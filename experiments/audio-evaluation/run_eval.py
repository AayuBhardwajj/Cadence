#!/usr/bin/env python3
"""
run_eval.py — Cadence ASR evaluation runner.

Implements the evaluation spec:
- Imports services/ml-audio/main.py via importlib (no side-effect name clash).
- Parity check: both main.py and amqp_consumer.py must contain
  `model.transcribe(audio, word_timestamps=True)`.
- Loads Whisper base on CPU (fp32).
- Calls _run_whisper_transcription(model, path) → returns (audio, duration_s, whisper_result).
- Two WER normalizations: EnglishTextNormalizer (primary), lowercase+strip-punct (secondary).
- Per-file try/except, never drops errored rows.
- Optional repeatability pass with quantile-selected files.
- Outputs to results/runs/<run_id>/.

Usage:
  backend/venv/bin/python experiments/audio-evaluation/run_eval.py \\
    --manifest experiments/audio-evaluation/results/test_manifest.csv \\
    --limit 3
"""

# ── Force CADENCE_ENV before any services/ import ────────────────────────────
import os
os.environ["CADENCE_ENV"] = "dev"

import argparse
import csv
import hashlib
import importlib.util
import inspect
import json
import logging
import platform
import re
import resource
import shutil
import subprocess
import sys
import time
import traceback
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

import torch
import whisper
import jiwer
import numpy as np

# ── Path setup ────────────────────────────────────────────────────────────────
SCRIPT_DIR = Path(__file__).resolve().parent
REPO_ROOT = SCRIPT_DIR.parent.parent
ML_AUDIO_DIR = REPO_ROOT / "services" / "ml-audio"
ML_SHARED_DIR = REPO_ROOT / "services" / "ml-shared"

# Abort immediately if env/dev.env is missing
DEV_ENV_FILE = REPO_ROOT / "env" / "dev.env"
if not DEV_ENV_FILE.is_file():
    sys.exit(f"ABORT: env/dev.env not found at {DEV_ENV_FILE}. Cannot proceed.")

# Inject ml-shared so load_env() can locate env/dev.env
if str(ML_SHARED_DIR) not in sys.path:
    sys.path.insert(0, str(ML_SHARED_DIR))

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
)
log = logging.getLogger("cadence.eval")

# ── Normalizers ──────────────────────────────────────────────────────────────
from whisper.normalizers import EnglishTextNormalizer as _ENTextNorm

_primary_normalizer = _ENTextNorm()
_PUNCT_RE = re.compile(r"[^\w\s]")


def normalize_primary(text: str) -> str:
    """EnglishTextNormalizer (Whisper's own)."""
    return _primary_normalizer(text)


def normalize_simple(text: str) -> str:
    """Lowercase + strip punctuation (mirrors _compute_wer in run_evaluation.py)."""
    return _PUNCT_RE.sub("", text.lower()).strip()


# ── WER computation ──────────────────────────────────────────────────────────

def compute_wer_stats(reference: str, hypothesis: str) -> dict:
    """
    Compute WER statistics using jiwer.process_words.
    Handles empty hypothesis explicitly (all ref words = deletions).
    Returns dict with keys: wer, S, D, I, hits, N.
    """
    ref_words = reference.split()
    N = len(ref_words)
    if N == 0:
        return {"wer": 0.0, "S": 0, "D": 0, "I": 0, "hits": 0, "N": 0,
                "jiwer_error": None}

    hyp_stripped = hypothesis.strip()
    if not hyp_stripped:
        # Empty hypothesis: all reference words are deletions
        return {"wer": 1.0, "S": 0, "D": N, "I": 0, "hits": 0, "N": N,
                "jiwer_error": "empty_hypothesis_handled_manually"}

    try:
        out = jiwer.process_words(reference, hyp_stripped)
        # jiwer.process_words returns a WordOutput with attributes
        wer_val = out.wer
        S = out.substitutions
        D = out.deletions
        I = out.insertions
        hits = out.hits
        return {"wer": round(wer_val, 6), "S": S, "D": D, "I": I, "hits": hits,
                "N": N, "jiwer_error": None}
    except Exception as e:
        return {"wer": None, "S": None, "D": None, "I": None, "hits": None,
                "N": N, "jiwer_error": str(e)}


# ── Parity check ─────────────────────────────────────────────────────────────
PARITY_STRING = "model.transcribe(audio, word_timestamps=True)"


def check_parity() -> dict:
    """Assert both main.py and amqp_consumer.py contain the parity string."""
    main_src = (ML_AUDIO_DIR / "main.py").read_text(encoding="utf-8")
    amqp_src = (ML_AUDIO_DIR / "amqp_consumer.py").read_text(encoding="utf-8")
    main_ok = PARITY_STRING in main_src
    amqp_ok = PARITY_STRING in amqp_src
    return {
        "parity_string": PARITY_STRING,
        "main_py_contains": main_ok,
        "amqp_consumer_py_contains": amqp_ok,
        "passed": main_ok and amqp_ok,
    }


# ── Load main.py via importlib ────────────────────────────────────────────────

def load_ml_audio_main():
    """
    Load services/ml-audio/main.py under a unique module name to avoid
    polluting sys.modules with 'main'. Returns the module object.
    """
    main_path = ML_AUDIO_DIR / "main.py"
    module_name = f"_cadence_ml_audio_main_{uuid.uuid4().hex}"
    spec = importlib.util.spec_from_file_location(module_name, main_path,
                                                   submodule_search_locations=[str(ML_AUDIO_DIR)])
    mod = importlib.util.module_from_spec(spec)
    # Ensure sys.path has ml-audio and ml-shared for transitive imports
    if str(ML_AUDIO_DIR) not in sys.path:
        sys.path.insert(0, str(ML_AUDIO_DIR))
    spec.loader.exec_module(mod)
    return mod


# ── Helper: extract segment info from Whisper result ─────────────────────────

def extract_segment_info(whisper_result: dict) -> dict:
    """Extract language, num_segments, max_segment_temperature from Whisper result."""
    language = whisper_result.get("language", "unknown")
    segments = whisper_result.get("segments", [])
    num_segments = len(segments)
    temps = [seg.get("temperature", None) for seg in segments]
    temps_valid = [t for t in temps if t is not None]
    max_temp = max(temps_valid) if temps_valid else None
    return {
        "language_detected": language,
        "num_segments": num_segments,
        "max_segment_temperature": max_temp,
    }


# ── SHA256 of hypothesis ──────────────────────────────────────────────────────

def sha256_text(text: str) -> str:
    return hashlib.sha256(text.encode("utf-8")).hexdigest()


# ── Single file evaluation ────────────────────────────────────────────────────

def evaluate_file(
    row: dict,
    model,
    run_whisper_transcription_fn,
    run_id: str,
    rep: int = 0,
    is_warmup: bool = False,
) -> dict:
    """
    Run transcription + metrics on one manifest row.
    Returns a results dict with all per-file fields.
    """
    utterance_id = row.get("utterance_id", "")
    speaker_id = row.get("speaker_id", row.get("utterance_id", "").split("-")[0] if row.get("utterance_id") else "")
    audio_path_rel = row.get("audio_path", "")
    ref_raw = row.get("reference_transcript", "")

    # Resolve audio path: relative to experiments/audio-evaluation/
    audio_path = (SCRIPT_DIR / audio_path_rel).resolve()

    base = {
        "run_id": run_id,
        "rep": rep,
        "utterance_id": utterance_id,
        "speaker_id": speaker_id,
        "is_warmup": is_warmup,
        "status": "ok",
        "error": "",
        "audio_duration_s": None,
        "decode_s": None,
        "latency_s": None,
        "rtf": None,
        "ref_raw": ref_raw,
        "hyp_raw": "",
        "ref_norm_primary": "",
        "hyp_norm_primary": "",
        "ref_norm_simple": "",
        "hyp_norm_simple": "",
        "wer_primary": None,
        "S_primary": None,
        "D_primary": None,
        "I_primary": None,
        "N_primary": None,
        "hits_primary": None,
        "jiwer_error_primary": None,
        "wer_simple": None,
        "S_simple": None,
        "D_simple": None,
        "I_simple": None,
        "N_simple": None,
        "hits_simple": None,
        "jiwer_error_simple": None,
        "language_detected": None,
        "max_segment_temperature": None,
        "num_segments": None,
        "hyp_sha256": "",
    }

    try:
        if not audio_path.is_file():
            raise FileNotFoundError(f"Audio file not found: {audio_path}")

        # Time decode (load_audio) separately
        t_decode_start = time.perf_counter()
        _ = whisper.load_audio(str(audio_path))  # side call to measure decode only
        t_decode_end = time.perf_counter()
        decode_s = t_decode_end - t_decode_start

        # Time transcription (includes load_audio internally in _run_whisper_transcription)
        t_start = time.perf_counter()
        audio_arr, duration_seconds, whisper_result = run_whisper_transcription_fn(model, str(audio_path))
        t_end = time.perf_counter()
        latency_s = t_end - t_start

        hyp_raw = whisper_result.get("text", "").strip()
        seg_info = extract_segment_info(whisper_result)

        # Normalizations
        ref_norm_primary = normalize_primary(ref_raw)
        hyp_norm_primary = normalize_primary(hyp_raw)
        ref_norm_simple = normalize_simple(ref_raw)
        hyp_norm_simple = normalize_simple(hyp_raw)

        # WER primary
        wer_p = compute_wer_stats(ref_norm_primary, hyp_norm_primary)
        # WER simple
        wer_s = compute_wer_stats(ref_norm_simple, hyp_norm_simple)

        rtf = latency_s / duration_seconds if duration_seconds > 0 else None

        base.update({
            "audio_duration_s": round(duration_seconds, 4),
            "decode_s": round(decode_s, 4),
            "latency_s": round(latency_s, 4),
            "rtf": round(rtf, 4) if rtf is not None else None,
            "hyp_raw": hyp_raw,
            "ref_norm_primary": ref_norm_primary,
            "hyp_norm_primary": hyp_norm_primary,
            "ref_norm_simple": ref_norm_simple,
            "hyp_norm_simple": hyp_norm_simple,
            "wer_primary": wer_p["wer"],
            "S_primary": wer_p["S"],
            "D_primary": wer_p["D"],
            "I_primary": wer_p["I"],
            "N_primary": wer_p["N"],
            "hits_primary": wer_p["hits"],
            "jiwer_error_primary": wer_p["jiwer_error"],
            "wer_simple": wer_s["wer"],
            "S_simple": wer_s["S"],
            "D_simple": wer_s["D"],
            "I_simple": wer_s["I"],
            "N_simple": wer_s["N"],
            "hits_simple": wer_s["hits"],
            "jiwer_error_simple": wer_s["jiwer_error"],
            "language_detected": seg_info["language_detected"],
            "max_segment_temperature": seg_info["max_segment_temperature"],
            "num_segments": seg_info["num_segments"],
            "hyp_sha256": sha256_text(hyp_raw),
        })

    except Exception as exc:
        log.error("[%s] FAILED: %s", utterance_id, exc)
        base["status"] = "error"
        base["error"] = f"{type(exc).__name__}: {exc}"

    return base


# ── System helpers ────────────────────────────────────────────────────────────

def get_ffmpeg_version() -> str:
    try:
        out = subprocess.check_output(["ffmpeg", "-version"], stderr=subprocess.STDOUT,
                                      text=True, timeout=5)
        return out.splitlines()[0]
    except Exception as e:
        return f"ERROR: {e}"


def get_git_info() -> dict:
    try:
        head = subprocess.check_output(["git", "rev-parse", "HEAD"],
                                        cwd=str(REPO_ROOT), text=True, timeout=5).strip()
        dirty_out = subprocess.check_output(["git", "status", "--porcelain"],
                                             cwd=str(REPO_ROOT), text=True, timeout=5).strip()
        dirty = bool(dirty_out)
        return {"HEAD": head, "dirty": dirty}
    except Exception as e:
        return {"HEAD": "UNVERIFIED", "dirty": None, "error": str(e)}


def get_ram_bytes() -> int:
    import platform as _pl
    if _pl.system() == "Darwin":
        try:
            out = subprocess.check_output(["sysctl", "hw.memsize"], text=True, timeout=5)
            return int(out.split(":")[1].strip())
        except Exception:
            return -1
    try:
        with open("/proc/meminfo") as f:
            for line in f:
                if line.startswith("MemTotal:"):
                    return int(line.split()[1]) * 1024
    except Exception:
        return -1
    return -1


def sha256_file(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as f:
        for chunk in iter(lambda: f.read(65536), b""):
            h.update(chunk)
    return h.hexdigest()


# ── CSV writer ────────────────────────────────────────────────────────────────

PREDICTIONS_FIELDS = [
    "run_id", "rep", "utterance_id", "speaker_id", "is_warmup", "status", "error",
    "audio_duration_s", "decode_s", "latency_s", "rtf",
    "ref_raw", "hyp_raw",
    "ref_norm_primary", "hyp_norm_primary",
    "ref_norm_simple", "hyp_norm_simple",
    "wer_primary", "S_primary", "D_primary", "I_primary", "N_primary", "hits_primary", "jiwer_error_primary",
    "wer_simple", "S_simple", "D_simple", "I_simple", "N_simple", "hits_simple", "jiwer_error_simple",
    "language_detected", "max_segment_temperature", "num_segments", "hyp_sha256",
]

REPEATABILITY_FIELDS = PREDICTIONS_FIELDS  # same schema


# ── Main ──────────────────────────────────────────────────────────────────────

def parse_args():
    p = argparse.ArgumentParser(description="Cadence ASR evaluation runner")
    p.add_argument("--manifest", required=True, type=Path, help="Path to manifest CSV")
    p.add_argument("--limit", type=int, default=None, help="Limit number of files to evaluate")
    p.add_argument("--reps", type=int, default=1, help="Repetitions (unused unless --repeat-subset > 0)")
    p.add_argument("--repeat-subset", type=int, default=0, dest="repeat_subset",
                   help="Number of files to select for repeatability pass (at duration quantiles)")
    p.add_argument("--out-dir", type=Path, default=None,
                   help="Output directory (default: results/runs/<run_id>/)")
    return p.parse_args()


def main():
    args = parse_args()
    run_id = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")

    # ── Output directory ────────────────────────────────────────────────────
    out_dir = args.out_dir if args.out_dir else (SCRIPT_DIR / "results" / "runs" / run_id)
    out_dir.mkdir(parents=True, exist_ok=True)
    log.info("Output directory: %s", out_dir)

    # ── Parity check ────────────────────────────────────────────────────────
    parity = check_parity()
    log.info("Parity check: %s", parity)
    if not parity["passed"]:
        sys.exit(
            f"ABORT: Parity check failed.\n"
            f"  main.py contains parity string: {parity['main_py_contains']}\n"
            f"  amqp_consumer.py contains parity string: {parity['amqp_consumer_py_contains']}\n"
            f"  Expected string: {PARITY_STRING}"
        )
    log.info("Parity check PASSED.")

    # ── Load main.py via importlib ──────────────────────────────────────────
    log.info("Loading services/ml-audio/main.py via importlib...")
    ml_audio = load_ml_audio_main()
    run_whisper_fn = ml_audio._run_whisper_transcription
    log.info("Using transcription function: _run_whisper_transcription from main.py")
    transcription_path_used = "_run_whisper_transcription from services/ml-audio/main.py"

    # Verify the function returns (audio, duration_seconds, result)
    # as seen in main.py:193-200
    # It returns a 3-tuple; result is the raw whisper dict.

    # ── Load Whisper model ──────────────────────────────────────────────────
    log.info("Loading Whisper 'base' model on cpu (fp32)...")
    torch_seed = torch.initial_seed()
    model = whisper.load_model("base", device="cpu")
    log.info("Whisper model loaded. device=%s", next(model.parameters()).device)
    log.info("torch.get_num_threads()=%d  torch.initial_seed()=%d", torch.get_num_threads(), torch_seed)

    # ── Read manifest ────────────────────────────────────────────────────────
    manifest_path = args.manifest.resolve()
    if not manifest_path.is_file():
        sys.exit(f"ABORT: Manifest not found: {manifest_path}")
    manifest_sha256 = sha256_file(manifest_path)
    with manifest_path.open(encoding="utf-8", newline="") as f:
        reader = csv.DictReader(f)
        all_rows = list(reader)
    log.info("Manifest: %d rows loaded from %s", len(all_rows), manifest_path)

    rows = all_rows[:args.limit] if args.limit else all_rows
    log.info("Rows to evaluate: %d%s", len(rows),
             f" (limited from {len(all_rows)})" if args.limit and args.limit < len(all_rows) else "")

    # ── Warm-up ─────────────────────────────────────────────────────────────
    log.info("Running warm-up transcription (excluded from stats)...")
    warmup_row = rows[0]
    warmup_result = evaluate_file(warmup_row, model, run_whisper_fn, run_id, rep=0, is_warmup=True)
    log.info("Warm-up done. status=%s duration_s=%s latency_s=%s",
             warmup_result["status"], warmup_result["audio_duration_s"], warmup_result["latency_s"])

    # ── Main evaluation pass ─────────────────────────────────────────────────
    log.info("Starting main evaluation pass (%d files)...", len(rows))
    results = []
    for i, row in enumerate(rows):
        log.info("[%d/%d] %s", i + 1, len(rows), row.get("utterance_id", ""))
        r = evaluate_file(row, model, run_whisper_fn, run_id, rep=0, is_warmup=False)
        results.append(r)
        status_str = f"status={r['status']}"
        if r["status"] == "ok":
            status_str += (f" wer_primary={r['wer_primary']}"
                           f" latency_s={r['latency_s']}"
                           f" rtf={r['rtf']}")
        log.info("  → %s", status_str)

    # Write predictions.csv (warm-up row first, then main results)
    predictions_csv = out_dir / "predictions.csv"
    all_output_rows = [warmup_result] + results
    with predictions_csv.open("w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=PREDICTIONS_FIELDS, extrasaction="ignore")
        writer.writeheader()
        writer.writerows(all_output_rows)
    log.info("predictions.csv written: %d rows (1 warmup + %d main)", len(all_output_rows), len(results))

    # ── Repeatability pass ───────────────────────────────────────────────────
    # Default metadata (overwritten if the repeat pass runs)
    _rep_meta = {
        "requested_k": args.repeat_subset, "actual_k": 0,
        "n_quantile_selected": 0, "n_fallback_selected": 0,
        "n_quantile_dropped": 0, "n_fallback_dropped": 0,
        "fallback_file_ids": [], "selected_ids": [],
    }
    repeatability_rows = []
    if args.repeat_subset > 0 and args.reps > 1:
        ok_results = [r for r in results if r["status"] == "ok" and r["audio_duration_s"] is not None]
        if len(ok_results) < args.repeat_subset:
            log.warning("repeat_subset=%d but only %d ok results; using all ok results",
                        args.repeat_subset, len(ok_results))
            subset_size = len(ok_results)
        else:
            subset_size = args.repeat_subset

        # ── Repeat-subset selection ───────────────────────────────────────────
        # Step 1: K evenly-spaced positions in duration-sorted ok results.
        #         Python's round() uses banker's rounding (deterministic).
        ok_results_sorted = sorted(ok_results, key=lambda r: r["audio_duration_s"])
        n_ok_sorted = len(ok_results_sorted)
        seen_idx = set()
        quantile_uids = []
        for i in range(subset_size):
            raw_idx = round(i * (n_ok_sorted - 1) / (subset_size - 1)) if subset_size > 1 else 0
            idx = min(max(raw_idx, 0), n_ok_sorted - 1)
            if idx not in seen_idx:
                seen_idx.add(idx)
                quantile_uids.append(ok_results_sorted[idx]["utterance_id"])
        # Step 2: All files with max_segment_temperature > 0.
        temp_fallback_uids = [
            r["utterance_id"] for r in ok_results
            if (r.get("max_segment_temperature") is not None
                and r["max_segment_temperature"] > 0.0)
        ]
        # Step 3: Union — fallback files first (protected from truncation), then quantile.
        #         Deduplicate: a file in both sets counts as fallback.
        fallback_set = set(temp_fallback_uids)
        quantile_only_uids = [u for u in quantile_uids if u not in fallback_set]
        # Step 4: Cap = K + 5.  Truncation removes from the END of each list,
        #         but fallback list is truncated only after quantile list is exhausted.
        cap_total = subset_size + 5
        all_candidates = temp_fallback_uids + quantile_only_uids
        n_fallback_dropped = 0
        n_quantile_dropped = 0
        if len(all_candidates) > cap_total:
            # First try dropping quantile files from the end
            n_to_drop = len(all_candidates) - cap_total
            if n_to_drop <= len(quantile_only_uids):
                n_quantile_dropped = n_to_drop
            else:
                # Must also drop some fallback files
                n_quantile_dropped = len(quantile_only_uids)
                n_fallback_dropped = n_to_drop - n_quantile_dropped
                log.warning(
                    "repeat_subset cap=%d: %d fallback file(s) also had to be dropped "
                    "(total fallbacks=%d, quantile=%d, cap=%d).",
                    cap_total, n_fallback_dropped, len(temp_fallback_uids),
                    len(quantile_only_uids), cap_total,
                )
        combined_uids = all_candidates[:cap_total]
        if n_quantile_dropped > 0 or n_fallback_dropped > 0:
            log.warning(
                "repeat_subset cap=%d: kept %d fallback + %d quantile = %d; "
                "dropped %d quantile + %d fallback.",
                cap_total,
                len(temp_fallback_uids) - n_fallback_dropped,
                len(quantile_only_uids) - n_quantile_dropped,
                len(combined_uids),
                n_quantile_dropped, n_fallback_dropped,
            )
        # Record selection metadata for config.json
        _rep_meta = {
            "requested_k": args.repeat_subset,
            "actual_k": len(combined_uids),
            "n_quantile_selected": len(quantile_only_uids) - n_quantile_dropped,
            "n_fallback_selected": len(temp_fallback_uids) - n_fallback_dropped,
            "n_quantile_dropped": n_quantile_dropped,
            "n_fallback_dropped": n_fallback_dropped,
            "fallback_file_ids": temp_fallback_uids,
            "selected_ids": combined_uids,
        }
        # Build manifest subset (preserves manifest row order for reproducibility)
        subset_rows_map = {uid: next(r for r in ok_results if r["utterance_id"] == uid)
                           for uid in combined_uids}
        subset_manifest = [r for r in all_rows if r.get("utterance_id") in subset_rows_map]

        log.info("Repeatability pass: K=%d files, R=%d reps", len(subset_manifest), args.reps)

        # Interleaved: rep1 over all K files, then rep2, etc.
        for rep_idx in range(1, args.reps + 1):
            for row in subset_manifest:
                log.info("[repeatability] rep=%d %s", rep_idx, row.get("utterance_id", ""))
                r = evaluate_file(row, model, run_whisper_fn, run_id, rep=rep_idx, is_warmup=False)
                repeatability_rows.append(r)

        if repeatability_rows:
            repeatability_csv = out_dir / "repeatability.csv"
            with repeatability_csv.open("w", newline="", encoding="utf-8") as f:
                writer = csv.DictWriter(f, fieldnames=REPEATABILITY_FIELDS, extrasaction="ignore")
                writer.writeheader()
                writer.writerows(repeatability_rows)
            log.info("repeatability.csv written: %d rows", len(repeatability_rows))

    # ── Peak RSS ─────────────────────────────────────────────────────────────
    peak_rss_bytes = resource.getrusage(resource.RUSAGE_SELF).ru_maxrss
    # On macOS, ru_maxrss is in bytes; on Linux it's in kilobytes
    if platform.system() == "Linux":
        peak_rss_bytes *= 1024

    # ── config.json ──────────────────────────────────────────────────────────
    # Get default temperature tuple from inspect.signature
    try:
        sig = inspect.signature(whisper.transcribe)
        default_temp = sig.parameters["temperature"].default
        default_temp_repr = repr(default_temp)
    except Exception as e:
        default_temp_repr = f"UNVERIFIED: {e}"

    # Get versions
    def pkg_version(name: str) -> str:
        try:
            import importlib.metadata
            return importlib.metadata.version(name)
        except Exception:
            return "UNVERIFIED"

    config = {
        "run_id": run_id,
        "argv": sys.argv,
        "manifest_path": str(manifest_path),
        "manifest_sha256": manifest_sha256,
        "manifest_rows_total": len(all_rows),
        "manifest_rows_evaluated": len(rows),
        "CADENCE_ENV": os.environ.get("CADENCE_ENV"),
        "model_name": "base",
        "device": "cpu",
        "dtype_note": "cpu → fp32 (Whisper forces fp32 when device=cpu, see whisper/transcribe.py:127-136)",
        "transcribe_call_literal": "model.transcribe(audio, word_timestamps=True)",
        "default_temperature_from_signature": default_temp_repr,
        "transcription_path_used": transcription_path_used,
        "parity_check": parity,
        "timeout_enforced": False,
        "timeout_note": "No per-file timeout is enforced; transcription runs until Whisper completes.",
        "torch_initial_seed": torch_seed,
        "torch_num_threads": torch.get_num_threads(),
        "torch_seed_note": "torch not seeded; production-faithful. Non-determinism possible on temperature fallback.",
        "normalizer_names": [
            "primary: whisper.normalizers.EnglishTextNormalizer",
            "simple: lowercase + strip punctuation (re.sub([^\\w\\s], '', text.lower()).strip())"
        ],
        "versions": {
            "python": sys.version,
            "openai-whisper": pkg_version("openai-whisper"),
            "torch": pkg_version("torch"),
            "numpy": pkg_version("numpy"),
            "jiwer": pkg_version("jiwer"),
        },
        "ffmpeg": get_ffmpeg_version(),
        "platform": platform.platform(),
        "platform_machine": platform.machine(),
        "ram_bytes": get_ram_bytes(),
        "git": get_git_info(),
        "peak_rss_bytes": peak_rss_bytes,
        "peak_rss_note": "resource.getrusage(RUSAGE_SELF).ru_maxrss — bytes on macOS, KB on Linux",
        "warmup_utterance_id": warmup_result.get("utterance_id"),
        "warmup_status": warmup_result.get("status"),
        "repeatability": {
            "reps": args.reps,
            "repeat_subset_k": args.repeat_subset,
            "requested_k": _rep_meta["requested_k"],
            "actual_k": _rep_meta["actual_k"],
            "n_quantile_selected": _rep_meta["n_quantile_selected"],
            "n_fallback_selected": _rep_meta["n_fallback_selected"],
            "n_quantile_dropped": _rep_meta["n_quantile_dropped"],
            "n_fallback_dropped": _rep_meta["n_fallback_dropped"],
            "fallback_file_ids": _rep_meta["fallback_file_ids"],
            "selected_ids": _rep_meta["selected_ids"],
            "rows_written": len(repeatability_rows),
        },
    }

    config_path = out_dir / "config.json"
    config_path.write_text(json.dumps(config, indent=2, default=str), encoding="utf-8")
    log.info("config.json written.")

    # ── Summary ───────────────────────────────────────────────────────────────
    ok_results = [r for r in results if r["status"] == "ok"]
    n_ok = len(ok_results)
    n_err = len(results) - n_ok
    log.info("=" * 60)
    log.info("DONE. files=%d  ok=%d  error=%d", len(results), n_ok, n_err)
    if n_ok:
        wers_p = [r["wer_primary"] for r in ok_results if r["wer_primary"] is not None]
        wers_s = [r["wer_simple"] for r in ok_results if r["wer_simple"] is not None]
        latencies = [r["latency_s"] for r in ok_results if r["latency_s"] is not None]
        rtfs = [r["rtf"] for r in ok_results if r["rtf"] is not None]
        if wers_p:
            log.info("  WER(primary) mean=%.4f  min=%.4f  max=%.4f",
                     sum(wers_p)/len(wers_p), min(wers_p), max(wers_p))
        if wers_s:
            log.info("  WER(simple)  mean=%.4f  min=%.4f  max=%.4f",
                     sum(wers_s)/len(wers_s), min(wers_s), max(wers_s))
        if latencies:
            log.info("  Latency(s)   mean=%.2f  min=%.2f  max=%.2f",
                     sum(latencies)/len(latencies), min(latencies), max(latencies))
        if rtfs:
            log.info("  RTF          mean=%.4f  min=%.4f  max=%.4f",
                     sum(rtfs)/len(rtfs), min(rtfs), max(rtfs))
    log.info("Output: %s", out_dir)
    log.info("=" * 60)


if __name__ == "__main__":
    main()

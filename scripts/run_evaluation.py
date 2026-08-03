#!/usr/bin/env python3
"""
Cadence Diagnostic Evaluation Harness
======================================
Standalone script that runs the production pipeline on a folder of audio files
and produces quantitative metrics for a research paper.

USAGE:
    python scripts/run_evaluation.py --input-dir <folder> [--output-dir <folder>]

OUTPUTS (written to --output-dir, default: same as --input-dir):
    evaluation_results.csv       — per-file metrics
    evaluation_summary.json      — aggregate statistics
    evaluation_errors.log        — files/stages that failed
    <filename>_diagnostic.txt    — raw LLM output per file (for manual review)

REQUIREMENTS:
    pip install jiwer
    All other deps are already in backend/requirements.txt
"""

import argparse
import asyncio
import csv
import json
import logging
import os
import re
import sys
import time
import traceback
from pathlib import Path
from typing import Optional

# ── Path Setup ────────────────────────────────────────────────────────────────
# Insert backend/ into sys.path so we can import production modules directly.
SCRIPT_DIR = Path(__file__).resolve().parent
REPO_ROOT   = SCRIPT_DIR.parent
BACKEND_DIR = REPO_ROOT / "backend"

if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

# Load backend/.env so all API keys and DB credentials are available.
from dotenv import load_dotenv
load_dotenv(BACKEND_DIR / ".env")

# ── Logging Setup ─────────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
)
log = logging.getLogger("cadence.eval")

# ── Optional WER dependency ───────────────────────────────────────────────────
try:
    import jiwer
    _JIWER_AVAILABLE = True
except ImportError:
    _JIWER_AVAILABLE = False
    log.warning(
        "jiwer not installed — WER calculation will be skipped. "
        "Run: pip install jiwer"
    )

# ── Production imports ────────────────────────────────────────────────────────
# We import these *after* sys.path is set so they resolve correctly.
import whisper as _whisper  # the openai-whisper package

from utils.scoring import calculate_score
from services.analysis_service import deep_analyze_speech
import utils.ai_usage_logger as _usage_logger  # for monkey-patching
from utils.supabase_client import supabase

# ── Whisper model (loaded once, same as production) ───────────────────────────
log.info("Loading Whisper 'base' model (this may take a moment)…")
_WHISPER_MODEL = _whisper.load_model("base")
log.info("Whisper model ready.")

# ── Supported audio extensions ─────────────────────────────────────────────────
AUDIO_EXTENSIONS = {".webm", ".wav", ".mp4", ".mp3", ".ogg", ".flac", ".m4a"}

# ── LLM provider capture via monkey-patch ─────────────────────────────────────
# We intercept log_llm_usage (called internally by call_llm) to capture which
# provider/model actually responded.  Production behaviour is unchanged because
# we restore the original after each file.
_captured_llm_provider: Optional[str] = None
_captured_llm_model:    Optional[str] = None
_original_log_llm_usage = _usage_logger.log_llm_usage


def _intercepting_log_llm_usage(
    provider: str,
    model: str,
    input_tokens: int,
    output_tokens: int,
    purpose: str,
    assessment_id=None,
    user_id=None,
) -> None:
    global _captured_llm_provider, _captured_llm_model
    _captured_llm_provider = provider
    _captured_llm_model    = model
    # Still call the original so production logs are not silenced.
    _original_log_llm_usage(
        provider=provider,
        model=model,
        input_tokens=input_tokens,
        output_tokens=output_tokens,
        purpose=purpose,
        assessment_id=assessment_id,
        user_id=user_id,
    )


def _start_llm_capture() -> None:
    """Activate provider-capture intercept."""
    global _captured_llm_provider, _captured_llm_model
    _captured_llm_provider = None
    _captured_llm_model    = None
    _usage_logger.log_llm_usage = _intercepting_log_llm_usage


def _stop_llm_capture() -> tuple[str, str]:
    """Deactivate intercept and return (provider, model)."""
    _usage_logger.log_llm_usage = _original_log_llm_usage
    return (
        _captured_llm_provider or "unknown",
        _captured_llm_model    or "unknown",
    )


# ── Word-bank helpers ──────────────────────────────────────────────────────────

def _fetch_all_word_bank_entries() -> list[dict]:
    """
    Fetch every active+verified entry from the word_bank table.
    Returns list of dicts with keys: id, word_code, word, issue_type, bucket.
    Raises on DB error so the caller can decide how to handle it.
    """
    res = (
        supabase
        .table("word_bank")
        .select("id, word_code, word, issue_type, bucket")
        .eq("active", True)
        .execute()
    )
    return res.data or []


def _match_word_bank(transcript: str, word_bank_entries: list[dict]) -> dict:
    """
    Check which word_bank entries appear in the transcript.
    Uses whole-word, case-insensitive regex matching (same logic as
    passage_generation_service.find_word_positions).

    Returns:
        {
            "mti_matches":    [{ word_code, word, bucket }, ...],
            "stutter_matches":[{ word_code, word, bucket }, ...],
        }
    """
    mti_matches     = []
    stutter_matches = []
    text_lower      = transcript.lower()

    for entry in word_bank_entries:
        word    = entry.get("word", "")
        pattern = re.compile(
            rf"(?<!\w){re.escape(word.lower())}(?!\w)",
            re.IGNORECASE,
        )
        if pattern.search(text_lower):
            hit = {
                "word_code": entry.get("word_code"),
                "word":      word,
                "bucket":    entry.get("bucket"),
            }
            if entry.get("issue_type") == "mti":
                mti_matches.append(hit)
            else:
                stutter_matches.append(hit)

    return {
        "mti_matches":     mti_matches,
        "stutter_matches": stutter_matches,
    }


# ── WER helper ─────────────────────────────────────────────────────────────────

def _compute_wer(hypothesis: str, reference: str) -> float:
    """
    Compute Word Error Rate using jiwer.
    Returns a float in [0, inf) — 0.0 means perfect match.
    """
    transforms = jiwer.Compose([
        jiwer.ToLowerCase(),
        jiwer.RemovePunctuation(),
        jiwer.Strip(),
        jiwer.ReduceToListOfListOfWords(),
    ])
    return jiwer.wer(
        reference,
        hypothesis,
        reference_transform=transforms,
        hypothesis_transform=transforms,
    )


# ── Stage timers ───────────────────────────────────────────────────────────────

class _Timer:
    """Simple perf_counter context manager."""
    def __init__(self):
        self._start = 0.0
        self.elapsed_ms = 0.0

    def __enter__(self):
        self._start = time.perf_counter()
        return self

    def __exit__(self, *_):
        self.elapsed_ms = (time.perf_counter() - self._start) * 1000


# ── Per-file evaluation ────────────────────────────────────────────────────────

async def _evaluate_single_file(
    audio_path: Path,
    word_bank_entries: list[dict],
    output_dir: Path,
    error_log_path: Path,
) -> Optional[dict]:
    """
    Run all five pipeline stages on a single audio file.
    Returns a result dict suitable for CSV output, or None on critical failure.
    On stage-level failure, logs the error and continues.
    """
    filename = audio_path.name
    stem     = audio_path.stem
    gt_path  = audio_path.with_suffix(".gt.txt")
    gt_text  = None

    if gt_path.exists():
        gt_text = gt_path.read_text(encoding="utf-8").strip()
        log.info(f"  [GT] Ground truth found: {gt_path.name}")
    else:
        log.info("  [GT] No ground truth file — WER will be N/A")

    result = {
        "filename":               filename,
        "wer":                    "N/A",
        "mti_matches":            0,
        "stutter_matches":        0,
        "total_wordbank_matches": 0,
        "latency_upload_ms":      "N/A",
        "latency_preprocess_ms":  "N/A",
        "latency_transcription_ms": "N/A",
        "latency_matching_ms":    "N/A",
        "latency_llm_ms":         "N/A",
        "llm_provider_used":      "N/A",
        "total_latency_ms":       "N/A",
    }

    def _log_error(stage: str, exc: Exception):
        msg = f"[{filename}] FAILED at stage '{stage}': {exc}"
        log.error(msg)
        with open(error_log_path, "a", encoding="utf-8") as fh:
            fh.write(msg + "\n" + traceback.format_exc() + "\n\n")

    # ── Stage 1: Upload / Validation ─────────────────────────────────────────
    # Measurement starts once the file is on disk (server-side receipt).
    # We validate extension and file readability.
    try:
        with _Timer() as t_upload:
            if not audio_path.exists():
                raise FileNotFoundError(f"File not found: {audio_path}")
            ext = audio_path.suffix.lower()
            if ext not in AUDIO_EXTENSIONS:
                raise ValueError(f"Unsupported file extension: {ext}")
            _ = audio_path.stat().st_size  # confirm readable
        result["latency_upload_ms"] = round(t_upload.elapsed_ms, 2)
        log.info(f"  [1/5] Upload/Validation: {t_upload.elapsed_ms:.1f} ms")
    except Exception as e:
        _log_error("upload_validation", e)
        return None  # Cannot continue without a valid file

    # ── Stage 2: Pre-processing (audio load / resampling) ─────────────────────
    # whisper.load_audio() handles ffmpeg demux + resample to 16 kHz.
    # Note: the production pipeline has no separate noise-reduction or
    # normalization step; this stage covers exactly what the server does
    # before transcription begins.
    audio_array = None
    try:
        with _Timer() as t_preprocess:
            audio_array = _whisper.load_audio(str(audio_path))
        result["latency_preprocess_ms"] = round(t_preprocess.elapsed_ms, 2)
        log.info(f"  [2/5] Pre-processing:    {t_preprocess.elapsed_ms:.1f} ms")
    except Exception as e:
        _log_error("preprocessing", e)
        return result  # Return partial so upstream stages are still logged

    # ── Stage 3: Whisper Transcription ────────────────────────────────────────
    transcription   = ""
    words_data      = []
    audio_data_dict = {}

    try:
        with _Timer() as t_transcription:
            whisper_result = _WHISPER_MODEL.transcribe(audio_array, word_timestamps=True)

        result["latency_transcription_ms"] = round(t_transcription.elapsed_ms, 2)
        log.info(f"  [3/5] Transcription:     {t_transcription.elapsed_ms:.1f} ms")

        transcription  = whisper_result.get("text", "").strip()
        duration_secs  = len(audio_array) / 16000.0

        for seg in whisper_result.get("segments", []):
            for w in seg.get("words", []):
                words_data.append({
                    "word":  w["word"].strip(),
                    "start": w["start"],
                    "end":   w["end"],
                })

        # Build the audio_data dict that production services expect
        words       = transcription.split()
        word_count  = len(words)
        dur_minutes = duration_secs / 60 if duration_secs > 0 else 1
        wpm         = round(word_count / dur_minutes)

        FILLER_WORDS = [
            "um", "uh", "ah", "like", "you know", "basically", "literally",
            "actually", "right", "so", "well", "okay", "kind of", "sort of",
            "i mean", "you see", "honestly", "seriously",
        ]
        text_lower    = transcription.lower()
        filler_count  = 0
        filler_detail = {}
        for fw in FILLER_WORDS:
            hits = re.findall(r'\b' + re.escape(fw) + r'\b', text_lower)
            if hits:
                filler_detail[fw]  = len(hits)
                filler_count      += len(hits)

        from services.audio_service import detect_stutters, compute_pause_metrics
        stutter_res = detect_stutters(words_data)
        pause_res   = compute_pause_metrics(words_data)

        audio_data_dict = {
            "transcription":   transcription,
            "wpm":             wpm,
            "filler_count":    filler_count,
            "filler_detail":   filler_detail,
            "duration":        round(duration_secs, 2),
            "words_data":      words_data,
            "stutter_count":   stutter_res["stutter_count"],
            "stutter_events":  stutter_res["stutter_events"],
            "pause_count":     pause_res["pause_count"],
            "longest_pause":   pause_res["longest_pause"],
            "average_pause":   pause_res["average_pause"],
            "pause_intervals": pause_res["pause_intervals"],
        }

        # WER (only if ground truth exists and jiwer is available)
        if gt_text and _JIWER_AVAILABLE:
            try:
                wer_val = _compute_wer(transcription, gt_text)
                result["wer"] = round(wer_val, 4)
                log.info(f"  [WER] {result['wer']:.4f} ({result['wer']*100:.2f}%)")
            except Exception as e:
                log.warning(f"  [WER] Calculation failed: {e}")

    except Exception as e:
        _log_error("transcription", e)
        return result

    # ── Stage 4: Word-bank / MTI / Stutter-pattern Matching ──────────────────
    match_hit_detail = {"mti_matches": [], "stutter_matches": []}
    try:
        with _Timer() as t_matching:
            match_hit_detail = _match_word_bank(transcription, word_bank_entries)

        result["latency_matching_ms"]    = round(t_matching.elapsed_ms, 2)
        result["mti_matches"]            = len(match_hit_detail["mti_matches"])
        result["stutter_matches"]        = len(match_hit_detail["stutter_matches"])
        result["total_wordbank_matches"] = (
            result["mti_matches"] + result["stutter_matches"]
        )
        log.info(
            f"  [4/5] Word-bank matching: {t_matching.elapsed_ms:.1f} ms  "
            f"| MTI={result['mti_matches']}  stutter={result['stutter_matches']}"
        )
    except Exception as e:
        _log_error("wordbank_matching", e)

    # Stash raw hit details for coverage computation (not written to CSV)
    result["_mti_hits"]     = match_hit_detail["mti_matches"]
    result["_stutter_hits"] = match_hit_detail["stutter_matches"]

    # ── Stage 5: LLM Diagnostic Generation ───────────────────────────────────
    try:
        score_data = calculate_score(audio_data_dict, {"eye_contact_percent": 0})

        _start_llm_capture()
        with _Timer() as t_llm:
            deep_result = await deep_analyze_speech(
                audio_data_dict,
                score_data,
                topic_id="custom",
                topic_prompt="Please speak on a topic of your choice.",
                assessment_id=None,
                user_id=None,
            )
        provider_used, model_used = _stop_llm_capture()

        result["latency_llm_ms"]    = round(t_llm.elapsed_ms, 2)
        result["llm_provider_used"] = f"{provider_used}/{model_used}"
        log.info(
            f"  [5/5] LLM generation:    {t_llm.elapsed_ms:.1f} ms  "
            f"| provider={provider_used}/{model_used}"
        )

        # Save raw LLM diagnostic output for manual paper review
        llm_output_raw = json.dumps(deep_result, indent=2, ensure_ascii=False)
        diag_path = output_dir / f"{stem}_diagnostic.txt"
        diag_path.write_text(
            f"=== Cadence Diagnostic Output ===\n"
            f"File     : {filename}\n"
            f"Provider : {provider_used}/{model_used}\n"
            f"LLM ms   : {result['latency_llm_ms']}\n"
            f"Transcript:\n{transcription}\n\n"
            f"=== Raw LLM JSON ===\n{llm_output_raw}\n",
            encoding="utf-8",
        )
        log.info(f"  [LLM] Diagnostic saved: {diag_path.name}")

    except Exception as e:
        _stop_llm_capture()
        _log_error("llm_diagnostic", e)

    # ── Total latency ─────────────────────────────────────────────────────────
    numeric_latencies = [
        result[k] for k in (
            "latency_upload_ms",
            "latency_preprocess_ms",
            "latency_transcription_ms",
            "latency_matching_ms",
            "latency_llm_ms",
        )
        if isinstance(result[k], (int, float))
    ]
    if numeric_latencies:
        result["total_latency_ms"] = round(sum(numeric_latencies), 2)

    return result


# ── Aggregate statistics ───────────────────────────────────────────────────────

def _compute_summary(
    results: list[dict],
    word_bank_entries: list[dict],
) -> dict:
    """Build the evaluation_summary.json payload."""

    # WER
    wer_values    = [r["wer"] for r in results if isinstance(r.get("wer"), float)]
    mean_wer      = round(sum(wer_values) / len(wer_values), 4) if wer_values else None
    files_with_gt = len(wer_values)

    # Word-bank coverage: what % of all word_bank entries were triggered
    # at least once across the full sample set.
    # NOTE: This measures how REPRESENTATIVE the sample is (coverage),
    # NOT transcription accuracy. Labelled clearly as "coverage" per requirement.
    all_codes_triggered: set[str] = set()
    for r in results:
        for hit in r.get("_mti_hits", []) + r.get("_stutter_hits", []):
            if hit.get("word_code"):
                all_codes_triggered.add(hit["word_code"])

    total_wb_entries      = len(word_bank_entries)
    coverage_count        = len(all_codes_triggered)
    wordbank_coverage_pct = (
        round(coverage_count / total_wb_entries * 100, 2)
        if total_wb_entries > 0 else 0.0
    )

    # Per-stage latency aggregates
    def _stage_stats(key: str) -> dict:
        vals = [r[key] for r in results if isinstance(r.get(key), (int, float))]
        if not vals:
            return {"mean_ms": None, "median_ms": None, "max_ms": None}
        vals_sorted = sorted(vals)
        n = len(vals_sorted)
        median = (
            vals_sorted[n // 2]
            if n % 2 == 1
            else (vals_sorted[n // 2 - 1] + vals_sorted[n // 2]) / 2
        )
        return {
            "mean_ms":   round(sum(vals) / n, 2),
            "median_ms": round(median, 2),
            "max_ms":    round(max(vals), 2),
        }

    return {
        "num_files_evaluated":        len(results),
        "num_files_with_gt":          files_with_gt,
        "mean_wer":                   mean_wer,
        "wordbank_coverage_note": (
            "Percentage of the total word_bank entries (active+verified) that "
            "were triggered at least once across the full sample set. "
            "This measures SAMPLE REPRESENTATIVENESS (coverage), not accuracy."
        ),
        "total_wordbank_entries":       total_wb_entries,
        "wordbank_entries_triggered":   coverage_count,
        "wordbank_coverage_pct":        wordbank_coverage_pct,
        "latency_upload":        _stage_stats("latency_upload_ms"),
        "latency_preprocess":    _stage_stats("latency_preprocess_ms"),
        "latency_transcription": _stage_stats("latency_transcription_ms"),
        "latency_matching":      _stage_stats("latency_matching_ms"),
        "latency_llm":           _stage_stats("latency_llm_ms"),
        "latency_total":         _stage_stats("total_latency_ms"),
    }


# ── Pretty-print summary table ─────────────────────────────────────────────────

def _print_summary_table(summary: dict) -> None:
    print("\n" + "=" * 62)
    print("  Cadence Evaluation Summary")
    print("=" * 62)
    print(f"  Files evaluated          : {summary['num_files_evaluated']}")
    print(f"  Files with ground truth  : {summary['num_files_with_gt']}")
    wer = summary["mean_wer"]
    print(
        f"  Mean WER                 : "
        f"{f'{wer:.4f} ({wer*100:.2f}%)' if wer is not None else 'N/A (no GT files)'}"
    )
    print(f"  Word-bank total entries  : {summary['total_wordbank_entries']}")
    print(f"  Word-bank triggered      : {summary['wordbank_entries_triggered']}")
    print(
        f"  Sample coverage (note)   : {summary['wordbank_coverage_pct']}%  "
        f"[COVERAGE = representativeness, not accuracy]"
    )
    print()
    print(f"  {'Stage':<22} {'Mean (ms)':>10} {'Median (ms)':>12} {'Max (ms)':>10}")
    print(f"  {'-'*22} {'-'*10} {'-'*12} {'-'*10}")
    for key, label in [
        ("latency_upload",        "Upload/Validation"),
        ("latency_preprocess",    "Pre-processing"),
        ("latency_transcription", "Transcription"),
        ("latency_matching",      "Word-bank Match"),
        ("latency_llm",           "LLM Diagnostic"),
        ("latency_total",         "Total E2E"),
    ]:
        s = summary[key]
        mean_s   = f"{s['mean_ms']:.1f}"   if s["mean_ms"]   is not None else "N/A"
        median_s = f"{s['median_ms']:.1f}" if s["median_ms"] is not None else "N/A"
        max_s    = f"{s['max_ms']:.1f}"    if s["max_ms"]    is not None else "N/A"
        print(f"  {label:<22} {mean_s:>10} {median_s:>12} {max_s:>10}")
    print("=" * 62 + "\n")


# ── Main ───────────────────────────────────────────────────────────────────────

async def main() -> None:
    parser = argparse.ArgumentParser(
        description="Cadence diagnostic evaluation harness for research metrics."
    )
    parser.add_argument(
        "--input-dir",
        required=True,
        type=Path,
        metavar="FOLDER",
        help="Directory containing audio files (and optional .gt.txt files).",
    )
    parser.add_argument(
        "--output-dir",
        type=Path,
        default=None,
        metavar="FOLDER",
        help="Directory for output files (default: same as --input-dir).",
    )
    args = parser.parse_args()

    input_dir  = args.input_dir.resolve()
    output_dir = (args.output_dir or input_dir).resolve()

    if not input_dir.is_dir():
        log.error(f"--input-dir does not exist or is not a directory: {input_dir}")
        sys.exit(1)

    output_dir.mkdir(parents=True, exist_ok=True)

    csv_path     = output_dir / "evaluation_results.csv"
    summary_path = output_dir / "evaluation_summary.json"
    error_path   = output_dir / "evaluation_errors.log"

    # Clear previous error log on each run
    error_path.write_text("", encoding="utf-8")

    # ── Discover audio files ──────────────────────────────────────────────────
    audio_files = sorted(
        p for p in input_dir.iterdir()
        if p.is_file() and p.suffix.lower() in AUDIO_EXTENSIONS
    )

    if not audio_files:
        log.error(f"No audio files found in {input_dir}")
        log.error(f"Supported extensions: {', '.join(sorted(AUDIO_EXTENSIONS))}")
        sys.exit(1)

    log.info(f"Found {len(audio_files)} audio file(s) in {input_dir}")

    # ── Fetch word_bank once for the whole run ────────────────────────────────
    log.info("Fetching word_bank entries from Supabase…")
    try:
        word_bank_entries = _fetch_all_word_bank_entries()
        log.info(f"Loaded {len(word_bank_entries)} active+verified word_bank entries.")
    except Exception as e:
        log.error(f"Failed to fetch word_bank: {e}")
        log.warning("Word-bank matching will be skipped (results will show 0 matches).")
        word_bank_entries = []

    # ── CSV header ────────────────────────────────────────────────────────────
    CSV_FIELDS = [
        "filename",
        "wer",
        "mti_matches",
        "stutter_matches",
        "total_wordbank_matches",
        "latency_upload_ms",
        "latency_preprocess_ms",
        "latency_transcription_ms",
        "latency_matching_ms",
        "latency_llm_ms",
        "llm_provider_used",
        "total_latency_ms",
    ]

    all_results: list[dict] = []

    with open(csv_path, "w", newline="", encoding="utf-8") as csv_fh:
        writer = csv.DictWriter(csv_fh, fieldnames=CSV_FIELDS, extrasaction="ignore")
        writer.writeheader()

        for idx, audio_path in enumerate(audio_files, start=1):
            log.info(
                f"\n{'─'*60}\n"
                f"  Processing [{idx}/{len(audio_files)}]: {audio_path.name}"
            )

            try:
                file_result = await _evaluate_single_file(
                    audio_path=audio_path,
                    word_bank_entries=word_bank_entries,
                    output_dir=output_dir,
                    error_log_path=error_path,
                )
            except Exception as e:
                msg = f"[{audio_path.name}] Unexpected top-level error: {e}"
                log.error(msg)
                with open(error_path, "a", encoding="utf-8") as fh:
                    fh.write(msg + "\n" + traceback.format_exc() + "\n\n")
                file_result = None

            if file_result is not None:
                all_results.append(file_result)
                writer.writerow(file_result)
                csv_fh.flush()  # Write immediately so partial runs are recoverable

    if not all_results:
        log.error("No files were processed successfully. Check evaluation_errors.log.")
        sys.exit(1)

    # ── Aggregate summary ─────────────────────────────────────────────────────
    summary = _compute_summary(all_results, word_bank_entries)
    summary_path.write_text(
        json.dumps(summary, indent=2, ensure_ascii=False),
        encoding="utf-8",
    )

    _print_summary_table(summary)

    log.info(f"Results CSV      : {csv_path}")
    log.info(f"Summary JSON     : {summary_path}")
    log.info(f"Error log        : {error_path}")
    log.info(f"Diagnostic files : {output_dir}/<filename>_diagnostic.txt")


if __name__ == "__main__":
    asyncio.run(main())

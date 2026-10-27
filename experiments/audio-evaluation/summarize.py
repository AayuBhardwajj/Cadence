#!/usr/bin/env python3
"""
summarize.py — ASR evaluation summary generator.

Usage:
    python summarize.py --run-a <dir> --run-b <dir> [--run-c <dir>] [--manifest-seed 42]

Outputs:
    results/summary/summary.json
    results/summary/REPORT.md

Rules:
    - stdlib + numpy only (no pandas, no installs)
    - is_warmup rows are excluded from all statistics
    - repeatability rows are excluded from main-pass WER stats
    - All corpus-level WER = (ΣS + ΣD + ΣI) / ΣN (primary metric)
    - Bootstrap 95% CI uses file-level resampling, seed=42, 10_000 resamples
"""

import argparse
import csv
import hashlib
import json
import math
import os
import platform
import random
import subprocess
import sys
import textwrap
from collections import defaultdict
from pathlib import Path

import numpy as np

SCRIPT_DIR = Path(__file__).resolve().parent
SUMMARY_DIR = SCRIPT_DIR / "results" / "summary"


# ── Helpers ──────────────────────────────────────────────────────────────────

def load_csv(path: Path) -> list:
    with open(path, encoding="utf-8", newline="") as f:
        return list(csv.DictReader(f))


def coerce_float(v):
    try:
        return float(v)
    except (TypeError, ValueError):
        return None


def coerce_int(v):
    try:
        return int(v)
    except (TypeError, ValueError):
        return None


def safe_sha256(s):
    return hashlib.sha256(s.encode()).hexdigest()


def corpus_wer(rows, S_col, D_col, I_col, N_col):
    """Corpus WER = (ΣS+ΣD+ΣI) / ΣN across rows with valid N > 0."""
    total_S = total_D = total_I = total_N = total_hits = 0
    for r in rows:
        S = coerce_int(r.get(S_col)) or 0
        D = coerce_int(r.get(D_col)) or 0
        I_ = coerce_int(r.get(I_col)) or 0
        N = coerce_int(r.get(N_col)) or 0
        if N > 0:
            total_S += S
            total_D += D
            total_I += I_
            total_N += N
            total_hits += N - S - D
    wer = (total_S + total_D + total_I) / total_N if total_N > 0 else None
    return wer, total_S, total_D, total_I, total_N, total_hits


def bootstrap_corpus_wer_ci(rows, S_col, D_col, I_col, N_col, seed=42, n_resamples=10000):
    """
    File-level bootstrap 95% CI for corpus WER.
    Each resample draws len(rows) files with replacement and computes corpus WER.
    """
    valid = [(coerce_int(r.get(S_col)) or 0,
              coerce_int(r.get(D_col)) or 0,
              coerce_int(r.get(I_col)) or 0,
              coerce_int(r.get(N_col)) or 0)
             for r in rows if (coerce_int(r.get(N_col)) or 0) > 0]
    if len(valid) == 0:
        return None, None
    rng = random.Random(seed)
    boot_wers = []
    n = len(valid)
    for _ in range(n_resamples):
        sample = [valid[rng.randint(0, n - 1)] for _ in range(n)]
        S_ = sum(x[0] for x in sample)
        D_ = sum(x[1] for x in sample)
        I_ = sum(x[2] for x in sample)
        N_ = sum(x[3] for x in sample)
        if N_ > 0:
            boot_wers.append((S_ + D_ + I_) / N_)
    boot_wers.sort()
    lo = boot_wers[int(0.025 * len(boot_wers))]
    hi = boot_wers[int(0.975 * len(boot_wers))]
    return lo, hi


def mean_per_file_wer(rows, wer_col):
    vals = [coerce_float(r.get(wer_col)) for r in rows
            if coerce_float(r.get(wer_col)) is not None]
    return sum(vals) / len(vals) if vals else None


def latency_stats(rows, col):
    vals = [coerce_float(r.get(col)) for r in rows
            if coerce_float(r.get(col)) is not None]
    if not vals:
        return {}
    arr = sorted(vals)
    n = len(arr)
    def pct(p):
        idx = min(int(math.ceil(p / 100.0 * n)) - 1, n - 1)
        return arr[max(idx, 0)]
    return {
        "mean": sum(arr) / n,
        "median": pct(50),
        "p90": pct(90),
        "p95": pct(95),
        "max": arr[-1],
        "min": arr[0],
        "n": n,
    }


def rtf_stats(rows):
    vals = [coerce_float(r.get("rtf")) for r in rows
            if coerce_float(r.get("rtf")) is not None]
    if not vals:
        return {}
    return {"mean": sum(vals) / len(vals), "median": sorted(vals)[len(vals) // 2]}


def speaker_wer(rows, S_col, D_col, I_col, N_col):
    spk = defaultdict(lambda: [0, 0, 0, 0])
    for r in rows:
        sid = r.get("speaker_id", "unknown")
        S = coerce_int(r.get(S_col)) or 0
        D = coerce_int(r.get(D_col)) or 0
        I_ = coerce_int(r.get(I_col)) or 0
        N = coerce_int(r.get(N_col)) or 0
        if N > 0:
            spk[sid][0] += S
            spk[sid][1] += D
            spk[sid][2] += I_
            spk[sid][3] += N
    result = {}
    for sid, (S, D, I_, N) in spk.items():
        result[sid] = {"wer": (S + D + I_) / N if N > 0 else None,
                       "S": S, "D": D, "I": I_, "N": N}
    return result


def file_wer_list(rows, wer_col, ref_col, hyp_col):
    out = []
    for r in rows:
        w = coerce_float(r.get(wer_col))
        if w is None:
            continue
        out.append({
            "utterance_id": r.get("utterance_id"),
            "speaker_id": r.get("speaker_id"),
            "wer": w,
            "ref": r.get(ref_col, ""),
            "hyp": r.get(hyp_col, ""),
        })
    return sorted(out, key=lambda x: -x["wer"])


def manifest_sha256(path):
    h = hashlib.sha256()
    h.update(path.read_bytes())
    return h.hexdigest()


def git_head():
    try:
        head = subprocess.check_output(
            ["git", "rev-parse", "HEAD"], cwd=str(SCRIPT_DIR),
            stderr=subprocess.DEVNULL).decode().strip()
        dirty = subprocess.check_output(
            ["git", "status", "--porcelain"], cwd=str(SCRIPT_DIR),
            stderr=subprocess.DEVNULL).decode().strip()
        return head + ("-dirty" if dirty else "")
    except Exception:
        return "UNVERIFIED"


def total_wall_time(rows):
    vals = [coerce_float(r.get("latency_s")) for r in rows
            if coerce_float(r.get("latency_s")) is not None]
    return sum(vals) if vals else None


# ── Per-run processing ────────────────────────────────────────────────────────

def process_run(run_dir, label):
    pred_path = run_dir / "predictions.csv"
    rep_path = run_dir / "repeatability.csv"
    cfg_path = run_dir / "config.json"

    if not pred_path.exists():
        raise FileNotFoundError(f"predictions.csv not found in {run_dir}")

    all_pred = load_csv(pred_path)
    cfg = json.loads(cfg_path.read_text()) if cfg_path.exists() else {}

    main_rows = [r for r in all_pred if r.get("is_warmup", "").lower() != "true"]

    ok_rows = [r for r in main_rows if r.get("status") == "ok"]
    error_rows = [r for r in main_rows if r.get("status") != "ok"]
    empty_hyp_rows = [r for r in ok_rows if not r.get("hyp_raw", "").strip()]

    wer_p, S_p, D_p, I_p, N_p, hits_p = corpus_wer(
        ok_rows, "S_primary", "D_primary", "I_primary", "N_primary")
    mean_file_wer_p = mean_per_file_wer(ok_rows, "wer_primary")
    ci_lo_p, ci_hi_p = bootstrap_corpus_wer_ci(
        ok_rows, "S_primary", "D_primary", "I_primary", "N_primary")

    wer_s, S_s, D_s, I_s, N_s, hits_s = corpus_wer(
        ok_rows, "S_simple", "D_simple", "I_simple", "N_simple")
    mean_file_wer_s = mean_per_file_wer(ok_rows, "wer_simple")

    spk_wer = speaker_wer(ok_rows, "S_primary", "D_primary", "I_primary", "N_primary")
    worst_speakers = sorted(
        [(k, v["wer"]) for k, v in spk_wer.items() if v["wer"] is not None],
        key=lambda x: -x[1])[:5]

    file_list = file_wer_list(ok_rows, "wer_primary", "ref_norm_primary", "hyp_norm_primary")
    worst_files = file_list[:5]

    fallback_rows = [r for r in ok_rows
                     if (coerce_float(r.get("max_segment_temperature")) or 0.0) > 0.0]
    fallback_ids = [r["utterance_id"] for r in fallback_rows]

    lat = latency_stats(ok_rows, "latency_s")
    dec = latency_stats(ok_rows, "decode_s")
    rtf = rtf_stats(ok_rows)
    wall = total_wall_time(ok_rows)

    rep_summary = None
    if rep_path.exists():
        rep_rows = load_csv(rep_path)
        rep_rows = [r for r in rep_rows if r.get("is_warmup", "").lower() != "true"]
        by_uid = defaultdict(list)
        for r in rep_rows:
            by_uid[r["utterance_id"]].append(r)
        file_rep_results = {}
        for uid, reps in by_uid.items():
            hashes = [r.get("hyp_sha256", "") for r in reps]
            wers = [coerce_float(r.get("wer_primary")) for r in reps
                    if coerce_float(r.get("wer_primary")) is not None]
            temps = [coerce_float(r.get("max_segment_temperature")) or 0.0 for r in reps]
            durs = [coerce_float(r.get("audio_duration_s")) for r in reps
                    if coerce_float(r.get("audio_duration_s")) is not None]
            file_rep_results[uid] = {
                "n_reps": len(reps),
                "n_distinct_sha256": len(set(hashes)),
                "fully_identical": len(set(hashes)) == 1,
                "wer_min": min(wers) if wers else None,
                "wer_max": max(wers) if wers else None,
                "wer_range": (max(wers) - min(wers)) if wers and len(wers) > 1 else 0.0,
                "max_temperature": max(temps),
                "duration_s": durs[0] if durs else None,
                "speaker_id": reps[0].get("speaker_id", ""),
            }
        n_total = len(file_rep_results)
        n_identical = sum(1 for v in file_rep_results.values() if v["fully_identical"])
        differing = {uid: v for uid, v in file_rep_results.items() if not v["fully_identical"]}
        rep_summary = {
            "n_files": n_total,
            "n_identical": n_identical,
            "pct_identical": 100.0 * n_identical / n_total if n_total > 0 else None,
            "differing_files": differing,
            "file_rep_details": file_rep_results,
        }

    return {
        "label": label,
        "run_id": run_dir.name,
        "run_dir": str(run_dir),
        "config": cfg,
        "n_total": len(main_rows),
        "n_ok": len(ok_rows),
        "n_error": len(error_rows),
        "n_empty_hyp": len(empty_hyp_rows),
        "error_files": [{"utterance_id": r.get("utterance_id"),
                         "error": r.get("error", "")} for r in error_rows],
        "empty_hyp_files": [r.get("utterance_id") for r in empty_hyp_rows],
        "wer_primary": {
            "corpus_wer": wer_p,
            "mean_per_file_wer": mean_file_wer_p,
            "S": S_p, "D": D_p, "I": I_p, "N": N_p, "hits": hits_p,
            "bootstrap_95ci_lo": ci_lo_p,
            "bootstrap_95ci_hi": ci_hi_p,
            "bootstrap_note": "File-level bootstrap, seed=42, n_resamples=10000",
        },
        "wer_simple": {
            "corpus_wer": wer_s,
            "mean_per_file_wer": mean_file_wer_s,
            "S": S_s, "D": D_s, "I": I_s, "N": N_s, "hits": hits_s,
        },
        "speaker_wer": spk_wer,
        "worst_5_speakers": worst_speakers,
        "worst_5_files": worst_files,
        "fallback_count": len(fallback_ids),
        "fallback_file_ids": fallback_ids,
        "latency": lat,
        "decode": dec,
        "rtf": rtf,
        "total_wall_s": wall,
        "repeatability": rep_summary,
    }


# ── Cross-run consistency (B vs C) ───────────────────────────────────────────

def cross_run_consistency(rb, rc, pred_b, pred_c):
    b_map = {r["utterance_id"]: r for r in pred_b
             if r.get("is_warmup", "").lower() != "true"}
    c_map = {r["utterance_id"]: r for r in pred_c
             if r.get("is_warmup", "").lower() != "true"}

    common_uids = sorted(set(b_map) & set(c_map))
    identical = 0
    differing = []
    for uid in common_uids:
        rb_r = b_map[uid]
        rc_r = c_map[uid]
        if rb_r.get("hyp_sha256") == rc_r.get("hyp_sha256"):
            identical += 1
        else:
            wb = coerce_float(rb_r.get("wer_primary"))
            wc = coerce_float(rc_r.get("wer_primary"))
            diff = abs(wb - wc) if (wb is not None and wc is not None) else None
            differing.append({
                "utterance_id": uid,
                "hyp_b": rb_r.get("hyp_raw", ""),
                "hyp_c": rc_r.get("hyp_raw", ""),
                "wer_b": wb,
                "wer_c": wc,
                "wer_abs_diff": diff,
            })

    pct_identical = 100.0 * identical / len(common_uids) if common_uids else None
    corpus_wer_b, *_ = corpus_wer(
        list(b_map.values()), "S_primary", "D_primary", "I_primary", "N_primary")
    corpus_wer_c, *_ = corpus_wer(
        list(c_map.values()), "S_primary", "D_primary", "I_primary", "N_primary")
    corpus_wer_diff = (abs(corpus_wer_b - corpus_wer_c)
                       if (corpus_wer_b is not None and corpus_wer_c is not None) else None)

    return {
        "n_compared": len(common_uids),
        "n_identical": identical,
        "pct_identical": pct_identical,
        "n_differing": len(differing),
        "differing_files": differing,
        "corpus_wer_b": corpus_wer_b,
        "corpus_wer_c": corpus_wer_c,
        "corpus_wer_abs_diff": corpus_wer_diff,
    }


# ── Markdown report ───────────────────────────────────────────────────────────

def fmt(v, decimals=6):
    if v is None:
        return "N/A"
    return f"{v:.{decimals}f}"


def fmt4(v):
    return fmt(v, 4)


def pct_str(v):
    if v is None:
        return "N/A"
    return f"{v:.2f}%"


def make_report(runs, cross, git_sha, args,
                manifest_seed=42,
                latency_contaminated=None,
                appendix=None):
    if latency_contaminated is None:
        latency_contaminated = set()
    if appendix is None:
        appendix = {}

    ra = runs.get("A")
    rb = runs.get("B")
    rc = runs.get("C")

    cfg_b = rb["config"] if rb else {}

    lines = []

    def h(level, title):
        lines.append("\n" + "#" * level + " " + title + "\n")

    def trow(*cells):
        lines.append("| " + " | ".join(str(c) for c in cells) + " |")

    def tsep(*widths):
        lines.append("| " + " | ".join("-" * w for w in widths) + " |")

    def cfg_val(d, *keys):
        v = d
        for k in keys:
            if isinstance(v, dict):
                v = v.get(k)
            else:
                return "UNVERIFIED"
        return v if v is not None else "UNVERIFIED"

    # ── (1) Setup ─────────────────────────────────────────────────────────────
    h(2, "1. Setup")

    lines.append("| Field | Value |")
    lines.append("| --- | --- |")
    lines.append(f"| Git HEAD | `{git_sha}` |")
    lines.append(f"| Model | `{cfg_val(cfg_b, 'model_name')}` |")
    lines.append(f"| Device | `{cfg_val(cfg_b, 'device')}` |")
    lines.append(f"| Precision | `{cfg_val(cfg_b, 'dtype_note')}` |")
    lines.append(f"| Torch threads | `{cfg_val(cfg_b, 'torch_num_threads')}` |")
    lines.append(f"| Whisper version | `{cfg_val(cfg_b, 'versions', 'openai-whisper')}` |")
    lines.append(f"| Transcribe call | `{cfg_val(cfg_b, 'transcribe_call_literal')}` |")
    norm_names = cfg_b.get("normalizer_names", [])
    lines.append(f"| Primary normalizer | `{norm_names[0] if norm_names else 'UNVERIFIED'}` |")
    lines.append(f"| Simple normalizer | `{norm_names[1] if len(norm_names) > 1 else 'UNVERIFIED'}` |")
    lines.append(f"| Torch seed note | `{cfg_val(cfg_b, 'torch_seed_note')}` |")
    lines.append(f"| Platform | `{cfg_val(cfg_b, 'platform')}` |")
    pmach = cfg_val(cfg_b, "platform_machine")
    pmach_label = f"{pmach} (Apple Silicon)" if pmach == "arm64" else pmach
    lines.append(f"| Platform machine | `{pmach_label}` |")
    lines.append(f"| RAM bytes | `{cfg_val(cfg_b, 'ram_bytes')}` |")

    if rb:
        manifest_path = cfg_val(cfg_b, "manifest_path")
        try:
            msha = manifest_sha256(Path(manifest_path))
        except Exception:
            msha = "UNVERIFIED"
        lines.append(f"| Manifest (B/C) | `{manifest_path}` |")
        lines.append(f"| Manifest SHA-256 | `{msha}` |")
        lines.append(f"| Manifest seed | `{manifest_seed} (passed via --manifest-seed; used in make_manifest.py --seed, not in run_eval.py)` |")
        
        warmup_uid = cfg_val(cfg_b, "warmup_utterance_id")
        try:
            manifest_rows = load_csv(Path(cfg_val(cfg_b, "manifest_path")))
            warmup_positions = [i+1 for i, r in enumerate(manifest_rows)
                                if r.get("utterance_id") == warmup_uid]
            warmup_pos_str = str(warmup_positions[0]) if warmup_positions else "not found in manifest"
        except Exception:
            warmup_pos_str = "UNVERIFIED (manifest path not accessible)"
        lines.append(f"| Warm-up utterance | `{warmup_uid}` (manifest row {warmup_pos_str}) |")

        lines.append(f"| Run A run_id | `{ra['run_id'] if ra else 'N/A'}` |")
        lines.append(f"| Run B run_id | `{rb['run_id']}` |")
        lines.append(f"| Run C run_id | `{rc['run_id'] if rc else 'N/A'}` |")

    lines.append("")
    lines.append("Warm-up: one file transcribed before the main pass (excluded from all statistics). "
                 "The first main-pass file runs immediately after the warm-up.")

    # ── (2) Results tables ────────────────────────────────────────────────────
    h(2, "2. Results")

    for label, run in [("A", ra), ("B", rb), ("C", rc)]:
        if run is None:
            continue
        h(3, f"Run {label} — {run['run_id']}")
        lines.append(f"N = {run['n_ok']} files ok / {run['n_error']} error / "
                     f"{run['n_empty_hyp']} empty-hypothesis\n")

        wp = run["wer_primary"]
        ws = run["wer_simple"]
        lines.append("**WER**\n")
        trow("Metric", "Corpus WER", "95% CI (bootstrap, file-level)", "Mean per-file WER", "S", "D", "I", "N", "Hits")
        tsep(20, 12, 32, 20, 6, 6, 6, 8, 8)
        ci_str = (f"[{fmt4(wp['bootstrap_95ci_lo'])}, {fmt4(wp['bootstrap_95ci_hi'])}]"
                  if wp.get("bootstrap_95ci_lo") is not None else "N/A")
        trow("Primary (Whisper norm)",
             fmt4(wp["corpus_wer"]),
             ci_str,
             fmt4(wp["mean_per_file_wer"]),
             wp["S"], wp["D"], wp["I"], wp["N"], wp["hits"])
        trow("Simple (lower+strip)",
             fmt4(ws["corpus_wer"]),
             "—",
             fmt4(ws["mean_per_file_wer"]),
             ws["S"], ws["D"], ws["I"], ws["N"], ws["hits"])
        lines.append("")

        lines.append("**5 worst files (primary WER)**\n")
        trow("utterance_id", "WER", "reference", "hypothesis")
        tsep(22, 8, 55, 55)
        for f in run["worst_5_files"]:
            trow(f["utterance_id"], fmt4(f["wer"]),
                 f["ref"][:50] + ("..." if len(f["ref"]) > 50 else ""),
                 f["hyp"][:50] + ("..." if len(f["hyp"]) > 50 else ""))
        lines.append("")

        lines.append("**5 worst speakers (primary WER)**\n")
        trow("speaker_id", "WER", "N words")
        tsep(12, 8, 8)
        for sid, wer in run["worst_5_speakers"]:
            spk = run["speaker_wer"].get(sid, {})
            trow(sid, fmt4(wer), spk.get("N", "?"))
        lines.append("")

        lines.append(f"**Temperature fallback:** {run['fallback_count']} file(s) triggered fallback "
                     f"(max_segment_temperature > 0).")
        if run["fallback_file_ids"]:
            lines.append(f"IDs: {', '.join(run['fallback_file_ids'])}")
        lines.append("")

    # ── (3) Cross-process consistency (B vs C) ────────────────────────────────
    h(2, "3. Cross-Process Consistency (Run B vs Run C)")
    if cross:
        lines.append(f"Files compared: {cross['n_compared']}")
        lines.append(f"Identical (hyp_sha256 match): {cross['n_identical']} / {cross['n_compared']} "
                     f"({pct_str(cross['pct_identical'])})")
        lines.append(f"Differing: {cross['n_differing']}")
        lines.append(f"Corpus WER B: {fmt(cross['corpus_wer_b'])}")
        lines.append(f"Corpus WER C: {fmt(cross['corpus_wer_c'])}")
        lines.append(f"Corpus WER absolute difference: {fmt(cross['corpus_wer_abs_diff'])}")
        if cross["differing_files"]:
            lines.append("\n**Differing files:**\n")
            trow("utterance_id", "hyp_b", "hyp_c", "wer_b", "wer_c", "wer_diff")
            tsep(22, 40, 40, 8, 8, 8)
            for df in cross["differing_files"]:
                trow(df["utterance_id"],
                     df["hyp_b"][:35] + ("..." if len(df["hyp_b"]) > 35 else ""),
                     df["hyp_c"][:35] + ("..." if len(df["hyp_c"]) > 35 else ""),
                     fmt4(df["wer_b"]), fmt4(df["wer_c"]),
                     fmt4(df["wer_abs_diff"]) if df["wer_abs_diff"] is not None else "N/A")
    else:
        lines.append("Run C not provided; cross-process comparison skipped.")
    lines.append("")

    # ── (4) Latency ──────────────────────────────────────────────────────────
    h(2, "4. Latency")
    lines.append("CPU/fp32, warm-up excluded. First main-pass file runs after one warm-up.\n")

    for label, run in [("A", ra), ("B", rb), ("C", rc)]:
        if run is None:
            continue
        lat = run["latency"]
        dec = run["decode"]
        rtf = run["rtf"]
        contamination_note = ""
        if label in latency_contaminated:
            contamination_note = " ⚠️ **latency contaminated** — other I/O ran concurrently; prefer Run C"
        lines.append(f"**Run {label}** (N={lat.get('n', '?')} files){contamination_note}\n")
        trow("Stat", "latency_s (full)", "decode_s (load_audio)", "RTF")
        tsep(10, 18, 22, 10)
        for stat in ["mean", "median", "p90", "p95", "max"]:
            trow(stat,
                 fmt4(lat.get(stat)),
                 fmt4(dec.get(stat)) if stat not in ("p90", "p95") else "—",
                 fmt4(rtf.get(stat)) if stat in ("mean", "median") else "—")
        lines.append(
            f"\nSum of inference latency (excludes audio decode and loop overhead): "
            f"{fmt4(run['total_wall_s'])} s"
        )
        lines.append("Note: no loop wall time is recorded in config.json; "
                     "true elapsed includes loop overhead and is larger.\n")

    # ── (5) Within-process repeatability ──────────────────────────────────────
    h(2, "5. Within-Process Repeatability")
    for label, run in [("B", rb), ("C", rc)]:
        if run is None:
            continue
        rep = run.get("repeatability")
        if rep is None:
            lines.append(f"**Run {label}**: no repeatability.csv found.")
            continue
        rep_cfg = run["config"].get("repeatability", {})
        reps_val = rep_cfg.get("reps", "?")
        req_k   = rep_cfg.get("requested_k", rep_cfg.get("repeat_subset_k", "?"))
        act_k   = rep_cfg.get("actual_k", rep["n_files"])
        n_quant = rep_cfg.get("n_quantile_selected", "?")
        n_fall  = rep_cfg.get("n_fallback_selected", "?")
        n_drop  = rep_cfg.get("n_quantile_dropped", 0)
        n_fb_drop = rep_cfg.get("n_fallback_dropped", 0)
        sel_ids = rep_cfg.get("selected_ids", [])
        fb_ids  = rep_cfg.get("fallback_file_ids", [])

        lines.append(f"**Run {label}** — requested K={req_k}, actual K={act_k}, R={reps_val} reps\n")
        drop_note = []
        if n_drop:
            drop_note.append(f"{n_drop} quantile file(s) dropped to meet cap")
        if n_fb_drop:
            drop_note.append(f"{n_fb_drop} fallback file(s) dropped to meet cap")
        drop_str = f"; {', '.join(drop_note)}." if drop_note else "."

        lines.append(
            f"Selection rule (from config.json): {req_k} evenly-spaced positions in duration-sorted "
            f"ok results + every file with max_segment_temperature > 0 (fallbacks: {len(fb_ids)}); "
            f"cap = K+5 = {req_k if isinstance(req_k, int) else '?'}+5. "
            f"Fallback files are protected from truncation (placed first). "
            f"Result: {n_quant} quantile file(s) + {n_fall} fallback file(s) = {act_k} total{drop_str}"
        )
        lines.append("")
        
        # Subset file table — from file_rep_details (computed from repeatability.csv)
        lines.append("Subset files (utterance_id, duration, max_segment_temperature across all reps):\n")
        lines.append("| utterance_id | duration_s | max_temp (all reps) | is_fallback |")
        lines.append("| --- | --- | --- | --- |")
        detail = rep.get("file_rep_details", {})
        fb_set = set(fb_ids)
        for uid in (sel_ids if sel_ids else sorted(detail.keys())):
            v = detail.get(uid, {})
            lines.append(
                f"| {uid} | {fmt4(v.get('duration_s'))} "
                f"| {fmt4(v.get('max_temperature'))} "
                f"| {'yes' if uid in fb_set else 'no'} |"
            )
        lines.append("")
        lines.append(f"Files fully identical across all reps: "
                     f"{rep['n_identical']}/{rep['n_files']} "
                     f"({pct_str(rep['pct_identical'])})")
        if rep["differing_files"]:
            lines.append("\nFiles with differing outputs:\n")
            trow("utterance_id", "n_distinct_sha256", "wer_range", "max_temperature")
            tsep(22, 18, 10, 16)
            for uid, v in rep["differing_files"].items():
                trow(uid, v["n_distinct_sha256"], fmt4(v["wer_range"]), fmt4(v["max_temperature"]))
        else:
            lines.append("All files produced identical outputs across all reps.")
        lines.append("")

    # ── (6) Temperature fallback summary ─────────────────────────────────────
    h(2, "6. Temperature Fallback Summary")
    for label, run in [("A", ra), ("B", rb), ("C", rc)]:
        if run is None:
            continue
        n_fb = run["fallback_count"]
        ids = run["fallback_file_ids"]
        lines.append(f"Run {label}: {n_fb} file(s) with max_segment_temperature > 0. "
                     + (f"IDs: {', '.join(ids)}" if ids else "None."))
    lines.append("")

    # ── (7) Normalization sensitivity ─────────────────────────────────────────
    h(2, "7. Normalization Sensitivity")
    for label, run in [("A", ra), ("B", rb), ("C", rc)]:
        if run is None:
            continue
        wp = run["wer_primary"]["corpus_wer"]
        ws = run["wer_simple"]["corpus_wer"]
        diff = abs(wp - ws) if (wp is not None and ws is not None) else None
        lines.append(f"Run {label}: primary={fmt(wp)}, simple={fmt(ws)}, delta={fmt(diff)}")
    lines.append("")
    
    h(3, "Why N differs between normalizers")
    _ref_run = rb or ra
    if _ref_run:
        _ok = [r for r in load_csv(Path(_ref_run["run_dir"]) / "predictions.csv")
               if r.get("is_warmup", "").lower() != "true" and r.get("status") == "ok"]
        _differ = [(r["utterance_id"], r["N_primary"], r["N_simple"],
                    r["ref_norm_primary"], r["ref_norm_simple"])
                   for r in _ok
                   if r.get("N_primary") and r.get("N_simple") and r["N_primary"] != r["N_simple"]]
        lines.append(
            f"{len(_differ)} of {len(_ok)} files in Run {_ref_run['label']} have different N between "
            f"normalizers. Cause: `EnglishTextNormalizer` expands contractions into separate tokens "
            f"(e.g. \"don't\" → \"do not\"), increasing N_primary relative to N_simple. "
            f"It also expands possessive 's into \"is\" (e.g. \"child's\" → \"child is\", as in utterance `1221-135766-0005`), "
            f"which affects reference and hypothesis alike. First three examples:\n"
        )
        lines.append("| utterance_id | N_primary | N_simple | ref_primary excerpt | ref_simple excerpt |")
        lines.append("| --- | --- | --- | --- | --- |")
        for uid, np, ns, rp, rs in _differ[:3]:
            lines.append(f"| {uid} | {np} | {ns} | {rp[:50]} | {rs[:50]} |")
        lines.append("")

    # ── (8) What these results show ───────────────────────────────────────────
    h(2, "8. What These Results Show")
    if rb:
        wp_b = rb["wer_primary"]["corpus_wer"]
        ci_lo = rb["wer_primary"]["bootstrap_95ci_lo"]
        ci_hi = rb["wer_primary"]["bootstrap_95ci_hi"]
        lines.append(
            f"On {rb['n_ok']} utterances from LibriSpeech test-clean (40 speakers x 3 files), "
            f"the Whisper base model achieved a corpus WER of {fmt4(wp_b)} "
            f"(95% CI [{fmt4(ci_lo)}, {fmt4(ci_hi)}]) using the primary normalizer. "
        )
        if cross:
            n_diff = cross["n_differing"]
            lines.append(
                f"Cross-process comparison found {cross['n_identical']}/{cross['n_compared']} "
                f"files with identical output (sha256 match). "
                f"{n_diff} file(s) differed; corpus WER absolute difference = "
                f"{fmt(cross['corpus_wer_abs_diff'])}."
            )
        lines.append(
            f"Temperature fallback occurred in {rb['fallback_count']} file(s) in Run B."
        )
    lines.append("")

    # ── (9) What they do NOT show ─────────────────────────────────────────────
    h(2, "9. What These Results Do NOT Show")
    lines.append(textwrap.dedent("""\
    - **No evidence about real-world or Cadence-user speech.** LibriSpeech test-clean is
      clean, studio-recorded read English. Results do not apply to Indian English, accents,
      mother-tongue influence (MTI), stuttering, spontaneous speech, background noise,
      phone/microphone quality, or any other acoustic condition not represented here.
    - **ASR component only.** WER measures transcription accuracy, not scoring accuracy,
      pitch detection, or any other Cadence system component.
    - **Repeatability here is not robustness.** These results show unseeded torch, fixed configuration;
      determinism here comes from greedy decoding at temperature 0 (no fallback triggered).
      They do not measure robustness to configuration changes, hardware variation, or concurrent load.
    - **WER excludes semantic errors.** A transcription may be semantically incorrect while
      having low WER (e.g., wrong homophone).
    - **Small sample.** 120 files / 3 per speaker is a small sample; speaker-level WER
      (3 files each) is shown for completeness but is low-N and should not be over-interpreted.
    - **Corpus is single-chapter (Run A).** Run A uses 30 utterances from speaker 1089 only.
    """))

    # ── (10) Deviations and Limitations ───────────────────────────────────────
    h(2, "10. Deviations and Limitations")
    _wuid = cfg_val(cfg_b, "warmup_utterance_id")
    try:
        _mrows = load_csv(Path(cfg_val(cfg_b, "manifest_path")))
        _wpos  = next((i+1 for i, r in enumerate(_mrows) if r.get("utterance_id") == _wuid), None)
        _wpos_str = str(_wpos) if _wpos else "not found"
    except Exception:
        _wpos_str = "UNVERIFIED"

    fb_runs = [(lbl, r['fallback_count'], r['fallback_file_ids']) 
               for lbl, r in [('A', ra), ('B', rb), ('C', rc)] if r and r.get('fallback_count', 0) > 0]
    if fb_runs:
        fb_desc = "; ".join(f"Run {lbl}: {cnt} file(s) ({', '.join(ids)})" for lbl, cnt, ids in fb_runs)
        fallback_bullet = f"- **Temperature fallback triggered.** {fb_desc}."
    else:
        fallback_bullet = "- **Temperature fallback never triggered.** All files decoded at temperature 0.0 in all runs. The non-determinism path was not exercised."

    dev_lines = [
        f"- **Warm-up file is a manifest row.** The warm-up utterance (`{_wuid}`, manifest row {_wpos_str}) is "
        f"drawn from the evaluation manifest and excluded from all WER and latency statistics, but it "
        f"occupies a manifest slot and is transcribed before timing begins."
    ]
    if latency_contaminated:
        dev_lines.append(
            f"- **Latency contaminated in {', '.join(sorted(latency_contaminated))}.** "
            f"Other disk/CPU I/O ran concurrently with execution. "
            f"Use unaffected runs as the cleaner latency measurement."
        )
    dev_lines.append(
        f"- **Single machine, Apple Silicon (arm64), CPU/fp32, {cfg_val(cfg_b, 'torch_num_threads')} torch threads.** "
        f"Results are not representative of GPU or server deployment."
    )
    dev_lines.append(fallback_bullet)
    lines.append("\n".join(dev_lines) + "\n")

    # ── (11) Reproduction Commands ────────────────────────────────────────────
    h(2, "11. Reproduction Commands")
    lines.append("```bash")
    if ra:
        lines.append("# Run A")
        lines.append("backend/venv/bin/python experiments/audio-evaluation/run_eval.py \\")
        lines.append("  --manifest experiments/audio-evaluation/results/test_manifest.csv")
    if rb:
        rep_cfg_b = rb["config"].get("repeatability", {})
        reps = rep_cfg_b.get("reps", 5)
        rsk = rep_cfg_b.get("requested_k", rep_cfg_b.get("repeat_subset_k", 10))
        lines.append("# Run B / Run C (identical command, run twice)")
        lines.append("backend/venv/bin/python experiments/audio-evaluation/run_eval.py \\")
        lines.append("  --manifest experiments/audio-evaluation/results/manifest_stratified_s42_n3.csv \\")
        lines.append(f"  --reps {reps} --repeat-subset {rsk}")
    lines.append("# Summarize")
    lines.append("backend/venv/bin/python experiments/audio-evaluation/summarize.py \\")
    lines.append("  --run-a <run_a_dir> --run-b <run_b_dir> --run-c <run_c_dir> \\")
    lines.append("  --manifest-seed 42")
    lines.append("```")
    lines.append("")
    lines.append("**Raw data CSVs:**")
    for label, run in [("A", ra), ("B", rb), ("C", rc)]:
        if run is None:
            continue
        rdir = run["run_dir"]
        lines.append(f"- Run {label} predictions: `{rdir}/predictions.csv`")
        if (Path(rdir) / "repeatability.csv").exists():
            lines.append(f"- Run {label} repeatability: `{rdir}/repeatability.csv`")
    lines.append("")

    # ── (Appendix) Earlier Runs ───────────────────────────────────────────────
    if appendix:
        h(2, "Appendix — Earlier Runs")
        lines.append("These runs used the buggy repeat-subset (K hardcoded to 5 quantile points) "
                     "and are kept for traceability only. Do not use for repeatability conclusions.\n")
        for lbl, arun in sorted(appendix.items()):
            h(3, f"Appendix Run {lbl} — {arun['run_id']}")
            wp = arun["wer_primary"]
            ci_str = (f"[{fmt4(wp['bootstrap_95ci_lo'])}, {fmt4(wp['bootstrap_95ci_hi'])}]"
                      if wp.get("bootstrap_95ci_lo") is not None else "N/A")
            lines.append(f"N={arun['n_ok']} ok / {arun['n_error']} error. "
                         f"Corpus WER (primary) = {fmt(wp['corpus_wer'])} "
                         f"95% CI {ci_str}.")
            lines.append(f"Run dir: `{arun['run_dir']}`")
            lines.append("")

    return "\n".join(lines)


# ── Main ─────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description="Summarise ASR evaluation runs")
    parser.add_argument("--run-a", required=True, help="Primary Run A directory (pilot, 30 files)")
    parser.add_argument("--run-b", required=True, help="Primary Run B directory (full, 120 files)")
    parser.add_argument("--run-c", required=False, default=None,
                        help="Primary Run C directory (full, 120 files, cross-process pair of B)")
    parser.add_argument("--appendix-run", action="append", default=[], metavar="LABEL=DIR",
                        help="Repeatable. Append old runs to report as appendix. "
                             "Format: LABEL=path/to/run/dir (e.g. --appendix-run B_old=results/runs/20261024T075603Z)")
    parser.add_argument("--manifest-seed", type=int, default=42,
                        help="Seed used when make_manifest.py was called (default: 42). "
                             "Recorded in the setup table; not used for computation.")
    parser.add_argument("--latency-contaminated", action="append", default=[],
                        metavar="LABEL",
                        help="Mark a run label as having contaminated latency (other I/O ran concurrently). "
                             "Adds a note to the latency table for that run. E.g. --latency-contaminated B")
    args = parser.parse_args()

    run_a_dir = Path(args.run_a).resolve()
    run_b_dir = Path(args.run_b).resolve()
    run_c_dir = Path(args.run_c).resolve() if args.run_c else None

    # Parse --appendix-run LABEL=path entries
    appendix_runs = {}
    for entry in args.appendix_run:
        if "=" not in entry:
            parser.error(f"--appendix-run must be LABEL=path, got: {entry!r}")
        lbl, path_str = entry.split("=", 1)
        appendix_runs[lbl] = Path(path_str).resolve()

    print(f"Processing Run A: {run_a_dir}")
    ra = process_run(run_a_dir, "A")

    print(f"Processing Run B: {run_b_dir}")
    rb = process_run(run_b_dir, "B")

    rc = None
    if run_c_dir:
        print(f"Processing Run C: {run_c_dir}")
        rc = process_run(run_c_dir, "C")

    appendix_data = {}
    for lbl, adir in appendix_runs.items():
        print(f"Processing appendix run {lbl}: {adir}")
        appendix_data[lbl] = process_run(adir, lbl)

    cross = None
    if rc is not None:
        pred_b = load_csv(run_b_dir / "predictions.csv")
        pred_c = load_csv(run_c_dir / "predictions.csv")
        cross = cross_run_consistency(rb, rc, pred_b, pred_c)

    git_sha = git_head()

    summary = {
        "git_head": git_sha,
        "runs": {"A": ra, "B": rb, "C": rc},
        "cross_process_consistency_B_vs_C": cross,
        "appendix_runs": appendix_data,
    }

    SUMMARY_DIR.mkdir(parents=True, exist_ok=True)
    summary_path = SUMMARY_DIR / "summary.json"
    report_path = SUMMARY_DIR / "REPORT.md"

    with open(summary_path, "w", encoding="utf-8") as f:
        json.dump(summary, f, indent=2, default=str)
    print(f"summary.json written: {summary_path}")

    report_md = make_report(
        {"A": ra, "B": rb, "C": rc}, cross, git_sha, args,
        manifest_seed=args.manifest_seed,
        latency_contaminated=set(args.latency_contaminated),
        appendix=appendix_data,
    )
    report_path.write_text(report_md, encoding="utf-8")
    print(f"REPORT.md written: {report_path}")

    print("\n=== HEADLINE ===")
    for label, run in [("A", ra), ("B", rb), ("C", rc)]:
        if run is None:
            continue
        wp = run["wer_primary"]
        print(f"Run {label} ({run['n_ok']} files)  corpus_WER_primary={fmt(wp['corpus_wer'])}  "
              f"CI=[{fmt4(wp['bootstrap_95ci_lo'])}, {fmt4(wp['bootstrap_95ci_hi'])}]  "
              f"fallback={run['fallback_count']}")
    if cross:
        print(f"B vs C: {cross['pct_identical']:.1f}% identical, "
              f"corpus_WER_diff={fmt(cross['corpus_wer_abs_diff'])}")


if __name__ == "__main__":
    main()

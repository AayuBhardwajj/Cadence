"""Deterministic MTI region classifier for Cadence ml-analysis service.

Implements Phase 2 of MTI region-attribution feature (D22).
Pure deterministic classification without LLM calls or network requests.
"""

from __future__ import annotations

import json
import logging
import re
from typing import Any

logger = logging.getLogger(__name__)

# Cluster-level human-readable labels per D22 (never single state names)
REGION_DISPLAY_NAMES: dict[str, str] = {
    "hindi_belt": "Hindi-belt (Bhojpuri/Rajasthani/Haryanvi cluster) influence patterns detected",
    "bengali_odia_belt": "Bengali/Odia/Assamese cluster influence patterns detected",
    "dravidian_belt": "Dravidian (Tamil/Telugu/Kannada/Malayalam cluster) influence patterns detected",
    "punjabi": "North-Western (Punjabi/Haryanvi cluster) influence patterns detected",
    "generic_indian_english": "Pan-Indian English influence patterns detected",
}

NEUTRAL_RESULT: dict[str, Any] = {
    "detected_accent": "Neutral / No strong L1 influence detected",
    "patterns": [],
    "region_candidates": [],
    "insufficient_signal": True,
}


def _normalize_word(text: Any) -> str:
    """Strip punctuation and whitespace, lowercase for case-insensitive matching."""
    if not text:
        return ""
    w = str(text).replace("’", "'")
    w = re.sub(r"[^\w']", "", w)
    return w.strip().lower()


def _format_region_display(region: str) -> str:
    """Format human-readable cluster label for a region key."""
    if region in REGION_DISPLAY_NAMES:
        return REGION_DISPLAY_NAMES[region]
    clean_name = region.replace("_", " ").title()
    return f"{clean_name} cluster influence patterns detected"


def classify_mti_region(
    error_log_entries: list[dict] | None,
    target_words: list[dict] | None,
    bucket_l1_mapping: dict[str, dict] | list[dict] | None,
) -> dict[str, Any]:
    """Pure deterministic classification of MTI regional influence.

    No LLM calls. No network calls.

    error_log_entries: amcat_error_log-shaped list (word/said_as/category/error_type)
    target_words: this session's generated_passages.target_words
                  JSONB array of {word_code, word, issue_type, bucket, ...}
    bucket_l1_mapping: {bucket: {"region_weights": {...}, "reviewed_by_slp": bool}}
                       (or list of rows from Supabase bucket_l1_mapping table)

    Matching: for each error_log entry with error_type in ('substitution','deletion'),
    case-insensitive-match its `word` field against target_words[].word.
    Only count a match where target_words[].issue_type == 'mti'.
    Do NOT fall back to fuzzy/generic word_bank text lookup for unmatched words.

    Minimum evidence: require matches across >= 2 DISTINCT buckets before returning
    a positive detection. Below that: returns NEUTRAL_RESULT with insufficient_signal: True.

    On sufficient evidence: sum each matched bucket's region_weights (weighted by
    how many distinct target words in that bucket were hit), normalize into a 0-1
    confidence per region, sort descending.
    If ANY contributing bucket has reviewed_by_slp=False, includes
    "unreviewed_mapping": True in the output.
    """
    # Guard against None / malformed / non-list inputs
    if isinstance(error_log_entries, str):
        try:
            error_log_entries = json.loads(error_log_entries)
        except Exception:
            error_log_entries = []
    if not isinstance(error_log_entries, list) or not error_log_entries:
        return dict(NEUTRAL_RESULT)

    if isinstance(target_words, str):
        try:
            target_words = json.loads(target_words)
        except Exception:
            target_words = []
    if not isinstance(target_words, list) or not target_words:
        return dict(NEUTRAL_RESULT)

    # Normalize bucket_l1_mapping to {bucket_name: {"region_weights": ..., "reviewed_by_slp": ...}}
    mapping_dict: dict[str, dict] = {}
    if isinstance(bucket_l1_mapping, list):
        for row in bucket_l1_mapping:
            if isinstance(row, dict) and "bucket" in row:
                mapping_dict[row["bucket"]] = row
    elif isinstance(bucket_l1_mapping, dict):
        mapping_dict = bucket_l1_mapping

    if not mapping_dict:
        return dict(NEUTRAL_RESULT)

    # Index target words: map normalized_word -> list of target_word dicts
    # Only count target words explicitly embedded as MTI target words
    mti_target_index: dict[str, list[dict]] = {}
    for tw in target_words:
        if not isinstance(tw, dict):
            continue
        if str(tw.get("issue_type", "")).strip().lower() != "mti":
            continue
        w_norm = _normalize_word(tw.get("word"))
        if not w_norm:
            continue
        mti_target_index.setdefault(w_norm, []).append(tw)

    if not mti_target_index:
        return dict(NEUTRAL_RESULT)

    # Match error_log entries with error_type in ('substitution', 'deletion')
    # Track matched distinct words per bucket: bucket -> set of distinct word strings
    matched_bucket_words: dict[str, set[str]] = {}

    for entry in error_log_entries:
        if not isinstance(entry, dict):
            continue
        err_type = str(entry.get("error_type", "")).strip().lower()
        if err_type not in ("substitution", "deletion"):
            continue
        err_norm = _normalize_word(entry.get("word"))
        if not err_norm or err_norm not in mti_target_index:
            continue

        for tw in mti_target_index[err_norm]:
            bucket = tw.get("bucket")
            if not bucket:
                continue
            # Store the normalized word for distinct target word tracking
            canonical_word = str(tw.get("word", "")).strip().lower() or err_norm
            matched_bucket_words.setdefault(bucket, set()).add(canonical_word)

    # Minimum evidence: require matches across >= 2 DISTINCT buckets
    if len(matched_bucket_words) < 2:
        return dict(NEUTRAL_RESULT)

    # Build patterns array and calculate weighted region scores
    patterns = []
    region_scores: dict[str, float] = {}
    has_unreviewed_bucket = False

    for bucket, words_set in matched_bucket_words.items():
        distinct_words = sorted(list(words_set))
        hit_count = len(distinct_words)
        patterns.append({
            "pattern": bucket,
            "score": hit_count,
            "behaviors": distinct_words,
        })

        mapping_entry = mapping_dict.get(bucket, {})
        reviewed = bool(mapping_entry.get("reviewed_by_slp", False))
        if not reviewed:
            has_unreviewed_bucket = True

        raw_weights = mapping_entry.get("region_weights") or {}
        if isinstance(raw_weights, str):
            try:
                raw_weights = json.loads(raw_weights)
            except Exception:
                raw_weights = {}

        for region, weight in raw_weights.items():
            try:
                w_val = float(weight)
            except (ValueError, TypeError):
                continue
            region_scores[region] = region_scores.get(region, 0.0) + (w_val * hit_count)

    # If no region weights were matched or total score is 0, cannot attribute
    total_score = sum(region_scores.values())
    if total_score <= 0:
        return dict(NEUTRAL_RESULT)

    # Normalize into 0-1 confidence per region and sort descending
    # Ties broken by raw score, then region name
    candidates_raw = []
    for region, score in region_scores.items():
        conf = round(score / total_score, 2)
        candidates_raw.append({
            "region": region,
            "confidence": conf,
            "_raw": score,
        })

    candidates_raw.sort(key=lambda c: (-c["confidence"], -c["_raw"], c["region"]))

    region_candidates = [
        {"region": c["region"], "confidence": c["confidence"]}
        for c in candidates_raw
    ]

    # Patterns sorted descending by score, then bucket name
    patterns.sort(key=lambda p: (-p["score"], p["pattern"]))

    top_region = region_candidates[0]["region"]
    detected_accent = _format_region_display(top_region)

    result: dict[str, Any] = {
        "detected_accent": detected_accent,
        "patterns": patterns,
        "region_candidates": region_candidates,
        "insufficient_signal": False,
    }

    if has_unreviewed_bucket:
        result["unreviewed_mapping"] = True

    return result

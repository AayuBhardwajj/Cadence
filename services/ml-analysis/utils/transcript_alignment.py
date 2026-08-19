"""
Deterministic reference-vs-transcript alignment using jiwer.

Replaces LLM-invented "pronunciation_errors" with real, verifiable
word-level discrepancies between the known reference passage and the
Whisper transcript. See BUGS_AND_ISSUES.md section 6 for the two bugs
this fixes:
  1. LLM fabricates IPA for ASR mis-transcriptions ("measurable" -> "miserable")
  2. LLM misclassifies real word substitutions as pronunciation errors
     ("scrutiny" -> "astringency")
"""

import re
import jiwer


def _normalize_for_alignment(text: str) -> str:
    """
    Strip punctuation and lowercase before alignment so that
    'exhibition' vs 'exhibition,' isn't reported as a substitution.
    Whisper transcripts are already largely punctuation-free; this
    mainly protects against the reference passage's punctuation
    creating false-positive mismatches.
    """
    text = text.replace("’", "'")  # normalize curly apostrophe
    text = re.sub(r"[^\w\s']", " ", text)  # strip punctuation except apostrophes (contractions)
    text = re.sub(r"\s+", " ", text).strip()
    return text


def align_transcript(reference_passage: str, whisper_transcript: str) -> list[dict]:
    """
    Align the known reference passage against the Whisper transcript.

    Returns a list of dicts, one per real discrepancy, in this shape:
    {
        "error_type": "substitution" | "deletion" | "insertion",
        "reference_words": str,   # what the passage says (empty for insertion)
        "said_words": str,        # what the transcript has (empty for deletion)
        "category": "Vocabulary" | "Fluency",
        "severity": "low" | "medium" | "high",
        "high_confidence": bool,
        "hyp_start_idx": int,
        "hyp_end_idx": int,
    }
    """
    ref_norm = _normalize_for_alignment(reference_passage)
    hyp_norm = _normalize_for_alignment(whisper_transcript)

    result = jiwer.process_words(ref_norm, hyp_norm)

    errors = []
    for chunk in result.alignments[0]:
        if chunk.type == "equal":
            continue

        ref_words = result.references[0][chunk.ref_start_idx:chunk.ref_end_idx]
        hyp_words = result.hypotheses[0][chunk.hyp_start_idx:chunk.hyp_end_idx]

        if chunk.type == "substitute":
            is_single_word_swap = len(ref_words) == 1 and len(hyp_words) == 1
            errors.append({
                "error_type": "substitution",
                "reference_words": " ".join(ref_words),
                "said_words": " ".join(hyp_words),
                "category": "Vocabulary",
                "severity": "medium" if is_single_word_swap else "low",
                "high_confidence": is_single_word_swap,
                "hyp_start_idx": chunk.hyp_start_idx,
                "hyp_end_idx": chunk.hyp_end_idx,
            })
        elif chunk.type == "delete":
            is_small_deletion = len(ref_words) <= 5
            errors.append({
                "error_type": "deletion" if is_small_deletion else "large_omission",
                "reference_words": " ".join(ref_words),
                "said_words": "",
                "category": "Vocabulary" if is_small_deletion else "Fluency",
                "severity": "low",
                "high_confidence": is_small_deletion,
                "hyp_start_idx": chunk.hyp_start_idx,
                "hyp_end_idx": chunk.hyp_end_idx,
            })
        elif chunk.type == "insert":
            errors.append({
                "error_type": "insertion",
                "reference_words": "",
                "said_words": " ".join(hyp_words),
                "category": "Fluency",
                "severity": "low",
                "high_confidence": len(hyp_words) <= 2,
                "hyp_start_idx": chunk.hyp_start_idx,
                "hyp_end_idx": chunk.hyp_end_idx,
            })

    return errors

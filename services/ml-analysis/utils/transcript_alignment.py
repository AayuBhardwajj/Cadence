import re
import jiwer


def _normalize_for_alignment(text: str) -> str:
    text = text.replace("’", "'")
    text = re.sub(r"[^\w\s']", " ", text)
    text = re.sub(r"\s+", " ", text).strip()
    return text


def align_transcript(reference_passage: str, whisper_transcript: str) -> list[dict]:
    ref_norm = _normalize_for_alignment(reference_passage)
    hyp_norm = _normalize_for_alignment(whisper_transcript)

    if not ref_norm or not hyp_norm:
        return []

    try:
        alignment = jiwer.process_words(ref_norm, hyp_norm)
    except Exception:
        return []

    ref_words = ref_norm.split()
    hyp_words = hyp_norm.split()

    discrepancies: list[dict] = []

    for chunk in alignment.alignment:
        for op in chunk:
            op_type = op.type
            if op_type == "equal":
                continue

            ref_sub = " ".join(ref_words[op.ref_start_idx:op.ref_end_idx])
            hyp_sub = " ".join(hyp_words[op.hyp_start_idx:op.hyp_end_idx])

            if op_type == "substitute":
                discrepancies.append({
                    "error_type": "substitution",
                    "reference_words": ref_sub,
                    "said_words": hyp_sub,
                    "category": "Vocabulary",
                    "ref_start_idx": op.ref_start_idx,
                    "ref_end_idx": op.ref_end_idx,
                    "hyp_start_idx": op.hyp_start_idx,
                    "hyp_end_idx": op.hyp_end_idx,
                })
            elif op_type == "delete":
                discrepancies.append({
                    "error_type": "deletion",
                    "reference_words": ref_sub,
                    "said_words": "",
                    "category": "Fluency",
                    "ref_start_idx": op.ref_start_idx,
                    "ref_end_idx": op.ref_end_idx,
                    "hyp_start_idx": op.hyp_start_idx,
                    "hyp_end_idx": op.hyp_end_idx,
                })
            elif op_type == "insert":
                discrepancies.append({
                    "error_type": "insertion",
                    "reference_words": "",
                    "said_words": hyp_sub,
                    "category": "Fluency",
                    "ref_start_idx": op.ref_start_idx,
                    "ref_end_idx": op.ref_end_idx,
                    "hyp_start_idx": op.hyp_start_idx,
                    "hyp_end_idx": op.hyp_end_idx,
                })

    return discrepancies

#!/usr/bin/env python3
"""
Autonomous Word Bank Research (LLM + Web)
Per DECISIONS.md D20 and D21.

Finds coverage deficits across topic_fit × difficulty combinations in word_bank,
uses Gemini with Google Search grounding to discover and research authentic domain terms,
validates and deduplicates candidate words, inserts approved rows into word_bank
with source='llm_research', and logs every proposal (accepted or rejected) into
word_bank_research_log for an inspectable audit trail.
"""

import argparse
import asyncio
import json
import logging
import re
import uuid
from typing import Any

from google.genai import types
from ml_shared.ai_usage_logger import log_llm_usage
from ml_shared.llm_client import call_llm
from ml_shared.supabase_client import supabase

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("word_bank_research")

# Allowed schema values per DATABASE_SCHEMA.md constraints
ALLOWED_BUCKETS = {
    "extra_sound",
    "v_w_mix",
    "looks_different",
    "wrong_stress",
    "th_sound",
    "vowel_shift",
    "retroflex_td",
    "syllabic_schwa",
    "dropped_sounds",
    "ending_markers",
    "initial_consonant",
    "long_word",
    "content_word_stressed",
    "sentence_initial_position",
    "low_frequency_word",
}

ALLOWED_DIFFICULTIES = {"easy", "medium", "hard"}
ALLOWED_ISSUE_TYPES = {"mti", "stutter_trigger"}

ALL_TOPICS = ["tech", "business", "academics", "general", "legal", "education"]
ALL_DIFFICULTIES = ["easy", "medium", "hard"]

DEFAULT_TARGET_PER_COMBO = 10
DEFAULT_MAX_PROPOSALS_PER_COMBO = 5


def _generate_word_code(bucket: str) -> str:
    """Generate collision-free word_code with LR- prefix per D21."""
    bucket_slug = re.sub(r"[^A-Za-z0-9]", "", bucket.upper())[:6] or "GEN"
    suffix = uuid.uuid4().hex[:6].upper()
    return f"LR-{bucket_slug}-{suffix}"


def _clean_json_output(raw: str) -> str:
    """Strip markdown code blocks if present."""
    text = raw.strip()
    if text.startswith("```json"):
        text = text[7:]
    elif text.startswith("```"):
        text = text[3:]
    if text.endswith("```"):
        text = text[:-3]
    return text.strip()


async def run_cycle(
    target_per_combo: int = DEFAULT_TARGET_PER_COMBO,
    max_proposals_per_combo: int = DEFAULT_MAX_PROPOSALS_PER_COMBO,
    dry_run: bool = False,
) -> dict[str, Any]:
    """
    Executes a single word-bank autonomous research cycle.
    """
    batch_id = str(uuid.uuid4())
    logger.info("Starting word bank research cycle batch_id=%s (dry_run=%s)...", batch_id, dry_run)

    # 1. Acquire dedicated distributed advisory lock
    if not dry_run:
        try:
            lock_res = supabase.rpc("try_word_bank_research_lock").execute()
            if not lock_res.data:
                logger.info("Word bank research lock held elsewhere (try_word_bank_research_lock returned false). Skipping cycle.")
                return {"status": "skipped", "reason": "lock_held", "batch_id": batch_id}
            logger.info("Acquired word_bank_research_lock successfully.")
        except Exception as lock_err:
            logger.error("Failed to acquire word_bank_research_lock: %s", lock_err, exc_info=True)
            return {"status": "error", "reason": str(lock_err), "batch_id": batch_id}

    total_inserted = 0
    total_rejected = 0
    proposals_summary: list[dict[str, Any]] = []

    try:
        # 2. Query current word_bank state: coverage counts + word set for dedup
        logger.info("Querying current word_bank active rows for coverage deficit analysis...")
        wb_res = supabase.table("word_bank").select("word, topic_fit, difficulty").eq("active", True).execute()
        existing_rows = wb_res.data or []

        existing_words_lower: set[str] = set()
        combo_counts: dict[tuple[str, str], int] = {}

        for row in existing_rows:
            w = (row.get("word") or "").strip().lower()
            if w:
                existing_words_lower.add(w)
            tf = (row.get("topic_fit") or "").strip().lower()
            diff = (row.get("difficulty") or "").strip().lower()
            if tf and diff:
                combo_counts[(tf, diff)] = combo_counts.get((tf, diff), 0) + 1

        # Find deficit combos
        deficit_combos: list[tuple[str, str, int]] = []
        for topic in ALL_TOPICS:
            for difficulty in ALL_DIFFICULTIES:
                count = combo_counts.get((topic, difficulty), 0)
                if count < target_per_combo:
                    needed = target_per_combo - count
                    deficit_combos.append((topic, difficulty, needed))

        logger.info(
            "Identified %d deficit combos out of %d total (target=%d words per combo).",
            len(deficit_combos),
            len(ALL_TOPICS) * len(ALL_DIFFICULTIES),
            target_per_combo,
        )

        # Grounding tool definition per D21
        grounding_tool = types.Tool(google_search=types.GoogleSearch())

        # 3. Process each deficit combo
        for topic, difficulty, needed in deficit_combos:
            propose_count = min(needed, max_proposals_per_combo)
            logger.info(
                "Researching combo topic_fit='%s', difficulty='%s' (current=%d, target=%d, requesting %d)...",
                topic,
                difficulty,
                combo_counts.get((topic, difficulty), 0),
                target_per_combo,
                propose_count,
            )

            prompt = f"""You are an expert Speech-Language Pathologist (SLP) and English pronunciation linguist.
We need authentic candidate practice terms for speech assessment and pronunciation coaching.

Domain/Topic: "{topic}"
Difficulty Level: "{difficulty}" (easy = high-frequency / familiar syllable structure; medium = moderate syllables / technical terms; hard = multi-syllabic / complex consonant clusters)
Target Quantity: Exactly {propose_count} distinct terms.

Instructions:
1. Use Google Search to research authentic, current terminology and natural usage in the "{topic}" domain.
2. Select words or short compound terms that exhibit clear Indian English pronunciation challenges (MTI patterns like v/w confusion, retroflex stops, th-sound, consonant clusters, or syllable timing) or stutter trigger patterns.
3. For each candidate, provide:
   - word: the target word or short phrase
   - issue_type: "mti" or "stutter_trigger"
   - bucket: exactly one primary phonological category from: {sorted(list(ALLOWED_BUCKETS))}
   - bucket_2: optional secondary category from the same list, or null
   - difficulty: "{difficulty}"
   - topic_fit: "{topic}"
   - why: specific clinical rationale describing mouth mechanics and articulation challenges
   - source_urls: list of web URLs retrieved from search grounding that validate authentic domain usage
   - llm_raw_rationale: 1-2 sentences summarizing why this word was selected from search results

Return ONLY a valid JSON array of {propose_count} objects with these exact keys. No markdown preamble, no commentary."""

            try:
                raw_resp = await call_llm(
                    chain="volume_tier",
                    prompt=prompt,
                    system_message="You are an expert speech therapist and linguist. Return ONLY valid JSON array.",
                    tools=[grounding_tool],
                )
            except Exception as llm_err:
                logger.error("LLM call failed for combo %s/%s: %s", topic, difficulty, llm_err, exc_info=True)
                continue

            # Parse response
            try:
                cleaned_text = _clean_json_output(raw_resp)
                candidates = json.loads(cleaned_text)
                if isinstance(candidates, dict) and "words" in candidates:
                    candidates = candidates["words"]
                if not isinstance(candidates, list):
                    raise ValueError(f"Expected JSON array, got {type(candidates)}")
            except Exception as parse_err:
                logger.error("Failed to parse LLM response for %s/%s: %s. Raw text snippet: %.200s", topic, difficulty, parse_err, raw_resp)
                continue

            # 4. Validate and process each proposed candidate
            for cand in candidates:
                if not isinstance(cand, dict):
                    continue

                raw_word = str(cand.get("word") or "").strip()
                issue_type = str(cand.get("issue_type") or "").strip().lower()
                bucket = str(cand.get("bucket") or "").strip().lower()
                bucket_2 = str(cand.get("bucket_2") or "").strip().lower() if cand.get("bucket_2") else None
                cand_diff = str(cand.get("difficulty") or "").strip().lower()
                cand_topic = str(cand.get("topic_fit") or "").strip().lower()
                why = str(cand.get("why") or "").strip()
                source_urls = cand.get("source_urls") if isinstance(cand.get("source_urls"), list) else []
                rationale = str(cand.get("llm_raw_rationale") or "").strip()

                status = "inserted"
                rejection_reason = None
                word_code = None

                # Validation checks
                if not raw_word:
                    status = "rejected_validation"
                    rejection_reason = "Word is empty"
                elif raw_word.lower() in existing_words_lower:
                    status = "rejected_duplicate"
                    rejection_reason = f"Word '{raw_word}' already exists in word_bank (case-insensitive dedup)"
                elif bucket not in ALLOWED_BUCKETS:
                    status = "rejected_bad_bucket"
                    rejection_reason = f"Bucket '{bucket}' not in ALLOWED_BUCKETS"
                elif bucket_2 and bucket_2 not in ALLOWED_BUCKETS:
                    status = "rejected_bad_bucket"
                    rejection_reason = f"Bucket_2 '{bucket_2}' not in ALLOWED_BUCKETS"
                elif cand_diff not in ALLOWED_DIFFICULTIES:
                    status = "rejected_validation"
                    rejection_reason = f"Difficulty '{cand_diff}' not in ALLOWED_DIFFICULTIES"
                elif issue_type not in ALLOWED_ISSUE_TYPES:
                    status = "rejected_validation"
                    rejection_reason = f"Issue type '{issue_type}' not in ALLOWED_ISSUE_TYPES"
                elif not why:
                    status = "rejected_validation"
                    rejection_reason = "Rationale 'why' is empty"

                if status == "inserted":
                    word_code = _generate_word_code(bucket)
                    word_bank_payload = {
                        "word_code": word_code,
                        "word": raw_word,
                        "issue_type": issue_type,
                        "bucket": bucket,
                        "bucket_2": bucket_2,
                        "why": why,
                        "difficulty": cand_diff,
                        "topic_fit": cand_topic,
                        "source": "llm_research",
                        "verified_by_slp": "not_yet",
                        "active": True,
                    }

                    if not dry_run:
                        try:
                            supabase.table("word_bank").insert(word_bank_payload).execute()
                            existing_words_lower.add(raw_word.lower())
                            total_inserted += 1
                            logger.info("Inserted LLM-researched word: code=%s, word='%s', bucket=%s", word_code, raw_word, bucket)
                        except Exception as ins_err:
                            logger.error("Insert into word_bank failed for '%s': %s", raw_word, ins_err)
                            status = "rejected_validation"
                            rejection_reason = f"DB insert error: {ins_err}"
                            total_rejected += 1
                    else:
                        existing_words_lower.add(raw_word.lower())
                        total_inserted += 1
                        logger.info("[DRY RUN] Would insert: code=%s, word='%s', bucket=%s", word_code, raw_word, bucket)
                else:
                    total_rejected += 1
                    logger.warning("Rejected candidate word='%s': status=%s, reason=%s", raw_word, status, rejection_reason)

                # Write audit log row
                log_payload = {
                    "batch_id": batch_id,
                    "proposed_word": raw_word or "<EMPTY>",
                    "word_code": word_code,
                    "issue_type": issue_type or None,
                    "bucket": bucket or None,
                    "bucket_2": bucket_2,
                    "topic_fit": cand_topic or None,
                    "difficulty": cand_diff or None,
                    "why": why or None,
                    "source_urls": source_urls,
                    "llm_raw_rationale": rationale or None,
                    "status": status,
                    "rejection_reason": rejection_reason,
                }

                if not dry_run:
                    try:
                        supabase.table("word_bank_research_log").insert(log_payload).execute()
                    except Exception as log_err:
                        logger.warning("Failed to write to word_bank_research_log: %s", log_err)

                proposals_summary.append({
                    "word": raw_word,
                    "status": status,
                    "rejection_reason": rejection_reason,
                    "code": word_code,
                })

            # Math: 1.5s delay between LLM calls across combos prevents rapid token accumulation
            # under Groq / Gemini TPM limits, matching the delay rationale in refill_passages().
            await asyncio.sleep(1.5)

    finally:
        if not dry_run:
            try:
                supabase.rpc("unlock_word_bank_research").execute()
                logger.info("Released word_bank_research_lock.")
            except Exception as unlock_err:
                logger.error("Failed to release word_bank_research_lock: %s", unlock_err, exc_info=True)

    result = {
        "batch_id": batch_id,
        "total_inserted": total_inserted,
        "total_rejected": total_rejected,
        "proposals_summary": proposals_summary,
        "dry_run": dry_run,
    }
    logger.info("Word bank research cycle completed: inserted=%d, rejected=%d", total_inserted, total_rejected)
    return result


def main():
    parser = argparse.ArgumentParser(description="Autonomous Word Bank Research Cycle")
    parser.add_argument("--target", type=int, default=DEFAULT_TARGET_PER_COMBO, help="Target words per topic_fit × difficulty combo")
    parser.add_argument("--max-proposals", type=int, default=DEFAULT_MAX_PROPOSALS_PER_COMBO, help="Max words to propose per combo in one cycle")
    parser.add_argument("--dry-run", action="store_true", help="Run without writing to database")
    args = parser.parse_args()

    asyncio.run(run_cycle(
        target_per_combo=args.target,
        max_proposals_per_combo=args.max_proposals,
        dry_run=args.dry_run,
    ))


if __name__ == "__main__":
    main()

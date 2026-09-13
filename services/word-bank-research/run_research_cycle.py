#!/usr/bin/env python3
"""
Autonomous Word Bank Research (Two-Stage Architecture)
Per DECISIONS.md D20, D21, and D22.

Two-stage pipeline:
1. Gemini lightweight generation: discovers candidate terms for deficient
   topic_fit × difficulty combinations in word_bank (no tools/grounding).
2. Deterministic backend validation & case-insensitive deduplication.
3. Groq reasoning-only verification: evaluates clinical plausibility of survivors
   using openai/gpt-oss-20b with max_retries=0 (no search/grounding tools).
4. Persistence & Audit Logging: inserts approved words into word_bank
   (source='llm_research', verified_by_slp='not_yet') and logs all candidates
   into word_bank_research_log (grounded_attempt=False, source_urls=[]).
"""

import argparse
import asyncio
from datetime import datetime, timezone
import json
import logging
import os
import re
import uuid
from typing import Any

from groq import Groq, APIError, RateLimitError
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

# Step 2: In-process daily cycle budget defaults
DEFAULT_MAX_BUCKETS = 3
DEFAULT_MAX_GENERATION_CALLS = 3
DEFAULT_MAX_VERIFICATION_CALLS = 5
DEFAULT_MAX_CANDIDATES_GENERATED = 15
DEFAULT_DAILY_TOKEN_BUDGET = 50000


def _get_verifier_groq_client() -> Groq | None:
    """
    Constructs a dedicated Groq client with max_retries=0.
    Ensures this job's 429 handling governs behavior without triggering
    the Groq SDK's internal exponential backoff sleeps. Does not touch
    or alter the shared Groq client used by the live assessment pipeline.
    """
    api_key = os.environ.get("GROQ_API_KEY")
    if not api_key:
        return None
    return Groq(api_key=api_key, max_retries=0)


def _get_today_token_usage() -> int:
    """
    Queries ai_usage_logs for SUM(input_tokens + output_tokens)
    WHERE purpose = 'word_bank_research' AND created_at >= today's date (UTC) at midnight.
    """
    today_midnight = (
        datetime.now(timezone.utc)
        .replace(hour=0, minute=0, second=0, microsecond=0)
        .isoformat()
    )
    try:
        res = (
            supabase.table("ai_usage_logs")
            .select("input_tokens, output_tokens")
            .eq("purpose", "word_bank_research")
            .gte("created_at", today_midnight)
            .execute()
        )
        total = sum(
            (row.get("input_tokens") or 0) + (row.get("output_tokens") or 0)
            for row in (res.data or [])
        )
        return total
    except Exception as e:
        logger.warning("Failed to query ai_usage_logs for token budget: %s", e)
        return 0


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
    max_buckets: int = DEFAULT_MAX_BUCKETS,
    max_generation_calls: int = DEFAULT_MAX_GENERATION_CALLS,
    max_verification_calls: int = DEFAULT_MAX_VERIFICATION_CALLS,
    max_candidates_generated: int = DEFAULT_MAX_CANDIDATES_GENERATED,
    max_provider_tokens: int = DEFAULT_DAILY_TOKEN_BUDGET,
    dry_run: bool = False,
) -> dict[str, Any]:
    """
    Executes a two-stage word-bank autonomous research cycle per D22:
    1. Coverage deficit analysis & ranking (largest deficit first).
    2. Daily budget gates (combos, calls, candidates, and token budget from ai_usage_logs).
    3. Lightweight Gemini generation (~5 candidates per combo, no tools/search).
    4. Deterministic backend validation & active-row dedup.
    5. Reasoning-only Groq verification (openai/gpt-oss-20b, max_retries=0, no search).
    6. Database persistence (word_bank) and provenance audit logging (word_bank_research_log).
    """
    batch_id = str(uuid.uuid4())
    logger.info("Starting word bank research cycle batch_id=%s (dry_run=%s)...", batch_id, dry_run)

    # 1. Acquire dedicated distributed advisory lock per D21
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
    combos_processed = 0
    generation_calls_count = 0
    verification_calls_count = 0
    candidates_generated_count = 0
    proposals_summary: list[dict[str, Any]] = []

    groq_verifier = _get_verifier_groq_client()

    try:
        # 2. Query current word_bank active rows for coverage deficit analysis & dedup
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

        # Identify deficit combos
        deficit_combos: list[tuple[str, str, int]] = []
        for topic in ALL_TOPICS:
            for difficulty in ALL_DIFFICULTIES:
                count = combo_counts.get((topic, difficulty), 0)
                if count < target_per_combo:
                    needed = target_per_combo - count
                    deficit_combos.append((topic, difficulty, needed))

        # Rank deficient combos by size of deficit, largest first
        deficit_combos.sort(key=lambda x: x[2], reverse=True)

        logger.info(
            "Identified %d deficit combos out of %d total (target=%d). Processing top deficit combos up to budget limits...",
            len(deficit_combos),
            len(ALL_TOPICS) * len(ALL_DIFFICULTIES),
            target_per_combo,
        )

        # 3. Process deficient combos subject to budget gates
        for topic, difficulty, needed in deficit_combos:
            # Check in-process counter budget limits before starting combo
            if combos_processed >= max_buckets:
                logger.info(
                    "Cycle budget reached: max_buckets (%d) processed. Stopping cycle cleanly.",
                    max_buckets,
                )
                break

            if generation_calls_count >= max_generation_calls:
                logger.info(
                    "Cycle budget reached: max_generation_calls (%d) reached. Stopping cycle cleanly.",
                    max_generation_calls,
                )
                break

            if candidates_generated_count >= max_candidates_generated:
                logger.info(
                    "Cycle budget reached: max_candidates_generated (%d) reached. Stopping cycle cleanly.",
                    max_candidates_generated,
                )
                break

            # Check daily token budget from ai_usage_logs
            tokens_used_today = _get_today_token_usage()
            if tokens_used_today >= max_provider_tokens:
                logger.info(
                    "Daily token budget reached: %d/%d tokens used today (UTC). Stopping cycle cleanly.",
                    tokens_used_today,
                    max_provider_tokens,
                )
                break

            propose_count = min(
                needed,
                max_proposals_per_combo,
                max_candidates_generated - candidates_generated_count,
            )
            if propose_count <= 0:
                break

            logger.info(
                "Researching deficit combo topic='%s', difficulty='%s' (current=%d, target=%d, needed=%d, proposing=%d)...",
                topic,
                difficulty,
                combo_counts.get((topic, difficulty), 0),
                target_per_combo,
                needed,
                propose_count,
            )

            # ── STAGE 1: Lightweight Candidate Generation (Gemini, no tools) ───
            gen_prompt = f"""Generate {propose_count} candidate English practice words or short compound terms for speech therapy and pronunciation coaching.
Domain/Topic: "{topic}"
Difficulty Level: "{difficulty}" (easy = high-frequency, familiar syllable structure; medium = moderate syllables, technical terms; hard = multi-syllabic, complex consonant clusters)

Requirements:
1. Target terms must exhibit clear Indian English pronunciation challenges (MTI patterns like v/w confusion, retroflex stops, th-sound, consonant clusters, or syllable timing) or stutter triggers.
2. For each candidate, provide ONLY:
   - word: the target word or short phrase
   - definition: concise definition (1 sentence)
   - example: concise example phrase or sentence demonstrating natural usage
   - issue_type: "mti" or "stutter_trigger"
   - bucket: exactly one primary phonological category from: {sorted(list(ALLOWED_BUCKETS))}
   - bucket_2: optional secondary category from the same list, or null

Explicit Constraints:
- Do NOT provide department, difficulty, active status, verification status, timestamps, or IDs (the backend already manages these).
- Return ONLY a valid JSON array of objects with keys: "word", "definition", "example", "issue_type", "bucket", "bucket_2".
- No markdown preamble, no commentary, no research essays."""

            gen_sys_msg = (
                "You are an expert speech-language pathologist and linguist. "
                "Return ONLY a valid JSON array of candidate terms. "
                "Do not include research essays, justifications, or markdown formatting."
            )

            raw_resp = None
            try:
                raw_resp = await call_llm(
                    chain="volume_tier",
                    prompt=gen_prompt,
                    system_message=gen_sys_msg,
                    tools=None,
                    provider="gemini",
                    purpose="word_bank_research",
                )
                generation_calls_count += 1
                logger.info("Stage 1 (Gemini generation) succeeded for combo %s/%s.", topic, difficulty)
            except Exception as gen_err:
                logger.error(
                    "Stage 1 (Gemini generation) failed for combo %s/%s: %s. Skipping combo.",
                    topic,
                    difficulty,
                    gen_err,
                )
                combos_processed += 1
                await asyncio.sleep(1.5)
                continue

            # Parse Stage 1 JSON
            try:
                cleaned_text = _clean_json_output(raw_resp)
                raw_candidates = json.loads(cleaned_text)
                if isinstance(raw_candidates, dict) and "words" in raw_candidates:
                    raw_candidates = raw_candidates["words"]
                elif isinstance(raw_candidates, dict) and "candidates" in raw_candidates:
                    raw_candidates = raw_candidates["candidates"]
                if not isinstance(raw_candidates, list):
                    raise ValueError(f"Expected JSON array, got {type(raw_candidates)}")
            except Exception as parse_err:
                logger.error(
                    "Failed to parse generation response for %s/%s: %s. Raw snippet: %.200s",
                    topic,
                    difficulty,
                    parse_err,
                    raw_resp,
                )
                combos_processed += 1
                await asyncio.sleep(1.5)
                continue

            candidates_generated_count += len(raw_candidates)

            # ── STAGE 2A: Deterministic Backend Filtering ───────────────────────
            survivors: list[dict[str, Any]] = []

            for cand in raw_candidates:
                if not isinstance(cand, dict):
                    continue

                raw_word = str(cand.get("word") or "").strip().lower()
                issue_type = str(cand.get("issue_type") or "").strip().lower()
                bucket = str(cand.get("bucket") or "").strip().lower()
                bucket_2 = str(cand.get("bucket_2") or "").strip().lower() if cand.get("bucket_2") else None
                definition = str(cand.get("definition") or "").strip()
                example = str(cand.get("example") or "").strip()

                rejection_reason = None
                status = None

                if not raw_word or len(raw_word) < 2 or len(raw_word) > 64:
                    status = "rejected_validation"
                    rejection_reason = "Word empty or length out of bounds (2-64)"
                elif bool(re.search(r"\s", raw_word)):
                    status = "rejected_validation"
                    rejection_reason = "Word must be a single word, not a phrase"
                elif raw_word in existing_words_lower:
                    status = "rejected_duplicate"
                    rejection_reason = f"Word '{raw_word}' already exists in word_bank (active-row dedup)"
                elif bucket not in ALLOWED_BUCKETS:
                    status = "rejected_bad_bucket"
                    rejection_reason = f"Bucket '{bucket}' not in ALLOWED_BUCKETS"
                elif bucket_2 and bucket_2 not in ALLOWED_BUCKETS:
                    status = "rejected_bad_bucket"
                    rejection_reason = f"Bucket_2 '{bucket_2}' not in ALLOWED_BUCKETS"
                elif issue_type not in ALLOWED_ISSUE_TYPES:
                    status = "rejected_validation"
                    rejection_reason = f"Issue type '{issue_type}' not in ALLOWED_ISSUE_TYPES"
                elif not definition or not example:
                    status = "rejected_validation"
                    rejection_reason = "Definition or example phrase is missing"

                if status:
                    total_rejected += 1
                    logger.warning("Backend filter rejected '%s': status=%s, reason=%s", raw_word, status, rejection_reason)
                    # Audit log backend rejection
                    log_payload = {
                        "batch_id": batch_id,
                        "proposed_word": raw_word or "<EMPTY>",
                        "word_code": None,
                        "issue_type": issue_type or None,
                        "bucket": bucket or None,
                        "bucket_2": bucket_2,
                        "topic_fit": topic,
                        "difficulty": difficulty,
                        "why": f"{definition} Example: {example}".strip() or None,
                        "source_urls": [],
                        "llm_raw_rationale": None,
                        "status": status,
                        "rejection_reason": rejection_reason,
                        "grounded_attempt": False,
                    }
                    if not dry_run:
                        try:
                            supabase.table("word_bank_research_log").insert(log_payload).execute()
                        except Exception as log_err:
                            logger.warning("Failed to write audit log: %s", log_err)
                    proposals_summary.append({
                        "word": raw_word,
                        "status": status,
                        "rejection_reason": rejection_reason,
                        "code": None,
                    })
                else:
                    survivors.append({
                        "word": raw_word,
                        "issue_type": issue_type,
                        "bucket": bucket,
                        "bucket_2": bucket_2,
                        "definition": definition,
                        "example": example,
                    })

            if not survivors:
                logger.info("No candidates survived backend filtering for combo %s/%s.", topic, difficulty)
                combos_processed += 1
                await asyncio.sleep(1.5)
                continue

            # Selection Rule: Select top 2-3 filtered survivors in primary response order
            selected_survivors = survivors[:3]
            unselected_survivors = survivors[3:]
            logger.info(
                "Selected %d survivor(s) in response order for Groq verification: %s. Unselected (%d): %s",
                len(selected_survivors),
                [s["word"] for s in selected_survivors],
                len(unselected_survivors),
                [s["word"] for s in unselected_survivors],
            )

            # Audit log unselected survivors per D21 audit completeness guarantee
            for unselected in unselected_survivors:
                total_rejected += 1
                unselected_reason = "Passed backend validation but not selected for verification (per-combo cap)"
                log_payload = {
                    "batch_id": batch_id,
                    "proposed_word": unselected["word"],
                    "word_code": None,
                    "issue_type": unselected["issue_type"],
                    "bucket": unselected["bucket"],
                    "bucket_2": unselected["bucket_2"],
                    "topic_fit": topic,
                    "difficulty": difficulty,
                    "why": f"{unselected['definition']} Example: {unselected['example']}".strip() or None,
                    "source_urls": [],
                    "llm_raw_rationale": None,
                    "status": "not_selected",
                    "rejection_reason": unselected_reason,
                    "grounded_attempt": False,
                }
                if not dry_run:
                    try:
                        supabase.table("word_bank_research_log").insert(log_payload).execute()
                    except Exception as log_err:
                        logger.warning("Failed to write audit log for unselected candidate: %s", log_err)
                proposals_summary.append({
                    "word": unselected["word"],
                    "status": "not_selected",
                    "rejection_reason": unselected_reason,
                    "code": None,
                })

            # ── STAGE 2B: Groq Reasoning-Only Verification (openai/gpt-oss-20b) ──
            verified_accepted: list[tuple[dict[str, Any], str]] = []

            if verification_calls_count < max_verification_calls and groq_verifier:
                candidates_formatted = "\n".join([
                    f"- Candidate: '{s['word']}' | Target Bucket: '{s['bucket']}' | Issue: '{s['issue_type']}' | Definition: {s['definition']} | Example: {s['example']}"
                    for s in selected_survivors
                ])

                verif_prompt = f"""Evaluate the following candidate speech practice words for suitability in a clinical speech therapy tool.
Topic/Domain: "{topic}"
Target Difficulty: "{difficulty}"

Candidates to evaluate:
{candidates_formatted}

Instructions:
Evaluate each candidate using your own linguistic and speech pathology knowledge only:
1. Is the word clinically plausible and appropriate for the stated difficulty ("{difficulty}")?
2. Does it legitimately address the phonological bucket and issue type?
3. Is it natural and authentic in the "{topic}" domain?

Important: This is an internal reasoning evaluation only based on your own knowledge. No external web search or live evidence is available or used.
Return ONLY a valid JSON object of the form:
{{"evaluations": [{{"word": "<word>", "decision": "accept"|"reject", "reason": "<one-line clinical reason>"}}]}}
No markdown preamble, no long justification."""

                try:
                    verif_resp = groq_verifier.chat.completions.create(
                        model="openai/gpt-oss-20b",
                        messages=[
                            {
                                "role": "system",
                                "content": (
                                    "You are a clinical speech therapy evaluator. "
                                    "Evaluate candidates using internal knowledge only. "
                                    "Return ONLY a valid JSON object with key 'evaluations'. No markdown."
                                ),
                            },
                            {"role": "user", "content": verif_prompt},
                        ],
                        temperature=0.1,
                        max_tokens=800,
                        response_format={"type": "json_object"},
                    )
                    verification_calls_count += 1

                    # Log usage for Groq verification
                    usage = getattr(verif_resp, "usage", None)
                    log_llm_usage(
                        provider="groq",
                        model="openai/gpt-oss-20b",
                        input_tokens=usage.prompt_tokens if usage else 0,
                        output_tokens=usage.completion_tokens if usage else 0,
                        purpose="word_bank_research",
                        chain="volume_tier",
                    )

                    v_content = verif_resp.choices[0].message.content or "{}"
                    v_parsed = json.loads(_clean_json_output(v_content))
                    eval_list = v_parsed.get("evaluations", []) if isinstance(v_parsed, dict) else []

                    # Map evaluations by lower-case word
                    eval_map = {}
                    for ev in eval_list:
                        if isinstance(ev, dict) and "word" in ev:
                            eval_map[ev["word"].strip().lower()] = ev

                    for s in selected_survivors:
                        w_key = s["word"].lower()
                        ev = eval_map.get(w_key, {})
                        decision = str(ev.get("decision") or "").strip().lower()
                        reason = str(ev.get("reason") or "").strip() or "Evaluated by verifier"

                        if decision == "accept":
                            verified_accepted.append((s, reason))
                        else:
                            total_rejected += 1
                            logger.info("Groq verifier rejected '%s': %s", s["word"], reason)
                            log_payload = {
                                "batch_id": batch_id,
                                "proposed_word": s["word"],
                                "word_code": None,
                                "issue_type": s["issue_type"],
                                "bucket": s["bucket"],
                                "bucket_2": s["bucket_2"],
                                "topic_fit": topic,
                                "difficulty": difficulty,
                                "why": f"{s['definition']} Example: {s['example']}",
                                "source_urls": [],
                                "llm_raw_rationale": reason,
                                "status": "rejected_verification",
                                "rejection_reason": reason,
                                "grounded_attempt": False,
                            }
                            if not dry_run:
                                try:
                                    supabase.table("word_bank_research_log").insert(log_payload).execute()
                                except Exception as log_err:
                                    logger.warning("Failed to write audit log: %s", log_err)
                            proposals_summary.append({
                                "word": s["word"],
                                "status": "rejected_verification",
                                "rejection_reason": reason,
                                "code": None,
                            })

                except RateLimitError as rle:
                    logger.warning(
                        "Groq verification hit 429 RateLimitError for combo %s/%s (%s). "
                        "Skipping verification without retry backoff.",
                        topic,
                        difficulty,
                        rle,
                    )
                except APIError as apie:
                    logger.warning(
                        "Groq verification APIError for combo %s/%s (%s). Skipping verification.",
                        topic,
                        difficulty,
                        apie,
                    )
                except Exception as verif_err:
                    logger.warning(
                        "Groq verification failed for combo %s/%s: %s. Skipping verification.",
                        topic,
                        difficulty,
                        verif_err,
                    )
            else:
                logger.info(
                    "Skipping Groq verification (verification_calls=%d/%d, groq_available=%s).",
                    verification_calls_count,
                    max_verification_calls,
                    bool(groq_verifier),
                )

            # ── STAGE 2C: Persist Best 1-2 Accepted Survivors ──────────────────
            # Take top 1-2 accepted survivors in order
            to_insert = verified_accepted[:2]

            for s, groq_reason in to_insert:
                word_code = _generate_word_code(s["bucket"])
                why_field = f"{s['definition']} Example: {s['example']}".strip()

                word_bank_payload = {
                    "word_code": word_code,
                    "word": s["word"],
                    "issue_type": s["issue_type"],
                    "bucket": s["bucket"],
                    "bucket_2": s["bucket_2"],
                    "why": why_field,
                    "difficulty": difficulty,
                    "topic_fit": topic,
                    "source": "llm_research",
                    "verified_by_slp": "not_yet",
                    "active": True,
                }

                if not dry_run:
                    try:
                        supabase.table("word_bank").insert(word_bank_payload).execute()
                        existing_words_lower.add(s["word"].lower())
                        total_inserted += 1
                        logger.info("Inserted verified word: code=%s, word='%s', bucket=%s", word_code, s["word"], s["bucket"])
                    except Exception as ins_err:
                        logger.error("Insert into word_bank failed for '%s': %s", s["word"], ins_err)
                        total_rejected += 1
                        continue
                else:
                    existing_words_lower.add(s["word"].lower())
                    total_inserted += 1
                    logger.info("[DRY RUN] Would insert: code=%s, word='%s', bucket=%s", word_code, s["word"], s["bucket"])

                # Write audit log row:
                # grounded_attempt is always False per D22 (reasoning-only verification).
                # source_urls is always [] (no web search executed).
                # llm_raw_rationale stores Groq's one-line reasoning verdict.
                # Gemini's clinical definition & example are preserved in the 'why' field.
                log_payload = {
                    "batch_id": batch_id,
                    "proposed_word": s["word"],
                    "word_code": word_code,
                    "issue_type": s["issue_type"],
                    "bucket": s["bucket"],
                    "bucket_2": s["bucket_2"],
                    "topic_fit": topic,
                    "difficulty": difficulty,
                    "why": why_field,
                    "source_urls": [],
                    "llm_raw_rationale": groq_reason,
                    "status": "inserted",
                    "rejection_reason": None,
                    "grounded_attempt": False,
                }

                if not dry_run:
                    try:
                        supabase.table("word_bank_research_log").insert(log_payload).execute()
                    except Exception as log_err:
                        logger.warning("Failed to write to word_bank_research_log: %s", log_err)

                proposals_summary.append({
                    "word": s["word"],
                    "status": "inserted",
                    "rejection_reason": None,
                    "code": word_code,
                })

            combos_processed += 1
            # 1.5s delay between combos to respect token rate pacing
            await asyncio.sleep(1.5)

    finally:
        # Release distributed advisory lock
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
        "combos_processed": combos_processed,
        "generation_calls": generation_calls_count,
        "verification_calls": verification_calls_count,
        "candidates_generated": candidates_generated_count,
        "proposals_summary": proposals_summary,
        "dry_run": dry_run,
    }
    logger.info(
        "Word bank research cycle completed: inserted=%d, rejected=%d, combos=%d",
        total_inserted,
        total_rejected,
        combos_processed,
    )
    return result


def main():
    parser = argparse.ArgumentParser(description="Autonomous Word Bank Research Cycle (Two-Stage Architecture)")
    parser.add_argument("--target", type=int, default=DEFAULT_TARGET_PER_COMBO, help="Target words per topic_fit × difficulty combo")
    parser.add_argument("--max-proposals", type=int, default=DEFAULT_MAX_PROPOSALS_PER_COMBO, help="Max words to propose per combo in one cycle")
    parser.add_argument("--max-buckets", type=int, default=DEFAULT_MAX_BUCKETS, help="Max deficient combos to process in one cycle")
    parser.add_argument("--max-generation-calls", type=int, default=DEFAULT_MAX_GENERATION_CALLS, help="Max Gemini generation calls per cycle")
    parser.add_argument("--max-verification-calls", type=int, default=DEFAULT_MAX_VERIFICATION_CALLS, help="Max Groq verification calls per cycle")
    parser.add_argument("--max-candidates", type=int, default=DEFAULT_MAX_CANDIDATES_GENERATED, help="Max total candidates generated per cycle")
    parser.add_argument("--daily-token-budget", type=int, default=DEFAULT_DAILY_TOKEN_BUDGET, help="Daily token ceiling from ai_usage_logs")
    parser.add_argument("--dry-run", action="store_true", help="Run without writing to database")
    args = parser.parse_args()

    asyncio.run(run_cycle(
        target_per_combo=args.target,
        max_proposals_per_combo=args.max_proposals,
        max_buckets=args.max_buckets,
        max_generation_calls=args.max_generation_calls,
        max_verification_calls=args.max_verification_calls,
        max_candidates_generated=args.max_candidates,
        max_provider_tokens=args.daily_token_budget,
        dry_run=args.dry_run,
    ))


if __name__ == "__main__":
    main()

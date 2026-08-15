import re
import logging
import json
import uuid
import asyncio
from datetime import datetime
from utils.supabase_client import supabase
from utils.llm_client import call_llm

logger = logging.getLogger("cadence")

DIFFICULTY_RANGES = {
    "easy": "60-90 words",
    "medium": "80-120 words",
    "hard": "100-150 words"
}

TOPIC_TO_WORD_BANK_MAP = {
    "workplace_communication": "business",
    "technology": "tech",
    "social_situations": "general",
    "academic_english": "academics",
    "job_interview": "business"
}

# Maps all frontend/alias difficulty labels to the canonical DB values used in
# DIFFICULTIES, passage_pool, and word_bank difficulty columns.
_DIFFICULTY_ALIAS: dict[str, str] = {
    "easy": "easy",
    "easy-tier": "easy",
    "beginner": "easy",
    "medium": "medium",
    "medium-tier": "medium",
    "intermediate": "medium",
    "hard": "hard",
    "hard-tier": "hard",
    "advanced": "hard",
}


def normalize_difficulty(difficulty: str | None) -> str | None:
    """
    Normalises a raw difficulty label (from the frontend or any caller) to one of
    the canonical DB values: 'easy', 'medium', or 'hard'.
    Returns None if the input is None or unrecognised.
    """
    if not difficulty:
        return None
    return _DIFFICULTY_ALIAS.get(difficulty.lower())

def find_word_positions(passage_text: str, target_words: list[dict]) -> tuple[list[dict], list[dict]]:
    """
    Finds the exact character start/end position of each target word in the final passage text.
    Uses a case-insensitive match on a whole-word boundary using regex lookarounds.
    Returns (found_words, missing_words).
    """
    found = []
    missing = []
    for w in target_words:
        word_str = w["word"]
        # Match case-insensitive whole-word boundary using lookarounds
        pattern = re.compile(rf'(?<!\w){re.escape(word_str)}(?!\w)', re.IGNORECASE)
        match = pattern.search(passage_text)
        if match:
            found.append({
                "word_code": w["word_code"],
                "word": w["word"],
                "issue_type": w["issue_type"],
                "bucket": w["bucket"],
                "char_start": match.start(),
                "char_end": match.end()
            })
        else:
            missing.append(w)
    return found, missing

async def generate_passage(
    difficulty: str | None,
    topic: str | None,
    issue_type: str | None,
    word_count: int = 8
) -> dict:
    """
    Generates a single coherent reading passage that embeds selected target words.
    Query filters:
      - active = TRUE (always)
      - verified_by_slp = 'yes' (always)
      - difficulty matches requested tier (or spread across tiers if not specified)
      - issue_type filter if provided ('mti' or 'stutter_trigger')
      - topic_fit matches requested topic (mapped to word_bank topic_fit) if provided, else any topic_fit
      - ORDER BY random(), LIMIT word_count (handled in DB RPC function)
    """
    # 1. Validate and clamp word_count parameter to [1, 15] bounds
    if not (1 <= word_count <= 15):
        logger.warning(f"Requested word_count {word_count} is outside the allowed bounds [1, 15]. Clamping it.")
        word_count = max(1, min(15, word_count))

    # 2. Map difficulty parameters to check database constraints ('easy', 'medium', 'hard')
    difficulty_clean = normalize_difficulty(difficulty)

    db_diff = difficulty_clean if difficulty_clean else None
    db_issue_type = issue_type if issue_type else None

    # Resolve user-facing topic to word_bank topic_fit category
    target_topic_fit = TOPIC_TO_WORD_BANK_MAP.get(topic, topic) if topic else None
    db_topic = target_topic_fit

    # 3. Query words from the live word_bank using our RPC
    words = []
    try:
        res = supabase.rpc("get_random_words", {
            "p_difficulty": db_diff,
            "p_issue_type": db_issue_type,
            "p_topic": db_topic,
            "p_limit": word_count
        }).execute()
        words = res.data or []
    except Exception as e:
        logger.error(f"Failed to query word_bank using get_random_words: {e}", exc_info=True)
        raise RuntimeError(f"Database query failed: {e}")

    # Fallback 1: If mapped topic_fit produced fewer than word_count words, try topic_fit='general'
    if len(words) < word_count and db_topic and db_topic != "general":
        logger.info(
            f"Topic fallback triggered for topic='{topic}' (mapped to '{db_topic}'): "
            f"found {len(words)} words for difficulty='{db_diff}', needed {word_count}. "
            f"Falling back to topic_fit='general'."
        )
        try:
            fb_res = supabase.rpc("get_random_words", {
                "p_difficulty": db_diff,
                "p_issue_type": db_issue_type,
                "p_topic": "general",
                "p_limit": word_count
            }).execute()
            fb_words = fb_res.data or []
            if len(fb_words) > len(words):
                words = fb_words
        except Exception as fb_err:
            logger.warning(f"Fallback to general topic_fit failed: {fb_err}")

    # Fallback 2: If still fewer than word_count words, fall back to topic_fit=None (any topic)
    if len(words) < word_count and db_topic:
        logger.info(
            f"Ultimate topic fallback triggered for topic='{topic}': "
            f"found {len(words)} words for difficulty='{db_diff}', needed {word_count}. "
            f"Falling back to topic_fit=None (any topic)."
        )
        try:
            any_res = supabase.rpc("get_random_words", {
                "p_difficulty": db_diff,
                "p_issue_type": db_issue_type,
                "p_topic": None,
                "p_limit": word_count
            }).execute()
            any_words = any_res.data or []
            if len(any_words) > len(words):
                words = any_words
        except Exception as any_err:
            logger.warning(f"Fallback to any topic_fit failed: {any_err}")

    if not words:
        raise ValueError(
            f"No matching active and verified words found in word_bank for filters: "
            f"difficulty={difficulty}, topic={topic}, issue_type={issue_type}"
        )

    words_list_str = ", ".join([f"'{w['word']}'" for w in words])
    length_guideline = DIFFICULTY_RANGES.get(difficulty_clean, "80-120 words")

    prompt = f"""
You are an expert English speech therapist and linguist. 
Write a single coherent reading passage of approximately {length_guideline} that naturally embeds ALL of the following target words/phrases verbatim:
{words_list_str}

Difficulty level of words: {difficulty_clean or 'mixed'}
Topic of passage: {topic or 'general'}

Strictest Rules:
1. You MUST include every target word/phrase exactly as listed. Do NOT conjugate, change tense, pluralize, or paraphrase them. They must appear verbatim.
2. The passage must flow naturally and read like coherent speech for a speech assessment, not like a random list of words.
3. Return ONLY a valid JSON object matching the JSON schema below.
4. Do NOT include any markdown formatting (like ```json or ```).
5. Do NOT include any conversational preamble or trailing explanation.

JSON Schema:
{{
    "passage": "string"
}}
"""

    system_msg = "You are an expert English speech assessment system. Return ONLY valid JSON — no markdown, no preamble."
    task_name = "passage_generation"

    # Call LLM (first attempt)
    try:
        raw_output = await call_llm(
            chain="volume_tier",
            prompt=prompt,
            system_message=system_msg,
        )
        content = raw_output.strip()
        if content.startswith("```json"):
            content = content[7:-3].strip()
        elif content.startswith("```"):
            content = content[3:-3].strip()
        
        parsed = json.loads(content)
        passage_text = parsed.get("passage", "").strip()
    except Exception as e:
        logger.error(f"LLM call or JSON parsing failed on attempt 1: {e}", exc_info=True)
        raise RuntimeError(f"Failed to generate passage: {e}")

    # Locate words
    found, missing = find_word_positions(passage_text, words)

    # Retry once if any words are missing verbatim
    if missing:
        logger.info(f"Target words missing on first attempt: {[w['word'] for w in missing]}. Retrying with stricter prompt...")
        missing_str = ", ".join([f"'{w['word']}'" for w in missing])
        
        retry_prompt = f"""
You previously generated a passage, but it did NOT contain the following target words/phrases verbatim:
{missing_str}

Please generate a NEW single coherent reading passage of approximately {length_guideline} that strictly and verbatim embeds ALL of the originally requested target words/phrases:
{words_list_str}

Strictest Rules:
1. You MUST include every target word/phrase exactly as listed, including the missing ones: {missing_str}. Do NOT conjugate, change tense, pluralize, or paraphrase them.
2. Return ONLY a valid JSON object matching the JSON schema below.
3. Do NOT include any markdown formatting (like ```json or ```).
4. Do NOT include any conversational preamble or trailing explanation.

JSON Schema:
{{
    "passage": "string"
}}
"""
        try:
            raw_output = await call_llm(
                chain="volume_tier",
                prompt=retry_prompt,
                system_message=system_msg,
            )
            content = raw_output.strip()
            if content.startswith("```json"):
                content = content[7:-3].strip()
            elif content.startswith("```"):
                content = content[3:-3].strip()
            
            parsed = json.loads(content)
            passage_text = parsed.get("passage", "").strip()
        except Exception as e:
            logger.error(f"LLM call or JSON parsing failed on retry attempt: {e}", exc_info=True)
            raise RuntimeError(f"Failed to generate passage on retry: {e}")

        # Re-verify positions
        found, missing = find_word_positions(passage_text, words)

    # Log warning for still missing words and drop them
    if missing:
        for w in missing:
            logger.warning(
                f"Word '{w['word']}' (word_code: {w['word_code']}) could not be embedded verbatim in the generated passage after retry. Dropping from response."
            )

    # Calculate actual word count (simple whitespace split)
    actual_word_count = len([w for w in passage_text.split() if w.strip()])

    # 4. Persist generated passage to generated_passages table
    passage_id = str(uuid.uuid4())
    generated_at = datetime.utcnow().isoformat() + "Z"
    
    db_row = {
        "id": passage_id,
        "passage_text": passage_text,
        "difficulty": difficulty_clean if difficulty_clean else "medium",
        "topic": topic if topic else "general",
        "target_words": found,
        "word_count": actual_word_count,
        "generated_at": generated_at
    }

    try:
        supabase.table("generated_passages").insert(db_row).execute()
    except Exception as db_err:
        logger.error(f"Failed to persist generated passage to database: {db_err}", exc_info=True)
        # Raise on failure per project convention
        raise RuntimeError(f"Failed to save generated passage to database: {db_err}")

    # Return shape
    return {
        "passage_id": passage_id,
        "passage_text": passage_text,
        "difficulty": difficulty_clean if difficulty_clean else "medium",
        "topic": topic if topic else "general",
        "target_words": found,
        "generated_at": generated_at
    }


# ── Passage Pool Caching & Serving Layer ──────────────────────────────────────

TARGET_POOL_SIZE = 5

# User-facing topic labels that the product presents to users.
# These map to word_bank topic_fit values via TOPIC_TO_WORD_BANK_MAP inside generate_passage().
FIXED_TOPICS = [
    "workplace_communication",
    "technology",
    "social_situations",
    "academic_english",
    "job_interview"
]

DIFFICULTIES = [
    "easy",
    "medium",
    "hard"
]


TOPIC_ALIAS_MAP = {
    "workplace": "workplace_communication",
    "social": "social_situations",
    "academic": "academic_english",
    "interview": "job_interview",
    "tech": "technology",
}

async def get_or_generate_passage(
    topic: str,
    difficulty: str,
    issue_type: str | None = None,
    word_count: int = 8
) -> dict:
    """
    Serving layer: claim a pre-generated passage from passage_pool if available,
    otherwise fall back to live generation.

    Returns dict containing passage fields plus metadata tag `source` ('pool' or 'fallback').

    NOTE: difficulty is normalised to the canonical DB value ('easy'/'medium'/'hard')
    at the very top of this function, before the pool-gate check, so frontend labels
    such as 'beginner'/'intermediate'/'advanced' all route through the pool correctly.
    """
    # ── Normalise BEFORE any pool gate check ─────────────────────────────────
    # The frontend sends 'beginner'/'intermediate'/'advanced'; the pool and
    # DIFFICULTIES list use 'easy'/'medium'/'hard'.  Without this, the gate
    # condition below is always False for frontend traffic and every request
    # falls straight into live generation regardless of pool stock.
    diff_normalized = normalize_difficulty(difficulty) or difficulty
    resolved_topic = TOPIC_ALIAS_MAP.get(topic, topic)

    # Only pool-route fixed combos; everything else goes straight to generate_passage
    if resolved_topic in FIXED_TOPICS and diff_normalized in DIFFICULTIES:
        try:
            # Single atomic UPDATE...WHERE status='available' RETURNING * via RPC
            claim_res = supabase.rpc("claim_pooled_passage", {
                "p_topic": resolved_topic,
                "p_difficulty": diff_normalized
            }).execute()

            if claim_res.data:
                pool_row = claim_res.data[0]
                passage_id = pool_row["passage_id"]

                # Fetch the full passage from generated_passages
                gp_res = supabase.table("generated_passages") \
                    .select("*") \
                    .eq("id", passage_id) \
                    .execute()
                if gp_res.data:
                    gp_row = gp_res.data[0]
                    logger.info(
                        f"Pool HIT: served passage {passage_id} "
                        f"for topic={topic} (resolved={resolved_topic}), "
                        f"difficulty={difficulty} (normalized={diff_normalized})"
                    )
                    return {
                        "passage_id": gp_row["id"],
                        "passage_text": gp_row["passage_text"],
                        "difficulty": gp_row["difficulty"],
                        "topic": topic,          # return the user-facing label
                        "target_words": gp_row["target_words"],
                        "generated_at": gp_row["generated_at"],
                        "source": "pool"
                    }
                else:
                    logger.warning(
                        f"Pool row references passage {passage_id} "
                        f"which is missing from generated_passages. Falling back."
                    )
        except Exception as e:
            logger.error(f"Error claiming passage from pool: {e}", exc_info=True)
            # Fall through to live generation — never degrade user-facing request

    # ── Fallback: live generation (same path as before this layer existed) ────
    logger.info(
        f"Pool MISS/fallback: live generation for topic={topic} (resolved={resolved_topic}), "
        f"difficulty={difficulty} (normalized={diff_normalized})"
    )
    res = await generate_passage(
        difficulty=diff_normalized,   # pass the canonical value so generate_passage
        topic=resolved_topic,         # doesn't have to re-normalise
        issue_type=issue_type,
        word_count=word_count
    )

    # Self-seed: even without the refill worker having run, real traffic populates the pool.
    # Use resolved_topic + diff_normalized so the pool row is consistent with what the
    # refill worker writes — raw labels like 'advanced' must never reach the DB column.
    if resolved_topic in FIXED_TOPICS and diff_normalized in DIFFICULTIES:
        try:
            passage_id = res["passage_id"]
            # Insert as available then immediately mark served (it's going out right now)
            supabase.table("passage_pool").insert({
                "passage_id": passage_id,
                "topic": resolved_topic,
                "difficulty": diff_normalized,
                "status": "available"
            }).execute()
            supabase.table("passage_pool").update({
                "status": "served",
                "served_at": datetime.utcnow().isoformat() + "Z"
            }).eq("passage_id", passage_id).execute()
            logger.info(
                f"Self-seeded+served passage {passage_id} "
                f"for topic={resolved_topic}, difficulty={diff_normalized}"
            )
        except Exception as seed_err:
            logger.error(
                f"Failed to self-seed pool for passage {res.get('passage_id')}: {seed_err}",
                exc_info=True
            )
            # Non-blocking — passage already generated, return it regardless

    # Normalise topic & tag source
    res["topic"] = topic
    res["source"] = "fallback"
    return res


async def refill_passages() -> None:
    """
    Refill worker: for each of the 15 (topic, difficulty) combos, count available
    rows and generate enough passages to reach TARGET_POOL_SIZE.

    Called on a configurable interval (REFILL_INTERVAL_SECONDS, default 600 s)
    via the asyncio background loop in main.py.
    Uses a DB-level advisory lock (refill_lock table + try_refill_lock RPC) so
    that only one process performs the refill cycle at a time when running under
    multiple workers or deployed instances.
    """
    logger.info("Refill worker cycle starting: attempting to acquire lock...")
    try:
        lock_res = supabase.rpc("try_refill_lock").execute()
        if not lock_res.data:
            logger.info("refill cycle skipped, lock held elsewhere")
            return
    except Exception as lock_err:
        logger.error(f"Failed to check/acquire refill lock: {lock_err}", exc_info=True)
        return

    logger.info("Refill lock acquired. Counting pool demand (single pass)...")

    # ── Single-pass combo count ────────────────────────────────────────────────
    # Build a dict of available counts for all 15 combos in one sweep.
    # The top-up loop below reads directly from this dict — each combo is
    # queried exactly once per cycle. See DECISIONS.md D7.
    combo_counts: dict[tuple[str, str], int] = {}
    for _topic in FIXED_TOPICS:
        for _diff in DIFFICULTIES:
            try:
                _cr = supabase.table("passage_pool") \
                    .select("id", count="exact") \
                    .eq("topic", _topic) \
                    .eq("difficulty", _diff) \
                    .eq("status", "available") \
                    .execute()
                combo_counts[(_topic, _diff)] = _cr.count if _cr.count is not None else 0
            except Exception as count_err:
                # Log with full traceback so a persistently-failing combo is
                # visible in logs, not silently folded into the demand count.
                logger.warning(
                    f"Pre-cycle count query failed for {_topic}/{_diff} "
                    f"(will attempt top-up conservatively): {count_err}",
                    exc_info=True,
                )
                # Treat as 0 so the top-up loop attempts this combo rather than skipping it.
                combo_counts[(_topic, _diff)] = 0

    combos_needing_refill = sum(
        1 for cnt in combo_counts.values() if cnt < TARGET_POOL_SIZE
    )
    combos_already_full = len(combo_counts) - combos_needing_refill
    total_combos = len(FIXED_TOPICS) * len(DIFFICULTIES)
    logger.info(
        f"Pool demand: {combos_needing_refill}/{total_combos} combos need refilling "
        f"(below TARGET_POOL_SIZE={TARGET_POOL_SIZE}), "
        f"{combos_already_full}/{total_combos} already full."
    )
    # ── End single-pass combo count ───────────────────────────────────────────

    total_generated = 0
    topped_up_combos: list[str] = []

    try:
        for topic in FIXED_TOPICS:
            for difficulty in DIFFICULTIES:
                try:
                    # Reuse the count already fetched above — no second query per combo.
                    current_count = combo_counts.get((topic, difficulty), 0)

                    if current_count < TARGET_POOL_SIZE:
                        needed = TARGET_POOL_SIZE - current_count
                        logger.info(
                            f"Combo {topic}/{difficulty}: {current_count} available, "
                            f"generating {needed} more."
                        )
                        generated_for_combo = 0
                        for _ in range(needed):
                            try:
                                res = await generate_passage(
                                    difficulty=difficulty,
                                    topic=topic,
                                    issue_type=None,
                                    word_count=8
                                )
                                supabase.table("passage_pool").insert({
                                    "passage_id": res["passage_id"],
                                    "topic": topic,
                                    "difficulty": difficulty,
                                    "status": "available"
                                }).execute()
                                generated_for_combo += 1
                                total_generated += 1
                                # Math: 1 generate_passage call = ~992 tokens (309 prompt + 683 completion).
                                # Groq free-tier openai/gpt-oss-20b cap = 8,000 TPM.
                                # 1.5s delay prevents rapid token accumulation under Groq's 8,000 TPM limit.
                                await asyncio.sleep(1.5)
                            except Exception as gen_err:
                                logger.error(
                                    f"Failed to generate for pool top-up "
                                    f"({topic}/{difficulty}): {gen_err}",
                                    exc_info=True
                                )
                                # Per-passage failure: log and continue to next slot

                        if generated_for_combo > 0:
                            topped_up_combos.append(
                                f"{topic}/{difficulty} (+{generated_for_combo})"
                            )
                except Exception as combo_err:
                    logger.error(
                        f"Error processing combo {topic}/{difficulty}: {combo_err}",
                        exc_info=True
                    )

        logger.info(
            f"Refill cycle done. Combos topped up: "
            f"{', '.join(topped_up_combos) if topped_up_combos else 'none'}. "
            f"Total generated: {total_generated}."
        )
    finally:
        # Always release the lock, even if a combo loop raised
        try:
            supabase.rpc("unlock_refill").execute()
            logger.info("Refill lock released.")
        except Exception as unlock_err:
            logger.error(f"Failed to release refill lock: {unlock_err}", exc_info=True)



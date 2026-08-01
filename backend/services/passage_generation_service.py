import re
import logging
import json
import uuid
from datetime import datetime
from utils.supabase_client import supabase
from utils.llm_client import call_llm

logger = logging.getLogger("cadence")

DIFFICULTY_RANGES = {
    "easy": "60-90 words",
    "medium": "80-120 words",
    "hard": "100-150 words"
}

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
      - topic_fit matches requested topic if provided, else any topic_fit
      - ORDER BY random(), LIMIT word_count (handled in DB RPC function)
    """
    # 1. Validate and clamp word_count parameter to [1, 15] bounds
    if not (1 <= word_count <= 15):
        logger.warning(f"Requested word_count {word_count} is outside the allowed bounds [1, 15]. Clamping it.")
        word_count = max(1, min(15, word_count))

    # 2. Map difficulty parameters to check database constraints ('easy', 'medium', 'hard')
    difficulty_clean = None
    if difficulty:
        diff_lower = difficulty.lower()
        if diff_lower in ("easy", "medium", "hard"):
            difficulty_clean = diff_lower
        elif diff_lower in ("beginner", "easy-tier"):
            difficulty_clean = "easy"
        elif diff_lower in ("intermediate", "medium-tier"):
            difficulty_clean = "medium"
        elif diff_lower in ("advanced", "hard-tier"):
            difficulty_clean = "hard"

    db_diff = difficulty_clean if difficulty_clean else None
    db_topic = topic if topic else None
    db_issue_type = issue_type if issue_type else None

    # 3. Query words from the live word_bank using our RPC
    try:
        res = supabase.rpc("get_random_words", {
            "p_difficulty": db_diff,
            "p_issue_type": db_issue_type,
            "p_topic": db_topic,
            "p_limit": word_count
        }).execute()
    except Exception as e:
        logger.error(f"Failed to query word_bank using get_random_words: {e}", exc_info=True)
        raise RuntimeError(f"Database query failed: {e}")

    words = res.data or []
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
    purpose = "passage_generation"

    # Call LLM (first attempt)
    try:
        raw_output = await call_llm(
            prompt=prompt,
            system_message=system_msg,
            purpose=purpose
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
                prompt=retry_prompt,
                system_message=system_msg,
                purpose=purpose
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

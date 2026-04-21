"""
tip_service.py — Daily tip generation via Groq, with Supabase caching.

Logic:
  - PRO/PREMIUM users: personalized tip based on their latest assessment weak areas.
  - FREE users: deterministic-seeded tip (hash of user_id + date) so each user
    gets a unique but consistent tip each day — without needing assessment history.
  - All tips are cached in `daily_tips` table; Groq is only called once per user per day.
"""

import hashlib
import logging
from datetime import date, datetime
from typing import Optional

from groq import Groq, APIError

logger = logging.getLogger(__name__)

# ── Topic pool for free-tier seeding ─────────────────────────────────────────
FREE_TIER_TOPICS = [
    "reducing mother tongue influence on English vowel sounds",
    "controlling speech pace to sound more confident",
    "mastering the 'th' sound (voiced and unvoiced)",
    "eliminating filler words like 'um', 'uh', and 'like'",
    "syllable stress patterns in multi-syllable English words",
    "linking words smoothly in connected speech",
    "reducing retroflex consonants common in Indian English",
    "improving sentence-final intonation to avoid monotone delivery",
    "clear articulation of word-final consonants",
    "differentiating 'v' and 'w' sounds",
    "improving rhythm and natural stress in English sentences",
    "breathing technique for sustained, clear speech",
    "the schwa sound — English's most common vowel",
    "reducing unnecessary retroflex 'd' and 't' sounds",
    "pausing effectively for emphasis instead of rushing",
    "open vs closed vowels — distinguishing 'bit' vs 'beat'",
    "soft 'l' vs hard 'l' — word-final vs word-initial",
    "controlling nasality in speech",
    "practical warmup routines before presentations",
    "eye contact and speech fluency — how they connect",
]


def _seed_topic_for_user(user_id: str, today: date) -> str:
    """
    Deterministically pick a topic for a free-tier user.
    Same user + same date → same topic. Different users → likely different topics.
    """
    seed_string = f"{user_id}:{today.isoformat()}"
    hash_int = int(hashlib.sha256(seed_string.encode()).hexdigest(), 16)
    return FREE_TIER_TOPICS[hash_int % len(FREE_TIER_TOPICS)]


async def get_tip_of_the_day(
    user_id: str,
    tier: str,
    supabase,
    groq_client: Groq,
    weak_areas: Optional[list[str]] = None,
    recent_score: Optional[float] = None,
) -> dict:
    """
    Main entry point. Returns { tip, is_personalized, generated_at }.
    Checks cache first; generates + caches only on cache miss.
    """
    today = date.today()

    # ── 1. Cache lookup ───────────────────────────────────────────────────────
    try:
        cached = (
            supabase.table("daily_tips")
            .select("tip_text, is_personalized, generated_at")
            .eq("user_id", user_id)
            .eq("tip_date", today.isoformat())
            .single()
            .execute()
        )
        if cached.data:
            logger.info(f"Cache hit for user {user_id} on {today}")
            return {
                "tip": cached.data["tip_text"],
                "is_personalized": cached.data["is_personalized"],
                "generated_at": cached.data["generated_at"],
                "cached": True,
            }
    except Exception:
        # PostgREST raises if no row found — that's fine, fall through
        pass

    # ── 2. Build prompt ───────────────────────────────────────────────────────
    is_paid = tier.upper() in ("PRO", "PREMIUM")

    if is_paid and weak_areas:
        top_weak = ", ".join(weak_areas[:3])
        score_context = (
            f"Their most recent fluency score is {recent_score:.0f}/100."
            if recent_score is not None
            else ""
        )
        system_prompt = (
            "You are a professional speech-language coach helping Indian college students "
            "prepare for placement interviews and improve spoken English. "
            "Write actionable, encouraging tips in a warm but direct tone. "
            "Keep tips to 2–3 sentences max. No markdown, no bullet points."
        )
        user_prompt = (
            f"Give me one specific, practical tip for today to improve my spoken English. "
            f"My current weak areas are: {top_weak}. {score_context} "
            f"Focus on the single most impactful thing I can practice today."
        )
        is_personalized = True
    else:
        topic = _seed_topic_for_user(user_id, today)
        system_prompt = (
            "You are a professional speech-language coach helping Indian college students "
            "improve their spoken English for placement interviews. "
            "Write actionable, encouraging tips in a warm but direct tone. "
            "Keep tips to 2–3 sentences max. No markdown, no bullet points. "
            "Make the tip feel specific and useful, not generic."
        )
        user_prompt = (
            f"Give me one practical tip for today on this topic: {topic}. "
            f"Be specific — include a small exercise or technique the user can try right now."
        )
        is_personalized = False

    # ── 3. Call Groq ──────────────────────────────────────────────────────────
    tip_text = None
    try:
        response = groq_client.chat.completions.create(
            model="llama-3.1-8b-instant",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            max_tokens=120,
            temperature=0.8,
        )
        tip_text = response.choices[0].message.content.strip()
    except APIError as e:
        logger.warning(f"Groq tip generation failed: {e}. Using fallback.")

    # ── 4. Fallback if Groq fails ─────────────────────────────────────────────
    if not tip_text:
        topic = _seed_topic_for_user(user_id, today)
        tip_text = (
            f"Today's focus: {topic}. "
            "Record yourself speaking for 60 seconds and listen back — "
            "you'll catch patterns you can't hear in the moment."
        )

    # ── 5. Cache the result ───────────────────────────────────────────────────
    now_iso = datetime.utcnow().isoformat()
    try:
        supabase.table("daily_tips").upsert(
            {
                "user_id": user_id,
                "tip_date": today.isoformat(),
                "tip_text": tip_text,
                "is_personalized": is_personalized,
                "generated_at": now_iso,
            },
            on_conflict="user_id,tip_date",
        ).execute()
    except Exception as e:
        logger.warning(f"Failed to cache tip for user {user_id}: {e}")

    return {
        "tip": tip_text,
        "is_personalized": is_personalized,
        "generated_at": now_iso,
        "cached": False,
    }
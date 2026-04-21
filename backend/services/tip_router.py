"""
tip_router.py — /api/tip-of-the-day

Pulls the current user's tier + latest assessment data, then delegates
to tip_service for Groq generation + Supabase caching.
"""

import logging
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from typing import Optional

from dependencies import get_current_user          # your existing auth dep
from database import get_supabase                  # your existing supabase dep
from groq_client import get_groq_client            # your existing groq dep
from services.tip_service import get_tip_of_the_day

router = APIRouter(prefix="/api", tags=["tips"])
logger = logging.getLogger(__name__)


class TipResponse(BaseModel):
    tip: str
    is_personalized: bool
    generated_at: str
    cached: bool


@router.get("/tip-of-the-day", response_model=TipResponse)
async def tip_of_the_day(
    current_user: dict = Depends(get_current_user),
    supabase=Depends(get_supabase),
    groq=Depends(get_groq_client),
):
    user_id: str = current_user["id"]

    # ── Fetch user profile for tier ───────────────────────────────────────────
    try:
        profile_resp = (
            supabase.table("profiles")
            .select("tier")
            .eq("id", user_id)
            .single()
            .execute()
        )
        tier: str = profile_resp.data.get("tier", "FREE") if profile_resp.data else "FREE"
    except Exception as e:
        logger.warning(f"Could not fetch tier for {user_id}: {e}")
        tier = "FREE"

    # ── For paid users: fetch latest assessment weak areas ────────────────────
    weak_areas: Optional[list[str]] = None
    recent_score: Optional[float] = None

    is_paid = tier.upper() in ("PRO", "PREMIUM")
    if is_paid:
        try:
            assessment_resp = (
                supabase.table("assessments")
                .select("overall_score, weak_areas")
                .eq("user_id", user_id)
                .order("created_at", desc=True)
                .limit(1)
                .single()
                .execute()
            )
            if assessment_resp.data:
                recent_score = assessment_resp.data.get("overall_score")
                raw_weak = assessment_resp.data.get("weak_areas")
                # weak_areas stored as JSON array of strings in your DB
                if isinstance(raw_weak, list):
                    weak_areas = raw_weak
                elif isinstance(raw_weak, str):
                    import json
                    weak_areas = json.loads(raw_weak)
        except Exception as e:
            logger.warning(f"Could not fetch assessment data for {user_id}: {e}")

    # ── Generate / retrieve tip ───────────────────────────────────────────────
    try:
        result = await get_tip_of_the_day(
            user_id=user_id,
            tier=tier,
            supabase=supabase,
            groq_client=groq,
            weak_areas=weak_areas,
            recent_score=recent_score,
        )
        return result
    except Exception as e:
        logger.error(f"Tip generation failed for {user_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Could not generate tip. Please try again later.",
        )
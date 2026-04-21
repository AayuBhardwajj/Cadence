"""
tip_router.py — /api/tip-of-the-day

Accepts user_id as a query parameter, consistent with all other
endpoints in this project (see /api/assessment/eligibility, etc.)
"""

import json
import logging
import os
from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel
from typing import Optional
from groq import Groq

from utils.supabase_client import supabase
from services.tip_service import get_tip_of_the_day

router = APIRouter(prefix="/api", tags=["tips"])
logger = logging.getLogger(__name__)

_groq_client = Groq(api_key=os.environ.get("GROQ_API_KEY"))


class TipResponse(BaseModel):
    tip: str
    is_personalized: bool
    generated_at: str
    cached: bool


@router.get("/tip-of-the-day", response_model=TipResponse)
async def tip_of_the_day(user_id: str):
    """
    user_id — Supabase auth UUID, passed as query param:
      GET /api/tip-of-the-day?user_id=<uuid>
    """
    if not user_id or len(user_id) < 10:
        raise HTTPException(status_code=401, detail="Invalid or missing user_id.")

    # ── Fetch tier from profiles ──────────────────────────────────────────────
    tier = "FREE"
    try:
        profile_resp = (
            supabase.table("profiles")
            .select("tier")
            .eq("id", user_id)
            .single()
            .execute()
        )
        if profile_resp.data:
            tier = profile_resp.data.get("tier", "FREE")
    except Exception as e:
        logger.warning(f"Could not fetch tier for {user_id[:8]}: {e}")

    # ── For paid users: fetch latest assessment weak areas ────────────────────
    weak_areas: Optional[list] = None
    recent_score: Optional[float] = None

    if tier.upper() in ("PRO", "PREMIUM"):
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
                if isinstance(raw_weak, list):
                    weak_areas = raw_weak
                elif isinstance(raw_weak, str):
                    weak_areas = json.loads(raw_weak)
        except Exception as e:
            logger.warning(f"Could not fetch assessment data for {user_id[:8]}: {e}")

    # ── Generate / retrieve tip ───────────────────────────────────────────────
    try:
        result = await get_tip_of_the_day(
            user_id=user_id,
            tier=tier,
            supabase=supabase,
            groq_client=_groq_client,
            weak_areas=weak_areas,
            recent_score=recent_score,
        )
        return result
    except Exception as e:
        logger.error(f"Tip generation failed for {user_id[:8]}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Could not generate tip. Please try again later.",
        )
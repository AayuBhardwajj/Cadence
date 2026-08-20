"""
Cadence ML Recommendation & Adaptive Learning Service (ml-recommendation).
Port: 9003.

Exposes endpoints:
- GET /health
- POST /profile/generate
- POST /recommendations/generate
- POST /profile/exercise-complete
"""

import os
import sys
import logging
from typing import Dict, Any, List, Optional
from pathlib import Path
from dotenv import load_dotenv

# Explicitly load backend/.env if SUPABASE_URL / GROQ_API_KEY is not in environment
SERVICE_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = SERVICE_DIR.parent.parent
BACKEND_ENV = PROJECT_ROOT / "backend" / ".env"
if BACKEND_ENV.exists():
    load_dotenv(BACKEND_ENV, override=True)

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from services.recommendation_service import RecommendationService

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
logger = logging.getLogger("ml-recommendation")

app = FastAPI(title="Cadence ML Recommendation Service", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class GenerateProfileRequest(BaseModel):
    user_id: str
    assessment_id: str
    scores: Dict[str, Any] = Field(..., description="Calculated scores e.g. overall_score, fluency, pronunciation, grammar, vocabulary")
    metrics: Dict[str, Any] = Field(default_factory=dict, description="Acoustic/text metrics e.g. filler_word_count, stutter_count")
    diagnostic_issues: Optional[Dict[str, Any]] = Field(default_factory=dict, description="Qualitative diagnostic errors from ml-analysis following D15 schema")


class GenerateRecommendationsRequest(BaseModel):
    user_id: str
    pre_generated_exercises: Optional[List[Dict[str, Any]]] = Field(
        default=None,
        description="Optional pre-generated exercises from deep analysis",
    )


class ExerciseCompleteRequest(BaseModel):
    user_id: str
    exercise_id: str
    category: str
    score: int
    issues_resolved: Optional[List[str]] = Field(default_factory=list)


@app.get("/health")
def health():
    return {
        "status": "healthy",
        "service": "ml-recommendation",
        "port": 9003,
    }


@app.post("/profile/generate")
async def generate_profile(req: GenerateProfileRequest):
    """
    Generates and updates a user's speech profile based on assessment score breakdown.
    """
    try:
        profile = await RecommendationService.generate_speech_profile(
            user_id=req.user_id,
            assessment_id=req.assessment_id,
            scores=req.scores,
            metrics=req.metrics,
            diagnostic_issues=req.diagnostic_issues,
        )
        return {
            "status": "success",
            "profile": profile,
        }
    except Exception as e:
        logger.exception("Failed to generate speech profile for user %s: %s", req.user_id, e)
        raise HTTPException(status_code=500, detail=f"Failed to generate speech profile: {e}")


@app.post("/recommendations/generate")
async def generate_recommendations(req: GenerateRecommendationsRequest):
    """
    Generates customized, prioritized recommendations based on the user's current speech profile.
    """
    try:
        recommendations = await RecommendationService.generate_recommendations(
            user_id=req.user_id,
            pre_generated_exercises=req.pre_generated_exercises,
        )
        return recommendations
    except Exception as e:
        logger.exception("Failed to generate recommendations for user %s: %s", req.user_id, e)
        raise HTTPException(status_code=500, detail=f"Failed to generate recommendations: {e}")


@app.post("/profile/exercise-complete")
async def complete_exercise(req: ExerciseCompleteRequest):
    """
    Handles exercise completion: computes score_delta internally, updates speech_profiles,
    and inserts user_exercise_history record.
    """
    try:
        if not 0 <= req.score <= 100:
            raise HTTPException(status_code=400, detail="Score must be between 0 and 100.")

        res = await RecommendationService.update_profile_from_exercise(
            user_id=req.user_id,
            exercise_id=req.exercise_id,
            category=req.category,
            score=req.score,
            issues_resolved=req.issues_resolved,
        )
        return res
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Failed to complete exercise for user %s: %s", req.user_id, e)
        raise HTTPException(status_code=500, detail=f"Failed to process exercise completion: {e}")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=9003)

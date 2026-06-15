from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import shutil
import os
import uuid
from typing import List
from dotenv import load_dotenv
load_dotenv()

from services.audio_service import analyze_audio
from utils.scoring import calculate_score
from utils.supabase_client import supabase
from services.recommendation_service import RecommendationService
from services.analysis_service import deep_analyze_speech
from services.content_generation_service import generate_assessment_package
from services.content_quality_service import evaluate_content_quality
from datetime import datetime
import logging

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("cadence")

app = FastAPI(title="Cadence AI Backend")

# ── Routers ───────────────────────────────────────────────────────────────────
from services.tip_router import router as tip_router
app.include_router(tip_router)

# ── CORS — env-driven, no wildcard ────────────────────────────────────────────
_raw_origins = os.environ.get("ALLOWED_ORIGINS", "http://localhost:5173")
ALLOWED_ORIGINS = [o.strip() for o in _raw_origins.split(",")]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

TEMP_DIR = "temp_uploads"
os.makedirs(TEMP_DIR, exist_ok=True)


def verify_user_id(user_id: str) -> str:
    if not user_id or len(user_id) < 10:
        raise HTTPException(status_code=401, detail="Invalid or missing user identity.")
    return user_id


def internal_error(e: Exception, context: str = "") -> HTTPException:
    logger.error(f"Error [{context}]: {e}", exc_info=True)
    return HTTPException(status_code=500, detail="An internal error occurred. Please try again.")


@app.get("/")
def read_root():
    return {"message": "Cadence AI Backend is running"}


from fastapi import Body

@app.post("/api/assessments/generate-content")
async def generate_content(body: dict = Body(...)):
    try:
        topic = body.get("topic")
        difficulty = body.get("difficulty", "intermediate")
        res = await generate_assessment_package(
            topic=topic,
            difficulty=difficulty
        )
        return res
    except Exception as e:
        raise internal_error(e, "generate_content")


@app.get("/api/assessment/eligibility")
async def get_eligibility(user_id: str):
    try:
        verify_user_id(user_id)
        return {"can_assess": True, "next_available_at": None, "assessments_remaining": 999}
    except HTTPException:
        raise
    except Exception as e:
        raise internal_error(e, "eligibility")


@app.post("/api/assessment/start")
async def start_assessment(user_id: str):
    try:
        verify_user_id(user_id)
        eligibility = await get_eligibility(user_id)
        if not eligibility.get("can_assess"):
            raise HTTPException(status_code=403, detail="Assessment not available yet.")
        return {"status": "success", "sessionId": str(uuid.uuid4())}
    except HTTPException:
        raise
    except Exception as e:
        raise internal_error(e, "start_assessment")


@app.post("/api/assessment/upload")
async def upload_assessment(
    file: UploadFile = File(...),
    sessionId: str = None,
    userId: str = None,
    topicId: str = "custom",
    duration: float = 0
):
    user_id = verify_user_id(userId)

    allowed_types = [
        "audio/webm", "video/webm", "audio/wav",
        "audio/mp4", "video/mp4", "audio/mpeg", "application/octet-stream"
    ]
    if file.content_type and file.content_type not in allowed_types:
        raise HTTPException(status_code=400, detail=f"Unsupported file type: {file.content_type}")

    temp_file_path = None
    try:
        file_ext = (file.filename or "recording.webm").split(".")[-1]
        temp_file_path = os.path.join(TEMP_DIR, f"{uuid.uuid4()}.{file_ext}")

        with open(temp_file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        logger.info(f"File saved for user {user_id[:8]}...")

        audio_data = analyze_audio(temp_file_path)
        # TODO: Wire to video_service.py MediaPipe analyzer once video processing is enabled.
        # Using 0 as a neutral placeholder to avoid artificially inflating confidence scores.
        video_data = {"eye_contact_percent": 0}
        score_data = calculate_score(audio_data, video_data)

        TOPIC_PROMPTS = {
            'workplace': 'An ideal workplace reflects values like collaboration, respect, and innovation.',
            'tech': 'Technology has transformed communication, relationships, education, and work.',
            'social': 'Social media influences friendships, relationships, identity, and self-expression.',
            'language': 'Learning multiple languages improves communication and career opportunities.',
            'custom': 'Please speak on a topic of your choice.'
        }

        logger.info(f"Starting deep analysis for user {user_id[:8]}...")
        deep_analysis = await deep_analyze_speech(
            audio_data,
            score_data,
            topic_id=topicId,
            topic_prompt=TOPIC_PROMPTS.get(topicId, TOPIC_PROMPTS['custom'])
        )

        if isinstance(deep_analysis, dict):
            score_data.update(deep_analysis)

        try:
            supabase.table('profiles').update({
                'last_full_assessment_at': datetime.now().isoformat()
            }).eq('id', user_id).execute()
        except Exception as e:
            logger.warning(f"Profile timestamp update failed: {e}")

        try:
            await RecommendationService.generate_speech_profile(user_id, sessionId, score_data, audio_data)
            practice_exercises = score_data.get("practice_exercises", [])
            await RecommendationService.generate_recommendations(user_id, pre_generated_exercises=practice_exercises)
        except Exception as e:
            logger.warning(f"Adaptive learning update failed: {e}")

        # Persist full analysis result to analysis_results table
        try:
            if isinstance(deep_analysis, dict):
                amcat_block = deep_analysis.get("amcat", {}) if isinstance(deep_analysis.get("amcat"), dict) else {}
                persist_data = {
                    "assessment_id": sessionId,
                    "overall_score": deep_analysis.get("overall_score", 0),
                    "cefr_level": deep_analysis.get("cefr_level", "A2"),
                    "transcription": deep_analysis.get("transcription", ""),
                    "breakdown": deep_analysis.get("breakdown", {}),
                    "amcat_metrics": deep_analysis.get("amcat_metrics", amcat_block.get("metrics", {})),
                    "amcat_insights": deep_analysis.get("amcat_insights", amcat_block.get("insights", {})),
                    "amcat_mti_deep_dive": deep_analysis.get("amcat_mti_deep_dive", amcat_block.get("mti_deep_dive", {})),
                    "amcat_transcript": deep_analysis.get("amcat_transcript", amcat_block.get("transcript", {})),
                    "amcat_error_log": deep_analysis.get("amcat_error_log", amcat_block.get("error_log", [])),
                    "amcat_sentences": deep_analysis.get("amcat_sentences", amcat_block.get("sentences", [])),
                    "stutter_analysis": deep_analysis.get("stutter_analysis", {}),
                    "mti_deep": deep_analysis.get("mti_deep", {})
                }
                supabase.table("analysis_results").insert(persist_data).execute()
        except Exception as db_err:
            # Log but do not fail the request — analysis already completed
            logger.error(f"Failed to persist analysis_results: {db_err}")

        # Content quality scoring
        try:
            transcript = audio_data.get("transcription", "")
            if transcript and len(transcript.strip()) > 20:
                content_quality = await evaluate_content_quality(
                    transcript=transcript,
                    original_prompt=TOPIC_PROMPTS.get(topicId, TOPIC_PROMPTS['custom']),
                    topic=topicId,
                    assessment_id=sessionId
                )
                # Attach to response for immediate display
                score_data["content_quality"] = content_quality
        except Exception as cq_err:
            logger.warning(f"Content quality scoring failed (non-blocking): {cq_err}")
            score_data["content_quality"] = None

        return {
            "sessionId": sessionId or str(uuid.uuid4()),
            "status": "completed",
            "results": score_data,
            "transcription": audio_data.get("transcription", ""),
            "content_quality": score_data.get("content_quality")
        }

    except HTTPException:
        raise
    except Exception as e:
        raise internal_error(e, "upload_assessment")
    finally:
        if temp_file_path and os.path.exists(temp_file_path):
            os.remove(temp_file_path)


@app.get("/api/assessment/results/{sessionId}")
async def get_results(sessionId: str):
    return {"message": f"Results for session {sessionId}", "status": "pending"}


@app.post("/api/exercises/complete")
async def complete_exercise(
    user_id: str,
    exercise_id: str,
    category: str,
    score: int,
    issues_resolved: List[str] = []
):
    try:
        verify_user_id(user_id)
        if not 0 <= score <= 100:
            raise HTTPException(status_code=400, detail="Score must be between 0 and 100.")

        score_delta = 5 if score > 80 else 2 if score > 60 else -1
        await RecommendationService.update_profile_from_exercise(user_id, category, score_delta, issues_resolved)

        supabase.table('user_exercise_history').insert({
            "user_id": user_id,
            "recommendation_id": exercise_id,
            "score": score
        }).execute()

        return {"status": "success", "message": "Profile updated based on performance"}
    except HTTPException:
        raise
    except Exception as e:
        raise internal_error(e, "complete_exercise")


@app.get("/api/recommendations")
async def get_recommendations(user_id: str):
    try:
        verify_user_id(user_id)
        return await RecommendationService.generate_recommendations(user_id)
    except HTTPException:
        raise
    except Exception as e:
        raise internal_error(e, "get_recommendations")


@app.post("/analyze")
async def analyze_legacy(file: UploadFile = File(...)):
    return await upload_assessment(file=file, userId="legacy-user")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
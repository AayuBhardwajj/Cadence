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
from services.content_quality_service import evaluate_content_quality
from contextlib import asynccontextmanager
import asyncio
from utils.ai_usage_logger import log_whisper_usage
from datetime import datetime, timezone
import logging

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("cadence")

# TODO: This cron-based refill is a temporary implementation. Once RabbitMQ 
# is set up (per MIGRATION_ROADMAP.md), replace this with a queue-based 
# approach: publish a 'refill_needed' message per combo when pool count drops 
# low (can be checked opportunistically in get_or_generate_passage's fallback 
# path, or via a lighter periodic check), consumed by a dedicated worker. 
# Do not remove this todo until that migration happens.

# Superseded by content-service, see DECISIONS.md D10
# _raw_refill_interval = os.environ.get("REFILL_INTERVAL_SECONDS", "600")
# try:
#     REFILL_INTERVAL_SECONDS = max(1, int(_raw_refill_interval))
# except ValueError:
#     logger.warning(
#         f"Invalid REFILL_INTERVAL_SECONDS value '{_raw_refill_interval}'; "
#         "falling back to 600 seconds."
#     )
#     REFILL_INTERVAL_SECONDS = 600
# 
# async def refill_worker_loop():
#     logger.info(
#         f"Refill worker loop background task started "
#         f"(interval={REFILL_INTERVAL_SECONDS}s)."
#     )
#     # Wait a few seconds for startup to complete before the first refill cycle
#     await asyncio.sleep(5)
#     while True:
#         try:
#             await refill_passages()
#         except Exception as e:
#             logger.error(f"Error in refill worker cycle: {e}", exc_info=True)
#         await asyncio.sleep(REFILL_INTERVAL_SECONDS)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # CUTOVER (DECISIONS.md D1 content-service migration): The passage pool refill worker
    # loop has been ported to Spring Boot content-service (@Scheduled RefillWorker on port 8084).
    # Disabling Python background loop to avoid double-firing refills or lock contention.
    # Superseded by content-service, see DECISIONS.md D10
    # refill_task = asyncio.create_task(refill_worker_loop())
    # logger.info("Python refill_worker_loop disabled in lifespan — active in content-service (Port 8084).")
    yield
    # Shutdown logic
    # logger.info("Cancelling refill worker loop...")
    # refill_task.cancel()

app = FastAPI(title="Cadence AI Backend", lifespan=lifespan)

# ── Routers ───────────────────────────────────────────────────────────────────
# Superseded by content-service, see DECISIONS.md D10
# from services.tip_router import router as tip_router
# app.include_router(tip_router)

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

# Superseded by content-service, see DECISIONS.md D10
# # DEPRECATED / SUPERSEDED:
# # As of the passage_pool migration, /api/assessments/generate-content is superseded
# # by /api/passages/generate (passage_pool serving layer). It is no longer invoked
# # by the live frontend flow. Preserved for backward compatibility / legacy consumers.
# @app.post("/api/assessments/generate-content")
# async def generate_content(body: dict = Body(...)):
#     try:
#         topic = body.get("topic")
#         difficulty = body.get("difficulty", "intermediate")
#         res = await generate_assessment_package(
#             topic=topic,
#             difficulty=difficulty
#         )
#         return res
#     except Exception as e:
#         raise internal_error(e, "generate_content")


# Superseded by content-service, see DECISIONS.md D10
# STATIC_TOPIC_PROMPTS = {
#     'workplace': 'An ideal workplace reflects values like collaboration, respect, and innovation.',
#     'workplace_communication': 'An ideal workplace reflects values like collaboration, respect, and innovation.',
#     'tech': 'Technology has transformed communication, relationships, education, and work.',
#     'technology': 'Technology has transformed communication, relationships, education, and work.',
#     'social': 'Social media influences friendships, relationships, identity, and self-expression.',
#     'social_situations': 'Social media influences friendships, relationships, identity, and self-expression.',
#     'academic': 'Learning multiple languages improves communication and career opportunities.',
#     'academic_english': 'Learning multiple languages improves communication and career opportunities.',
#     'interview': 'Preparing for an interview requires reflection on career goals and key strengths.',
#     'job_interview': 'Preparing for an interview requires reflection on career goals and key strengths.',
#     'custom': 'Please speak on a topic of your choice.'
# }
# 
# 
# @app.post("/api/passages/generate")
# async def generate_passage_endpoint(body: dict = Body(...)):
#     try:
#         difficulty = body.get("difficulty")
#         raw_topic = body.get("topic")
#         issue_type = body.get("issue_type")
#         word_count = body.get("word_count", 8)
#         session_id = body.get("sessionId") or body.get("session_id")
# 
#         # Normalize short TopicSelection.tsx slugs to the canonical keys expected
#         # by TOPIC_TO_WORD_BANK_MAP and the passage pool system. Without this,
#         # 4/5 topics ('workplace','social','academic','interview') silently miss
#         # pool inventory and fall back to the 'general' word-bank bucket.
#         _TOPIC_ALIAS: dict[str, str] = {
#             "workplace": "workplace_communication",
#             "social":    "social_situations",
#             "academic":  "academic_english",
#             "interview": "job_interview",
#             "tech":      "technology",
#         }
#         topic = _TOPIC_ALIAS.get((raw_topic or "").lower(), raw_topic)
# 
#         # If both topic and difficulty are provided, use the serving/pooling layer
#         if topic and difficulty:
#             res = await get_or_generate_passage(
#                 topic=topic,
#                 difficulty=difficulty,
#                 issue_type=issue_type,
#                 word_count=int(word_count)
#             )
#         else:
#             res = await generate_passage(
#                 difficulty=difficulty,
#                 topic=topic,
#                 issue_type=issue_type,
#                 word_count=int(word_count)
#             )
# 
#         passage_id = res.get("passage_id")
#         if session_id and passage_id:
#             try:
#                 supabase.table("assessment_sessions").update({
#                     "passage_id": passage_id
#                 }).eq("id", session_id).execute()
#                 logger.info(
#                     "Successfully linked passage_id %s to assessment_session %s",
#                     passage_id, session_id
#                 )
#             except Exception as err:
#                 logger.exception(
#                     "Failed to write passage_id to assessment_sessions for session %s: %s",
#                     session_id, err
#                 )
# 
#         # Use the resolved (canonical) topic key for the static prompt lookup
#         topic_key = (topic or "custom").lower()
#         res["topic_prompt"] = STATIC_TOPIC_PROMPTS.get(topic_key, STATIC_TOPIC_PROMPTS['custom'])
#         return res
#     except Exception as e:
#         raise internal_error(e, "generate_passage_endpoint")


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
        new_session_id = str(uuid.uuid4())
        try:
            supabase.table("assessments").insert({
                "id": new_session_id,
                "user_id": user_id,
            }).execute()
        except Exception as insert_err:
            raise internal_error(insert_err, "start_assessment_insert")

        # DUAL-WRITE (expand-contract D6): mirror to assessment_sessions.
        # This table is supplementary during the dual-write phase; a failure
        # here must NOT block the assessments insert or the success response.
        persistence_warnings: list[str] = []
        try:
            supabase.table("assessment_sessions").insert({
                "id": new_session_id,
                "user_id": user_id,
                "status": "pending",
                # created_at intentionally omitted — using column default
            }).execute()
        except Exception as err:
            logger.exception(
                "dual-write: assessment_sessions insert failed for session %s — continuing",
                new_session_id,
            )
            persistence_warnings.append(
                f"Failed to create assessment_sessions row: {type(err).__name__}"
            )

        return {"status": "success", "sessionId": new_session_id, "persistence_warnings": persistence_warnings}
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

        # Log Whisper transcription cost
        log_whisper_usage(
            duration_seconds=audio_data.get("duration", 0),
            model="base",
            assessment_id=sessionId,
            user_id=user_id,
        )

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

        # Query real passage_text from linked generated_passages via assessment_sessions.passage_id
        real_passage_text = None
        if sessionId:
            try:
                sess_res = supabase.table("assessment_sessions").select("passage_id").eq("id", sessionId).limit(1).execute()
                if sess_res.data and sess_res.data[0].get("passage_id"):
                    pid = sess_res.data[0]["passage_id"]
                    pass_res = supabase.table("generated_passages").select("passage_text").eq("id", pid).limit(1).execute()
                    if pass_res.data and pass_res.data[0].get("passage_text"):
                        real_passage_text = pass_res.data[0]["passage_text"]
                        logger.info("Successfully fetched real passage_text for session %s (passage_id=%s)", sessionId, pid)
            except Exception as passage_err:
                logger.warning("Failed to fetch linked passage_text for session %s: %s", sessionId, passage_err)

        chosen_topic_prompt = real_passage_text or TOPIC_PROMPTS.get(topicId, TOPIC_PROMPTS['custom'])

        logger.info(f"Starting deep analysis for user {user_id[:8]}...")
        deep_analysis = await deep_analyze_speech(
            audio_data,
            score_data,
            topic_id=topicId,
            topic_prompt=chosen_topic_prompt,
            reference_passage=real_passage_text,
            assessment_id=sessionId,
            user_id=user_id,
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

        # Accumulates short, frontend-readable strings for any persistence
        # failures that occurred after expensive work had already completed.
        # Always present in the response; empty list means full success.
        persistence_warnings: list[str] = []

        # Update the assessments row with analyzed metrics
        try:
            supabase.table("assessments").update({
                "overall_score": score_data.get("overall_score"),
                "wpm": audio_data.get("wpm"),
                "eye_contact_score": video_data.get("eye_contact_percent"),
                "filler_word_count": audio_data.get("filler_count"),
                "feedback": score_data.get("feedback"),
                "transcription": audio_data.get("transcription", ""),
            }).eq("id", sessionId).execute()
        except Exception as err:
            logger.exception("Failed to update assessments row for session %s", sessionId)
            persistence_warnings.append(
                f"Failed to persist to assessments: {type(err).__name__}"
            )

        # DUAL-WRITE (expand-contract D6): persist flat score breakdown into
        # assessment_reports. weak_areas is intentionally omitted — see
        # BUGS_AND_ISSUES.md for the open issue on that column.
        try:
            _breakdown = score_data.get("breakdown", {})
            supabase.table("assessment_reports").insert({
                "assessment_session_id": sessionId,
                "transcription": audio_data.get("transcription", ""),
                "overall_score": score_data.get("overall_score"),
                "pronunciation_score": _breakdown.get("pronunciation"),
                "fluency_score": _breakdown.get("fluency"),
                "clarity_score": _breakdown.get("clarity"),
                "grammar_score": _breakdown.get("grammar"),
                "vocabulary_score": _breakdown.get("vocabulary"),
                "confidence_score": _breakdown.get("confidence"),
                "cefr_level": score_data.get("cefr_level"),
                "wpm": _breakdown.get("wpm"),
                "filler_word_count": _breakdown.get("fillers"),
                "eye_contact_score": _breakdown.get("eye_contact"),
                "strengths": score_data.get("strengths"),
                "focus_areas": score_data.get("focus_areas"),
                "feedback": score_data.get("feedback"),
            }).execute()
        except Exception as err:
            logger.exception(
                "dual-write: assessment_reports insert failed for session %s — continuing",
                sessionId,
            )
            persistence_warnings.append(
                f"Failed to persist to assessment_reports: {type(err).__name__}"
            )

        # DUAL-WRITE (expand-contract D6): backfill topic/duration onto
        # assessment_sessions now that upload parameters are available.
        try:
            supabase.table("assessment_sessions").update({
                "topic_id": topicId,
                "duration_seconds": int(duration) if duration is not None else None,
                "status": "completed",
                "completed_at": datetime.now(timezone.utc).isoformat(),
            }).eq("id", sessionId).execute()
        except Exception as err:
            logger.exception(
                "dual-write: assessment_sessions update failed for session %s — continuing",
                sessionId,
            )
            persistence_warnings.append(
                f"Failed to update assessment_sessions: {type(err).__name__}"
            )

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
                    "amcat_sentences": deep_analysis.get("amcat_sentences", amcat_block.get("sentences", []))
                }
                supabase.table("analysis_results").insert(persist_data).execute()
        except Exception as err:
            # Log but do not fail the request — analysis already completed
            logger.exception("Failed to persist analysis_results for session %s", sessionId)
            persistence_warnings.append(
                f"Failed to persist to analysis_results: {type(err).__name__}"
            )

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
            "content_quality": score_data.get("content_quality"),
            "persistence_warnings": persistence_warnings,
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


@app.get("/api/admin/ai-usage")
async def get_ai_usage(
    from_date: str | None = None,
    to_date: str | None = None,
    provider: str | None = None,
):
    """
    Returns AI usage summary grouped by provider and model.
    Query params: from_date (ISO), to_date (ISO), provider ('groq'|'gemini'|'whisper')
    """
    try:
        query = supabase.table("ai_usage_logs").select(
            "provider, model, purpose, input_tokens, output_tokens, estimated_cost_usd, created_at"
        )
        if from_date:
            query = query.gte("created_at", from_date)
        if to_date:
            query = query.lte("created_at", to_date)
        if provider:
            query = query.eq("provider", provider)

        result = query.order("created_at", desc=True).limit(500).execute()
        rows = result.data or []

        # Aggregate summary
        summary = {}
        for row in rows:
            key = f"{row['provider']}:{row['model']}"
            if key not in summary:
                summary[key] = {
                    "provider": row["provider"],
                    "model": row["model"],
                    "total_calls": 0,
                    "total_input_tokens": 0,
                    "total_output_tokens": 0,
                    "total_cost_usd": 0.0,
                }
            summary[key]["total_calls"] += 1
            summary[key]["total_input_tokens"] += row.get("input_tokens") or 0
            summary[key]["total_output_tokens"] += row.get("output_tokens") or 0
            summary[key]["total_cost_usd"] += float(row.get("estimated_cost_usd") or 0)

        return {
            "rows": rows,
            "summary": list(summary.values()),
            "total_cost_usd": round(sum(r.get("estimated_cost_usd") or 0 for r in rows if r.get("estimated_cost_usd")), 6),
            "total_calls": len(rows),
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
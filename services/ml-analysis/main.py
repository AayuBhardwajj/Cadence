"""HTTP boundary for Cadence's deterministic scoring and LLM analysis.

This service runs independently, utilizing the ml-shared package for LLM
routing, cost logging, and Supabase client access.
"""

from contextlib import asynccontextmanager
import logging
from pathlib import Path
from typing import Any

from fastapi import FastAPI, HTTPException
from dotenv import load_dotenv
from pydantic import BaseModel, Field

BACKEND_DIR = Path(__file__).resolve().parents[2] / "backend"
BACKEND_ENV = BACKEND_DIR / ".env"
load_dotenv(BACKEND_ENV, override=True)

# Also load service-local .env if present
LOCAL_ENV = Path(__file__).resolve().parent / ".env"
if LOCAL_ENV.exists():
    load_dotenv(LOCAL_ENV, override=True)

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
logger = logging.getLogger("ml-analysis")

from services.analysis_service import deep_analyze_speech  # noqa: E402
from services.content_quality_service import evaluate_content_quality  # noqa: E402
from utils.scoring import calculate_score  # noqa: E402
from amqp_consumer import AmqpConsumer  # noqa: E402


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Manage startup and shutdown lifecycle for ml-analysis, including AMQP consumer."""
    consumer = AmqpConsumer()
    try:
        await consumer.start()
        app.state.amqp_consumer = consumer
    except Exception as err:
        logger.error("Failed to start AMQP consumer (service will continue in HTTP-only mode): %s", err)
        app.state.amqp_consumer = None

    yield

    if app.state.amqp_consumer:
        await app.state.amqp_consumer.stop()


class DeepAnalysisRequest(BaseModel):
    audio_data: dict[str, Any]
    video_data: dict[str, Any] = Field(default_factory=dict)
    topic_id: str = "custom"
    topic_prompt: str = ""
    reference_passage: str | None = None
    assessment_id: str | None = None
    user_id: str | None = None


class QualityRequest(BaseModel):
    transcript: str
    original_prompt: str
    topic: str
    assessment_id: str | None = None


app = FastAPI(title="Cadence ML Analysis Service", lifespan=lifespan)


@app.get("/health")
def health_check() -> dict[str, str]:
    return {"status": "healthy", "service": "ml-analysis", "port": "9002"}


@app.post("/analyze/deep")
async def analyze_deep(request: DeepAnalysisRequest) -> dict[str, Any]:
    """Calculate deterministic scores, then add qualitative LLM analysis."""
    try:
        score_data = calculate_score(request.audio_data, request.video_data)
        deep_analysis = await deep_analyze_speech(
            request.audio_data,
            score_data,
            topic_id=request.topic_id,
            topic_prompt=request.topic_prompt,
            reference_passage=request.reference_passage,
            assessment_id=request.assessment_id,
            user_id=request.user_id,
        )
        if isinstance(deep_analysis, dict):
            score_data.update(deep_analysis)
        return score_data
    except Exception as error:
        raise HTTPException(status_code=500, detail=f"Speech analysis failed: {error}") from error


@app.post("/quality")
async def analyze_quality(request: QualityRequest) -> dict[str, Any]:
    """Return the existing content-quality contract unchanged."""
    try:
        return await evaluate_content_quality(
            transcript=request.transcript,
            original_prompt=request.original_prompt,
            topic=request.topic,
            assessment_id=request.assessment_id,
        )
    except Exception as error:
        raise HTTPException(status_code=500, detail=f"Content quality analysis failed: {error}") from error


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=9002)

"""
ml-recommendation AMQP consumer — Phase 3 Stage 3.

Consumes from: ml-recommendation.analysis.completed (durable queue, bound to
               analysis.completed fanout exchange — declared by ml-analysis Stage 2)
Publishes to:  recommendations.updated (durable direct queue — declared here)

Processing pipeline per message:
  1. Deserialize analysis.completed payload.
  2. Extract diagnostic_issues from score_data (D15 schema).
  3. Call RecommendationService.generate_speech_profile() to update speech_profiles.
  4. Call RecommendationService.generate_recommendations() to update exercise_recommendations.
  5. Publish signal to recommendations.updated so report-service can broadcast WebSocket push.
  6. ACK message on success; NACK (no requeue) on unhandled error → dead-letter queue.

Failure semantics: fail-closed (D-impl approved).
  - If profile/recommendations generation fails with an unhandled exception,
    the message is NACKed without requeue. recommendations.updated is NOT published.
  - The session stays stuck without automated recovery (same gap as documented in
    BUGS_AND_ISSUES.md §4). No silent false-positive notification is ever sent.

lexical_gaps: explicitly deferred per DECISIONS.md D15 Q1. Always [].
"""

import asyncio
import json
import logging
from datetime import datetime, timezone
from typing import Any

import aio_pika
from aio_pika import DeliveryMode, ExchangeType, Message

from services.recommendation_service import RecommendationService

logger = logging.getLogger("ml-recommendation.amqp")

# ── Topology constants ────────────────────────────────────────────────────────
RABBITMQ_URL = "amqp://cadence:cadence_dev_pw@localhost:5672/"

# Inbound — declared by ml-analysis Stage 2; consumed passively here (passive=False
# ensures idempotent re-declaration with the same durable/exclusive=False settings).
INBOUND_QUEUE = "ml-recommendation.analysis.completed"

# Outbound — simple durable direct queue, single consumer (report-service Stage 4).
# Declared here (expand-contract: report-service will attach consumer in Stage 4).
OUTBOUND_QUEUE = "recommendations.updated"

PREFETCH_COUNT = 1  # process one message at a time; match ml-analysis pattern


# ── Message processing ────────────────────────────────────────────────────────

def _extract_diagnostic_issues(score_data: dict[str, Any]) -> dict[str, Any]:
    """
    Mirrors backend/main.py:474-487.
    Extracts D15-schema diagnostic_issues from score_data fields.
    """
    amcat_error_log = score_data.get("amcat_error_log", [])
    pronunciation_errors = [
        err for err in amcat_error_log
        if isinstance(err, dict) and err.get("category") == "Pronunciation"
    ]
    grammar_errors = score_data.get("grammar_errors", [])
    # lexical_gaps explicitly deferred per DECISIONS.md D15 Q1
    lexical_gaps: list[dict[str, Any]] = []

    return {
        "pronunciation_errors": pronunciation_errors,
        "grammar_errors": grammar_errors,
        "lexical_gaps": lexical_gaps,
    }


async def _process_message(
    message: aio_pika.abc.AbstractIncomingMessage,
    outbound_queue_obj: aio_pika.abc.AbstractQueue,
    channel: aio_pika.abc.AbstractChannel,
) -> None:
    """
    Core handler for a single analysis.completed message.
    Fail-closed: any unhandled exception NACKs without requeue.
    """
    async with message.process(requeue=False):
        try:
            payload = json.loads(message.body.decode("utf-8"))
        except (json.JSONDecodeError, UnicodeDecodeError) as exc:
            logger.error("ml-recommendation.amqp: malformed message body, discarding: %s", exc)
            return  # message.process(requeue=False) will NACK on exit

        session_id = payload.get("session_id", "<unknown>")
        user_id = payload.get("user_id", "<unknown>")
        score_data: dict[str, Any] = payload.get("score_data", {})
        audio_data: dict[str, Any] = payload.get("audio_data", {})
        pre_generated_exercises = score_data.get("practice_exercises") or []

        logger.info(
            "ml-recommendation.amqp: analysis.completed received: "
            "session=%s user=%s (overall_score=%s)",
            session_id,
            user_id,
            score_data.get("overall_score", "?"),
        )

        diagnostic_issues = _extract_diagnostic_issues(score_data)
        logger.info(
            "ml-recommendation.amqp: diagnostic_issues extracted — "
            "pronunciation_errors=%d grammar_errors=%d lexical_gaps=0 (deferred D15)",
            len(diagnostic_issues["pronunciation_errors"]),
            len(diagnostic_issues["grammar_errors"]),
        )

        # ── Step 1: Update speech profile ─────────────────────────────────────
        profile = await RecommendationService.generate_speech_profile(
            user_id=user_id,
            assessment_id=session_id,
            scores=score_data,
            metrics=audio_data,
            diagnostic_issues=diagnostic_issues,
        )
        logger.info(
            "ml-recommendation.amqp: speech profile updated for session=%s "
            "(weakness_1=%s weakness_2=%s weakness_3=%s)",
            session_id,
            profile.get("weakness_priority_1"),
            profile.get("weakness_priority_2"),
            profile.get("weakness_priority_3"),
        )

        # ── Step 2: Generate exercise recommendations ──────────────────────────
        await RecommendationService.generate_recommendations(
            user_id=user_id,
            pre_generated_exercises=pre_generated_exercises,
        )
        logger.info(
            "ml-recommendation.amqp: exercise recommendations updated for session=%s",
            session_id,
        )

        # ── Step 3: Publish recommendations.updated signal ────────────────────
        signal = json.dumps({
            "event": "recommendations.updated",
            "session_id": session_id,
            "user_id": user_id,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }).encode("utf-8")

        await channel.default_exchange.publish(
            Message(
                body=signal,
                delivery_mode=DeliveryMode.PERSISTENT,
                content_type="application/json",
            ),
            routing_key=OUTBOUND_QUEUE,
        )
        logger.info(
            "ml-recommendation.amqp: recommendations.updated published for session=%s",
            session_id,
        )
        # ACK is implicit on clean exit from message.process() context manager.


# ── Consumer lifecycle ────────────────────────────────────────────────────────

async def start_amqp_consumer(app: Any) -> None:
    """
    Connect to RabbitMQ, declare topology, and start consuming.
    Called from the FastAPI lifespan startup phase.
    Stores connection/channel on app.state for clean shutdown.
    """
    amqp_url = RABBITMQ_URL
    try:
        connection = await aio_pika.connect_robust(amqp_url)
        channel = await connection.channel()
        await channel.set_qos(prefetch_count=PREFETCH_COUNT)

        # Inbound queue — durable, already declared by ml-analysis Stage 2.
        # Re-declaring with the same parameters is idempotent.
        inbound_queue = await channel.declare_queue(
            INBOUND_QUEUE,
            durable=True,
            exclusive=False,
            auto_delete=False,
        )

        # Outbound queue — durable direct queue. Declared here; report-service
        # attaches a consumer in Stage 4 (expand-contract).
        await channel.declare_queue(
            OUTBOUND_QUEUE,
            durable=True,
            exclusive=False,
            auto_delete=False,
        )

        logger.info(
            "ml-recommendation.amqp: topology declared — "
            "inbound=%r outbound=%r",
            INBOUND_QUEUE,
            OUTBOUND_QUEUE,
        )

        # Start consuming — capture consumer_tag for clean cancellation
        consumer_tag = await inbound_queue.consume(
            lambda msg: asyncio.ensure_future(
                _process_message(msg, None, channel)
            )
        )

        app.state.amqp_connection = connection
        app.state.amqp_channel = channel
        app.state.amqp_consumer_tag = consumer_tag
        app.state.amqp_inbound_queue = inbound_queue

        logger.info(
            "ml-recommendation.amqp: consumer active — "
            "listening on %r (prefetch=%d)",
            INBOUND_QUEUE,
            PREFETCH_COUNT,
        )

    except Exception as exc:  # noqa: BLE001
        logger.error(
            "ml-recommendation.amqp: failed to connect/start consumer: %s — "
            "HTTP endpoints remain operational",
            exc,
        )
        app.state.amqp_connection = None


async def stop_amqp_consumer(app: Any) -> None:
    """
    Cancel the consumer and close the connection cleanly.
    Called from the FastAPI lifespan shutdown phase.
    """
    conn = getattr(app.state, "amqp_connection", None)
    if conn is None:
        return
    try:
        q = getattr(app.state, "amqp_inbound_queue", None)
        tag = getattr(app.state, "amqp_consumer_tag", None)
        if q and tag:
            await q.cancel(tag)
        await conn.close()
        logger.info("ml-recommendation.amqp: consumer stopped.")
    except Exception as exc:  # noqa: BLE001
        logger.warning("ml-recommendation.amqp: error during shutdown: %s", exc)

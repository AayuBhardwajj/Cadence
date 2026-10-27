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
import os
from datetime import datetime, timezone
from typing import Any

import aio_pika
from aio_pika import DeliveryMode, ExchangeType, Message

from services.recommendation_service import RecommendationService

logger = logging.getLogger("ml-recommendation.amqp")

# ── Topology constants ────────────────────────────────────────────────────────
# D26 dead-code: hardcoded cadence_dev_pw default removed
# RABBITMQ_URL = "amqp://cadence:cadence_dev_pw@localhost:5672/"  # D26


def get_rabbitmq_url() -> str:
    host = os.getenv("RABBITMQ_HOST", "localhost")
    port = os.getenv("RABBITMQ_PORT", "5672")
    user = os.getenv("RABBITMQ_USERNAME", "cadence")
    password = os.getenv("RABBITMQ_PASSWORD")
    if not password:
        raise RuntimeError(
            "RABBITMQ_PASSWORD is not set. "
            "Run infrastructure/dev/make-env.sh to generate env/dev.env, then use "
            "infrastructure/dev/with-env.sh dev -- <command>."
        )
    return f"amqp://{user}:{password}@{host}:{port}/"

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
    If RabbitMQ is unavailable at startup, launches background reconnection task.
    """
    # D26 dead-code: amqp_url = RABBITMQ_URL
    amqp_url = get_rabbitmq_url()
    app.state.amqp_closing = False
    app.state.amqp_reconnect_task = None

    try:
        connection = await aio_pika.connect_robust(
            amqp_url,
            client_properties={"connection_name": "cadence:ml-recommendation"},
        )
        channel = await connection.channel()
        await channel.set_qos(prefetch_count=PREFETCH_COUNT)

        inbound_queue = await channel.declare_queue(
            INBOUND_QUEUE,
            durable=True,
            exclusive=False,
            auto_delete=False,
        )

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
        logger.warning(
            "ml-recommendation.amqp: RabbitMQ not ready at startup: %s. Continuing in HTTP-only mode; launching background reconnection task.",
            exc,
        )
        app.state.amqp_connection = None
        app.state.amqp_reconnect_task = asyncio.create_task(_reconnect_loop(app, amqp_url))

    # Replaced finite 10x2s retry loop with background reconnect task (D-stall-fix)
    # try:
    #     max_retries = 10
    #     retry_delay = 2
    #     connection = None
    #     for attempt in range(1, max_retries + 1):
    #         try:
    #             connection = await aio_pika.connect_robust(
    #                 amqp_url,
    #                 client_properties={"connection_name": "cadence:ml-recommendation"},
    #             )
    #             break
    #         except Exception as conn_err:
    #             if attempt == max_retries:
    #                 logger.error("Failed to connect to RabbitMQ after %d attempts: %s", max_retries, conn_err)
    #                 raise
    #             logger.warning(
    #                 "RabbitMQ not ready yet (attempt %d/%d): %s. Retrying in %ds...",
    #                 attempt, max_retries, conn_err, retry_delay
    #             )
    #             await asyncio.sleep(retry_delay)
    #     channel = await connection.channel()
    #     await channel.set_qos(prefetch_count=PREFETCH_COUNT)
    #     inbound_queue = await channel.declare_queue(
    #         INBOUND_QUEUE,
    #         durable=True,
    #         exclusive=False,
    #         auto_delete=False,
    #     )
    #     await channel.declare_queue(
    #         OUTBOUND_QUEUE,
    #         durable=True,
    #         exclusive=False,
    #         auto_delete=False,
    #     )
    #     consumer_tag = await inbound_queue.consume(
    #         lambda msg: asyncio.ensure_future(
    #             _process_message(msg, None, channel)
    #         )
    #     )
    #     app.state.amqp_connection = connection
    #     app.state.amqp_channel = channel
    #     app.state.amqp_consumer_tag = consumer_tag
    #     app.state.amqp_inbound_queue = inbound_queue
    # except Exception as exc:
    #     logger.error(
    #         "ml-recommendation.amqp: failed to connect/start consumer: %s — "
    #         "HTTP endpoints remain operational",
    #         exc,
    #     )
    #     app.state.amqp_connection = None


async def _reconnect_loop(app: Any, amqp_url: str) -> None:
    """Background retry loop with capped exponential backoff until RabbitMQ connects."""
    delay = 2.0
    max_delay = 30.0
    attempt = 0
    while not getattr(app.state, "amqp_closing", False):
        try:
            await asyncio.sleep(delay)
            if getattr(app.state, "amqp_closing", False):
                break
            attempt += 1
            connection = await aio_pika.connect_robust(
                amqp_url,
                client_properties={"connection_name": "cadence:ml-recommendation"},
            )
            channel = await connection.channel()
            await channel.set_qos(prefetch_count=PREFETCH_COUNT)

            inbound_queue = await channel.declare_queue(
                INBOUND_QUEUE,
                durable=True,
                exclusive=False,
                auto_delete=False,
            )

            await channel.declare_queue(
                OUTBOUND_QUEUE,
                durable=True,
                exclusive=False,
                auto_delete=False,
            )

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
                "ml-recommendation.amqp: successfully connected (late connect on attempt %d) — listening on %r (prefetch=%d)",
                attempt,
                INBOUND_QUEUE,
                PREFETCH_COUNT,
            )
            break
        except asyncio.CancelledError:
            break
        except Exception as exc:
            logger.warning(
                "ml-recommendation.amqp: reconnect attempt %d failed: %s. Retrying in %.1fs...",
                attempt,
                exc,
                delay,
            )
            delay = min(delay * 2, max_delay)


async def stop_amqp_consumer(app: Any) -> None:
    """
    Cancel the consumer, background reconnect task, and close the connection cleanly.
    Called from the FastAPI lifespan shutdown phase.
    """
    app.state.amqp_closing = True
    task = getattr(app.state, "amqp_reconnect_task", None)
    if task and not task.done():
        task.cancel()
        try:
            await task
        except asyncio.CancelledError:
            pass

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

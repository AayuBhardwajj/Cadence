"""AMQP consumer for ml-analysis service.

Pipeline position (Phase 3 Stage 2):
  analysis.audio.completed (queue) -> ml-analysis (this worker) -> analysis.completed (fanout exchange)
                                                                       ├── report-service.analysis.completed (queue)
                                                                       └── ml-recommendation.analysis.completed (queue)

Topological guarantees (D15 Q5 / D-impl-1):
  - analysis.audio.completed: durable=True, exclusive=False, auto_delete=False (direct queue)
  - analysis.completed: durable=True (fanout exchange)
  - report-service.analysis.completed: durable=True, bound to analysis.completed
  - ml-recommendation.analysis.completed: durable=True, bound to analysis.completed
  - prefetch_count=1: For a single, unscaled ml-analysis instance (no parallelism benefit yet),
    processing one assessment sequentially avoids interleaving concurrent multi-second LLM API calls
    and keeps memory and API rate limits predictable.

Error handling & Stuck Sessions:
  - Unrecoverable errors (malformed JSON, missing session_id/audio_data) trigger nack(requeue=False)
    to prevent infinite poison-message loops.
  - KNOWN GAP (BUGS_AND_ISSUES.md §4): If ml-analysis dead-letters a message and never publishes
    analysis.completed, report-service receives no notification and assessment_sessions.status remains
    in 'uploading' or 'processing'. No automated watchdog or alerting exists today; detection relies
    on manual query.
"""

import asyncio
import json
import logging
import os
from typing import Any, Optional

import aio_pika
from dotenv import load_dotenv

from ml_shared.supabase_client import supabase
from services.analysis_service import deep_analyze_speech
from utils.scoring import calculate_score

logger = logging.getLogger("ml-analysis.amqp")

# Queue and Exchange Constants
# MUST match queue declarations across all services (D-impl-1 / D15)
QUEUE_ANALYSIS_AUDIO_COMPLETED = "analysis.audio.completed"
EXCHANGE_ANALYSIS_COMPLETED = "analysis.completed"
QUEUE_REPORT_SERVICE_COMPLETED = "report-service.analysis.completed"
QUEUE_ML_RECOMMENDATION_COMPLETED = "ml-recommendation.analysis.completed"

TOPIC_PROMPTS = {
    "workplace": "An ideal workplace reflects values like collaboration, respect, and innovation.",
    "tech": "Technology has transformed communication, relationships, education, and work.",
    "social": "Social media influences friendships, relationships, identity, and self-expression.",
    "language": "Learning multiple languages improves communication and career opportunities.",
    "custom": "Please speak on a topic of your choice.",
}


class AmqpConsumer:
    """Manages the RabbitMQ connection, channel, and consumer lifecycle for ml-analysis."""

    def __init__(self, amqp_url: Optional[str] = None):
        if not amqp_url:
            host = os.getenv("RABBITMQ_HOST", "localhost")
            port = os.getenv("RABBITMQ_PORT", "5672")
            user = os.getenv("RABBITMQ_USERNAME", "cadence")
            password = os.getenv("RABBITMQ_PASSWORD", "cadence_dev_pw")
            amqp_url = f"amqp://{user}:{password}@{host}:{port}/"

        self.amqp_url = amqp_url
        self.connection: Optional[aio_pika.RobustConnection] = None
        self.channel: Optional[aio_pika.RobustChannel] = None
        self.incoming_queue: Optional[aio_pika.RobustQueue] = None
        self.fanout_exchange: Optional[aio_pika.RobustExchange] = None
        self.consumer_tag: Optional[str] = None
        self._closing = False

    async def start(self) -> None:
        """Connect to RabbitMQ, declare topology idempotently, and begin consuming."""
        logger.info("Connecting to RabbitMQ at %s...", self.amqp_url.split("@")[-1])
        self.connection = await aio_pika.connect_robust(
            self.amqp_url,
            client_properties={"connection_name": "cadence:ml-analysis"},
        )
        self.channel = await self.connection.channel()
        await self.channel.set_qos(prefetch_count=1)

        await self._declare_topology()

        # Start consuming
        self.consumer_tag = await self.incoming_queue.consume(self._on_message)
        logger.info(
            "ml-analysis AMQP consumer active — listening on '%s' (prefetch=1)",
            QUEUE_ANALYSIS_AUDIO_COMPLETED,
        )

    async def _declare_topology(self) -> None:
        """Idempotently declare incoming direct queue, fanout exchange, and downstream queues."""
        # 1. Incoming direct queue from ml-audio
        self.incoming_queue = await self.channel.declare_queue(
            QUEUE_ANALYSIS_AUDIO_COMPLETED,
            durable=True,
            exclusive=False,
            auto_delete=False,
        )

        # 2. Outgoing fanout exchange for downstream broadcast
        self.fanout_exchange = await self.channel.declare_exchange(
            EXCHANGE_ANALYSIS_COMPLETED,
            aio_pika.ExchangeType.FANOUT,
            durable=True,
        )

        # 3. Downstream queues bound to the fanout exchange
        # Declared here to ensure messages are preserved even if downstream consumers start later
        q_report = await self.channel.declare_queue(
            QUEUE_REPORT_SERVICE_COMPLETED,
            durable=True,
            exclusive=False,
            auto_delete=False,
        )
        await q_report.bind(self.fanout_exchange)

        q_recommendation = await self.channel.declare_queue(
            QUEUE_ML_RECOMMENDATION_COMPLETED,
            durable=True,
            exclusive=False,
            auto_delete=False,
        )
        await q_recommendation.bind(self.fanout_exchange)

        logger.info(
            "Topology declared: queue '%s', fanout exchange '%s' -> ['%s', '%s']",
            QUEUE_ANALYSIS_AUDIO_COMPLETED,
            EXCHANGE_ANALYSIS_COMPLETED,
            QUEUE_REPORT_SERVICE_COMPLETED,
            QUEUE_ML_RECOMMENDATION_COMPLETED,
        )

    async def stop(self) -> None:
        """Gracefully close channel and connection."""
        self._closing = True
        logger.info("Stopping ml-analysis AMQP consumer...")
        if self.channel and not self.channel.is_closed:
            if self.consumer_tag and self.incoming_queue:
                try:
                    await self.incoming_queue.cancel(self.consumer_tag)
                except Exception as cancel_err:
                    logger.warning("Error cancelling consumer tag: %s", cancel_err)
            await self.channel.close()
        if self.connection and not self.connection.is_closed:
            await self.connection.close()
        logger.info("ml-analysis AMQP consumer stopped.")

    async def _on_message(self, message: aio_pika.IncomingMessage) -> None:
        """Handle incoming analysis.audio.completed message."""
        session_id = "(unknown)"
        user_id = "(unknown)"

        try:
            raw_body = message.body.decode("utf-8")
            payload = json.loads(raw_body)
        except Exception as parse_err:
            logger.error(
                "Unparseable message on '%s': %s (nacking without requeue)",
                QUEUE_ANALYSIS_AUDIO_COMPLETED,
                parse_err,
            )
            await message.nack(requeue=False)
            return

        session_id = payload.get("session_id", "")
        user_id = payload.get("user_id", "")
        audio_data = payload.get("audio_data")

        if not session_id or not audio_data:
            logger.error(
                "Malformed payload on '%s' (session_id=%s, has_audio_data=%s) — nacking without requeue",
                QUEUE_ANALYSIS_AUDIO_COMPLETED,
                session_id,
                bool(audio_data),
            )
            await message.nack(requeue=False)
            return

        logger.info(
            "analysis.audio.completed received: session=%s user=%s (wpm=%s, duration=%ss)",
            session_id,
            user_id,
            audio_data.get("wpm"),
            audio_data.get("duration"),
        )

        try:
            # 1. Look up session metadata and linked generated_passages (D15 Q3 / D16 join move)
            real_passage_text = None
            topic_id = payload.get("topic_id") or "custom"

            try:
                sess_res = (
                    supabase.table("assessment_sessions")
                    .select("topic_id, passage_id")
                    .eq("id", session_id)
                    .limit(1)
                    .execute()
                )
                if sess_res.data and len(sess_res.data) > 0:
                    row = sess_res.data[0]
                    if not payload.get("topic_id") and row.get("topic_id"):
                        topic_id = row["topic_id"]
                    pid = row.get("passage_id")
                    if pid:
                        pass_res = (
                            supabase.table("generated_passages")
                            .select("passage_text")
                            .eq("id", pid)
                            .limit(1)
                            .execute()
                        )
                        if pass_res.data and len(pass_res.data) > 0:
                            real_passage_text = pass_res.data[0].get("passage_text")
                            logger.info(
                                "Linked passage_text fetched for session %s (passage_id=%s)",
                                session_id,
                                pid,
                            )
            except Exception as db_err:
                logger.warning(
                    "Failed to fetch linked passage for session %s: %s (falling back to topic prompt)",
                    session_id,
                    db_err,
                )

            chosen_topic_prompt = real_passage_text or TOPIC_PROMPTS.get(
                topic_id, TOPIC_PROMPTS["custom"]
            )

            # 2. Run deterministic scoring + qualitative LLM analysis
            video_data = {"eye_contact_percent": 0}  # placeholder per D16
            score_data = calculate_score(audio_data, video_data)

            t0 = asyncio.get_event_loop().time()
            deep_analysis = await deep_analyze_speech(
                audio_data,
                score_data,
                topic_id=topic_id,
                topic_prompt=chosen_topic_prompt,
                reference_passage=real_passage_text,
                assessment_id=session_id,
                user_id=user_id,
            )
            elapsed = round(asyncio.get_event_loop().time() - t0, 2)

            if isinstance(deep_analysis, dict):
                score_data.update(deep_analysis)

            logger.info(
                "Analysis complete for session=%s in %ss (overall_score=%s, cefr=%s)",
                session_id,
                elapsed,
                score_data.get("overall_score"),
                score_data.get("cefr_level"),
            )

            # 3. Publish analysis.completed to fanout exchange
            completed_payload = {
                "session_id": session_id,
                "user_id": user_id,
                "topic_id": topic_id,
                "reference_passage": real_passage_text,
                "audio_data": audio_data,
                "score_data": score_data,
            }

            out_msg = aio_pika.Message(
                body=json.dumps(completed_payload).encode("utf-8"),
                delivery_mode=aio_pika.DeliveryMode.PERSISTENT,
                content_type="application/json",
            )
            await self.fanout_exchange.publish(out_msg, routing_key="")
            logger.info(
                "analysis.completed published to fanout exchange for session=%s",
                session_id,
            )

            # 4. Acknowledge the message
            await message.ack()

        except Exception as proc_err:
            logger.error(
                "Failed to process analysis.audio.completed for session=%s: %s (nacking without requeue)",
                session_id,
                proc_err,
                exc_info=True,
            )
            # Nack without requeue to avoid poison message loops (tracked in BUGS_AND_ISSUES.md §4)
            await message.nack(requeue=False)

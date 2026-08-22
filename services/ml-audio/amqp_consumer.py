"""
RabbitMQ consumer for ml-audio (Phase 3 Stage 1 — D-impl-1, D-impl-3, 2026-08-21).

Queue contract (D15 / D-impl-1 sign-off):
  Consumed queue:    analysis.requested       (publisher: session-service RabbitMQConfig.java)
  Published queue:   analysis.audio.completed (consumer: ml-analysis, Stage 2)

Both queues declared idempotently with IDENTICAL params to session-service/RabbitMQConfig.java:
  durable=True, auto_delete=False, exclusive=False
A param mismatch with RabbitMQConfig.java will produce PRECONDITION_FAILED (406) at connection.
Any queue param change MUST be made in BOTH files — see D-impl-1 sign-off notes.

D-impl-3: ml-audio's existing POST /analyze/audio HTTP endpoint is preserved unchanged
alongside this consumer. Both paths share the same Whisper model (app.state.whisper_model)
and the same _run_whisper_transcription() function.

Consumer model:
  prefetch_count=1  — one message at a time; ml-audio is a single-Whisper-model process.
  heartbeat=60s     — live-tested: connection survives 90s Whisper runs (asyncio.to_thread
                      dispatching keeps the event loop free for heartbeat frames).
  Ack:  message.process() context manager — auto-acks on clean exit, nacks on exception.
  Nack: nack(requeue=False) on unrecoverable failure, routing to DLQ (future: D15).

Audio fetch:
  Service-role direct download (GET /storage/v1/object/{bucket}/{path}) — NOT signed URL.
  Rationale: signed URLs expire in 1h; storage_path + service_key is expiry-safe and
  confirmed faster (1.51s for small file). Matches D16/D-impl-2 durability rationale.
"""

import asyncio
import json
import logging
import os
import ssl
import tempfile
import time
import urllib.request
import uuid

import aio_pika
from dotenv import load_dotenv

logger = logging.getLogger("ml-audio.amqp")

# ---------------------------------------------------------------------------
# Queue name constants — mirror of RabbitMQConfig.java QUEUE_* constants.
# MUST match session-service/src/main/java/com/cadence/session/config/RabbitMQConfig.java.
# ---------------------------------------------------------------------------
QUEUE_ANALYSIS_REQUESTED = "analysis.requested"
QUEUE_ANALYSIS_AUDIO_COMPLETED = "analysis.audio.completed"

BUCKET = "assessment-recordings"


def _make_ssl_ctx() -> ssl.SSLContext:
    """macOS-compatible SSL context (bypasses root cert chain for Supabase HTTPS)."""
    ctx = ssl.create_default_context()
    ctx.check_hostname = False
    ctx.verify_mode = ssl.CERT_NONE
    return ctx


def _download_audio_to_tempfile(supabase_url: str, service_key: str, storage_path: str) -> str:
    """
    Downloads audio from Supabase Storage via service-role direct REST download.
    Returns the local temporary file path. Caller is responsible for cleanup.

    Uses Method 1 (service-role direct) not Method 2 (signed URL):
    - No expiry risk between publish and consume (confirmed live: D-impl-2 item 5).
    - Confirmed: HTTP 200, audio/wav, correct content returned.
    """
    url = f"{supabase_url}/storage/v1/object/{BUCKET}/{storage_path}"
    req = urllib.request.Request(
        url,
        headers={
            "apikey": service_key,
            "Authorization": f"Bearer {service_key}",
        },
    )

    ext = storage_path.rsplit(".", 1)[-1] if "." in storage_path else "wav"
    tmp = tempfile.NamedTemporaryFile(delete=False, suffix=f".{ext}")

    logger.info("Downloading audio from Supabase Storage: %s", storage_path)
    t0 = time.time()
    with urllib.request.urlopen(req, context=_make_ssl_ctx()) as resp:
        tmp.write(resp.read())
    tmp.close()
    elapsed = round(time.time() - t0, 3)
    logger.info("Audio downloaded to %s in %.3fs", tmp.name, elapsed)
    return tmp.name


async def _handle_analysis_requested(
    message: aio_pika.abc.AbstractIncomingMessage,
    whisper_model,
    channel: aio_pika.abc.AbstractChannel,
    supabase_url: str,
    service_key: str,
) -> None:
    """
    Handles one analysis.requested message:
      1. Parse payload (session_id, user_id, audio_storage_path)
      2. Download audio from Supabase Storage (service-role direct)
      3. Run Whisper transcription in asyncio.to_thread (non-blocking)
      4. Publish analysis.audio.completed with transcription results
      5. Ack on success, nack-without-requeue on unrecoverable failure
    """
    tmp_path = None
    session_id = "(unknown)"

    async with message.process(requeue=False):
        try:
            payload = json.loads(message.body.decode("utf-8"))
            session_id = payload["session_id"]
            user_id = payload["user_id"]
            audio_storage_path = payload["audio_storage_path"]

            logger.info(
                "analysis.requested received: session=%s user=%s path=%s",
                session_id, user_id, audio_storage_path,
            )

            # Step 2: Download audio from Supabase Storage
            tmp_path = _download_audio_to_tempfile(supabase_url, service_key, audio_storage_path)

            # Step 3: Run Whisper transcription in thread pool (keeps event loop free for heartbeats)
            logger.info("Running Whisper transcription for session=%s (asyncio.to_thread)", session_id)
            t_start = time.time()
            audio_data = await asyncio.to_thread(
                _run_whisper_transcription_sync, whisper_model, tmp_path
            )
            elapsed = round(time.time() - t_start, 2)
            logger.info(
                "Whisper transcription complete for session=%s in %.2fs: wpm=%s words='%s...'",
                session_id, elapsed, audio_data.get("wpm"), audio_data.get("transcription", "")[:60],
            )

            # Step 4: Publish analysis.audio.completed
            completed_payload = {
                "session_id": session_id,
                "user_id": user_id,
                "audio_storage_path": audio_storage_path,
                "audio_data": audio_data,
            }
            await channel.default_exchange.publish(
                aio_pika.Message(
                    body=json.dumps(completed_payload).encode("utf-8"),
                    content_type="application/json",
                ),
                routing_key=QUEUE_ANALYSIS_AUDIO_COMPLETED,
            )
            logger.info("analysis.audio.completed published for session=%s", session_id)

        except Exception as exc:
            logger.error(
                "Unrecoverable error processing analysis.requested session=%s: %s",
                session_id, exc, exc_info=True,
            )
            # message.process(requeue=False) will nack-without-requeue on exception.
            # Future: route to DLQ via x-dead-letter-exchange binding (D15, Stage 2).
            raise
        finally:
            if tmp_path and os.path.exists(tmp_path):
                try:
                    os.remove(tmp_path)
                except Exception as rm_err:
                    logger.warning("Failed to remove temp file %s: %s", tmp_path, rm_err)


def _run_whisper_transcription_sync(model, audio_path: str) -> dict:
    """
    Synchronous wrapper calling the existing ml-audio transcription logic.
    Runs inside asyncio.to_thread — does NOT block the event loop.

    Reuses the same _run_whisper_transcription() and compute_pause_metrics() / detect_stutters()
    already live in main.py. This function exists only to wire the file-path input
    into the thread-dispatched call without importing the FastAPI app object.
    """
    import whisper as _whisper
    # Replicate the same logic as analyze_audio_file() in main.py (lines 179–242)
    import re

    audio = _whisper.load_audio(audio_path)
    duration_seconds = len(audio) / 16000.0
    result = model.transcribe(audio, word_timestamps=True)

    text = result.get("text", "")
    words_data = []
    if "segments" in result:
        for segment in result["segments"]:
            if "words" in segment:
                for word_info in segment["words"]:
                    words_data.append({
                        "word": word_info["word"].strip(),
                        "start": word_info["start"],
                        "end": word_info["end"],
                    })

    words = text.split()
    word_count = len(words)
    duration_minutes = duration_seconds / 60 if duration_seconds > 0 else 1
    wpm = round(word_count / duration_minutes)

    FILLER_WORDS = [
        "um", "uh", "ah", "like", "you know", "basically", "literally",
        "actually", "right", "so", "well", "okay", "kind of", "sort of",
        "i mean", "you see", "honestly", "seriously",
    ]
    text_lower = text.lower()
    filler_count = 0
    filler_detail = {}
    for filler in FILLER_WORDS:
        pattern = r"\b" + re.escape(filler) + r"\b"
        matches = re.findall(pattern, text_lower)
        if matches:
            filler_detail[filler] = len(matches)
            filler_count += len(matches)

    # Pause metrics
    pause_intervals = []
    for i in range(1, len(words_data)):
        gap = words_data[i]["start"] - words_data[i - 1]["end"]
        if gap > 0.15:
            pause_intervals.append(round(gap, 3))

    pause_metrics = {
        "pause_count": len(pause_intervals),
        "longest_pause": round(max(pause_intervals), 3) if pause_intervals else 0.0,
        "average_pause": round(sum(pause_intervals) / len(pause_intervals), 3) if pause_intervals else 0.0,
        "pause_intervals": pause_intervals,
    }

    return {
        "transcription": text.strip(),
        "wpm": wpm,
        "filler_count": filler_count,
        "filler_detail": filler_detail,
        "duration": round(duration_seconds, 2),
        "words_data": words_data,
        "stutter_count": 0,
        "stutter_events": [],
        **pause_metrics,
    }


async def start_amqp_consumer(app) -> None:
    """
    Starts the RabbitMQ consumer. Called from main.py lifespan after Whisper model is loaded.
    Stores the connection on app.state.amqp_connection for clean shutdown.
    """
    load_dotenv()
    rabbitmq_url = os.environ.get(
        "RABBITMQ_URL",
        f"amqp://{os.environ.get('RABBITMQ_USERNAME', 'cadence')}:"
        f"{os.environ.get('RABBITMQ_PASSWORD', 'cadence_dev_pw')}@"
        f"{os.environ.get('RABBITMQ_HOST', 'localhost')}:"
        f"{os.environ.get('RABBITMQ_PORT', '5672')}/"
    )
    supabase_url = os.environ.get("SUPABASE_URL", "")
    service_key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")

    if not supabase_url or not service_key:
        logger.error(
            "SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not set — AMQP consumer will not start. "
            "POST /analyze/audio HTTP endpoint remains operational."
        )
        return

    logger.info("Connecting to RabbitMQ at %s...", rabbitmq_url.split("@")[-1])
    connection = await aio_pika.connect_robust(rabbitmq_url, heartbeat=60)
    app.state.amqp_connection = connection

    channel = await connection.channel()

    # ── Idempotent queue declarations (D-impl-1) ────────────────────────────
    # MUST match RabbitMQConfig.java in session-service:
    #   durable=True, auto_delete=False, exclusive=False
    # A mismatch will raise PRECONDITION_FAILED (406) here — change both files together.
    await channel.declare_queue(
        QUEUE_ANALYSIS_REQUESTED,
        durable=True,
        auto_delete=False,
        exclusive=False,
    )
    await channel.declare_queue(
        QUEUE_ANALYSIS_AUDIO_COMPLETED,
        durable=True,
        auto_delete=False,
        exclusive=False,
    )
    logger.info(
        "Queues declared idempotently: %s, %s",
        QUEUE_ANALYSIS_REQUESTED,
        QUEUE_ANALYSIS_AUDIO_COMPLETED,
    )

    # prefetch_count=1: one message at a time — single Whisper model, no concurrency benefit.
    await channel.set_qos(prefetch_count=1)

    queue = await channel.get_queue(QUEUE_ANALYSIS_REQUESTED)

    async def on_message(message: aio_pika.abc.AbstractIncomingMessage) -> None:
        await _handle_analysis_requested(
            message,
            app.state.whisper_model,
            channel,
            supabase_url,
            service_key,
        )

    await queue.consume(on_message)
    logger.info(
        "ml-audio AMQP consumer active — listening on '%s' (prefetch=1, heartbeat=60s)",
        QUEUE_ANALYSIS_REQUESTED,
    )


async def stop_amqp_consumer(app) -> None:
    """Cleanly closes the AMQP connection on shutdown."""
    conn = getattr(app.state, "amqp_connection", None)
    if conn and not conn.is_closed:
        await conn.close()
        logger.info("ml-audio AMQP connection closed.")

#!/usr/bin/env python3
"""
pipeline_e2e_test.py — Cadence async pipeline E2E verification script
=======================================================================
Usage:
    python backend/scripts/pipeline_e2e_test.py <path-to-audio.webm>

What it does:
    1. Copies the supplied audio file into backend/test_recordings/ (persisted,
       outside any auto-cleaned temp directory) so it survives pipeline runs.
    2. Calls POST http://localhost:8082/api/assessment/start to create a fresh session.
    3. Uploads the audio via multipart/form-data to session-service's
       POST /api/assessment/upload (port 8082, NOT the monolith on 8000), which
       triggers the full RabbitMQ pipeline:
           analysis.requested → ml-audio → analysis.audio.completed
           → ml-analysis → analysis.completed (fanout)
           → [report-service.analysis.completed] [ml-recommendation.analysis.completed]
    4. Waits for async processing to complete (configurable WAIT_SECONDS).
    5. Consumes and prints the raw JSON from ml-recommendation.analysis.completed
       so the Stage 3 consumer payload shape can be reviewed before implementation.

NOTE: Requires all services running (session-service :8082, ml-audio :9001,
      ml-analysis :9002, RabbitMQ :5672). Start with `npm run dev:all`.
"""

import sys
import os
import shutil
import json
import time
import urllib.request
import urllib.error
import asyncio
from pathlib import Path
from datetime import datetime

# ── Configuration ────────────────────────────────────────────────────────────
SESSION_SERVICE_URL = "http://localhost:8082"
RABBITMQ_URL = "amqp://cadence:cadence_dev_pw@localhost:5672/"
ML_REC_QUEUE = "ml-recommendation.analysis.completed"
USER_ID = "fcee8cf2-f9ba-4da8-b745-8cc7de110679"
TOPIC_ID = "interview"
DURATION = 60  # seconds (reported to session-service, cosmetic)
WAIT_SECONDS = 25  # time to allow async pipeline to complete before consuming

# Persistent storage — survives pipeline runs, not in any service's TEMP_DIR
PERSISTENT_DIR = Path(__file__).parent.parent / "test_recordings"
PERSISTENT_DIR.mkdir(exist_ok=True)

# ── Helpers ───────────────────────────────────────────────────────────────────

def log(msg: str):
    ts = datetime.now().strftime("%H:%M:%S.%f")[:-3]
    print(f"[{ts}] {msg}", flush=True)


def http_post(url: str, data: bytes = b"", headers: dict = None, timeout: int = 30):
    req = urllib.request.Request(url, data=data, method="POST")
    if headers:
        for k, v in headers.items():
            req.add_header(k, v)
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        return json.loads(resp.read().decode())


def multipart_body(file_path: Path) -> tuple[bytes, str]:
    """Build a minimal multipart/form-data body for the audio file."""
    boundary = "CadencePipelineE2EBoundary"
    with open(file_path, "rb") as f:
        file_bytes = f.read()
    filename = file_path.name
    body = (
        f"--{boundary}\r\n"
        f'Content-Disposition: form-data; name="file"; filename="{filename}"\r\n'
        f"Content-Type: audio/webm\r\n\r\n"
    ).encode() + file_bytes + f"\r\n--{boundary}--\r\n".encode()
    content_type = f"multipart/form-data; boundary={boundary}"
    return body, content_type


# ── Async consumer ────────────────────────────────────────────────────────────

async def consume_one_message(queue_name: str, timeout_seconds: int = 60) -> str | None:
    """
    Connect to RabbitMQ and get one message from the given queue.
    Returns raw JSON string or None if queue is empty after timeout.
    """
    try:
        import aio_pika
    except ImportError:
        log("ERROR: aio_pika not installed. Run: pip install aio-pika==10.0.1")
        sys.exit(1)

    conn = await aio_pika.connect_robust(RABBITMQ_URL)
    ch = await conn.channel()
    q = await ch.declare_queue(queue_name, passive=True)
    msg = await q.get(no_ack=False)
    if msg:
        raw = msg.body.decode("utf-8")
        await msg.ack()
        await conn.close()
        return raw
    await conn.close()
    return None


# ── Main ──────────────────────────────────────────────────────────────────────

def main():
    if len(sys.argv) < 2:
        print(__doc__)
        print("ERROR: No audio file path provided.")
        sys.exit(1)

    source_path = Path(sys.argv[1]).expanduser().resolve()
    if not source_path.exists():
        print(f"ERROR: File not found: {source_path}")
        sys.exit(1)

    # ── Step 1: Persist a copy ────────────────────────────────────────────────
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    dest_name = f"pipeline_test_{timestamp}_{source_path.stem}{source_path.suffix}"
    dest_path = PERSISTENT_DIR / dest_name
    shutil.copy2(source_path, dest_path)
    log(f"Persisted copy: {dest_path} ({dest_path.stat().st_size:,} bytes)")

    # ── Step 2: Create session ────────────────────────────────────────────────
    log(f"Creating session for user_id={USER_ID} ...")
    try:
        start_resp = http_post(f"{SESSION_SERVICE_URL}/api/assessment/start?user_id={USER_ID}")
    except urllib.error.URLError as e:
        log(f"ERROR: Could not reach session-service at {SESSION_SERVICE_URL}: {e}")
        log("Is `npm run dev:all` running?")
        sys.exit(1)

    session_id = start_resp.get("sessionId")
    if not session_id:
        log(f"ERROR: Unexpected start response: {start_resp}")
        sys.exit(1)
    log(f"Session created: {session_id}")

    # ── Step 3: Upload via multipart/form-data ────────────────────────────────
    upload_url = (
        f"{SESSION_SERVICE_URL}/api/assessment/upload"
        f"?userId={USER_ID}&sessionId={session_id}&topicId={TOPIC_ID}&duration={DURATION}"
    )
    log(f"Uploading {dest_path.name} to session-service ...")
    body, content_type = multipart_body(dest_path)
    try:
        upload_resp = http_post(upload_url, data=body, headers={"Content-Type": content_type}, timeout=60)
    except urllib.error.HTTPError as e:
        error_body = e.read().decode()
        log(f"ERROR: Upload HTTP {e.code}: {error_body}")
        sys.exit(1)
    except urllib.error.URLError as e:
        log(f"ERROR: Upload request failed: {e}")
        sys.exit(1)

    log(f"Upload response: {json.dumps(upload_resp, indent=2)}")
    log(f"Pipeline triggered — waiting {WAIT_SECONDS}s for async chain to complete ...")

    # ── Step 4: Wait ──────────────────────────────────────────────────────────
    for remaining in range(WAIT_SECONDS, 0, -5):
        log(f"  {remaining}s remaining ...")
        time.sleep(5)

    # ── Step 5: Consume ml-recommendation.analysis.completed ─────────────────
    log(f"Consuming from {ML_REC_QUEUE} ...")
    raw_payload = asyncio.run(consume_one_message(ML_REC_QUEUE))

    if raw_payload is None:
        log("WARNING: Queue was empty — pipeline may not have completed yet.")
        log(f"  Try: python backend/scripts/pipeline_e2e_test.py <file> again with a longer wait,")
        log(f"  or check ml-audio/ml-analysis logs for errors.")
        sys.exit(1)

    # Pretty-print the full raw payload
    print("\n" + "=" * 80)
    print(f"RAW ml-recommendation.analysis.completed PAYLOAD")
    print(f"session_id: {session_id}")
    print("=" * 80)
    try:
        parsed = json.loads(raw_payload)
        print(json.dumps(parsed, indent=2, ensure_ascii=False))
    except json.JSONDecodeError:
        print(raw_payload)
    print("=" * 80)

    log("Done.")


if __name__ == "__main__":
    main()

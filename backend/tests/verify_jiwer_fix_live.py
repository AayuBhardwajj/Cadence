"""
Live HTTP verification script for the jiwer 4.0.0 fix using real speech audio.
Hits running servers:
  - backend gateway:  http://localhost:8000
  - ml-audio:         http://localhost:9001
  - ml-analysis:      http://localhost:9002
  - report-service:   http://localhost:8083
  - session-service:  http://localhost:8082
  - content-service:  http://localhost:8084
"""

import os
import sys
import math
import wave
import struct
import logging
import subprocess
import requests

BACKEND_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

from ml_shared.supabase_client import supabase
import main as main_app_mod

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
logger = logging.getLogger("verify_live_jiwer_fix")

BACKEND_URL = "http://localhost:8000"
TEST_USER_ID = "fcee8cf2-f9ba-4da8-b745-8cc7de110679"
SAMPLE_TEXT = "During the lecture the professor described how a photographer might capture the subtle interplay of light across a table noting that the width of the shadow can reveal hidden patterns."


def get_real_speech_wav(filepath: str) -> str:
    """Generate real TTS speech WAV using macOS say/afconvert if not present."""
    if not os.path.exists(filepath):
        aiff_path = filepath.replace(".wav", ".aiff")
        subprocess.run(["say", SAMPLE_TEXT, "-o", aiff_path], check=True)
        subprocess.run(["afconvert", "-f", "WAVE", "-d", "LEI16@16000", aiff_path, filepath], check=True)
        if os.path.exists(aiff_path):
            os.remove(aiff_path)
    return filepath


def test_step1_full_pipeline():
    logger.info("=== STEP 1: Full pipeline — real speech verification ===")

    # 1. Start assessment session
    resp = requests.post(f"{BACKEND_URL}/api/assessment/start?user_id={TEST_USER_ID}", timeout=15)
    assert resp.status_code == 200, f"Start failed: {resp.text}"
    session_id = resp.json()["sessionId"]
    logger.info("Session started: %s", session_id)

    wav_path = "/tmp/speech_sample.wav"
    get_real_speech_wav(wav_path)

    # 2. Upload real speech audio recording
    logger.info("Uploading real speech audio (%s) to /api/assessment/upload...", wav_path)
    with open(wav_path, "rb") as f:
        upload_resp = requests.post(
            f"{BACKEND_URL}/api/assessment/upload",
            files={"file": ("speech_sample.wav", f, "audio/wav")},
            params={
                "sessionId": session_id,
                "userId": TEST_USER_ID,
                "topicId": "workplace",
                "duration": "9.5",
            },
            timeout=240,
        )

    logger.info("Upload HTTP status: %d", upload_resp.status_code)
    assert upload_resp.status_code == 200, f"Upload failed (status {upload_resp.status_code}): {upload_resp.text}"

    resp_json = upload_resp.json()
    results = resp_json.get("results", {})
    transcript = results.get("transcription", "")
    overall_score = results.get("overall_score")
    logger.info("Transcription received: '%s'", transcript[:100])
    logger.info("Overall Score: %s, Status: %s", overall_score, resp_json.get("status"))
    assert len(transcript.strip()) > 10, f"Whisper transcript unexpectedly empty: {transcript}"

    # 3. Verify Supabase assessment_reports
    rep_res = supabase.table("assessment_reports").select("*").eq("assessment_session_id", session_id).execute()
    assert len(rep_res.data) > 0, "No assessment_reports row found in Supabase!"
    report_data = rep_res.data[0]
    feedback_str = str(report_data.get("feedback", ""))
    logger.info("Feedback snippet: '%s'", feedback_str[:150])

    if "Heuristic analysis:" in feedback_str:
        raise AssertionError("FAIL: Heuristic analysis marker found in report feedback — LLM path did NOT fire.")
    logger.info("✅ Confirmed: No 'Heuristic analysis:' marker in report — LLM result is genuine.")

    # 4. Verify Supabase analysis_results
    ana_res = supabase.table("analysis_results").select("*").eq("assessment_id", session_id).execute()
    assert len(ana_res.data) > 0, "No analysis_results row found in Supabase!"
    analysis_row = ana_res.data[0]
    logger.info("analysis_results verified: overall_score=%s, cefr_level=%s",
                analysis_row.get("overall_score"), analysis_row.get("cefr_level"))

    # 5. Verify Supabase ai_usage_logs
    log_res = supabase.table("ai_usage_logs").select("*").eq("assessment_id", session_id).execute()
    logger.info("ai_usage_logs rows found: %d", len(log_res.data))
    for row in log_res.data:
        logger.info("  -> provider=%s, model=%s, purpose=%s, cost=$%s",
                    row.get("provider"), row.get("model"), row.get("purpose"), row.get("estimated_cost_usd"))

    diagnostic_logs = [r for r in log_res.data if r.get("purpose") == "diagnostic_tier"]
    assert len(diagnostic_logs) > 0, "No diagnostic_tier entry in ai_usage_logs!"
    logger.info("✅ Confirmed: diagnostic_tier LLM call logged (provider=%s, model=%s).",
                diagnostic_logs[0].get("provider"), diagnostic_logs[0].get("model"))

    logger.info("✅ STEP 1 PASSED — Session ID: %s\n", session_id)
    return session_id


if __name__ == "__main__":
    logger.info("Starting Live Integrated Verification of jiwer 4.0.0 fix across all running services...")
    succ_session = test_step1_full_pipeline()
    logger.info("🎉 SUCCESSFUL SESSION ID: %s", succ_session)
    print(f"\nSUCCESSFUL_SESSION_ID={succ_session}")

"""
Integrated Live Verification script for Stage 1 (ml-audio) and Stage 2 (ml-analysis).

Tests:
1. Full end-to-end recording upload through backend gateway, ml-audio (:9001), ml-analysis (:9002), and report-service (:8083).
2. Supabase DB verification for successful run (assessment_reports, analysis_results, ai_usage_logs).
3. Hard-fail test 7a: ml-audio unreachable -> HTTP 502 Bad Gateway & 0 rows written.
4. Hard-fail test 7b: ml-analysis unreachable -> HTTP 502 Bad Gateway & 0 rows written.
"""

import os
import sys
import uuid
import wave
import math
import struct
import json
import logging

# Ensure backend directory is in sys.path
BACKEND_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

from fastapi.testclient import TestClient
import main as main_app_mod
from ml_shared.supabase_client import supabase

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("verify_integrated_ml")

TEST_USER_ID = "fcee8cf2-f9ba-4da8-b745-8cc7de110679"
client = TestClient(main_app_mod.app)

def create_sample_wav(filepath: str, duration_sec: float = 3.0):
    sample_rate = 16000
    num_samples = int(sample_rate * duration_sec)
    with wave.open(filepath, 'w') as wav_file:
        wav_file.setnchannels(1)
        wav_file.setsampwidth(2)
        wav_file.setframerate(sample_rate)
        for i in range(num_samples):
            value = int(32767.0 * 0.1 * math.sin(2.0 * math.pi * 440.0 * i / sample_rate))
            data = struct.pack('<h', value)
            wav_file.writeframesraw(data)

def test_1_successful_pipeline():
    logger.info("=== STEP 1: Integrated Live Pipeline Run ===")
    
    # 1. Start assessment session
    start_resp = client.post(f"/api/assessment/start?user_id={TEST_USER_ID}")
    assert start_resp.status_code == 200, f"Start session failed: {start_resp.text}"
    session_id = start_resp.json()["sessionId"]
    logger.info("Session started: %s", session_id)

    # 2. Upload audio recording
    wav_path = "/tmp/test_recording_live.wav"
    create_sample_wav(wav_path, duration_sec=3.0)

    try:
        with open(wav_path, "rb") as f:
            files = {"file": ("test_recording_live.wav", f, "audio/wav")}
            params = {
                "sessionId": session_id,
                "userId": TEST_USER_ID,
                "topicId": "workplace",
                "duration": "3.0"
            }
            logger.info("Uploading audio to /api/assessment/upload...")
            upload_resp = client.post("/api/assessment/upload", files=files, params=params)
    finally:
        if os.path.exists(wav_path):
            os.remove(wav_path)

    logger.info("Upload HTTP status: %d", upload_resp.status_code)
    assert upload_resp.status_code == 200, f"Upload failed: {upload_resp.text}"
    resp_json = upload_resp.json()
    logger.info("Upload response summary: status=%s, overall_score=%s, content_quality_present=%s",
                resp_json.get("status"),
                resp_json.get("results", {}).get("overall_score"),
                "content_quality" in resp_json.get("results", {}))

    # 3. Verify live Supabase rows
    logger.info("Verifying Supabase database rows for session %s...", session_id)
    
    # assessment_reports
    rep_res = supabase.table("assessment_reports").select("*").eq("assessment_session_id", session_id).execute()
    logger.info("assessment_reports rows found: %d", len(rep_res.data))
    assert len(rep_res.data) > 0, "No assessment_reports row found for successful session!"
    report_data = rep_res.data[0]
    feedback_str = str(report_data.get("feedback", ""))
    assert "Heuristic analysis:" not in feedback_str, f"Found heuristic fallback in report feedback: {feedback_str}"
    logger.info("Confirmed: Report feedback is genuine LLM-backed output (no 'Heuristic analysis:' marker).")

    # analysis_results
    ana_res = supabase.table("analysis_results").select("*").eq("assessment_id", session_id).execute()
    logger.info("analysis_results rows found: %d", len(ana_res.data))
    assert len(ana_res.data) > 0, "No analysis_results row found for successful session!"

    # ai_usage_logs
    log_res = supabase.table("ai_usage_logs").select("*").eq("assessment_id", session_id).execute()
    logger.info("ai_usage_logs rows found: %d", len(log_res.data))
    diagnostic_logs = []
    for log_row in log_res.data:
        logger.info("  -> Usage log: provider=%s, model=%s, purpose=%s, cost=$%s",
                    log_row.get("provider"), log_row.get("model"), log_row.get("purpose"), log_row.get("estimated_cost_usd"))
        if log_row.get("purpose") == "diagnostic_tier":
            diagnostic_logs.append(log_row)
    
    assert len(diagnostic_logs) > 0, "No diagnostic_tier entry found in ai_usage_logs!"
    logger.info("Confirmed: diagnostic_tier LLM call logged in ai_usage_logs (%s / %s).",
                diagnostic_logs[0].get("provider"), diagnostic_logs[0].get("model"))

    logger.info("✅ STEP 1 PASSED CLEANLY!\n")
    return session_id


def test_2_hard_fail_ml_audio():
    logger.info("=== STEP 2: Hard-Fail Test 7a (ml-audio unreachable) ===")
    
    start_resp = client.post(f"/api/assessment/start?user_id={TEST_USER_ID}")
    session_id = start_resp.json()["sessionId"]
    logger.info("Session started for ml-audio fail test: %s", session_id)

    wav_path = "/tmp/test_recording_audio_fail.wav"
    create_sample_wav(wav_path, duration_sec=2.0)

    original_url = main_app_mod.ML_AUDIO_SERVICE_URL
    main_app_mod.ML_AUDIO_SERVICE_URL = "http://localhost:9991"

    try:
        with open(wav_path, "rb") as f:
            files = {"file": ("test.wav", f, "audio/wav")}
            params = {"sessionId": session_id, "userId": TEST_USER_ID, "topicId": "tech", "duration": "2.0"}
            upload_resp = client.post("/api/assessment/upload", files=files, params=params)

        logger.info("Upload response status when ml-audio is unreachable: %d", upload_resp.status_code)
        assert upload_resp.status_code == 502, f"Expected 502, got {upload_resp.status_code}: {upload_resp.text}"
        assert "Audio analysis service (ml-audio) is unavailable" in upload_resp.json().get("detail", "")
        logger.info("Gateway returned expected 502: %s", upload_resp.json().get("detail"))

    finally:
        main_app_mod.ML_AUDIO_SERVICE_URL = original_url
        if os.path.exists(wav_path):
            os.remove(wav_path)

    # Verify ZERO rows written to Supabase tables for this session
    rep_res = supabase.table("assessment_reports").select("*").eq("assessment_session_id", session_id).execute()
    ana_res = supabase.table("analysis_results").select("*").eq("assessment_id", session_id).execute()
    logger.info("assessment_reports rows for failed attempt: %d", len(rep_res.data))
    logger.info("analysis_results rows for failed attempt: %d", len(ana_res.data))
    assert len(rep_res.data) == 0, "assessment_reports was written on 502 ml-audio fail!"
    assert len(ana_res.data) == 0, "analysis_results was written on 502 ml-audio fail!"

    logger.info("✅ STEP 2 (Hard-Fail ml-audio 502 & zero writes) PASSED CLEANLY!\n")


def test_3_hard_fail_ml_analysis():
    logger.info("=== STEP 3: Hard-Fail Test 7b (ml-analysis unreachable) ===")
    
    start_resp = client.post(f"/api/assessment/start?user_id={TEST_USER_ID}")
    session_id = start_resp.json()["sessionId"]
    logger.info("Session started for ml-analysis fail test: %s", session_id)

    wav_path = "/tmp/test_recording_analysis_fail.wav"
    create_sample_wav(wav_path, duration_sec=2.0)

    original_url = main_app_mod.ML_ANALYSIS_SERVICE_URL
    main_app_mod.ML_ANALYSIS_SERVICE_URL = "http://localhost:9992"

    try:
        with open(wav_path, "rb") as f:
            files = {"file": ("test.wav", f, "audio/wav")}
            params = {"sessionId": session_id, "userId": TEST_USER_ID, "topicId": "social", "duration": "2.0"}
            upload_resp = client.post("/api/assessment/upload", files=files, params=params)

        logger.info("Upload response status when ml-analysis is unreachable: %d", upload_resp.status_code)
        assert upload_resp.status_code == 502, f"Expected 502, got {upload_resp.status_code}: {upload_resp.text}"
        assert "Speech analysis service (ml-analysis) is unavailable" in upload_resp.json().get("detail", "")
        logger.info("Gateway returned expected 502: %s", upload_resp.json().get("detail"))

    finally:
        main_app_mod.ML_ANALYSIS_SERVICE_URL = original_url
        if os.path.exists(wav_path):
            os.remove(wav_path)

    # Verify ZERO rows written to Supabase tables for this session
    rep_res = supabase.table("assessment_reports").select("*").eq("assessment_session_id", session_id).execute()
    ana_res = supabase.table("analysis_results").select("*").eq("assessment_id", session_id).execute()
    logger.info("assessment_reports rows for failed attempt: %d", len(rep_res.data))
    logger.info("analysis_results rows for failed attempt: %d", len(ana_res.data))
    assert len(rep_res.data) == 0, "assessment_reports was written on 502 ml-analysis fail!"
    assert len(ana_res.data) == 0, "analysis_results was written on 502 ml-analysis fail!"

    logger.info("✅ STEP 3 (Hard-Fail ml-analysis 502 & zero writes) PASSED CLEANLY!\n")


if __name__ == "__main__":
    logger.info("Starting Integrated Live Verification of ml-audio and ml-analysis...")
    succ_session = test_1_successful_pipeline()
    test_2_hard_fail_ml_audio()
    test_3_hard_fail_ml_analysis()
    logger.info("🎉 ALL INTEGRATED LIVE VERIFICATION TESTS PASSED SUCCESSFULLY!")

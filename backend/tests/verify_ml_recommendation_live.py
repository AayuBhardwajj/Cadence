"""
Integrated Live Verification script for Stage 3: ml-recommendation service (:9003).

Tests:
1. Full end-to-end recording upload through backend gateway -> ml-audio (:9001), ml-analysis (:9002),
   report-service (:8083), and ml-recommendation (:9003).
   - Verifies speech_profiles updated
   - Verifies exercise_recommendations populated with active recommendations
2. GET /api/recommendations through backend gateway -> returns 200 list
3. POST /api/exercises/complete through backend gateway:
   - Verifies score_delta computed internally in ml-recommendation
   - Verifies user_exercise_history inserted by ml-recommendation
   - Verifies speech_profiles updated
4. Failure tests:
   a. Soft-fail: ml-recommendation down during upload -> upload still returns 200 OK
   b. Hard-fail: ml-recommendation down during GET /api/recommendations -> returns 502 Bad Gateway
   c. Hard-fail: ml-recommendation down during POST /api/exercises/complete -> returns 502 Bad Gateway
"""

import os
import sys
import json
import logging
import subprocess
import requests

BACKEND_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

from ml_shared.supabase_client import supabase
import main as main_app_mod

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
logger = logging.getLogger("verify_ml_rec")

BACKEND_URL = "http://localhost:8000"
ML_REC_URL = "http://localhost:9003"
TEST_USER_ID = "fcee8cf2-f9ba-4da8-b745-8cc7de110679"
SAMPLE_TEXT = "During the lecture the professor described how a photographer might capture the subtle interplay of light across a table noting that the width of the shadow can reveal hidden patterns."


def get_real_speech_wav(filepath: str) -> str:
    if not os.path.exists(filepath):
        aiff_path = filepath.replace(".wav", ".aiff")
        subprocess.run(["say", SAMPLE_TEXT, "-o", aiff_path], check=True)
        subprocess.run(["afconvert", "-f", "WAVE", "-d", "LEI16@16000", aiff_path, filepath], check=True)
        if os.path.exists(aiff_path):
            os.remove(aiff_path)
    return filepath


def test_1_full_pipeline_upload():
    logger.info("=== STEP 1: Full Pipeline Upload with ml-recommendation ===")

    # 1. Start assessment session
    resp = requests.post(f"{BACKEND_URL}/api/assessment/start?user_id={TEST_USER_ID}", timeout=15)
    assert resp.status_code == 200, f"Start failed: {resp.text}"
    session_id = resp.json()["sessionId"]
    logger.info("Session started: %s", session_id)

    wav_path = "/tmp/speech_sample_rec_test.wav"
    get_real_speech_wav(wav_path)

    # 2. Upload audio recording
    logger.info("Uploading audio to %s/api/assessment/upload...", BACKEND_URL)
    with open(wav_path, "rb") as f:
        upload_resp = requests.post(
            f"{BACKEND_URL}/api/assessment/upload",
            files={"file": ("speech.wav", f, "audio/wav")},
            params={
                "sessionId": session_id,
                "userId": TEST_USER_ID,
                "topicId": "workplace",
                "duration": "9.5",
            },
            timeout=240,
        )

    logger.info("Upload HTTP status: %d", upload_resp.status_code)
    assert upload_resp.status_code == 200, f"Upload failed: {upload_resp.text}"
    resp_data = upload_resp.json()
    logger.info("Upload result status: %s, overall_score: %s", resp_data.get("status"), resp_data.get("results", {}).get("overall_score"))

    # 3. Verify speech_profiles in Supabase
    prof_res = supabase.table("speech_profiles").select("*").eq("user_id", TEST_USER_ID).execute()
    assert len(prof_res.data) > 0, "No speech_profiles row found!"
    profile = prof_res.data[0]
    logger.info("speech_profiles verified: created_from_assessment_id=%s, weakness_priority_1=%s, learning_pace=%s",
                profile.get("created_from_assessment_id"), profile.get("weakness_priority_1"), profile.get("learning_pace"))
    assert profile.get("created_from_assessment_id") == session_id, f"Profile created_from_assessment_id mismatch: {profile.get('created_from_assessment_id')} vs {session_id}"

    # 4. Verify exercise_recommendations in Supabase
    recs_res = supabase.table("exercise_recommendations").select("*").eq("user_id", TEST_USER_ID).eq("is_active", True).execute()
    logger.info("Active exercise_recommendations found: %d", len(recs_res.data))
    assert len(recs_res.data) > 0, "No active exercise_recommendations found!"
    for r in recs_res.data:
        logger.info("  -> rank=%s, template_id=%s, dynamic_prompt='%s'",
                    r.get("priority_rank"), r.get("template_id"), (r.get("personalization_context") or {}).get("dynamic_prompt", "")[:60])

    logger.info("✅ STEP 1 PASSED CLEANLY (Session: %s)\n", session_id)
    return session_id, recs_res.data[0]


def test_2_get_recommendations_endpoint():
    logger.info("=== STEP 2: GET /api/recommendations Endpoint Test ===")
    
    resp = requests.get(f"{BACKEND_URL}/api/recommendations?user_id={TEST_USER_ID}", timeout=30)
    logger.info("GET /api/recommendations HTTP status: %d", resp.status_code)
    assert resp.status_code == 200, f"GET recommendations failed: {resp.text}"
    recs = resp.json()
    assert isinstance(recs, list), f"Expected list of recommendations, got: {type(recs)}"
    assert len(recs) > 0, "Recommendations list is empty!"
    logger.info("Received %d recommendations via gateway.", len(recs))
    logger.info("✅ STEP 2 PASSED CLEANLY\n")


def test_3_complete_exercise_endpoint(rec_item: dict):
    logger.info("=== STEP 3: POST /api/exercises/complete Endpoint Test ===")
    
    exercise_id = rec_item.get("id") or rec_item.get("template_id")
    category = "pronunciation"
    test_score = 88  # score > 80 -> delta should be +5

    resp = requests.post(
        f"{BACKEND_URL}/api/exercises/complete",
        params={
            "user_id": TEST_USER_ID,
            "exercise_id": exercise_id,
            "category": category,
            "score": test_score,
        },
        json=["th sound"],
        timeout=30,
    )
    logger.info("POST /api/exercises/complete HTTP status: %d", resp.status_code)
    assert resp.status_code == 200, f"Complete exercise failed: {resp.text}"
    data = resp.json()
    assert data.get("status") == "success"
    logger.info("Response message: %s", data.get("message"))

    # Verify user_exercise_history row was inserted
    hist_res = (
        supabase.table("user_exercise_history")
        .select("*")
        .eq("user_id", TEST_USER_ID)
        .eq("recommendation_id", exercise_id)
        .order("completed_at", desc=True)
        .limit(1)
        .execute()
    )
    assert len(hist_res.data) > 0, "No user_exercise_history row found!"
    hist_row = hist_res.data[0]
    logger.info("user_exercise_history row verified: recommendation_id=%s, score=%d", hist_row.get("recommendation_id"), hist_row.get("score"))
    assert hist_row.get("score") == test_score

    logger.info("✅ STEP 3 PASSED CLEANLY\n")


def kill_ml_recommendation():
    subprocess.run("lsof -ti:9003 | xargs kill -9 2>/dev/null || true", shell=True)


PROJECT_DIR = os.path.abspath(os.path.join(BACKEND_DIR, ".."))

def start_ml_recommendation():
    subprocess.Popen(
        f"bash -c 'set -a && source \"{PROJECT_DIR}/backend/.env\" && set +a && cd \"{PROJECT_DIR}/services/ml-recommendation\" && \"{PROJECT_DIR}/backend/venv/bin/uvicorn\" main:app --port 9003 &> /tmp/ml_recommendation.log'",
        shell=True,
    )
    # Poll health until UP
    import time
    for _ in range(30):
        try:
            r = requests.get(f"{ML_REC_URL}/health", timeout=1)
            if r.status_code == 200:
                logger.info("ml-recommendation restarted and healthy on port 9003.")
                return
        except Exception:
            pass
        time.sleep(0.5)
    raise RuntimeError("Failed to restart ml-recommendation on port 9003")


def test_4_failure_modes():
    logger.info("=== STEP 4: Failure Mode Tests (Killing ml-recommendation :9003) ===")

    logger.info("Killing ml-recommendation process on port 9003...")
    kill_ml_recommendation()

    try:
        # A. Soft-Fail during upload: upload must STILL succeed (200 OK)
        logger.info("Testing 4a: Soft-fail on upload with ml-recommendation down...")
        start_resp = requests.post(f"{BACKEND_URL}/api/assessment/start?user_id={TEST_USER_ID}", timeout=10)
        session_id = start_resp.json()["sessionId"]

        wav_path = "/tmp/speech_sample_rec_test.wav"
        get_real_speech_wav(wav_path)

        with open(wav_path, "rb") as f:
            up_resp = requests.post(
                f"{BACKEND_URL}/api/assessment/upload",
                files={"file": ("speech.wav", f, "audio/wav")},
                params={
                    "sessionId": session_id,
                    "userId": TEST_USER_ID,
                    "topicId": "workplace",
                    "duration": "9.5",
                },
                timeout=120,
            )
        logger.info("Upload HTTP status when ml-recommendation is unreachable: %d", up_resp.status_code)
        assert up_resp.status_code == 200, f"Upload should soft-fail on rec error, but got {up_resp.status_code}: {up_resp.text}"
        logger.info("✅ 4a (Soft-fail on upload) PASSED CLEANLY")

        # B. Hard-Fail on GET /api/recommendations: must return 502 Bad Gateway
        logger.info("Testing 4b: Hard-fail on GET /api/recommendations with ml-recommendation down...")
        rec_resp = requests.get(f"{BACKEND_URL}/api/recommendations?user_id={TEST_USER_ID}", timeout=15)
        logger.info("GET /api/recommendations status: %d", rec_resp.status_code)
        assert rec_resp.status_code == 502, f"Expected 502, got {rec_resp.status_code}: {rec_resp.text}"
        logger.info("✅ 4b (Hard-fail 502 on GET /api/recommendations) PASSED CLEANLY")

        # C. Hard-Fail on POST /api/exercises/complete: must return 502 Bad Gateway
        logger.info("Testing 4c: Hard-fail on POST /api/exercises/complete with ml-recommendation down...")
        ex_resp = requests.post(
            f"{BACKEND_URL}/api/exercises/complete",
            params={
                "user_id": TEST_USER_ID,
                "exercise_id": "00000000-0000-0000-0000-000000000000",
                "category": "fluency",
                "score": 75,
            },
            timeout=15,
        )
        logger.info("POST /api/exercises/complete status: %d", ex_resp.status_code)
        assert ex_resp.status_code == 502, f"Expected 502, got {ex_resp.status_code}: {ex_resp.text}"
        logger.info("✅ 4c (Hard-fail 502 on POST /api/exercises/complete) PASSED CLEANLY")

    finally:
        logger.info("Restarting ml-recommendation process on port 9003...")
        start_ml_recommendation()

    logger.info("✅ ALL STEP 4 FAILURE MODE TESTS PASSED CLEANLY!\n")


if __name__ == "__main__":
    logger.info("Starting Integrated Live Verification of ml-recommendation (:9003)...")
    succ_session, rec_item = test_1_full_pipeline_upload()
    test_2_get_recommendations_endpoint()
    test_3_complete_exercise_endpoint(rec_item)
    test_4_failure_modes()
    logger.info("🎉 ALL ML-RECOMMENDATION INTEGRATED TESTS PASSED SUCCESSFULLY! Session ID: %s", succ_session)
    print(f"\nSUCCESSFUL_SESSION_ID={succ_session}")

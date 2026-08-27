import sys
import os
import json
import time
import uuid
import threading
import requests
import websocket
from dotenv import dotenv_values
from supabase import create_client

def main():
    backend_env = dotenv_values("backend/.env")
    supabase_url = backend_env.get("SUPABASE_URL")
    service_role_key = backend_env.get("SUPABASE_SERVICE_ROLE_KEY")
    sp = create_client(supabase_url, service_role_key)

    user_id = "fcee8cf2-f9ba-4da8-b745-8cc7de110679"
    recordings_dir = "backend/test_recordings"
    files = [f for f in os.listdir(recordings_dir) if f.endswith(".webm")]
    if not files:
        print(f"Error: no webm files found in {recordings_dir}")
        sys.exit(1)
    audio_path = os.path.join(recordings_dir, files[0])

    print("=" * 70)
    print("STAGE 4 END-TO-END VERIFICATION: FULL PIPELINE + STOMP WEBSOCKET")
    print("=" * 70)

    # 1. Start Assessment on session-service
    start_resp = requests.post(f"http://localhost:8082/api/assessment/start?user_id={user_id}")
    if start_resp.status_code != 200:
        print(f"Failed to start assessment: {start_resp.text}")
        sys.exit(1)

    session_id = start_resp.json().get("sessionId")
    print(f"[*] Assessment Session Created: {session_id}")

    # 2. Connect WebSocket to report-service STOMP endpoint
    ws_url = "ws://localhost:8083/ws"
    received_frames = []
    connected_event = threading.Event()
    ws_closed = threading.Event()

    def on_message(ws, message):
        print(f"\n[STOMP FRAME RECEIVED @ {time.strftime('%H:%M:%S')}]:\n{message}")
        received_frames.append(message)
        if "CONNECTED" in message:
            connected_event.set()

    def on_error(ws, error):
        print(f"[STOMP ERROR]: {error}")

    def on_close(ws, close_status_code, close_msg):
        print(f"[STOMP CLOSED]: {close_status_code} - {close_msg}")
        ws_closed.set()

    def on_open(ws):
        print(f"[*] WebSocket Transport Connected to {ws_url}. Sending STOMP CONNECT...")
        connect_frame = "CONNECT\naccept-version:1.1,1.2\nheart-beat:10000,10000\n\n\x00"
        ws.send(connect_frame)

    ws_app = websocket.WebSocketApp(
        ws_url,
        on_open=on_open,
        on_message=on_message,
        on_error=on_error,
        on_close=on_close
    )

    ws_thread = threading.Thread(target=ws_app.run_forever, daemon=True)
    ws_thread.start()

    # Wait for STOMP CONNECTED
    if not connected_event.wait(timeout=5):
        print("[!] Timed out waiting for STOMP CONNECTED frame")
        sys.exit(1)

    # Subscribe to topic (strictly singular per D17)
    sub_topic = f"/topic/assessment/{session_id}"
    print(f"[*] Subscribing to destination: {sub_topic}")
    sub_frame = f"SUBSCRIBE\nid:sub-0\ndestination:{sub_topic}\nack:auto\n\n\x00"
    ws_app.send(sub_frame)
    time.sleep(1)

    # 3. Upload Audio to session-service
    print(f"[*] Uploading test audio ({os.path.getsize(audio_path)} bytes) to session-service:8082...")
    upload_url = f"http://localhost:8082/api/assessment/upload?userId={user_id}&sessionId={session_id}&topicId=interview&duration=30"
    with open(audio_path, "rb") as f:
        files = {"file": ("recording.webm", f, "audio/webm")}
        upload_resp = requests.post(upload_url, files=files)

    print(f"[*] Upload Response [{upload_resp.status_code}]: {upload_resp.json()}")

    # 4. Wait for both REPORT_READY and RECOMMENDATIONS_READY STOMP frames
    print("[*] Waiting for asynchronous pipeline to process and broadcast events...")
    start_wait = time.time()
    report_ready_frame = None
    rec_ready_frame = None

    while time.time() - start_wait < 45:
        for f in received_frames:
            if "REPORT_READY" in f and not report_ready_frame:
                report_ready_frame = f
            if "RECOMMENDATIONS_READY" in f and not rec_ready_frame:
                rec_ready_frame = f
        if report_ready_frame and rec_ready_frame:
            break
        time.sleep(1)

    ws_app.close()

    print("\n" + "=" * 70)
    print("STOMP WEBSOCKET FRAME RESULTS")
    print("=" * 70)
    print(f"REPORT_READY received         : {'YES' if report_ready_frame else 'NO'}")
    print(f"RECOMMENDATIONS_READY received: {'YES' if rec_ready_frame else 'NO'}")

    # 5. Live Database Corroboration via Supabase
    print("\n" + "=" * 70)
    print("LIVE SUPABASE CORROBORATION FOR SESSION:", session_id)
    print("=" * 70)

    session_row = sp.table("assessment_sessions").select("id, status, created_at, completed_at, failure_reason, audio_storage_path").eq("id", session_id).execute().data
    print("\n[assessment_sessions]:")
    print(json.dumps(session_row, indent=2))

    report_row = sp.table("assessment_reports").select("id, assessment_session_id, overall_score, pronunciation_score, fluency_score, clarity_score, grammar_score, vocabulary_score, confidence_score, wpm, filler_word_count, eye_contact_score, cefr_level, created_at").eq("assessment_session_id", session_id).execute().data
    print("\n[assessment_reports]:")
    print(json.dumps(report_row, indent=2))

    profile_row = sp.table("speech_profiles").select("id, user_id, weakness_priority_1, weakness_priority_2, weakness_priority_3, identified_issues, last_updated_at").eq("user_id", user_id).execute().data
    print("\n[speech_profiles]:")
    print(json.dumps(profile_row, indent=2))

    recs = sp.table("exercise_recommendations").select("id, user_id, template_id, priority_rank, is_active, created_at").eq("user_id", user_id).eq("is_active", True).execute().data
    print("\n[active exercise_recommendations]:")
    print(json.dumps(recs, indent=2))

if __name__ == "__main__":
    main()


import os
import sys
import subprocess
import json
import uuid
import urllib.request
import urllib.parse
import urllib.error

BASE_URL = "http://localhost:8085"
USER_ID = "fcee8cf2-f9ba-4da8-b745-8cc7de110679"
TARGET_TEXT = "The author thanked his mother and brother with warmth"

def generate_tts_wav(text: str, output_path: str):
    aiff_path = output_path.replace(".wav", ".aiff")
    subprocess.run(["say", "-o", aiff_path, text], check=True)
    subprocess.run(["ffmpeg", "-y", "-i", aiff_path, "-ar", "16000", "-ac", "1", output_path], check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    if os.path.exists(aiff_path):
        os.remove(aiff_path)

def http_post_json(url):
    req = urllib.request.Request(url, data=b"", method="POST")
    with urllib.request.urlopen(req) as resp:
        return resp.status, json.loads(resp.read().decode("utf-8"))

def submit_attempt(session_id, wav_file, attempt_number):
    cmd = [
        "curl", "-s", "-X", "POST",
        f"{BASE_URL}/api/practice/attempt",
        "-F", f"practiceSessionId={session_id}",
        "-F", f"targetText={TARGET_TEXT}",
        "-F", f"attemptNumber={attempt_number}",
        "-F", f"file=@{wav_file};type=audio/wav"
    ]
    r = subprocess.run(cmd, capture_output=True, text=True)
    return json.loads(r.stdout.strip())

def run_smoke_test():
    print(f"=== Starting Practice Game Service Smoke Test against {BASE_URL} ===")
    
    # 1. Start Practice Session
    print("\n[Step 1] Starting Practice Session (bucket='th_sound')...")
    status, session_data = http_post_json(f"{BASE_URL}/api/practice/session?user_id={USER_ID}&bucket=th_sound")
    print(f"Status Code: {status}")
    print(f"Response: {json.dumps(session_data, indent=2)}")
    assert status == 200, f"Expected 200, got {status}"
    session_id = session_data["sessionId"]
    print(f"✓ Session created successfully with ID: {session_id}")

    # Generate test audio clips
    mismatch_wav = "temp_mismatch.wav"
    match_wav = "temp_match.wav"
    generate_tts_wav("The quick brown fox jumps over the lazy dog", mismatch_wav)
    generate_tts_wav(TARGET_TEXT, match_wav)

    try:
        # 2. Submit Mismatch Attempt
        print("\n[Step 2] Submitting Mismatch Attempt (target vs 'The quick brown fox...')...")
        mismatch_data = submit_attempt(session_id, mismatch_wav, 1)
        print(f"Response: {json.dumps(mismatch_data, indent=2)}")
        assert mismatch_data["isMatch"] is False, f"Expected isMatch=False, got {mismatch_data['isMatch']}"
        assert mismatch_data["wer"] > 0.15, f"Expected WER > 0.15, got {mismatch_data['wer']}"
        print(f"✓ Mismatch attempt evaluated correctly: isMatch={mismatch_data['isMatch']}, wer={mismatch_data['wer']:.4f}")

        # 3. Submit Match Attempt
        print(f"\n[Step 3] Submitting Match Attempt (target vs '{TARGET_TEXT}')...")
        match_data = submit_attempt(session_id, match_wav, 2)
        print(f"Response: {json.dumps(match_data, indent=2)}")
        assert match_data["isMatch"] is True, f"Expected isMatch=True, got {match_data['isMatch']}"
        assert match_data["wer"] <= 0.15, f"Expected WER <= 0.15, got {match_data['wer']}"
        print(f"✓ Match attempt evaluated correctly: isMatch={match_data['isMatch']}, wer={match_data['wer']:.4f}")

        # 4. Complete Practice Session
        print(f"\n[Step 4] Completing Practice Session ({session_id})...")
        c_status, complete_data = http_post_json(f"{BASE_URL}/api/practice/session/{session_id}/complete")
        print(f"Status Code: {c_status}")
        print(f"Response: {json.dumps(complete_data, indent=2)}")
        assert c_status == 200, f"Expected 200, got {c_status}"
        assert complete_data["status"] == "completed", f"Expected status='completed', got {complete_data['status']}"
        print(f"✓ Session marked completed successfully: {complete_data['status']}")

        print("\n=== ALL SMOKE TEST ASSERTIONS PASSED ON PORT 8085 ===")

    finally:
        if os.path.exists(mismatch_wav):
            os.remove(mismatch_wav)
        if os.path.exists(match_wav):
            os.remove(match_wav)

if __name__ == "__main__":
    run_smoke_test()

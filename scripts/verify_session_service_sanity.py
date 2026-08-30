import requests
import json
import psycopg2
import os

SESSION_SERVICE_URL = "http://localhost:8082"
USER_ID = "fcee8cf2-f9ba-4da8-b745-8cc7de110679"
TOPIC_ID = "interview"

# Read DB connection details
DB_URL = os.environ.get("SUPABASE_DB_URL", "postgresql://postgres:1@Aayush9277@db.kvubxhrfipcvlephrxam.supabase.co:5432/postgres")

def main():
    print(f"=== [Part 1] Live session-service sanity check against {SESSION_SERVICE_URL} ===")
    
    # 1. Call POST /api/assessment/start
    url = f"{SESSION_SERVICE_URL}/api/assessment/start?user_id={USER_ID}&topic_id={TOPIC_ID}"
    print(f"Calling: POST {url}")
    resp = requests.post(url)
    print(f"HTTP Status Code: {resp.status_code}")
    print(f"HTTP Response Body: {json.dumps(resp.json(), indent=2)}")
    
    assert resp.status_code == 200, f"Expected 200, got {resp.status_code}"
    data = resp.json()
    session_id = data.get("sessionId")
    assert session_id is not None, "sessionId must be present in response"
    print(f"✓ Created session ID: {session_id}")

    # 2. Query Supabase directly
    print("\n--- Verifying Supabase DB Dual-Write (D6) ---")
    conn = psycopg2.connect(
        host="db.kvubxhrfipcvlephrxam.supabase.co",
        port=5432,
        dbname="postgres",
        user="postgres",
        password="9277Aayush13"
    )
    cur = conn.cursor()

    # Query legacy assessments table
    cur.execute("SELECT id, user_id, created_at FROM public.assessments WHERE id = %s", (session_id,))
    legacy_row = cur.fetchone()
    print(f"\n[public.assessments] Query Result:")
    if legacy_row:
        print(f"  id: {legacy_row[0]}")
        print(f"  user_id: {legacy_row[1]}")
        print(f"  created_at: {legacy_row[2]}")
    else:
        print("  ROW NOT FOUND!")

    # Query assessment_sessions table
    cur.execute("SELECT id, user_id, topic_id, status, created_at FROM public.assessment_sessions WHERE id = %s", (session_id,))
    new_row = cur.fetchone()
    print(f"\n[public.assessment_sessions] Query Result:")
    if new_row:
        print(f"  id: {new_row[0]}")
        print(f"  user_id: {new_row[1]}")
        print(f"  topic_id: {new_row[2]}")
        print(f"  status: {new_row[3]}")
        print(f"  created_at: {new_row[4]}")
    else:
        print("  ROW NOT FOUND!")

    cur.close()
    conn.close()

    assert legacy_row is not None, "Missing row in public.assessments"
    assert new_row is not None, "Missing row in public.assessment_sessions"
    assert str(legacy_row[0]) == str(session_id), "ID mismatch in assessments"
    assert str(new_row[0]) == str(session_id), "ID mismatch in assessment_sessions"
    
    print("\n✓ Dual-write contract (D6) verified successfully in Supabase!")

if __name__ == "__main__":
    main()

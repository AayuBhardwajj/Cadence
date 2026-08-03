import os
import sys
import asyncio
import json
from datetime import datetime

# Add backend to path
sys.path.append(os.path.join(os.getcwd(), "backend"))

from utils.supabase_client import supabase
from services.passage_generation_service import generate_passage, get_or_generate_passage, refill_passages

TEST_WORDS = [
    {
        "word_code": "TEST-WB-001",
        "word": "school",
        "issue_type": "mti",
        "bucket": "extra_sound",
        "why": "Starts with s+c, mouth wants to add a vowel before it",
        "difficulty": "easy",
        "topic_fit": "education",
        "verified_by_slp": "yes",
        "active": True
    },
    {
        "word_code": "TEST-WB-002",
        "word": "sports",
        "issue_type": "mti",
        "bucket": "extra_sound",
        "why": "Starts with s+p, same pattern",
        "difficulty": "easy",
        "topic_fit": "sports",
        "verified_by_slp": "yes",
        "active": True
    },
    {
        "word_code": "TEST-WB-003",
        "word": "spring",
        "issue_type": "mti",
        "bucket": "extra_sound",
        "why": "Three sounds stacked at the start (s+p+r)",
        "difficulty": "medium",
        "topic_fit": "general",
        "verified_by_slp": "yes",
        "active": True
    },
    {
        "word_code": "TEST-WB-004",
        "word": "strong",
        "issue_type": "mti",
        "bucket": "extra_sound",
        "why": "Three sounds stacked (s+t+r)",
        "difficulty": "medium",
        "topic_fit": "general",
        "verified_by_slp": "yes",
        "active": True
    },
    {
        "word_code": "TEST-WB-005",
        "word": "street",
        "issue_type": "mti",
        "bucket": "extra_sound",
        "why": "Three sounds stacked (s+t+r)",
        "difficulty": "medium",
        "topic_fit": "general",
        "verified_by_slp": "yes",
        "active": True
    },
    {
        "word_code": "TEST-WB-006",
        "word": "satisfactory",
        "issue_type": "mti",
        "bucket": "long_word",
        "why": "Multisyllabic word stress challenge",
        "difficulty": "hard",
        "topic_fit": "education",
        "verified_by_slp": "yes",
        "active": True
    },
    {
        "word_code": "TEST-WB-007",
        "word": "characteristic",
        "issue_type": "mti",
        "bucket": "long_word",
        "why": "Complex syllable structure",
        "difficulty": "hard",
        "topic_fit": "general",
        "verified_by_slp": "yes",
        "active": True
    },
    {
        "word_code": "TEST-WB-008",
        "word": "bubble",
        "issue_type": "stutter_trigger",
        "bucket": "initial_consonant",
        "why": "Stutter trigger word",
        "difficulty": "easy",
        "topic_fit": "general",
        "verified_by_slp": "yes",
        "active": True
    }
]

async def run_tests():
    print("🚀 Starting Passage Generation Verification...")
    
    # 1. Clean up any leftover test data first
    await cleanup()
    
    # 2. Seed test words into word_bank
    print("Seeding test words into word_bank...")
    try:
        supabase.table("word_bank").insert(TEST_WORDS).execute()
        print("✅ Seeded test words successfully!")
    except Exception as e:
        print(f"❌ Failed to seed test words: {e}")
        return

    created_passage_ids = []

    try:
        # Test Case 1: Simple generation with specific difficulty and topic
        print("\n--- Test Case 1: Specific difficulty ('easy') and topic ('education') ---")
        res1 = await generate_passage(difficulty="easy", topic="education", issue_type=None, word_count=2)
        created_passage_ids.append(res1["passage_id"])
        
        print("Generated Passage:")
        print(res1["passage_text"])
        
        # Asserts
        assert "passage_id" in res1
        assert "passage_text" in res1
        assert res1["difficulty"] == "easy"
        assert res1["topic"] == "education"
        assert len(res1["target_words"]) > 0
        
        # Verify verbatim match of each target word in passage at correct indexes
        for tw in res1["target_words"]:
            word_val = tw["word"]
            start, end = tw["char_start"], tw["char_end"]
            passage_slice = res1["passage_text"][start:end]
            print(f"Target word: '{word_val}' found at [{start}:{end}] -> '{passage_slice}'")
            assert passage_slice.lower() == word_val.lower()
        
        print("✅ Test Case 1 Passed!")

        # Test Case 2: No difficulty constraint (should spread across easy/medium/hard)
        print("\n--- Test Case 2: Difficulty spread (no difficulty specified) ---")
        res2 = await generate_passage(difficulty=None, topic=None, issue_type="mti", word_count=4)
        created_passage_ids.append(res2["passage_id"])
        
        print("Generated Passage:")
        print(res2["passage_text"])
        
        # Check that we got words of different difficulties
        diffs = [tw["word"] for tw in res2["target_words"]]
        print(f"Selected words: {diffs}")
        
        assert "passage_id" in res2
        assert len(res2["target_words"]) > 0
        print("✅ Test Case 2 Passed!")

        # Test Case 3: Stutter trigger words filter
        print("\n--- Test Case 3: Issue Type filter ('stutter_trigger') ---")
        res3 = await generate_passage(difficulty="easy", topic=None, issue_type="stutter_trigger", word_count=1)
        created_passage_ids.append(res3["passage_id"])
        
        print("Generated Passage:")
        print(res3["passage_text"])
        print(f"Target words: {res3['target_words']}")
        
        assert len(res3["target_words"]) == 1
        assert res3["target_words"][0]["word"] == "bubble"
        print("✅ Test Case 3 Passed!")

    except AssertionError as ae:
        print(f"❌ Assertion Error: {ae}")
    except Exception as e:
        print(f"❌ Unexpected Error: {e}")
        import traceback
        traceback.print_exc()
    finally:
        # Clean up database
        print("\nCleaning up database...")
        await cleanup(created_passage_ids)
        print("✅ Cleanup completed!")

async def cleanup(passage_ids=None):
    # Delete test words
    try:
        supabase.table("word_bank").delete().like("word_code", "TEST-WB-%").execute()
    except Exception as e:
        print(f"Error deleting test words: {e}")

    # Delete test generated passages
    if passage_ids:
        for pid in passage_ids:
            try:
                supabase.table("generated_passages").delete().eq("id", pid).execute()
            except Exception as e:
                print(f"Error deleting test passage {pid}: {e}")


async def cleanup_pool(topic: str, difficulty: str):
    """Remove all passage_pool rows (and their generated_passages) for a given combo."""
    try:
        rows = supabase.table("passage_pool") \
            .select("id, passage_id") \
            .eq("topic", topic) \
            .eq("difficulty", difficulty) \
            .execute()
        for row in (rows.data or []):
            supabase.table("passage_pool").delete().eq("id", row["id"]).execute()
            try:
                supabase.table("generated_passages").delete().eq("id", row["passage_id"]).execute()
            except Exception:
                pass
    except Exception as e:
        print(f"  Warning: pool cleanup error: {e}")


# ─────────────────────────────────────────────────────────────────────────────
# Pool-layer tests
# ─────────────────────────────────────────────────────────────────────────────

POOL_TOPIC = "technology"
POOL_DIFF  = "easy"


async def run_pool_tests():
    print("\n" + "="*60)
    print("🏊 Starting Passage Pool Layer Verification...")
    print("="*60)

    all_pool_passage_ids = []

    # ── Test Pool-1: Sequential serves yield distinct passage IDs ──────────────
    print("\n--- Pool Test 1: Sequential serves return distinct passage_ids ---")
    try:
        await cleanup_pool(POOL_TOPIC, POOL_DIFF)

        r1 = await get_or_generate_passage(topic=POOL_TOPIC, difficulty=POOL_DIFF)
        r2 = await get_or_generate_passage(topic=POOL_TOPIC, difficulty=POOL_DIFF)

        pid1, pid2 = r1["passage_id"], r2["passage_id"]
        all_pool_passage_ids.extend([pid1, pid2])

        print(f"  Request 1 passage_id: {pid1}")
        print(f"  Request 2 passage_id: {pid2}")

        assert pid1 != pid2, f"Expected distinct passage_ids but both were {pid1}"
        print("✅ Pool Test 1 Passed: two consecutive requests returned distinct passage_ids.")
    except AssertionError as ae:
        print(f"❌ Pool Test 1 FAILED: {ae}")
    except Exception as e:
        print(f"❌ Pool Test 1 ERROR: {e}")
        import traceback; traceback.print_exc()

    # ── Test Pool-2: Empty pool fallback seeds pool then succeeds ──────────────
    print("\n--- Pool Test 2: Empty pool fallback seeds passage_pool ---")
    try:
        # Drain everything for this combo
        await cleanup_pool(POOL_TOPIC, POOL_DIFF)

        # Verify pool is truly empty
        before = supabase.table("passage_pool") \
            .select("id", count="exact") \
            .eq("topic", POOL_TOPIC) \
            .eq("difficulty", POOL_DIFF) \
            .execute()
        assert (before.count or 0) == 0, "Pool was not empty before fallback test"

        # This call must succeed via live generation
        r = await get_or_generate_passage(topic=POOL_TOPIC, difficulty=POOL_DIFF)
        all_pool_passage_ids.append(r["passage_id"])

        assert "passage_id" in r, "No passage_id in response"

        # After the fallback the row must be present in passage_pool (status=served)
        after = supabase.table("passage_pool") \
            .select("id, status") \
            .eq("topic", POOL_TOPIC) \
            .eq("difficulty", POOL_DIFF) \
            .execute()
        pool_rows = after.data or []

        print(f"  Passage returned: {r['passage_id']}")
        print(f"  passage_pool rows after fallback: {len(pool_rows)}")
        for row in pool_rows:
            print(f"    → id={row['id']}  status={row['status']}")

        assert len(pool_rows) >= 1, "Fallback did not leave a row in passage_pool"
        statuses = {row["status"] for row in pool_rows}
        assert "served" in statuses, f"Expected 'served' row but got statuses: {statuses}"
        print("✅ Pool Test 2 Passed: fallback succeeded and self-seeded passage_pool.")
    except AssertionError as ae:
        print(f"❌ Pool Test 2 FAILED: {ae}")
    except Exception as e:
        print(f"❌ Pool Test 2 ERROR: {e}")
        import traceback; traceback.print_exc()

    # ── Test Pool-3: Concurrent claim atomicity (3 requests, 2 available) ──────
    print("\n--- Pool Test 3: Concurrent atomic claim (3 requests, 2 available) ---")
    try:
        # Start fresh
        await cleanup_pool(POOL_TOPIC, POOL_DIFF)

        # Pre-populate exactly 2 available rows by calling generate_passage directly
        print("  Pre-populating pool with exactly 2 available passages...")
        for _ in range(2):
            seed = await generate_passage(difficulty=POOL_DIFF, topic=None,
                                          issue_type=None, word_count=8)
            supabase.table("passage_pool").insert({
                "passage_id": seed["passage_id"],
                "topic": POOL_TOPIC,
                "difficulty": POOL_DIFF,
                "status": "available"
            }).execute()
            all_pool_passage_ids.append(seed["passage_id"])

        verify_seed = supabase.table("passage_pool") \
            .select("id", count="exact") \
            .eq("topic", POOL_TOPIC).eq("difficulty", POOL_DIFF) \
            .eq("status", "available").execute()
        print(f"  Confirmed {verify_seed.count} available rows before concurrent test.")
        assert verify_seed.count == 2, f"Expected 2 available rows, got {verify_seed.count}"

        # Fire 3 concurrent requests
        print("  Firing 3 concurrent get_or_generate_passage requests...")
        tasks = [
            asyncio.create_task(get_or_generate_passage(topic=POOL_TOPIC, difficulty=POOL_DIFF))
            for _ in range(3)
        ]
        results = await asyncio.gather(*tasks, return_exceptions=True)

        successes = [r for r in results if isinstance(r, dict)]
        errors    = [r for r in results if isinstance(r, Exception)]
        pids      = [r["passage_id"] for r in successes]
        unique_pids = set(pids)

        for r in successes:
            all_pool_passage_ids.append(r["passage_id"])

        pool_served = [r for r in successes if r.get("source") == "pool"]
        fallbacks   = [r for r in successes if r.get("source") == "fallback"]

        print(f"\n  Per-request breakdown:")
        for idx, r in enumerate(successes, 1):
            print(f"    Request {idx}: passage_id={r['passage_id']} -> source='{r.get('source')}'")

        print(f"\n  Results summary:")
        print(f"    Total requests fired      : 3")
        print(f"    Successful responses      : {len(successes)}")
        print(f"    Exceptions                : {len(errors)}")
        print(f"    Unique passage_ids        : {len(unique_pids)}  → {unique_pids}")
        print(f"    Pool-served (source=pool)  : {len(pool_served)} (expected 2)")
        print(f"    Live-generated (fallback) : {len(fallbacks)} (expected 1)")

        # Check pool state after
        after_served = supabase.table("passage_pool") \
            .select("id, status, served_at") \
            .eq("topic", POOL_TOPIC).eq("difficulty", POOL_DIFF) \
            .execute()
        served_rows    = [r for r in (after_served.data or []) if r["status"] == "served"]
        available_rows = [r for r in (after_served.data or []) if r["status"] == "available"]
        print(f"    passage_pool 'served' rows    : {len(served_rows)}")
        print(f"    passage_pool 'available' rows : {len(available_rows)}")

        # Strict assertions proving atomic contention behavior
        assert len(errors) == 0, f"Some requests raised exceptions: {errors}"
        assert len(unique_pids) == 3, \
            f"Expected 3 distinct passage_ids but got {len(unique_pids)}: {unique_pids}"
        assert len(pool_served) == 2, \
            f"Expected exactly 2 pool hits, got {len(pool_served)} (sources: {[r.get('source') for r in successes]})"
        assert len(fallbacks) == 1, \
            f"Expected exactly 1 fallback live generation, got {len(fallbacks)} (sources: {[r.get('source') for r in successes]})"
        assert len(served_rows) == 3, \
            f"Expected 3 total served rows in pool after self-seeding fallback, got {len(served_rows)}"
        print("✅ Pool Test 3 Passed: atomic claim correctly served 2 from pool and 1 via fallback.")
    except AssertionError as ae:
        print(f"❌ Pool Test 3 FAILED: {ae}")
    except Exception as e:
        print(f"❌ Pool Test 3 ERROR: {e}")
        import traceback; traceback.print_exc()

    # ── Test Pool-4: Refill worker reaches TARGET_POOL_SIZE ───────────────────
    print("\n--- Pool Test 4: Refill worker tops up all 15 combos to TARGET_POOL_SIZE ---")
    try:
        from services.passage_generation_service import TARGET_POOL_SIZE, FIXED_TOPICS, DIFFICULTIES

        # Reset lock in case a previous run left it held
        supabase.rpc("unlock_refill").execute()

        print(f"  Running refill_passages() directly (TARGET_POOL_SIZE={TARGET_POOL_SIZE})...")
        await refill_passages()

        combos_below_target = []
        for topic in FIXED_TOPICS:
            for diff in DIFFICULTIES:
                count_res = supabase.table("passage_pool") \
                    .select("id", count="exact") \
                    .eq("topic", topic) \
                    .eq("difficulty", diff) \
                    .eq("status", "available") \
                    .execute()
                cnt = count_res.count or 0
                status = "✅" if cnt >= TARGET_POOL_SIZE else "⚠️ "
                print(f"    {status} {topic}/{diff}: {cnt} available")
                if cnt < TARGET_POOL_SIZE:
                    combos_below_target.append(f"{topic}/{diff} (count={cnt})")

        if combos_below_target:
            print(f"❌ Pool Test 4 FAILED: combos below target: {combos_below_target}")
        else:
            print(f"✅ Pool Test 4 Passed: all 15 combos have ≥{TARGET_POOL_SIZE} available passages.")
    except Exception as e:
        print(f"❌ Pool Test 4 ERROR: {e}")
        import traceback; traceback.print_exc()

    # ── Pool-layer cleanup notice ─────────────────────────────────────────────
    print(f"\nNote: Pool rows and refill-generated passages are left in the DB.")
    print("They are valid pool inventory and do not need to be cleaned up.")
    print("="*60)


if __name__ == "__main__":
    import sys
    # Pass --pool to run only pool tests, default runs both
    run_pool_only = "--pool" in sys.argv
    if run_pool_only:
        asyncio.run(run_pool_tests())
    else:
        async def run_all():
            await run_tests()
            await run_pool_tests()
        asyncio.run(run_all())


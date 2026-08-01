import os
import sys
import asyncio
import json
from datetime import datetime

# Add backend to path
sys.path.append(os.path.join(os.getcwd(), "backend"))

from utils.supabase_client import supabase
from services.passage_generation_service import generate_passage

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

if __name__ == "__main__":
    asyncio.run(run_tests())

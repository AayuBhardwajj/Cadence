import os
import sys
import json
import asyncio
import logging

# Set up logging to stdout
logging.basicConfig(level=logging.INFO)

# Add backend directory to sys.path
sys.path.append(os.path.join(os.getcwd(), "backend"))

from supabase import create_client
from utils.transcript_alignment import align_transcript, _normalize_for_alignment
from services.analysis_service import deep_analyze_speech, _map_consolidated_to_amcat, _get_fallback_analysis

def load_env():
    env_path = os.path.join(os.getcwd(), "backend", ".env")
    if os.path.exists(env_path):
        with open(env_path) as f:
            for line in f:
                if "=" in line and not line.startswith("#"):
                    k, v = line.strip().split("=", 1)
                    os.environ[k] = v

async def test_1_alignment_function():
    print("\n--- Test 1: Unit Alignment Function ---")
    ref = ("During the lecture, the professor described how a photographer might capture "
           "the subtle interplay of light across a table, noting that the width of the shadow can "
           "reveal hidden patterns. He explained that the government's funding for the arts often "
           "faces difficult scrutiny, yet it remains essential for cultural growth.")
    hyp = ("During the lecture, the professor described how a photographer might capture "
           "the subtle interplay of light across a table, noting that the width of the shadow can "
           "reveal hidden patterns. He explained that the government's funding for the arts often "
           "faces difficult astringency, yet it remains essential for cultural growth.")
    
    errors = align_transcript(ref, hyp)
    assert len(errors) > 0, "Should detect at least one discrepancy"
    scrutiny_err = next((e for e in errors if e.get("reference_words") == "scrutiny"), None)
    assert scrutiny_err is not None, "Should detect 'scrutiny -> astringency' substitution"
    assert scrutiny_err["said_words"] == "astringency"
    assert scrutiny_err["error_type"] == "substitution"
    assert scrutiny_err["category"] == "Vocabulary"
    assert scrutiny_err["high_confidence"] is True
    print("✅ Test 1 Passed: Unit alignment correctly identified 'scrutiny -> astringency' substitution.")


async def test_2_session_b1d7500c_reanalysis():
    print("\n--- Test 2: Live Re-analysis of Session b1d7500c ---")
    load_env()
    sp = create_client(os.environ["SUPABASE_URL"], os.environ["SUPABASE_SERVICE_ROLE_KEY"])
    
    session_id = "b1d7500c-9aee-40b3-947f-1011dd72b0db"
    sess_res = sp.table("assessment_sessions").select("passage_id").eq("id", session_id).execute()
    assert sess_res.data and sess_res.data[0].get("passage_id"), "Session b1d7500c must exist with passage_id"
    
    passage_id = sess_res.data[0]["passage_id"]
    pass_res = sp.table("generated_passages").select("passage_text").eq("id", passage_id).execute()
    assert pass_res.data and pass_res.data[0].get("passage_text"), "Passage must exist"
    reference_passage = pass_res.data[0]["passage_text"]

    ares_res = sp.table("analysis_results").select("transcription").eq("assessment_id", session_id).execute()
    assert ares_res.data and ares_res.data[0].get("transcription"), "Analysis result must exist"
    transcription = ares_res.data[0]["transcription"]

    audio_data = {
        "transcription": transcription,
        "words_data": [],  # DB completed session has no words_data stored
        "wpm": 140,
        "filler_count": 2,
        "duration": 60
    }
    metrics = {
        "overall_score": 75,
        "cefr_level": "B2",
        "breakdown": {
            "fluency": 75, "pronunciation": 75, "clarity": 72,
            "grammar": 80, "vocabulary": 75, "confidence": 80
        }
    }

    result = await deep_analyze_speech(
        audio_data,
        metrics,
        topic_id="academic",
        topic_prompt=reference_passage,
        reference_passage=reference_passage,
        assessment_id=session_id
    )

    error_log = result.get("amcat_error_log", [])
    print(f"Retrieved {len(error_log)} total error_log entries.")
    
    scrutiny_entry = next((e for e in error_log if e.get("word") == "scrutiny"), None)
    assert scrutiny_entry is not None, "'scrutiny' substitution must appear in amcat_error_log"
    assert scrutiny_entry["said_as"] == "astringency"
    assert scrutiny_entry["error_type"] == "substitution"
    assert scrutiny_entry["category"] == "Vocabulary"
    assert scrutiny_entry["correct_ipa"] == "", "Phonetic IPA must be blank for jiwer-sourced errors"
    assert scrutiny_entry["excluded_from_scoring"] is False, "High confidence swap must NOT be excluded from scoring"

    # Check that low confidence garbling entries exist with excluded_from_scoring = True
    low_conf_entries = [e for e in error_log if e.get("excluded_from_scoring") is True]
    print(f"Found {len(low_conf_entries)} low-confidence entries tagged with excluded_from_scoring=True.")

    # Check error summary vocabulary_errors count excludes low-confidence items
    scored_vocab_count = len([e for e in error_log if not e.get("excluded_from_scoring") and e.get("category") == "Vocabulary"])
    summary_vocab_count = result.get("amcat_transcript", {}).get("error_summary", {}).get("vocabulary_errors")
    summary_mispron_count = result.get("amcat_transcript", {}).get("error_summary", {}).get("mispronunciation")
    assert summary_mispron_count == 0, "mispronunciation count must be 0 for jiwer reference alignment"
    assert summary_vocab_count == scored_vocab_count, f"Summary vocabulary_errors ({summary_vocab_count}) must equal scored vocab errors ({scored_vocab_count})"

    print("\nActual amcat_error_log output for session b1d7500c:")
    print(json.dumps(error_log, indent=2))
    print("✅ Test 2 Passed: Session b1d7500c re-analysis verified successfully!")
    return error_log


async def test_3_free_response_fallback():
    print("\n--- Test 3: Free-Response Fallback Path (reference_passage = None) ---")
    audio_data = {
        "transcription": "I enjoy talking about technology and innovation.",
        "words_data": [],
        "wpm": 150,
        "filler_count": 0,
        "duration": 15
    }
    metrics = {
        "overall_score": 80,
        "cefr_level": "B2",
        "breakdown": {
            "fluency": 80, "pronunciation": 80, "clarity": 80,
            "grammar": 80, "vocabulary": 80, "confidence": 80
        }
    }

    result = await deep_analyze_speech(
        audio_data,
        metrics,
        topic_id="custom",
        topic_prompt="Please speak on a topic of your choice.",
        reference_passage=None
    )
    assert result is not None
    assert "amcat_error_log" in result
    print("✅ Test 3 Passed: Free-response fallback path returned valid result.")


async def test_4_heuristic_fallback_with_reference():
    print("\n--- Test 4: LLM Outage Fallback Path with Reference Passage ---")
    audio_data = {
        "transcription": "He explained that the government's funding for the arts often faces difficult astringency.",
        "words_data": [],
        "wpm": 140,
        "filler_count": 0,
        "duration": 20
    }
    metrics = {
        "overall_score": 70,
        "cefr_level": "B1",
        "breakdown": {
            "fluency": 70, "pronunciation": 70, "clarity": 70,
            "grammar": 70, "vocabulary": 70, "confidence": 70
        }
    }
    ref_text = "He explained that the government's funding for the arts often faces difficult scrutiny."

    result = _get_fallback_analysis(metrics, audio_data, topic_prompt=ref_text, reference_passage=ref_text)
    error_log = result.get("amcat_error_log", [])
    scrutiny_entry = next((e for e in error_log if e.get("word") == "scrutiny"), None)
    assert scrutiny_entry is not None, "Fallback path must also run align_transcript deterministically"
    assert scrutiny_entry["said_as"] == "astringency"
    assert scrutiny_entry["category"] == "Vocabulary"
    print("✅ Test 4 Passed: Heuristic fallback with reference passage successfully ran deterministic alignment.")


async def test_5_timestamp_mapping():
    print("\n--- Test 5: Live Timestamp Mapping with words_data ---")
    ref_text = "He explained that the government's funding for the arts often faces difficult scrutiny."
    hyp_text = "He explained that the government's funding for the arts often faces difficult astringency."
    
    words_data = [
        {"word": "He", "start": 0.0, "end": 0.2},
        {"word": "explained", "start": 0.3, "end": 0.7},
        {"word": "that", "start": 0.8, "end": 0.9},
        {"word": "the", "start": 1.0, "end": 1.1},
        {"word": "government's", "start": 1.2, "end": 1.6},
        {"word": "funding", "start": 1.7, "end": 2.0},
        {"word": "for", "start": 2.1, "end": 2.2},
        {"word": "the", "start": 2.3, "end": 2.4},
        {"word": "arts", "start": 2.5, "end": 2.8},
        {"word": "often", "start": 2.9, "end": 3.2},
        {"word": "faces", "start": 3.3, "end": 3.6},
        {"word": "difficult", "start": 3.7, "end": 4.1},
        {"word": "astringency.", "start": 29.76, "end": 30.2}
    ]

    audio_data = {
        "transcription": hyp_text,
        "words_data": words_data,
        "wpm": 140,
        "filler_count": 0,
        "duration": 31
    }
    metrics = {
        "overall_score": 75,
        "cefr_level": "B2",
        "breakdown": {
            "fluency": 75, "pronunciation": 75, "clarity": 75,
            "grammar": 75, "vocabulary": 75, "confidence": 75
        }
    }

    result = _map_consolidated_to_amcat(
        {},
        metrics,
        audio_data,
        topic_prompt=ref_text,
        reference_passage=ref_text
    )
    error_log = result.get("amcat_error_log", [])
    scrutiny_entry = next((e for e in error_log if e.get("word") == "scrutiny"), None)
    assert scrutiny_entry is not None
    assert scrutiny_entry["timestamp"] == "0:29", f"Timestamp should map to '0:29', got '{scrutiny_entry['timestamp']}'"
    print("✅ Test 5 Passed: Live timestamp mapping mapped 'astringency' token at 29.76s to timestamp '0:29'.")


async def main():
    await test_1_alignment_function()
    await test_2_session_b1d7500c_reanalysis()
    await test_3_free_response_fallback()
    await test_4_heuristic_fallback_with_reference()
    await test_5_timestamp_mapping()
    print("\n🎉 ALL TRANSCRIPT ALIGNMENT TESTS PASSED PERFECTLY!")

if __name__ == "__main__":
    asyncio.run(main())

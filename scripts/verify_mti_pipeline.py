#!/usr/bin/env python3
"""Live verification script for MTI region classifier (D23).

Verifies:
1. Live query of bucket_l1_mapping table from Supabase.
2. Full assessment run with a passage embedding >= 2 MTI-bucket target words
   (v_w_mix + vowel_shift) where candidate mispronounces both.
   Verifies and outputs assessment_reports.amcat_mti_deep_dive JSON with
   region_candidates, cluster-level detected_accent, and unreviewed_mapping.
3. Clean-read assessment verifying insufficient_signal: True.
4. Diff-style before/after verification proving zero change to unrelated fields
   (amcat_error_log, grammar_errors, scores, etc.).
"""

import asyncio
import json
import uuid
import sys
import logging
from datetime import datetime, timezone

from ml_shared.supabase_client import supabase
from services.analysis_service import deep_analyze_speech, _map_consolidated_to_amcat
from utils.scoring import calculate_score

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
logger = logging.getLogger("mti_verification")

PASSAGE_ID = "3c26f50f-1852-4bf9-a1dc-ba98977a7840"
USER_ID = "fcee8cf2-f9ba-4da8-b745-8cc7de110679"


async def main():
    print("=" * 80)
    print("STEP 1: LIVE QUERY — bucket_l1_mapping from Supabase")
    print("=" * 80)
    map_res = supabase.table("bucket_l1_mapping").select("*").execute()
    assert map_res.data and len(map_res.data) > 0, "bucket_l1_mapping returned 0 rows!"
    print(f"✅ Successfully fetched {len(map_res.data)} rows from public.bucket_l1_mapping.")
    for row in map_res.data[:3]:
        print(f"   Bucket: {row['bucket']:<15} Weights: {json.dumps(row['region_weights'])} SLP-Reviewed: {row['reviewed_by_slp']}")

    bucket_l1_mapping = {
        r["bucket"]: {
            "region_weights": r.get("region_weights") or {},
            "reviewed_by_slp": bool(r.get("reviewed_by_slp", False)),
        }
        for r in map_res.data
        if "bucket" in r
    }

    # Fetch passage and target_words
    pass_res = supabase.table("generated_passages").select("passage_text, target_words").eq("id", PASSAGE_ID).execute()
    assert pass_res.data and len(pass_res.data) > 0, "Passage not found!"
    passage = pass_res.data[0]
    passage_text = passage["passage_text"]
    target_words = passage["target_words"]
    print(f"\nTarget passage ({PASSAGE_ID}):")
    print(f"Text: \"{passage_text[:100]}...\"")
    mti_tw = [tw for tw in target_words if tw.get("issue_type") == "mti"]
    print(f"MTI Target Words ({len(mti_tw)}): {[(tw['word'], tw['bucket']) for tw in mti_tw]}")

    print("\n" + "=" * 80)
    print("STEP 2: RUN REAL ASSESSMENT WITH >= 2 MTI BUCKET ERRORS (v_w_mix + vowel_shift)")
    print("=" * 80)
    # Session 1: candidate mispronounces 'very' (v_w_mix) as 'wery' and 'home' (vowel_shift) as 'oom'
    session_id_1 = str(uuid.uuid4())
    now_iso = datetime.now(timezone.utc).isoformat()
    supabase.table("assessment_sessions").insert({
        "id": session_id_1,
        "user_id": USER_ID,
        "topic_id": "passage",
        "status": "processing",
        "passage_id": PASSAGE_ID,
        "created_at": now_iso,
    }).execute()
    print(f"Created assessment session {session_id_1}")

    # Simulated candidate transcript substituting 'very' -> 'wery' and 'home' -> 'oom'
    # Original: "As a student, I was very excited to visit the local store with my family. We went home and got ready..."
    transcript_with_errors = (
        "As a student, I was wery excited to visit the local store with my family. "
        "We went oom and got ready for the day, making sure our teeth were clean. "
        "After a quick breakfast, we headed to the state fair, where I rode a slide and won a big stuffed animal. "
        "That was definitely a fun day out."
    )
    words = transcript_with_errors.split()
    words_data = [
        {"word": w, "start": round(i * 0.4, 2), "end": round((i + 1) * 0.4, 2)}
        for i, w in enumerate(words)
    ]
    audio_data_1 = {
        "transcription": transcript_with_errors,
        "duration": round(len(words) * 0.4, 1),
        "wpm": 140,
        "filler_count": 0,
        "words_data": words_data,
        "stutter_count": 0,
        "stutter_events": [],
    }

    # Run deterministic score + deep analysis
    score_data_1 = calculate_score(audio_data_1, {"eye_contact_percent": 0})
    deep_res_1 = await deep_analyze_speech(
        audio_data=audio_data_1,
        metrics=score_data_1,
        topic_id="passage",
        topic_prompt=passage_text,
        reference_passage=passage_text,
        assessment_id=session_id_1,
        user_id=USER_ID,
        target_words=target_words,
        bucket_l1_mapping=bucket_l1_mapping,
    )
    score_data_1.update(deep_res_1)

    # Create row in assessments table for foreign key compatibility
    try:
        supabase.table("assessments").insert({
            "id": session_id_1,
            "user_id": USER_ID,
            "topic": "passage",
            "duration": audio_data_1["duration"],
        }).execute()
    except Exception:
        pass

    # Persist report to assessment_reports in Supabase
    report_id_1 = str(uuid.uuid4())
    supabase.table("assessment_reports").insert({
        "id": report_id_1,
        "assessment_session_id": session_id_1,
        "transcription": transcript_with_errors,
        "overall_score": int(round(score_data_1.get("overall_score", 75))),
        "pronunciation_score": int(round(score_data_1.get("breakdown", {}).get("pronunciation", 75))),
        "fluency_score": int(round(score_data_1.get("breakdown", {}).get("fluency", 75))),
        "clarity_score": int(round(score_data_1.get("breakdown", {}).get("clarity", 75))),
        "grammar_score": int(round(score_data_1.get("breakdown", {}).get("grammar", 75))),
        "vocabulary_score": int(round(score_data_1.get("breakdown", {}).get("vocabulary", 75))),
        "confidence_score": int(round(score_data_1.get("breakdown", {}).get("confidence", 75))),
        "cefr_level": score_data_1.get("cefr_level", "B2"),
        "wpm": int(round(audio_data_1.get("wpm", 140))),
        "filler_word_count": 0,
        "eye_contact_score": 85,
        "strengths": score_data_1.get("strengths", []),
        "focus_areas": score_data_1.get("focus_areas", []),
        "feedback": score_data_1.get("feedback", ""),
        "amcat_metrics": score_data_1.get("amcat_metrics"),
        "amcat_insights": score_data_1.get("amcat_insights"),
        "amcat_error_log": score_data_1.get("amcat_error_log"),
        "amcat_sentences": score_data_1.get("amcat_sentences"),
        "amcat_mti_deep_dive": score_data_1.get("amcat_mti_deep_dive"),
        "reference_passage_text": passage_text,
    }).execute()

    # Query back from Supabase assessment_reports
    db_report_1 = supabase.table("assessment_reports").select("id, amcat_mti_deep_dive, amcat_error_log").eq("id", report_id_1).single().execute()
    deep_dive_live_1 = db_report_1.data["amcat_mti_deep_dive"]

    print("\n✅ Live assessment_reports.amcat_mti_deep_dive from Supabase:")
    print(json.dumps(deep_dive_live_1, indent=2))
    assert deep_dive_live_1["insufficient_signal"] is False, "Expected insufficient_signal: False"
    assert len(deep_dive_live_1["patterns"]) >= 2, "Expected >= 2 patterns"
    assert len(deep_dive_live_1["region_candidates"]) > 0, "Expected populated region_candidates"
    assert deep_dive_live_1.get("unreviewed_mapping") is True, "Expected unreviewed_mapping: True"

    print("\n" + "=" * 80)
    print("STEP 3: RUN REAL ASSESSMENT WITH CLEAN READ (insufficient_signal: True)")
    print("=" * 80)
    session_id_2 = str(uuid.uuid4())
    supabase.table("assessment_sessions").insert({
        "id": session_id_2,
        "user_id": USER_ID,
        "topic_id": "passage",
        "status": "processing",
        "passage_id": PASSAGE_ID,
        "created_at": now_iso,
    }).execute()
    print(f"Created assessment session {session_id_2}")

    # Clean read — candidate reads the exact reference passage without MTI substitutions
    clean_words = passage_text.split()
    clean_words_data = [
        {"word": w, "start": round(i * 0.4, 2), "end": round((i + 1) * 0.4, 2)}
        for i, w in enumerate(clean_words)
    ]
    audio_data_2 = {
        "transcription": passage_text,
        "duration": round(len(clean_words) * 0.4, 1),
        "wpm": 140,
        "filler_count": 0,
        "words_data": clean_words_data,
        "stutter_count": 0,
        "stutter_events": [],
    }

    score_data_2 = calculate_score(audio_data_2, {"eye_contact_percent": 0})
    deep_res_2 = await deep_analyze_speech(
        audio_data=audio_data_2,
        metrics=score_data_2,
        topic_id="passage",
        topic_prompt=passage_text,
        reference_passage=passage_text,
        assessment_id=session_id_2,
        user_id=USER_ID,
        target_words=target_words,
        bucket_l1_mapping=bucket_l1_mapping,
    )
    score_data_2.update(deep_res_2)

    # Create row in assessments table for foreign key compatibility
    try:
        supabase.table("assessments").insert({
            "id": session_id_2,
            "user_id": USER_ID,
            "topic": "passage",
            "duration": audio_data_2["duration"],
        }).execute()
    except Exception:
        pass

    report_id_2 = str(uuid.uuid4())
    supabase.table("assessment_reports").insert({
        "id": report_id_2,
        "assessment_session_id": session_id_2,
        "transcription": passage_text,
        "overall_score": int(round(score_data_2.get("overall_score", 90))),
        "pronunciation_score": int(round(score_data_2.get("breakdown", {}).get("pronunciation", 90))),
        "fluency_score": int(round(score_data_2.get("breakdown", {}).get("fluency", 90))),
        "clarity_score": int(round(score_data_2.get("breakdown", {}).get("clarity", 90))),
        "grammar_score": int(round(score_data_2.get("breakdown", {}).get("grammar", 90))),
        "vocabulary_score": int(round(score_data_2.get("breakdown", {}).get("vocabulary", 90))),
        "confidence_score": int(round(score_data_2.get("breakdown", {}).get("confidence", 90))),
        "cefr_level": score_data_2.get("cefr_level", "C1"),
        "wpm": int(round(audio_data_2.get("wpm", 140))),
        "filler_word_count": 0,
        "eye_contact_score": 85,
        "strengths": score_data_2.get("strengths", []),
        "focus_areas": score_data_2.get("focus_areas", []),
        "feedback": score_data_2.get("feedback", ""),
        "amcat_metrics": score_data_2.get("amcat_metrics"),
        "amcat_insights": score_data_2.get("amcat_insights"),
        "amcat_error_log": score_data_2.get("amcat_error_log"),
        "amcat_sentences": score_data_2.get("amcat_sentences"),
        "amcat_mti_deep_dive": score_data_2.get("amcat_mti_deep_dive"),
        "reference_passage_text": passage_text,
    }).execute()

    db_report_2 = supabase.table("assessment_reports").select("id, amcat_mti_deep_dive").eq("id", report_id_2).single().execute()
    deep_dive_live_2 = db_report_2.data["amcat_mti_deep_dive"]

    print("\n✅ Live clean-read assessment_reports.amcat_mti_deep_dive from Supabase:")
    print(json.dumps(deep_dive_live_2, indent=2))
    assert deep_dive_live_2["insufficient_signal"] is True, "Expected insufficient_signal: True"
    assert deep_dive_live_2["detected_accent"] == "Neutral / No strong L1 influence detected"
    assert deep_dive_live_2["patterns"] == []
    assert deep_dive_live_2["region_candidates"] == []

    print("\n" + "=" * 80)
    print("STEP 4: BEFORE / AFTER DIFF CONFIRMING ZERO CHANGE TO UNRELATED FIELDS")
    print("=" * 80)
    # Simulate run with legacy/no target words vs new MTI classifier on identical audio & metrics
    legacy_llm_data = {
        "grammar_errors": [{"original": "they is", "corrected": "they are", "rule": "Subject-verb agreement"}],
        "sentence_analysis": [{"text": "As a student, I was wery excited."}],
        "strengths": ["Clear volume", "Steady rhythm"],
        "weaknesses": ["Word substitutions"],
        "topic_relevancy": {"score": 85, "feedback": "Relevant"},
        "qualitative_feedback": {"overall_summary": "Good speech sample.", "delivery_notes": "Well paced."},
    }

    # Old way: target_words=None, bucket_l1_mapping=None
    res_before = _map_consolidated_to_amcat(
        data=legacy_llm_data,
        metrics=score_data_1,
        audio_data=audio_data_1,
        topic_prompt=passage_text,
        reference_passage=passage_text,
        target_words=None,
        bucket_l1_mapping=None,
    )

    # New way: target_words and bucket_l1_mapping passed
    res_after = _map_consolidated_to_amcat(
        data=legacy_llm_data,
        metrics=score_data_1,
        audio_data=audio_data_1,
        topic_prompt=passage_text,
        reference_passage=passage_text,
        target_words=target_words,
        bucket_l1_mapping=bucket_l1_mapping,
    )

    # Check which keys differ between before and after
    diff_keys = []
    identical_keys = []
    for k in res_before:
        if res_before[k] == res_after.get(k):
            identical_keys.append(k)
        else:
            diff_keys.append(k)

    print(f"Identical fields ({len(identical_keys)}):")
    for k in identical_keys:
        print(f"  ✓ {k}")

    print(f"\nChanged fields ({len(diff_keys)}):")
    for k in diff_keys:
        print(f"  • {k}")
        if k == "amcat_metrics":
            # In amcat_metrics, only mti sub-dict changes score based on patterns detected
            print(f"    - before amcat_metrics['mti']: {res_before['amcat_metrics']['mti']}")
            print(f"    + after  amcat_metrics['mti']: {res_after['amcat_metrics']['mti']}")
            # verify all other amcat_metrics sub-dictionaries are 100% identical
            for m_sub in ["pronunciation", "fluency", "intonation", "clarity", "relevancy"]:
                assert res_before["amcat_metrics"][m_sub] == res_after["amcat_metrics"][m_sub]
                print(f"      ✓ amcat_metrics['{m_sub}'] is identical")
        elif k == "amcat_mti_deep_dive":
            print(f"    - before: {json.dumps(res_before['amcat_mti_deep_dive'])}")
            print(f"    + after:  {json.dumps(res_after['amcat_mti_deep_dive'])}")

    assert res_before["amcat_error_log"] == res_after["amcat_error_log"], "amcat_error_log must be 100% identical!"
    assert res_before["grammar_errors"] == res_after["grammar_errors"], "grammar_errors must be 100% identical!"
    assert res_before["overall_score"] == res_after["overall_score"], "overall_score must be 100% identical!"
    assert res_before["breakdown"] == res_after["breakdown"], "breakdown must be 100% identical!"
    assert res_before["cefr_level"] == res_after["cefr_level"], "cefr_level must be 100% identical!"
    assert res_before["amcat_insights"] == res_after["amcat_insights"], "amcat_insights must be 100% identical!"
    assert res_before["amcat_sentences"] == res_after["amcat_sentences"], "amcat_sentences must be 100% identical!"

    print("\n" + "=" * 80)
    print("🎉 ALL LIVE VERIFICATION CHECKS PASSED SUCCESSFULLY!")
    print("=" * 80)


if __name__ == "__main__":
    asyncio.run(main())

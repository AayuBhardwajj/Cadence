import pytest
from services.mti_region_classifier import classify_mti_region, REGION_DISPLAY_NAMES
from services.analysis_service import _map_consolidated_to_amcat, _get_fallback_analysis


@pytest.fixture
def sample_mapping():
    return {
        "v_w_mix": {
            "region_weights": {"bengali_odia_belt": 0.7, "hindi_belt": 0.4},
            "reviewed_by_slp": False,
        },
        "vowel_shift": {
            "region_weights": {"dravidian_belt": 0.5, "hindi_belt": 0.4, "generic_indian_english": 0.3},
            "reviewed_by_slp": False,
        },
        "retroflex_td": {
            "region_weights": {"generic_indian_english": 0.7, "hindi_belt": 0.3, "dravidian_belt": 0.3},
            "reviewed_by_slp": False,
        },
        "th_sound": {
            "region_weights": {"generic_indian_english": 0.8},
            "reviewed_by_slp": False,
        },
    }


def test_classify_mti_empty_inputs_returns_insufficient_signal(sample_mapping):
    res1 = classify_mti_region([], [], sample_mapping)
    assert res1["insufficient_signal"] is True
    assert res1["detected_accent"] == "Neutral / No strong L1 influence detected"
    assert res1["patterns"] == []
    assert res1["region_candidates"] == []

    res2 = classify_mti_region(None, None, None)
    assert res2["insufficient_signal"] is True

    res3 = classify_mti_region([{"word": "test", "error_type": "substitution"}], [], sample_mapping)
    assert res3["insufficient_signal"] is True


def test_classify_mti_single_bucket_returns_insufficient_signal(sample_mapping):
    target_words = [
        {"word": "very", "bucket": "v_w_mix", "issue_type": "mti"},
        {"word": "village", "bucket": "v_w_mix", "issue_type": "mti"},
    ]
    # Two error instances, but both are the same bucket (v_w_mix)
    error_log = [
        {"word": "very", "said_as": "wery", "error_type": "substitution"},
        {"word": "village", "said_as": "willage", "error_type": "substitution"},
    ]
    res = classify_mti_region(error_log, target_words, sample_mapping)
    assert res["insufficient_signal"] is True
    assert res["patterns"] == []
    assert res["region_candidates"] == []


def test_classify_mti_ignores_non_mti_issue_types_and_insertions(sample_mapping):
    target_words = [
        {"word": "very", "bucket": "v_w_mix", "issue_type": "mti"},
        {"word": "school", "bucket": "vowel_shift", "issue_type": "grammar"},  # Not mti!
    ]
    error_log = [
        {"word": "very", "said_as": "wery", "error_type": "substitution"},
        {"word": "school", "said_as": "iskool", "error_type": "substitution"},
        {"word": "extra", "said_as": "extra", "error_type": "insertion"},  # Not substitution/deletion
    ]
    res = classify_mti_region(error_log, target_words, sample_mapping)
    # Only 1 MTI bucket matched (v_w_mix), so insufficient signal
    assert res["insufficient_signal"] is True


def test_classify_mti_sufficient_evidence_two_buckets(sample_mapping):
    target_words = [
        {"word": "very", "bucket": "v_w_mix", "issue_type": "mti"},
        {"word": "school", "bucket": "vowel_shift", "issue_type": "mti"},
    ]
    error_log = [
        {"word": "very", "said_as": "wery", "error_type": "substitution"},
        {"word": "school", "said_as": "(omitted)", "error_type": "deletion"},
    ]
    res = classify_mti_region(error_log, target_words, sample_mapping)

    assert res["insufficient_signal"] is False
    assert res.get("unreviewed_mapping") is True
    assert len(res["patterns"]) == 2

    # Patterns check
    pattern_names = {p["pattern"] for p in res["patterns"]}
    assert pattern_names == {"v_w_mix", "vowel_shift"}

    # Region candidates check
    candidates = res["region_candidates"]
    assert len(candidates) > 0

    # Scores:
    # v_w_mix (1 hit): bengali_odia_belt=0.7, hindi_belt=0.4
    # vowel_shift (1 hit): dravidian_belt=0.5, hindi_belt=0.4, generic_indian_english=0.3
    # Totals: hindi_belt=0.8, bengali_odia_belt=0.7, dravidian_belt=0.5, generic=0.3. Total=2.3
    # Top region should be hindi_belt
    assert candidates[0]["region"] == "hindi_belt"
    assert res["detected_accent"] == REGION_DISPLAY_NAMES["hindi_belt"]

    # Verify descending sort
    confs = [c["confidence"] for c in candidates]
    assert confs == sorted(confs, reverse=True)

    # Verify not a single state name
    for forbidden in ["Bihar", "Haryana", "Rajasthan"]:
        assert res["detected_accent"] != forbidden


def test_classify_mti_reviewed_mapping_flag(sample_mapping):
    # Set all buckets to reviewed
    for b in sample_mapping:
        sample_mapping[b]["reviewed_by_slp"] = True

    target_words = [
        {"word": "very", "bucket": "v_w_mix", "issue_type": "mti"},
        {"word": "school", "bucket": "vowel_shift", "issue_type": "mti"},
    ]
    error_log = [
        {"word": "very", "said_as": "wery", "error_type": "substitution"},
        {"word": "school", "said_as": "iskool", "error_type": "substitution"},
    ]
    res = classify_mti_region(error_log, target_words, sample_mapping)
    assert res["insufficient_signal"] is False
    assert "unreviewed_mapping" not in res or res["unreviewed_mapping"] is False


def test_analysis_service_wiring_and_fallback_survives_outage(sample_mapping):
    metrics = {
        "overall_score": 75,
        "breakdown": {"pronunciation": 75, "fluency": 75, "grammar": 70, "vocabulary": 80, "confidence": 75, "clarity": 70},
    }
    audio_data = {"transcription": "I am wery happy to see my iskool.", "words_data": [], "wpm": 140, "filler_count": 0}
    reference_passage = "I am very happy to see my school."
    target_words = [
        {"word": "very", "bucket": "v_w_mix", "issue_type": "mti"},
        {"word": "school", "bucket": "vowel_shift", "issue_type": "mti"},
    ]

    # Test _map_consolidated_to_amcat with target_words & sample_mapping
    llm_data = {
        "grammar_errors": [],
        "sentence_analysis": [{"text": "I am wery happy to see my iskool."}],
        "strengths": ["Good pace"],
        "weaknesses": ["Pronunciation"],
    }
    result = _map_consolidated_to_amcat(
        llm_data, metrics, audio_data,
        reference_passage=reference_passage,
        target_words=target_words,
        bucket_l1_mapping=sample_mapping
    )
    deep_dive = result["amcat_mti_deep_dive"]
    assert deep_dive["insufficient_signal"] is False
    assert len(deep_dive["patterns"]) == 2
    assert len(deep_dive["region_candidates"]) > 0

    # Test _get_fallback_analysis deterministic execution without LLM
    fallback_res = _get_fallback_analysis(
        metrics, audio_data,
        reference_passage=reference_passage,
        target_words=target_words,
        bucket_l1_mapping=sample_mapping
    )
    fb_deep_dive = fallback_res["amcat_mti_deep_dive"]
    assert fb_deep_dive["insufficient_signal"] is False
    assert len(fb_deep_dive["patterns"]) == 2
    assert fb_deep_dive["detected_accent"] == deep_dive["detected_accent"]

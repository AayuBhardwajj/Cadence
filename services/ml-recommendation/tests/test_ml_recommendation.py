import os
import sys
from pathlib import Path
import pytest
from fastapi.testclient import TestClient

SERVICE_DIR = Path(__file__).resolve().parent.parent
if str(SERVICE_DIR) not in sys.path:
    sys.path.insert(0, str(SERVICE_DIR))

from main import app

client = TestClient(app)


def test_health():
    resp = client.get("/health")
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "healthy"
    assert data["service"] == "ml-recommendation"
    assert data["port"] == 9003


def test_exercise_complete_validation():
    # Test score out of range (<0 or >100)
    resp = client.post("/profile/exercise-complete", json={
        "user_id": "test-user",
        "exercise_id": "ex-1",
        "category": "pronunciation",
        "score": 105,
        "issues_resolved": [],
    })
    assert resp.status_code == 400
    assert "Score must be between 0 and 100" in resp.text

    resp = client.post("/profile/exercise-complete", json={
        "user_id": "test-user",
        "exercise_id": "ex-1",
        "category": "pronunciation",
        "score": -5,
        "issues_resolved": [],
    })
    assert resp.status_code == 400


def test_generate_profile_request_schema():
    # Test missing required field
    resp = client.post("/profile/generate", json={
        "user_id": "test-user",
        # missing assessment_id and scores
    })
    assert resp.status_code == 422


from services.recommendation_service import rank_weakness_priorities, SCORE_DIMENSIONS, _extract_score


def test_weakness_priority_ranking_order():
    scores = {
        "fluency": 65.6,
        "confidence": 66.2,
        "grammar": 70,
        "pronunciation": 75,
        "vocabulary": 96,
        "clarity": 100,
    }
    weaknesses = rank_weakness_priorities(scores)
    assert weaknesses[0] == "fluency"
    assert weaknesses[1] == "confidence"
    assert weaknesses[2] == "grammar"
    assert weaknesses[3] == "pronunciation"
    assert weaknesses[4] == "vocabulary"
    assert weaknesses[5] == "clarity"


def test_weakness_priority_ranking_excludes_non_score_fields():
    score_data = {
        "api_error": False,
        "feedback": "Needs improvement on pacing.",
        "cefr_level": "B1",
        "transcription": "During the lecture the professor described how...",
        "overall_score": 79.85,
        "fluency": 65.6,
        "confidence": 66.2,
        "grammar": 70,
        "pronunciation": 75,
        "vocabulary": 96,
        "clarity": 100,
        "amcat_metrics": {"fluency": 65.6},
        "amcat_error_log": [],
        "random_metadata_zero": 0,
    }
    weaknesses = rank_weakness_priorities(score_data)

    # 1. Non-score fields must NEVER appear anywhere in the ranked list
    non_score_keys = {"api_error", "feedback", "cefr_level", "transcription", "overall_score", "amcat_metrics", "amcat_error_log", "random_metadata_zero"}
    for rank in weaknesses:
        assert rank not in non_score_keys, f"Found non-score key '{rank}' in ranked weaknesses!"

    # 2. Priority order must match exact expected dimension ranking
    assert weaknesses[0] == "fluency"
    assert weaknesses[1] == "confidence"
    assert weaknesses[2] == "grammar"
    assert set(weaknesses) == set(SCORE_DIMENSIONS)


def test_weakness_priority_ranking_with_nested_breakdown():
    score_data = {
        "api_error": False,
        "feedback": "Good job",
        "cefr_level": "B2",
        "transcription": "Sample text",
        "breakdown": {
            "fluency": 65.6,
            "confidence": 66.2,
            "grammar": 70,
            "pronunciation": 75,
            "vocabulary": 96,
            "clarity": 100,
        }
    }
    weaknesses = rank_weakness_priorities(score_data)
    assert weaknesses[0] == "fluency"
    assert weaknesses[1] == "confidence"
    assert weaknesses[2] == "grammar"
    assert set(weaknesses) == set(SCORE_DIMENSIONS)


@pytest.mark.asyncio
async def test_generate_recommendations_skips_missing_template_categories(monkeypatch):
    from unittest.mock import MagicMock
    from services.recommendation_service import RecommendationService

    mock_profile = {
        "user_id": "test-user-skip",
        "weakness_priority_1": "fluency",
        "weakness_priority_2": "confidence",  # No templates in DB
        "weakness_priority_3": "grammar",
        "identified_issues": {"fluency": ["5 fillers"], "grammar": []},
    }

    inserted_rows = []

    def mock_table(table_name):
        builder = MagicMock()
        if table_name == "speech_profiles":
            builder.select.return_value.eq.return_value.order.return_value.limit.return_value.execute.return_value = MagicMock(
                data=[mock_profile]
            )
        elif table_name == "exercise_templates":
            def template_select(*args):
                select_mock = MagicMock()
                def eq_skill(col, val):
                    eq_mock = MagicMock()
                    # Fluency and grammar have templates, confidence does NOT
                    if val == "confidence":
                        eq_mock.eq.return_value.limit.return_value.execute.return_value = MagicMock(data=[])
                    else:
                        eq_mock.eq.return_value.limit.return_value.execute.return_value = MagicMock(
                            data=[{"id": f"tmpl-{val}", "title": f"{val.capitalize()} Drill", "skill_category": val}]
                        )
                    return eq_mock
                select_mock.eq.side_effect = eq_skill
                return select_mock
            builder.select.side_effect = template_select
        elif table_name == "exercise_recommendations":
            builder.update.return_value.eq.return_value.execute.return_value = MagicMock()
            def mock_insert(rows):
                nonlocal inserted_rows
                inserted_rows = rows
                insert_exec = MagicMock()
                insert_exec.execute.return_value = MagicMock(data=rows)
                return insert_exec
            builder.insert.side_effect = mock_insert
        return builder

    monkeypatch.setattr("services.recommendation_service.supabase.table", mock_table)

    results = await RecommendationService.generate_recommendations("test-user-skip")

    # 1. Exactly 2 recommendations returned (confidence skipped)
    assert len(results) == 2
    # 2. Priority ranks must be sequential and non-duplicated: 1, 2
    assert [r["priority_rank"] for r in results] == [1, 2]
    # 3. Categories correspond to fluency (1) and grammar (2)
    assert results[0]["template_id"] == "tmpl-fluency"
    assert results[1]["template_id"] == "tmpl-grammar"


@pytest.mark.asyncio
async def test_generate_speech_profile_populates_diagnostic_issues(monkeypatch):
    from unittest.mock import MagicMock
    from services.recommendation_service import RecommendationService

    saved_payload = {}

    def mock_table(table_name):
        builder = MagicMock()
        if table_name == "speech_profiles":
            builder.select.return_value.eq.return_value.execute.return_value = MagicMock(data=[])
            def mock_insert(data):
                nonlocal saved_payload
                saved_payload = data
                m = MagicMock()
                m.execute.return_value = MagicMock(data=[data])
                return m
            builder.insert.side_effect = mock_insert
        return builder

    monkeypatch.setattr("services.recommendation_service.supabase.table", mock_table)

    scores = {
        "overall_score": 75.0,
        "fluency": 70.0,
        "grammar": 60.0,
        "pronunciation": 65.0,
        "vocabulary": 85.0,
        "confidence": 75.0,
        "clarity": 80.0,
    }
    metrics = {"filler_count": 8, "stutter_count": 0}
    diagnostic_issues = {
        "pronunciation_errors": [{"word": "market", "said_as": "mar-ket"}, {"word": "locate"}],
        "grammar_errors": [{"original": "I goes", "corrected": "I go"}],
        "lexical_gaps": [],
    }

    result = await RecommendationService.generate_speech_profile(
        user_id="test-user-diag",
        assessment_id="test-assess-1",
        scores=scores,
        metrics=metrics,
        diagnostic_issues=diagnostic_issues,
    )

    assert result["weakness_priority_1"] == "grammar"
    assert result["weakness_priority_2"] == "pronunciation"
    assert result["weakness_priority_3"] == "fluency"

    issues = result["identified_issues"]
    assert issues["pronunciation"] == ["market", "locate"]
    assert issues["grammar"] == ["I goes -> I go"]
    assert issues["fluency"] == ["8 filler words"]
    assert issues["vocabulary"] == []


def test_amqp_consumer_topology():
    from amqp_consumer import INBOUND_QUEUE, OUTBOUND_QUEUE, PREFETCH_COUNT
    assert INBOUND_QUEUE == "ml-recommendation.analysis.completed"
    assert OUTBOUND_QUEUE == "recommendations.updated"
    assert PREFETCH_COUNT == 1


def test_extract_diagnostic_issues():
    from amqp_consumer import _extract_diagnostic_issues

    score_data = {
        "amcat_error_log": [
            {"word": "and", "category": "Fluency", "error_type": "prolongation"},
            {"word": "photographer", "category": "Pronunciation", "error_type": "mispronunciation"},
            {"word": "essential", "category": "Pronunciation", "error_type": "vowel_shift"},
            {"word": "milestones", "category": "Fluency", "error_type": "block"},
            {"word": "corrupt_entry"},
            "non_dict_entry",
        ],
        "grammar_errors": [
            {"original": "he go", "corrected": "he goes", "rule": "agreement"}
        ],
    }

    diag = _extract_diagnostic_issues(score_data)
    assert len(diag["pronunciation_errors"]) == 2
    assert diag["pronunciation_errors"][0]["word"] == "photographer"
    assert diag["pronunciation_errors"][1]["word"] == "essential"
    assert diag["grammar_errors"] == [{"original": "he go", "corrected": "he goes", "rule": "agreement"}]
    assert diag["lexical_gaps"] == []




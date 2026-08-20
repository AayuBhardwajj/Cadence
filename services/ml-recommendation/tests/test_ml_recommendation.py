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


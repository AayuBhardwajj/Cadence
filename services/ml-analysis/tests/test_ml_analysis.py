import os
import sys
import importlib.util
from unittest.mock import AsyncMock, patch

from fastapi.testclient import TestClient


SERVICE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if SERVICE_DIR not in sys.path:
    sys.path.insert(0, SERVICE_DIR)
SERVICE_MAIN = os.path.join(SERVICE_DIR, "main.py")
spec = importlib.util.spec_from_file_location("ml_analysis_main", SERVICE_MAIN)
ml_analysis_main = importlib.util.module_from_spec(spec)
sys.modules[spec.name] = ml_analysis_main
assert spec.loader is not None
spec.loader.exec_module(ml_analysis_main)
app = ml_analysis_main.app


def test_health_contract():
    client = TestClient(app)
    response = client.get("/health")

    assert response.status_code == 200
    assert response.json() == {
        "status": "healthy",
        "service": "ml-analysis",
        "port": "9002",
    }


def test_service_loads_the_backend_env_file_explicitly():
    assert ml_analysis_main.BACKEND_ENV.name == ".env"
    assert ml_analysis_main.BACKEND_ENV.parent.name == "backend"
    assert ml_analysis_main.BACKEND_ENV.is_file()


def test_deep_analysis_combines_deterministic_and_qualitative_results():
    audio_data = {"transcription": "A short spoken sample.", "wpm": 145, "filler_count": 0}
    deterministic_result = {"overall_score": 71, "breakdown": {"fluency": 88}}
    qualitative_result = {"feedback": "Clear delivery.", "amcat_metrics": {"fluency": {"score": 88}}}

    with (
        patch.object(ml_analysis_main, "calculate_score", return_value=deterministic_result),
        patch.object(ml_analysis_main, "deep_analyze_speech", new=AsyncMock(return_value=qualitative_result)) as analyze,
    ):
        response = TestClient(app).post(
            "/analyze/deep",
            json={
                "audio_data": audio_data,
                "video_data": {"eye_contact_percent": 0},
                "topic_id": "workplace",
                "topic_prompt": "Describe an ideal workplace.",
                "assessment_id": "assessment-1",
                "user_id": "user-1",
            },
        )

    assert response.status_code == 200
    assert response.json() == {**deterministic_result, **qualitative_result}
    analyze.assert_awaited_once()


def test_quality_contract_is_proxied():
    expected = {"overall_content_score": 82.0, "coaching_notes": "Well structured."}
    with patch.object(ml_analysis_main, "evaluate_content_quality", new=AsyncMock(return_value=expected)):
        response = TestClient(app).post(
            "/quality",
            json={
                "transcript": "A complete answer.",
                "original_prompt": "Discuss teamwork.",
                "topic": "workplace",
                "assessment_id": "assessment-1",
            },
        )

    assert response.status_code == 200
    assert response.json() == expected

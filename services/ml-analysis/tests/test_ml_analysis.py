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


# D26: Backend .env load removed in favor of ml_shared.env.load_env()
# def test_service_loads_the_backend_env_file_explicitly():
#     assert ml_analysis_main.BACKEND_ENV.name == ".env"
#     assert ml_analysis_main.BACKEND_ENV.parent.name == "backend"
#     assert ml_analysis_main.BACKEND_ENV.is_file()


def test_deep_analysis_combines_deterministic_and_qualitative_results():
    audio_data = {"transcription": "A short spoken sample.", "wpm": 145, "filler_count": 0}
    deterministic_result = {"overall_score": 71, "breakdown": {"fluency": 88}}
    qualitative_result = {
        "feedback": "Clear delivery.",
        "amcat_metrics": {"fluency": {"score": 88}},
        "grammar_errors": [{"original": "He go", "corrected": "He goes", "rule": "Subject-verb agreement"}],
    }

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
    assert response.json()["grammar_errors"] == qualitative_result["grammar_errors"]
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


def test_map_consolidated_to_amcat_preserves_grammar_errors():
    from services.analysis_service import _map_consolidated_to_amcat, _get_fallback_analysis

    llm_data = {
        "grammar_errors": [{"original": "He go", "corrected": "He goes", "rule": "Subject-verb agreement"}],
        "strengths": ["Good clarity"],
        "weaknesses": ["Minor tense issues"],
    }
    metrics = {
        "overall_score": 75,
        "breakdown": {"pronunciation": 75, "fluency": 75, "grammar": 70, "vocabulary": 80, "confidence": 75, "clarity": 70},
    }
    audio_data = {"transcription": "He go to the store.", "words_data": [], "wpm": 140, "filler_count": 0}

    result = _map_consolidated_to_amcat(llm_data, metrics, audio_data)
    assert "grammar_errors" in result
    assert len(result["grammar_errors"]) == 1
    assert result["grammar_errors"][0]["original"] == "He go"

    fallback = _get_fallback_analysis(metrics, audio_data)
    assert "grammar_errors" in fallback
    assert fallback["grammar_errors"] == []


def test_amqp_consumer_topology_constants():
    from amqp_consumer import (
        QUEUE_ANALYSIS_AUDIO_COMPLETED,
        EXCHANGE_ANALYSIS_COMPLETED,
        QUEUE_REPORT_SERVICE_COMPLETED,
        QUEUE_ML_RECOMMENDATION_COMPLETED,
    )

    assert QUEUE_ANALYSIS_AUDIO_COMPLETED == "analysis.audio.completed"
    assert EXCHANGE_ANALYSIS_COMPLETED == "analysis.completed"
    assert QUEUE_REPORT_SERVICE_COMPLETED == "report-service.analysis.completed"
    assert QUEUE_ML_RECOMMENDATION_COMPLETED == "ml-recommendation.analysis.completed"


import pytest
import asyncio

@pytest.mark.asyncio
async def test_amqp_consumer_reconnect_retry_loop_recovers():
    from amqp_consumer import AmqpConsumer
    consumer = AmqpConsumer(amqp_url="amqp://guest:guest@localhost:5672/")

    mock_queue = AsyncMock()
    mock_queue.consume = AsyncMock(return_value="ctag-test-123")
    mock_channel = AsyncMock()
    mock_channel.set_qos = AsyncMock()
    mock_channel.declare_queue = AsyncMock(return_value=mock_queue)
    mock_channel.declare_exchange = AsyncMock(return_value=AsyncMock())
    mock_connection = AsyncMock()
    mock_connection.channel = AsyncMock(return_value=mock_channel)

    call_count = 0

    async def mock_connect(*args, **kwargs):
        nonlocal call_count
        call_count += 1
        if call_count <= 2:
            raise ConnectionError("Broker not ready")
        return mock_connection

    with patch("aio_pika.connect_robust", side_effect=mock_connect), \
         patch("asyncio.sleep", new=AsyncMock()):
        # Initial start fails, launches reconnect task
        await consumer.start()
        assert consumer._reconnect_task is not None
        # Await the reconnect loop task
        await consumer._reconnect_task
        assert call_count == 3
        assert consumer.connection == mock_connection
        assert consumer.consumer_tag == "ctag-test-123"

        await consumer.stop()


@pytest.mark.asyncio
async def test_amqp_consumer_stop_cancels_reconnect_task():
    from amqp_consumer import AmqpConsumer
    consumer = AmqpConsumer(amqp_url="amqp://guest:guest@localhost:5672/")

    async def hanging_connect(*args, **kwargs):
        raise ConnectionError("Broker unreachable")

    with patch("aio_pika.connect_robust", side_effect=hanging_connect):
        await consumer.start()
        assert consumer._reconnect_task is not None
        assert not consumer._reconnect_task.done()

        await consumer.stop()
        assert consumer._reconnect_task.done()



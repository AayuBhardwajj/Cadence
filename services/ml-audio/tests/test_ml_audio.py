import sys
import os
import pytest
from unittest.mock import MagicMock, patch
from fastapi.testclient import TestClient

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
from main import app, detect_stutters, compute_pause_metrics, analyze_audio_file


def test_detect_stutters():
    words_data = [
        {"word": "hello", "start": 0.0, "end": 0.5},
        {"word": "hello", "start": 0.6, "end": 1.1},  # repetition
        {"word": "world", "start": 2.7, "end": 3.0},  # block (>1.5s gap)
        {"word": "proloooonged", "start": 3.1, "end": 4.5}, # prolongation (>1.2s)
    ]
    res = detect_stutters(words_data)
    assert res["stutter_count"] == 3
    event_types = [e["type"] for e in res["stutter_events"]]
    assert "repetition" in event_types
    assert "block" in event_types
    assert "prolongation" in event_types


def test_compute_pause_metrics():
    words_data = [
        {"word": "first", "start": 0.0, "end": 1.0},
        {"word": "second", "start": 2.0, "end": 3.0}, # 1.0s pause
        {"word": "third", "start": 3.5, "end": 4.5},  # 0.5s pause
    ]
    res = compute_pause_metrics(words_data)
    assert res["pause_count"] == 2
    assert res["longest_pause"] == 1.0
    assert res["average_pause"] == 0.75
    assert res["pause_intervals"] == [1.0, 0.5]


def test_lifespan_loads_model_once():
    """
    Confirms DEVELOPMENT_RULES.md #5: model loads once at startup into app.state.whisper_model.
    """
    mock_model = MagicMock()
    with patch("whisper.load_model", return_value=mock_model) as mock_load:
        with TestClient(app) as client:
            # Model should be loaded exactly once during lifespan startup
            assert mock_load.call_count == 1
            mock_load.assert_called_with("base")
            assert client.app.state.whisper_model == mock_model

            # Health check should return healthy and model_loaded: true
            resp = client.get("/health")
            assert resp.status_code == 200
            assert resp.json()["model_loaded"] is True
            assert resp.json()["service"] == "ml-audio"


@pytest.mark.asyncio
async def test_analyze_audio_contract_shape():
    mock_model = MagicMock()
    mock_model.transcribe.return_value = {
        "text": "Hello um world this is a test.",
        "segments": [
            {
                "words": [
                    {"word": "Hello", "start": 0.0, "end": 0.4},
                    {"word": "um", "start": 0.5, "end": 0.8},
                    {"word": "world", "start": 0.9, "end": 1.3},
                    {"word": "this", "start": 1.4, "end": 1.7},
                    {"word": "is", "start": 1.8, "end": 2.0},
                    {"word": "a", "start": 2.1, "end": 2.2},
                    {"word": "test.", "start": 2.3, "end": 2.8},
                ]
            }
        ]
    }

    with patch("whisper.load_audio", return_value=[0.0] * 48000): # 3.0 seconds at 16kHz
        result = await analyze_audio_file("fake_path.webm", mock_model)

    expected_keys = {
        "transcription",
        "wpm",
        "filler_count",
        "filler_detail",
        "duration",
        "words_data",
        "stutter_count",
        "stutter_events",
        "pause_count",
        "longest_pause",
        "average_pause",
        "pause_intervals",
    }
    assert set(result.keys()) == expected_keys
    assert result["transcription"] == "Hello um world this is a test."
    assert result["filler_count"] == 1
    assert result["filler_detail"].get("um") == 1
    assert len(result["words_data"]) == 7
    assert result["duration"] == 3.0

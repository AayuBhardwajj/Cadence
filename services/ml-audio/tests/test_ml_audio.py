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


from unittest.mock import AsyncMock
import asyncio


@pytest.mark.asyncio
async def test_ml_audio_amqp_reconnect_retry_loop_recovers():
    from amqp_consumer import start_amqp_consumer, stop_amqp_consumer

    class FakeState:
        whisper_model = MagicMock()

    class FakeApp:
        state = FakeState()

    fake_app = FakeApp()

    mock_queue = AsyncMock()
    mock_queue.consume = AsyncMock(return_value="ctag-audio-123")
    mock_channel = AsyncMock()
    mock_channel.set_qos = AsyncMock()
    mock_channel.declare_queue = AsyncMock(return_value=mock_queue)
    mock_channel.get_queue = AsyncMock(return_value=mock_queue)
    mock_connection = AsyncMock()
    mock_connection.channel = AsyncMock(return_value=mock_channel)

    call_count = 0

    async def mock_connect(*args, **kwargs):
        nonlocal call_count
        call_count += 1
        if call_count <= 2:
            raise ConnectionError("Broker not ready")
        return mock_connection

    with patch.dict(os.environ, {"SUPABASE_URL": "http://localhost:54321", "SUPABASE_SERVICE_ROLE_KEY": "test_key", "RABBITMQ_PASSWORD": "test_pw"}), \
         patch("aio_pika.connect_robust", side_effect=mock_connect), \
         patch("asyncio.sleep", new=AsyncMock()):
        await start_amqp_consumer(fake_app)
        assert getattr(fake_app.state, "amqp_reconnect_task", None) is not None
        await fake_app.state.amqp_reconnect_task
        assert call_count == 3
        assert fake_app.state.amqp_connection == mock_connection
        await stop_amqp_consumer(fake_app)


@pytest.mark.asyncio
async def test_ml_audio_stop_cancels_reconnect_task():
    from amqp_consumer import start_amqp_consumer, stop_amqp_consumer

    class FakeState:
        whisper_model = MagicMock()

    class FakeApp:
        state = FakeState()

    fake_app = FakeApp()

    async def hanging_connect(*args, **kwargs):
        raise ConnectionError("Broker unreachable")

    with patch.dict(os.environ, {"SUPABASE_URL": "http://localhost:54321", "SUPABASE_SERVICE_ROLE_KEY": "test_key", "RABBITMQ_PASSWORD": "test_pw"}), \
         patch("aio_pika.connect_robust", side_effect=hanging_connect):
        await start_amqp_consumer(fake_app)
        task = getattr(fake_app.state, "amqp_reconnect_task", None)
        assert task is not None
        assert not task.done()

        await stop_amqp_consumer(fake_app)
        assert task.done()


@pytest.mark.asyncio
async def test_ml_audio_closes_connection_if_setup_fails():
    from amqp_consumer import start_amqp_consumer, stop_amqp_consumer

    class FakeState:
        whisper_model = MagicMock()

    class FakeApp:
        state = FakeState()

    fake_app = FakeApp()

    mock_connection = AsyncMock()
    mock_connection.is_closed = False
    mock_connection.close = AsyncMock()
    mock_connection.channel = AsyncMock(side_effect=RuntimeError("Channel setup failed"))

    with patch.dict(os.environ, {"SUPABASE_URL": "http://localhost:54321", "SUPABASE_SERVICE_ROLE_KEY": "test_key", "RABBITMQ_PASSWORD": "test_pw"}), \
         patch("aio_pika.connect_robust", return_value=mock_connection):
        await start_amqp_consumer(fake_app)
        mock_connection.close.assert_awaited_once()
        assert fake_app.state.amqp_connection is None
        await stop_amqp_consumer(fake_app)


@pytest.mark.asyncio
async def test_ml_audio_reconnect_loop_closes_connection_on_setup_failure_then_succeeds():
    from amqp_consumer import _reconnect_loop, stop_amqp_consumer

    class FakeState:
        whisper_model = MagicMock()

    class FakeApp:
        state = FakeState()

    fake_app = FakeApp()

    mock_conn1 = AsyncMock()
    mock_conn1.is_closed = False
    mock_conn1.close = AsyncMock()
    mock_conn1.channel = AsyncMock(side_effect=RuntimeError("Channel setup failed"))

    mock_queue = AsyncMock()
    mock_queue.consume = AsyncMock(return_value="ctag-audio-ok")
    mock_channel2 = AsyncMock()
    mock_channel2.set_qos = AsyncMock()
    mock_channel2.declare_queue = AsyncMock(return_value=mock_queue)
    mock_channel2.get_queue = AsyncMock(return_value=mock_queue)
    mock_conn2 = AsyncMock()
    mock_conn2.is_closed = False
    mock_conn2.close = AsyncMock()
    mock_conn2.channel = AsyncMock(return_value=mock_channel2)

    connections = [mock_conn1, mock_conn2]

    async def mock_connect(*args, **kwargs):
        if connections:
            return connections.pop(0)
        return mock_conn2

    with patch("aio_pika.connect_robust", side_effect=mock_connect), \
         patch("asyncio.sleep", new=AsyncMock()):
        task = asyncio.create_task(
            _reconnect_loop(fake_app, "amqp://guest:guest@localhost:5672/", "http://localhost:54321", "test_key")
        )
        await task
        mock_conn1.close.assert_awaited_once()
        assert fake_app.state.amqp_connection == mock_conn2
        await stop_amqp_consumer(fake_app)


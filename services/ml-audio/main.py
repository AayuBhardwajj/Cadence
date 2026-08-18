import os
import ssl
import re
import uuid
import shutil
import logging
import asyncio
from contextlib import asynccontextmanager
from typing import Dict, Any, List

import whisper
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import uvicorn

# Fix for SSL Certificate Error on macOS
try:
    _create_unverified_https_context = ssl._create_unverified_context
except AttributeError:
    pass
else:
    ssl._create_default_https_context = _create_unverified_https_context

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("ml-audio")

TEMP_DIR = "temp_audio_uploads"
os.makedirs(TEMP_DIR, exist_ok=True)

# ── Lifespan Startup / Shutdown ──────────────────────────────────────────────
# DEVELOPMENT_RULES.md #5: Whisper models are loaded once at startup, NEVER per-request.
# app.state.whisper_model keeps the model resident in memory across requests.
@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Loading Whisper 'base' model at startup (DEVELOPMENT_RULES.md #5)...")
    app.state.whisper_model = whisper.load_model("base")
    logger.info("Whisper 'base' model successfully loaded into app.state.whisper_model.")
    yield
    logger.info("Shutting down ml-audio service...")
    app.state.whisper_model = None


app = FastAPI(title="Cadence ML Audio Service", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def detect_stutters(words_data: list) -> dict:
    if not words_data or not isinstance(words_data, list) or len(words_data) < 2:
        return {"stutter_count": 0, "stutter_events": []}
    
    stutter_events = []
    stutter_count = 0
    
    # Filter and clean words, ensuring start and end exist and are numbers
    valid_words = []
    for w in words_data:
        if not isinstance(w, dict):
            continue
        if "word" not in w or "start" not in w or "end" not in w:
            continue
        start = w["start"]
        end = w["end"]
        if not (isinstance(start, (int, float)) and isinstance(end, (int, float))):
            continue
        
        raw_word = w["word"]
        if not isinstance(raw_word, str):
            raw_word = str(raw_word)
        cleaned = raw_word.strip(".,!?\"();:[]{}<>-").lower()
        
        valid_words.append({
            "original": raw_word,
            "cleaned": cleaned,
            "start": start,
            "end": end
        })
        
    if len(valid_words) < 2:
        return {"stutter_count": 0, "stutter_events": []}
        
    for i in range(len(valid_words)):
        w_curr = valid_words[i]
        
        # 1. Prolongation: if word duration is unusually long (> 1.2s)
        duration = w_curr["end"] - w_curr["start"]
        if duration > 1.2:
            stutter_events.append({
                "type": "prolongation",
                "word": w_curr["original"].strip(".,!?\"();:[]{}<>-"),
                "timestamp": round(w_curr["start"], 2),
                "duration": round(duration, 2)
            })
            stutter_count += 1
            
        # 2. Check relations with the next word
        if i < len(valid_words) - 1:
            w_next = valid_words[i + 1]
            
            # Repetition: consecutive words are identical
            if w_curr["cleaned"] and w_curr["cleaned"] == w_next["cleaned"]:
                stutter_events.append({
                    "type": "repetition",
                    "word": w_curr["original"].strip(".,!?\"();:[]{}<>-"),
                    "timestamp": round(w_curr["start"], 2),
                    "duration": round(w_next["end"] - w_curr["start"], 2)
                })
                stutter_count += 1
            # Block: gap between end of current and start of next is > 1.5 seconds
            elif (w_next["start"] - w_curr["end"]) > 1.5:
                stutter_events.append({
                    "type": "block",
                    "word": w_curr["original"].strip(".,!?\"();:[]{}<>-"),
                    "timestamp": round(w_curr["start"], 2),
                    "duration": round(w_next["start"] - w_curr["end"], 2)
                })
                stutter_count += 1
                
    return {
        "stutter_count": stutter_count,
        "stutter_events": stutter_events
    }


def compute_pause_metrics(word_timings: list) -> dict:
    """
    Computes pause metrics from Whisper word-level timestamps.
    word_timings: list of dicts with keys 'word', 'start', 'end'
    """
    if not word_timings or len(word_timings) < 2:
        return {
            "pause_count": 0,
            "longest_pause": 0.0,
            "average_pause": 0.0,
            "pause_intervals": []
        }

    pause_intervals = []
    for i in range(1, len(word_timings)):
        gap = word_timings[i]["start"] - word_timings[i - 1]["end"]
        if gap > 0.15:  # ignore gaps under 150ms — natural phoneme boundaries
            pause_intervals.append(round(gap, 3))

    if not pause_intervals:
        return {
            "pause_count": 0,
            "longest_pause": 0.0,
            "average_pause": 0.0,
            "pause_intervals": []
        }

    return {
        "pause_count": len(pause_intervals),
        "longest_pause": round(max(pause_intervals), 3),
        "average_pause": round(sum(pause_intervals) / len(pause_intervals), 3),
        "pause_intervals": pause_intervals
    }


def _run_whisper_transcription(model, audio_path: str):
    """
    Synchronous audio loading and Whisper transcription function executed in thread pool.
    """
    audio = whisper.load_audio(audio_path)
    duration_seconds = len(audio) / 16000.0  # Whisper resamples to 16kHz
    result = model.transcribe(audio, word_timestamps=True)
    return audio, duration_seconds, result


async def analyze_audio_file(file_path: str, model) -> Dict[str, Any]:
    """
    Extracts audio from file and analyzes it using Whisper.
    Runs CPU/GPU-intensive transcription in a worker thread via asyncio.to_thread.
    """
    # Run heavy synchronous inference in thread pool to prevent blocking the async event loop
    audio, duration_seconds, result = await asyncio.to_thread(_run_whisper_transcription, model, file_path)
    
    text = result.get("text", "")
    
    # Extract word-level timing data
    words_data = []
    if "segments" in result:
        for segment in result["segments"]:
            if "words" in segment:
                for word_info in segment["words"]:
                    words_data.append({
                        "word": word_info["word"].strip(),
                        "start": word_info["start"],
                        "end": word_info["end"]
                    })

    # Text Metrics
    words = text.split()
    word_count = len(words)
    duration_minutes = duration_seconds / 60 if duration_seconds > 0 else 1
    wpm = round(word_count / duration_minutes)
    
    # Filler Words
    FILLER_WORDS = [
        "um", "uh", "ah", "like", "you know", "basically", "literally",
        "actually", "right", "so", "well", "okay", "kind of", "sort of",
        "i mean", "you see", "honestly", "seriously"
    ]
    text_lower = text.lower()
    filler_count = 0
    filler_detail = {}
    for filler in FILLER_WORDS:
        pattern = r'\b' + re.escape(filler) + r'\b'
        matches = re.findall(pattern, text_lower)
        if matches:
            filler_detail[filler] = len(matches)
            filler_count += len(matches)

    # Detect stutters
    stutter_res = detect_stutters(words_data)

    # Calculate pause metrics
    pause_res = compute_pause_metrics(words_data)

    return {
        "transcription": text.strip(),
        "wpm": wpm,
        "filler_count": filler_count,
        "filler_detail": filler_detail,
        "duration": round(duration_seconds, 2),
        "words_data": words_data,
        "stutter_count": stutter_res["stutter_count"],
        "stutter_events": stutter_res["stutter_events"],
        "pause_count": pause_res["pause_count"],
        "longest_pause": pause_res["longest_pause"],
        "average_pause": pause_res["average_pause"],
        "pause_intervals": pause_res["pause_intervals"]
    }


@app.get("/health")
def health_check():
    is_model_loaded = hasattr(app.state, "whisper_model") and app.state.whisper_model is not None
    return {
        "status": "healthy" if is_model_loaded else "starting",
        "model_loaded": is_model_loaded,
        "service": "ml-audio",
        "port": 9001
    }


@app.post("/analyze/audio")
async def analyze_audio_endpoint(file: UploadFile = File(...)):
    """
    Accepts an uploaded audio or video recording file, saves to temporary storage,
    runs Whisper transcription and stutter/pause analysis in worker thread, and returns
    the standard audio_data contract shape.
    """
    if not hasattr(app.state, "whisper_model") or app.state.whisper_model is None:
        raise HTTPException(status_code=503, detail="Whisper model is not loaded.")

    temp_file_path = None
    try:
        file_ext = (file.filename or "recording.webm").split(".")[-1]
        temp_file_path = os.path.join(TEMP_DIR, f"{uuid.uuid4()}.{file_ext}")

        with open(temp_file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        logger.info(f"Analyzing audio file: {temp_file_path}")
        audio_data = await analyze_audio_file(temp_file_path, app.state.whisper_model)
        return audio_data

    except Exception as e:
        logger.error(f"Audio analysis failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Audio analysis failed: {str(e)}")
    finally:
        if temp_file_path and os.path.exists(temp_file_path):
            try:
                os.remove(temp_file_path)
            except Exception as rm_err:
                logger.warning(f"Failed to remove temp file {temp_file_path}: {rm_err}")


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=9001)

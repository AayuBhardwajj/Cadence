import whisper
import os
import ssl

# Fix for SSL Certificate Error on macOS
try:
    _create_unverified_https_context = ssl._create_unverified_context
except AttributeError:
    pass
else:
    ssl._create_default_https_context = _create_unverified_https_context

# Load model once (global) to avoid reloading on every request
# Using "base" model for speed/compatibility. Change to "small" or "medium" for better accuracy.
model = whisper.load_model("base")

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
                    "timestamp": round(w_curr["end"], 2),
                    "duration": round(w_next["start"] - w_curr["end"], 2)
                })
                stutter_count += 1
                
    return {
        "stutter_count": stutter_count,
        "stutter_events": stutter_events
    }

def analyze_audio(video_path: str):
    """
    Extracts audio from video and analyzes it using Whisper.
    Returns dict with transcription, wpm, and filler_word_count.
    """
    try:
        # 1. Load Audio directly using Whisper (uses ffmpeg internally)
        # This avoids MoviePy issues with webm files
        audio = whisper.load_audio(video_path)
        duration_seconds = len(audio) / 16000.0  # Whisper resamples to 16kHz
        
        # 2. Transcribe with Word-Level Timestamps
        result = model.transcribe(audio, word_timestamps=True)
        text = result["text"]
        
        # Extract word-level timing data for AMCAT error log mappings
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

        # 3. Analyze Text (Simple Logic)
        words = text.split()
        word_count = len(words)
        duration_minutes = duration_seconds / 60 if duration_seconds > 0 else 1
        wpm = round(word_count / duration_minutes)
        
        # Count filler words (very basic)
        fillers = ["um", "uh", "ah", "like", "you know"]
        filler_count = sum(text.lower().count(f) for f in fillers)

        # Detect stutters
        stutter_res = detect_stutters(words_data)

        return {
            "transcription": text.strip(),
            "wpm": wpm,
            "filler_count": filler_count,
            "duration": round(duration_seconds, 2),
            "words_data": words_data,
            "stutter_count": stutter_res["stutter_count"],
            "stutter_events": stutter_res["stutter_events"]
        }
        
    except Exception as e:
        print(f"Error in audio analysis: {e}")
        # Default fallback if analysis fails completely
        return {
            "transcription": "Could not analyze audio.",
            "wpm": 0,
            "filler_count": 0,
            "stutter_count": 0,
            "stutter_events": [],
            "error": str(e),
            "error_code": "AUDIO_ANALYSIS_FAILED"
        }

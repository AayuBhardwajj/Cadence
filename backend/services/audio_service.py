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

        return {
            "transcription": text.strip(),
            "wpm": wpm,
            "filler_count": filler_count,
            "duration": round(duration_seconds, 2),
            "words_data": words_data
        }
        
    except Exception as e:
        print(f"Error in audio analysis: {e}")
        # Default fallback if analysis fails completely
        return {
            "transcription": "Could not analyze audio.",
            "wpm": 0,
            "filler_count": 0,
            "error": str(e)
        }

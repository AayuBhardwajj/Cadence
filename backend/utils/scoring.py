def estimate_cefr(overall_score: int) -> str:
    if overall_score >= 90: return "C2"
    if overall_score >= 75: return "C1"
    if overall_score >= 60: return "B2"
    if overall_score >= 45: return "B1"
    if overall_score >= 30: return "A2"
    return "A1"

def compute_overall_score(
    fluency_score: float,      # 0-100
    pronunciation_score: float, # 0-100
    vocabulary_score: float,    # 0-100
    grammar_score: float,       # 0-100
    stutter_score: float,       # 0-100
    filler_score: float,        # 0-100
) -> float:
    return round(
        fluency_score * 0.25 +
        pronunciation_score * 0.25 +
        vocabulary_score * 0.20 +
        grammar_score * 0.15 +
        stutter_score * 0.10 +
        filler_score * 0.05,
        2
    )

def calculate_score(audio_data: dict, video_data: dict):
    """
    Calculates 6 core metrics (0-100) and CEFR level.
    """
    # 0. Check for analysis failure
    if audio_data.get("error_code") == "AUDIO_ANALYSIS_FAILED" or audio_data.get("transcription") == "Could not analyze audio.":
        return {
            "overall_score": 0,
            "cefr_level": "N/A",
            "breakdown": {
                "fluency": 0, "pronunciation": 0, "clarity": 0,
                "grammar": 0, "vocabulary": 0, "confidence": 0,
                "wpm": 0, "fillers": 0, "eye_contact": video_data.get("eye_contact_percent", 0)
            },
            "strengths": ["Audio processing failed"],
            "focus_areas": ["Ensure microphone is working", "Check if ffmpeg is installed"],
            "feedback": "Analysis failed: Could not process the audio file. Please try again."
        }

    wpm = audio_data.get("wpm", 0)
    fillers = audio_data.get("filler_count", 0)
    eye_contact = video_data.get("eye_contact_percent", 0)
    transcription = audio_data.get("transcription", "")
    
    # 1. Fluency Score (Target 140-160 WPM, filler penalty)
    wpm_score = 100 - min(40, abs(150 - wpm) * 0.8)
    filler_penalty = min(50, fillers * 4)
    # Stutter penalty — computed post-analysis, injected if available
    # scoring.py does not call detect_stutters directly (avoid circular import)
    # stutter_count is passed in via audio_data if pre-computed upstream
    stutter_count = audio_data.get("stutter_count", 0)
    stutter_penalty = min(30, stutter_count * 5)
    fluency = max(0, wpm_score - filler_penalty - stutter_penalty)
    
    # 2. Pronunciation Accuracy (Basic proxy)
    pronunciation = min(100, 70 + (len(transcription.split()) / 50))
    
    # 3. Clarity & Articulation (Derived display-only metric, not used in overall score)
    clarity = min(100, (fluency * 0.7) + (eye_contact * 0.3))
    
    # 4. Grammar & Structure
    grammar = min(100, 65 + (transcription.count('.') * 5))
    
    # 5. Vocabulary Range
    words = transcription.lower().split()
    unique_words = len(set(words))
    total_words = len(words)
    vocab_ratio = (unique_words / total_words) if total_words > 0 else 0
    vocab = min(100, vocab_ratio * 150)
    
    # 6. Confidence Indicators
    confidence = eye_contact
    
    # Overall Weighted Score (Deterministic)
    stutter_score = max(0, 100 - (stutter_count * 10))
    filler_score_val = max(0, 100 - (fillers * 8))
    
    overall = compute_overall_score(
        fluency_score=fluency,
        pronunciation_score=pronunciation,
        vocabulary_score=vocab,
        grammar_score=grammar,
        stutter_score=stutter_score,
        filler_score=filler_score_val,
    )
    
    cefr = estimate_cefr(int(overall))
    
    # Insights
    strengths = []
    focus_areas = []
    
    if fluency > 80: strengths.append("Excellent natural pace and flow")
    if pronunciation > 80: strengths.append("Clear pronunciation of multi-syllable words")
    if confidence > 80: strengths.append("Strong engagement and camera presence")
    
    if fillers > 8: focus_areas.append(f"Reduce filler words (you used {fillers})")
    if eye_contact < 60: focus_areas.append("Maintain more eye contact with the camera")
    if wpm < 120: focus_areas.append("Try to increase your speaking pace slightly")
    
    # Defaults if lists empty
    if not strengths: strengths = ["Consistent attempt", "Good volume control"]
    if not focus_areas: focus_areas = ["Practice complex sentence structures"]

    return {
        "overall_score": int(overall),
        "cefr_level": cefr,
        "stutter_score": stutter_score,
        "filler_score": filler_score_val,
        "breakdown": {
            "fluency": int(fluency),
            "pronunciation": int(pronunciation),
            "clarity": int(clarity),
            "grammar": int(grammar),
            "vocabulary": int(vocab),
            "confidence": int(confidence),
            "wpm": wpm,
            "fillers": fillers,
            "eye_contact": eye_contact
        },
        "strengths": strengths[:3],
        "focus_areas": focus_areas[:3],
        "feedback": f"You are at a {cefr} level. Your speaking is {'very clear' if clarity > 80 else 'understandable'} with {'excellent' if fluency > 80 else 'good'} flow."
    }

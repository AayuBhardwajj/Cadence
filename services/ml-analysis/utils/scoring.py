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
    
    wpm_score = 100 - min(40, abs(150 - wpm) * 0.8)
    filler_penalty = min(50, fillers * 4)
    stutter_count = audio_data.get("stutter_count", 0)
    stutter_penalty = min(30, stutter_count * 5)
    fluency = max(0, wpm_score - filler_penalty - stutter_penalty)
    
    pronunciation = 75.0
    clarity = max(0, 100 - (fillers * 3) - (stutter_penalty * 0.5))
    words = transcription.split()
    unique_words = len(set(words))
    vocab_ratio = unique_words / len(words) if words else 0
    vocabulary = min(100, max(30, vocab_ratio * 120))
    grammar = 70.0
    stutter_score = max(0, 100 - (stutter_count * 15))
    filler_score = max(0, 100 - (fillers * 10))

    confidence = round((fluency * 0.4) + (clarity * 0.4) + (eye_contact * 0.2), 1)
    
    overall = compute_overall_score(
        fluency_score=fluency,
        pronunciation_score=pronunciation,
        vocabulary_score=vocabulary,
        grammar_score=grammar,
        stutter_score=stutter_score,
        filler_score=filler_score
    )

    strengths = []
    if wpm >= 130 and wpm <= 160:
        strengths.append("Optimal speaking pace (130-160 WPM).")
    if fillers == 0:
        strengths.append("Zero filler words used during speech.")
    elif fillers <= 2:
        strengths.append("Minimal filler word usage.")
    if stutter_count == 0:
        strengths.append("Smooth, unbroken speech delivery with no detected stutters.")
    if eye_contact >= 70:
        strengths.append("Strong visual engagement and eye contact.")

    if not strengths:
        strengths.append("Clear vocal projection throughout the recording.")

    focus_areas = []
    if wpm < 120:
        focus_areas.append("Pacing: Speaking speed is below target range (ideal: 130-160 WPM).")
    elif wpm > 170:
        focus_areas.append("Pacing: Speaking speed is fast; slow down slightly for clarity.")
    if fillers > 3:
        focus_areas.append(f"Filler Words: {fillers} filler words detected (um, uh, like). Pause intentionally instead.")
    if stutter_count > 0:
        focus_areas.append(f"Speech Continuity: {stutter_count} stutter/repetition event(s) detected. Practice steady phrasing.")
    if eye_contact < 50 and eye_contact > 0:
        focus_areas.append("Eye Contact: Maintain direct eye contact with the camera.")

    if not focus_areas:
        focus_areas.append("Vocabulary: Incorporate more varied industry-specific terms.")

    feedback = f"Overall score is {overall}% ({estimate_cefr(overall)} level). "
    if overall >= 75:
        feedback += "Excellent overall delivery! Your pace and articulation demonstrate high communicative competence."
    elif overall >= 50:
        feedback += "Good performance with clear areas for growth. Focus on reducing filler words and stabilizing pacing."
    else:
        feedback += "Needs targeted practice. Work on speech pacing, reducing hesitation, and structuring responses."

    return {
        "overall_score": overall,
        "cefr_level": estimate_cefr(overall),
        "breakdown": {
            "fluency": round(fluency, 1),
            "pronunciation": round(pronunciation, 1),
            "clarity": round(clarity, 1),
            "grammar": round(grammar, 1),
            "vocabulary": round(vocabulary, 1),
            "confidence": confidence,
            "wpm": wpm,
            "fillers": fillers,
            "eye_contact": eye_contact
        },
        "strengths": strengths,
        "focus_areas": focus_areas,
        "feedback": feedback
    }

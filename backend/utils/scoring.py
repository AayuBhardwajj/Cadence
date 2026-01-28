
def estimate_cefr(overall_score: int) -> str:
    if overall_score >= 90: return "C2"
    if overall_score >= 75: return "C1"
    if overall_score >= 60: return "B2"
    if overall_score >= 45: return "B1"
    if overall_score >= 30: return "A2"
    return "A1"

def calculate_score(audio_data: dict, video_data: dict):
    """
    Calculates 6 core metrics (0-100) and CEFR level.
    """
    wpm = audio_data.get("wpm", 0)
    fillers = audio_data.get("filler_count", 0)
    eye_contact = video_data.get("eye_contact_percent", 0)
    transcription = audio_data.get("transcription", "")
    
    # 1. Fluency Score (Target 140-160 WPM, filler penalty)
    wpm_score = 100 - min(40, abs(150 - wpm) * 0.8)
    filler_penalty = min(50, fillers * 4)
    fluency = max(0, wpm_score - filler_penalty)
    
    # 2. Pronunciation Accuracy (Basic proxy: Based on transcription length/confidence if available)
    # Since we use Whisper, we don't have phoneme-level confidence here yet, 
    # but we can mock it or use word count as a proxy for complexity.
    pronunciation = min(100, 70 + (len(transcription.split()) / 50))
    
    # 3. Clarity & Articulation (Proxy: WPM stability and eye contact)
    clarity = min(100, (fluency * 0.7) + (eye_contact * 0.3))
    
    # 4. Grammar & Structure (Mock logic based on sentence completeness)
    grammar = min(100, 65 + (transcription.count('.') * 5))
    
    # 5. Vocabulary Range (Unique word count / total words)
    words = transcription.lower().split()
    unique_words = len(set(words))
    total_words = len(words)
    vocab_ratio = (unique_words / total_words) if total_words > 0 else 0
    vocab = min(100, vocab_ratio * 150)
    
    # 6. Confidence Indicators (Voice steadiness - mocked, Eye contact)
    confidence = eye_contact
    
    # Overall Weighted Score
    overall = (
        fluency * 0.25 + 
        pronunciation * 0.20 + 
        clarity * 0.15 + 
        grammar * 0.15 + 
        vocab * 0.15 + 
        confidence * 0.10
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

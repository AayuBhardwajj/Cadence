
def calculate_score(audio_data: dict, video_data: dict):
    """
    Combines audio and video metrics into a final score.
    """
    # 1. Fluency Score (based on WPM and Fillers)
    wpm = audio_data.get("wpm", 0)
    fillers = audio_data.get("filler_count", 0)
    
    # Ideal WPM is 130-150.
    wpm_deviation = abs(140 - wpm)
    wpm_score = max(0, 100 - wpm_deviation)
    
    # Deduct 5 points per filler word
    filler_penalty = fillers * 5
    fluency_score = max(0, wpm_score - filler_penalty)
    
    # 2. Confidence Score (based on Eye Contact)
    eye_contact = video_data.get("eye_contact_percent", 0)
    confidence_score = eye_contact # Direct mapping for now
    
    # 3. Overall Weighted Score
    # Fluency 60%, Confidence 40%
    overall = (fluency_score * 0.6) + (confidence_score * 0.4)
    
    feedback = []
    if fillers > 5:
        feedback.append(f"Try to reduce filler words. You used {fillers}.")
    if wpm > 160:
        feedback.append("You were speaking a bit fast. Try to slow down.")
    elif wpm < 110:
        feedback.append("You were speaking a bit slow. Try to pick up the pace.")
    if eye_contact < 70:
        feedback.append("Try to maintain more eye contact with the camera.")
    if not feedback:
        feedback.append("Great job! You spoke clearly and confidently.")

    return {
        "overall_score": int(overall),
        "breakdown": {
            "fluency_score": int(fluency_score),
            "confidence_score": int(confidence_score),
            "wpm": wpm,
            "fillers": fillers,
            "eye_contact": eye_contact
        },
        "feedback": " ".join(feedback)
    }

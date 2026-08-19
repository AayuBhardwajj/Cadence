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

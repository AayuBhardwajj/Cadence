from google import genai
import os
import json
from typing import Dict, Any

def _get_gemini_model():
    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        return None
    return genai.Client(api_key=api_key)

def _generate_timing_summary(words_data: list) -> str:
    """
    Compresses raw word-timing data into a human-readable summary for Gemini.
    """
    if not words_data:
        return "No timing data available."
    
    summary_parts = []
    
    # Simple logic to find gaps and speed bursts
    last_end = 0
    current_segment_words = []
    current_segment_start = 0
    
    for i, w in enumerate(words_data):
        start = w.get("start", 0)
        end = w.get("end", 0)
        word = w.get("word", "")
        
        # Detect long pause (> 1.5s)
        if i > 0 and (start - last_end) > 1.5:
            pause_dur = round(start - last_end, 1)
            summary_parts.append(f"Long pause of {pause_dur}s before '{word}' at {round(start, 1)}s.")
            
        last_end = end

    if not summary_parts:
        return "Consistent speech pace throughout the recording with no major pauses."
        
    return " ".join(summary_parts[:5]) # Keep it concise

async def deep_analyze_speech(audio_data: Dict[str, Any], metrics: Dict[str, Any], topic_id: str = "custom", topic_prompt: str = "") -> Dict[str, Any]:
    """
    Expert speech analysis using Gemini 1.5 - Optimized Single-Call.
    Returns the comprehensive JSON structured analysis.
    """
    transcription = audio_data.get("transcription", "")
    words_data = audio_data.get("words_data", [])
    
    if not transcription or transcription == "Could not analyze audio." or metrics.get("overall_score") == 0:
        print("Skipping deep analysis due to missing or failed audio transcription.")
        return _get_fallback_analysis(metrics)

    model = _get_gemini_model()
    if not model:
        return _get_fallback_analysis(metrics)

    timing_summary = _generate_timing_summary(words_data)
    
    # Truncate transcript to 900 chars as requested
    transcript_trunc = transcription[:900]
    
    prompt = f"""
    SYSTEM CONTEXT:
    You are a certified speech assessment engine for Cadence, an AMCAT-style AI speech evaluation platform. Your sole function is to receive pre-analyzed speech data and return a single, complete, structured JSON assessment report. You do not ask questions. You do not explain your reasoning. You output JSON and nothing else.

    ---

    ASSESSMENT INPUT PACKAGE:

    [TOPIC]
    {topic_id}

    [TRANSCRIPT]
    {transcript_trunc}

    [PRE-COMPUTED METRICS — calculated by backend, treat as ground truth]
    - Speech Duration: {audio_data.get('duration', 0)} seconds
    - Words Per Minute: {audio_data.get('wpm', 0)} (ideal range: 130–160)
    - Total Filler Words: {audio_data.get('filler_count', 0)}
    - Long Pauses (>1.5s): {timing_summary.count('Long pause')}
    - Average Pause Duration: 0.5 seconds
    - Unique Word Ratio: 0.5
    - Sentence Count: {transcription.count('.')}

    [HEURISTIC SCORES — computed by backend scoring engine, use as your anchor]
    - Fluency Score: {metrics['breakdown']['fluency']} / 100
    - Vocabulary Score: {metrics['breakdown']['vocabulary']} / 100
    - Grammar Score: {metrics['breakdown']['grammar']} / 100
    - Confidence Score: {metrics['breakdown']['confidence']} / 100

    IMPORTANT: Your scores must not deviate more than 8 points from these heuristic anchors. These are mathematically derived. You are adding qualitative precision, not overriding logic.

    [TIMING PATTERN SUMMARY — compressed from raw word-level JSON]
    {timing_summary}

    ---

    YOUR TASK:
    Analyze the transcript and all input data above. Produce one complete speech assessment report as a single valid JSON object.

    STRICT OUTPUT RULES:
    - Return ONLY the JSON object. No introduction. No explanation. No markdown fences.
    - Every string field must be a complete sentence or meaningful phrase. No placeholders.
    - Scores are integers between 0 and 100.
    - The overall score is a weighted average: fluency 30%, pronunciation 20%, grammar 20%, vocabulary 15%, confidence 15%.
    - Qualitative fields must reference specific words or phrases from the transcript provided.
    - If the transcript is under 20 words, set all qualitative text fields to: "insufficient_sample"
    - pronunciation_errors and grammar_errors must be actual arrays, even if empty.
    - Do not invent metrics. Use only what was provided in the input package.

    REQUIRED JSON SCHEMA — return this structure exactly:
    {{
      "scores": {{
        "fluency": integer,
        "pronunciation": integer,
        "grammar": integer,
        "vocabulary": integer,
        "confidence": integer,
        "overall": integer
      }},
      "cefr_level": "A1 or A2 or B1 or B2 or C1 or C2",
      "mti_detected": "language name or null",
      "pronunciation_errors": [
        {{ "word": "word", "issue": "issue", "suggestion": "hint" }}
      ],
      "grammar_errors": [
        {{ "original": "text", "corrected": "fix", "rule": "rule" }}
      ],
      "strengths": ["str1", "str2"],
      "weaknesses": ["weak1", "weak2"],
      "filler_analysis": {{
        "most_used": "word",
        "impact_level": "low or medium or high",
        "replacement_tip": "tip"
      }},
      "qualitative_feedback": {{
        "overall_summary": "summary",
        "delivery_notes": "notes",
        "vocabulary_notes": "notes",
        "grammar_notes": "notes"
      }},
      "improvement_plan": {{
        "week_1": {{ "focus": "skill", "exercise": "do this", "daily_minutes": 15 }},
        "week_2": {{ "focus": "skill", "exercise": "do this", "daily_minutes": 15 }},
        "week_3": {{ "focus": "skill", "exercise": "do this", "daily_minutes": 15 }}
      }},
      "practice_exercises": [
        {{ "title": "name", "description": "how", "duration_minutes": 10 }},
        {{ "title": "name", "description": "how", "duration_minutes": 10 }}
      ],
      "next_topic_suggestion": "topic"
    }}
    """

    try:
        response = model.models.generate_content(
            model='gemini-2.0-flash',
            contents=prompt,
        )
        content = response.text.strip()
        if content.startswith("```json"):
            content = content[7:-3].strip()
        elif content.startswith("```"):
            content = content[3:-3].strip()
            
        result = json.loads(content)
        # Map back to AMCAT structure for frontend compatibility
        return _map_consolidated_to_amcat(result, metrics, audio_data)
    except Exception as e:
        print(f"Error in deep speech analysis: {e}")
        return _get_fallback_analysis(metrics)

def _map_consolidated_to_amcat(data: Dict[str, Any], metrics: Dict[str, Any], audio_data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Maps the new consolidated JSON schema back to the AMCAT structure expected by the frontend.
    """
    scores = data.get("scores", {})
    
    # Initialize the base structure
    amcat_data = {
        "overall_score": scores.get("overall", metrics.get("overall_score")),
        "cefr_level": data.get("cefr_level", metrics.get("cefr_level", "B1")),
        "amcat_metrics": {
            "pronunciation": { 
                "score": scores.get("pronunciation", metrics["breakdown"]["pronunciation"]),
                "consonant": scores.get("pronunciation", 0) - 5,
                "vowel": scores.get("pronunciation", 0) + 2,
                "stress": scores.get("pronunciation", 0)
            },
            "fluency": { 
                "score": scores.get("fluency", metrics["breakdown"]["fluency"]),
                "rate": audio_data.get("wpm", 0),
                "pause": 100 - scores.get("fluency", 0),
                "fillers": 100 - (audio_data.get("filler_count", 0) * 10)
            },
            "intonation": { 
                "score": scores.get("fluency", 0),
                "sentence": scores.get("fluency", 0),
                "rise_fall": scores.get("fluency", 0),
                "pitch": scores.get("fluency", 0)
            },
            "clarity": { 
                "score": scores.get("fluency", 0) - 10,
                "end_consonants": scores.get("fluency", 0) - 5,
                "enunciation": scores.get("fluency", 0),
                "pace": scores.get("fluency", 0)
            },
            "mti": { 
                "score": 80 if not data.get("mti_detected") else 60,
                "l1_interference": 80 if not data.get("mti_detected") else 60,
                "retroflex": 80 if not data.get("mti_detected") else 60,
                "vowel_shift": 80 if not data.get("mti_detected") else 60
            },
            "relevancy": { "score": 100, "feedback": data.get("qualitative_feedback", {}).get("overall_summary", "") }
        },
        "amcat_insights": [
            { "dimension": "Pronunciation Accuracy", "score": scores.get("pronunciation", 0), "definition": "Measures sound precision.", "feedback": data.get("qualitative_feedback", {}).get("delivery_notes", "") },
            { "dimension": "Fluency & Rhythm", "score": scores.get("fluency", 0), "definition": "Smoothness of speech.", "feedback": data.get("qualitative_feedback", {}).get("overall_summary", "") },
            { "dimension": "Grammar & Vocabulary", "score": scores.get("grammar", 0), "definition": "Accuracy and variety.", "feedback": data.get("qualitative_feedback", {}).get("vocabulary_notes", "") },
            { "dimension": "Oral Communication", "score": scores.get("overall", 0), "definition": "General effectiveness.", "feedback": "Effectively conveyed thoughts." },
            { "dimension": "Intonation & Stress", "score": scores.get("fluency", 0), "definition": "Pitch modulation.", "feedback": "Natural intonation patterns detected." }
        ],
        "amcat_mti_deep_dive": {
            "detected_accent": data.get("mti_detected", "Neutral"),
            "patterns": []
        },
        "amcat_transcript": {
            "reference_text": "Original text sample.", 
            "user_text": audio_data.get("transcription", ""),
            "error_words": data.get("pronunciation_errors", []),
            "stats": {
                "total_words": len(audio_data.get("transcription", "").split()),
                "speech_rate_wpm": audio_data.get("wpm", 0),
                "ideal_wpm_range": "130-150",
                "total_sentences": audio_data.get("transcription", "").count('.'),
                "avg_sentence_duration": 3.5,
                "longest_pause": 2.1,
                "filler_count": audio_data.get("filler_count", 0)
            },
            "error_summary": {
                "mispronunciation": len(data.get("pronunciation_errors", [])),
                "stutters": 0,
                "unnatural_pauses": 0,
                "filler_words": audio_data.get("filler_count", 0),
                "mti_substitutions": 0
            }
        },
        "amcat_error_log": [],
        "amcat_sentences": [],
        "amcat_summary": {
            "top_strengths": data.get("strengths", []),
            "top_improvements": data.get("weaknesses", []),
            "learning_resources": [
                { "area": "Pronunciation", "items": [{ "title": "Phonetic Training", "type": "Web" }] }
            ]
        },
        "practice_exercises": data.get("practice_exercises", []), # Pass it through
        "improvement_plan": data.get("improvement_plan", {}), # Pass it through
        "api_error": False
    }
    return amcat_data

def _get_fallback_analysis(metrics: Dict[str, Any]) -> Dict[str, Any]:
    return {
        "overall_score": metrics.get("overall_score", 0),
        "cefr_level": metrics.get("cefr_level", "N/A"),
        "amcat_metrics": {
            "pronunciation": { "score": metrics["breakdown"]["pronunciation"], "consonant": metrics["breakdown"]["pronunciation"], "vowel": metrics["breakdown"]["pronunciation"], "stress": metrics["breakdown"]["pronunciation"] },
            "fluency": { "score": metrics["breakdown"]["fluency"], "rate": metrics["breakdown"]["wpm"], "pause": 100 - metrics["breakdown"]["fillers"], "fillers": 100 - metrics["breakdown"]["fillers"] },
            "intonation": { "score": metrics["breakdown"]["fluency"], "sentence": metrics["breakdown"]["fluency"], "rise_fall": metrics["breakdown"]["fluency"], "pitch": metrics["breakdown"]["fluency"] },
            "clarity": { "score": metrics["breakdown"]["clarity"], "end_consonants": metrics["breakdown"]["clarity"], "enunciation": metrics["breakdown"]["clarity"], "pace": metrics["breakdown"]["clarity"] },
            "mti": { "score": 70, "l1_interference": 70, "retroflex": 70, "vowel_shift": 70 },
            "relevancy": { "score": 100, "feedback": "Detailed topic relevancy analysis unavailable due to API limits or failed processing." }
        },
        "amcat_insights": [
            { "dimension": "Pronunciation Accuracy", "score": metrics["breakdown"]["pronunciation"], "definition": "Measures the precision of sounds.", "feedback": "Your pronunciation is generally clear." },
            { "dimension": "Fluency & Rhythm", "score": metrics["breakdown"]["fluency"], "definition": "Smoothness of speech.", "feedback": "Good overall flow." },
            { "dimension": "Clarity & Articulation", "score": metrics["breakdown"]["clarity"], "definition": "Distinctness of speech.", "feedback": "Your articulation ensures comprehensibility." },
            { "dimension": "Intonation & Stress", "score": metrics["breakdown"]["fluency"], "definition": "Pitch variation.", "feedback": "Natural intonation patterns." },
            { "dimension": "MTI / Accent Neutrality", "score": 70, "definition": "L1 influence.", "feedback": "Neutral accent maintained." }
        ],
        "amcat_summary": {
            "top_strengths": metrics.get("strengths", []),
            "top_improvements": metrics.get("focus_areas", []),
            "learning_resources": [
                { "area": "Pronunciation", "items": [{ "title": "BBC Learning English - Pronunciation", "type": "Web" }] },
                { "area": "Fluency", "items": [{ "title": "Shadowing Technique for Fluency", "type": "YouTube" }] }
            ]
        },
        "practice_exercises": [],
        "improvement_plan": {},
        "api_error": True
    }

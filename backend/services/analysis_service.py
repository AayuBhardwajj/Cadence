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
    if not words_data:
        return "No timing data available."
    
    summary_parts = []
    last_end = 0
    
    for i, w in enumerate(words_data):
        start = w.get("start", 0)
        end = w.get("end", 0)
        word = w.get("word", "")
        
        if i > 0 and (start - last_end) > 1.5:
            pause_dur = round(start - last_end, 1)
            summary_parts.append(f"Long pause of {pause_dur}s before '{word}' at {round(start, 1)}s.")
            
        last_end = end

    if not summary_parts:
        return "Consistent speech pace throughout the recording with no major pauses."
        
    return " ".join(summary_parts[:5])

def _wpm_to_score(wpm: int) -> int:
    """Convert raw WPM to a 0-100 score. Ideal range is 130-160."""
    if wpm <= 0:
        return 0
    if 130 <= wpm <= 160:
        return 100
    if wpm < 130:
        # Too slow — linear drop from 130 down to 60 WPM = score 0
        return max(0, int((wpm / 130) * 100))
    else:
        # Too fast — linear drop from 160 up to 220 WPM = score 0
        return max(0, int(100 - ((wpm - 160) / 60) * 100))

def _clamp(val: int, lo: int = 0, hi: int = 100) -> int:
    return max(lo, min(hi, val))

async def deep_analyze_speech(audio_data: Dict[str, Any], metrics: Dict[str, Any], topic_id: str = "custom", topic_prompt: str = "") -> Dict[str, Any]:
    transcription = audio_data.get("transcription", "")
    words_data = audio_data.get("words_data", [])
    
    if not transcription or transcription == "Could not analyze audio." or metrics.get("overall_score") == 0:
        print("Skipping deep analysis due to missing or failed audio transcription.")
        return _get_fallback_analysis(metrics, audio_data, topic_prompt)

    model = _get_gemini_model()
    if not model:
        print("Skipping deep analysis due to missing Gemini API Key.")
        return _get_fallback_analysis(metrics, audio_data, topic_prompt)

    timing_summary = _generate_timing_summary(words_data)
    transcript_trunc = transcription[:900]
    
    # Build sentence list for Gemini to analyze per-sentence
    sentences_raw = [s.strip() for s in transcription.replace('!', '.').replace('?', '.').split('.') if len(s.strip()) > 10]
    sentences_json = json.dumps(sentences_raw[:12])  # cap at 12 sentences

    prompt = f"""
    SYSTEM CONTEXT:
    You are a certified speech assessment engine for Cadence, an AMCAT-style AI speech evaluation platform. Your sole function is to receive pre-analyzed speech data and return a single, complete, structured JSON assessment report. You do not ask questions. You do not explain your reasoning. You output JSON and nothing else.

    ---

    ASSESSMENT INPUT PACKAGE:

    [TOPIC ID]: {topic_id}
    [TOPIC REFERENCE TEXT]: {topic_prompt}

    [TRANSCRIPT]
    {transcript_trunc}

    [SENTENCES EXTRACTED]
    {sentences_json}

    [PRE-COMPUTED METRICS — treat as ground truth]
    - Speech Duration: {audio_data.get('duration', 0)} seconds
    - Words Per Minute: {audio_data.get('wpm', 0)} (ideal range: 130–160)
    - Total Filler Words: {audio_data.get('filler_count', 0)}
    - Long Pauses (>1.5s): {timing_summary.count('Long pause')}
    - Sentence Count: {len(sentences_raw)}

    [HEURISTIC SCORES — your scores must stay within ±8 of these]
    - Fluency: {metrics['breakdown']['fluency']} / 100
    - Vocabulary: {metrics['breakdown']['vocabulary']} / 100
    - Grammar: {metrics['breakdown']['grammar']} / 100
    - Confidence: {metrics['breakdown']['confidence']} / 100

    [TIMING SUMMARY]
    {timing_summary}

    ---

    STRICT OUTPUT RULES:
    - Return ONLY the JSON object. No markdown. No preamble.
    - All scores are integers 0–100.
    - Qualitative fields must reference actual words/phrases from the transcript.
    - If transcript < 20 words, set all qualitative text to: "insufficient_sample"
    - Arrays must be actual arrays, even if empty.

    REQUIRED JSON SCHEMA:
    {{
      "scores": {{
        "fluency": integer,
        "pronunciation": integer,
        "grammar": integer,
        "vocabulary": integer,
        "confidence": integer,
        "overall": integer
      }},
      "cefr_level": "A1|A2|B1|B2|C1|C2",
      "mti_detected": "language name or null",
      "mti_patterns": [
        {{
          "pattern": "pattern name e.g. Retroflex Consonants",
          "score": integer (0=rare, 100=frequent),
          "behaviors": ["specific example from transcript", "another example"]
        }}
      ],
      "pronunciation_errors": [
        {{ "word": "word", "said_as": "phonetic transcription", "correct_ipa": "/kəˈrekt/", "error_type": "substitution|omission|addition", "category": "Pronunciation|MTI|Fluency", "severity": "minor|moderate|major", "timestamp": "0:00" }}
      ],
      "grammar_errors": [
        {{ "original": "text", "corrected": "fix", "rule": "rule name" }}
      ],
      "sentence_analysis": [
        {{
          "text": "exact sentence from transcript",
          "pronunciation_issues": "specific issue or 'None detected'",
          "fluency": "smooth|slightly hesitant|hesitant",
          "mti_detected": "yes - description|no",
          "rhythm": "natural|slightly uneven|uneven",
          "intonation": "appropriate|flat|over-expressive"
        }}
      ],
      "strengths": ["specific strength 1", "specific strength 2", "specific strength 3"],
      "weaknesses": ["specific weakness 1", "specific weakness 2", "specific weakness 3"],
      "filler_analysis": {{
        "most_used": "word or 'none'",
        "impact_level": "low|medium|high",
        "replacement_tip": "specific actionable tip"
      }},
      "qualitative_feedback": {{
        "overall_summary": "2-3 sentence summary referencing transcript content",
        "delivery_notes": "specific delivery observation",
        "vocabulary_notes": "vocabulary observation",
        "grammar_notes": "grammar observation"
      }},
      "topic_relevancy": {{
        "score": integer,
        "feedback": "was the speech on-topic? specific observation"
      }},
      "improvement_plan": {{
        "week_1": {{ "focus": "skill name", "exercise": "specific daily exercise", "daily_minutes": 15 }},
        "week_2": {{ "focus": "skill name", "exercise": "specific daily exercise", "daily_minutes": 15 }},
        "week_3": {{ "focus": "skill name", "exercise": "specific daily exercise", "daily_minutes": 15 }}
      }},
      "practice_exercises": [
        {{ "title": "exercise name", "description": "specific how-to instructions", "duration_minutes": 10 }},
        {{ "title": "exercise name", "description": "specific how-to instructions", "duration_minutes": 10 }}
      ],
      "next_topic_suggestion": "suggested topic name"
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
        return _map_consolidated_to_amcat(result, metrics, audio_data, topic_prompt)
    except Exception as e:
        print(f"Error in deep speech analysis: {e}")
        return _get_fallback_analysis(metrics, audio_data, topic_prompt)

def _map_consolidated_to_amcat(data: Dict[str, Any], metrics: Dict[str, Any], audio_data: Dict[str, Any], topic_prompt: str = "") -> Dict[str, Any]:
    scores = data.get("scores", {})
    transcription = audio_data.get("transcription", "")
    wpm = audio_data.get("wpm", 0)
    filler_count = audio_data.get("filler_count", 0)

    pron_score = _clamp(scores.get("pronunciation", metrics["breakdown"]["pronunciation"]))
    fluency_score = _clamp(scores.get("fluency", metrics["breakdown"]["fluency"]))
    grammar_score = _clamp(scores.get("grammar", metrics["breakdown"]["grammar"]))
    vocab_score = _clamp(scores.get("vocabulary", metrics["breakdown"]["vocabulary"]))
    confidence_score = _clamp(scores.get("confidence", metrics["breakdown"]["confidence"]))
    overall_score = _clamp(scores.get("overall", metrics.get("overall_score", 0)))

    wpm_score = _wpm_to_score(wpm)
    filler_score = _clamp(100 - (filler_count * 8))  # each filler costs 8 points

    # MTI patterns from Gemini
    mti_patterns_raw = data.get("mti_patterns", [])
    mti_score = 80 if not data.get("mti_detected") else _clamp(100 - len(mti_patterns_raw) * 10)

    # Map pronunciation_errors → amcat_error_log format
    error_log = []
    for err in data.get("pronunciation_errors", []):
        error_log.append({
            "timestamp": err.get("timestamp", "0:00"),
            "word": err.get("word", ""),
            "said_as": err.get("said_as", ""),
            "correct_ipa": err.get("correct_ipa", ""),
            "error_type": err.get("error_type", "substitution"),
            "severity": err.get("severity", "minor"),
            "category": err.get("category", "Pronunciation")
        })

    # Map sentence_analysis → amcat_sentences format
    amcat_sentences = []
    for s in data.get("sentence_analysis", []):
        amcat_sentences.append({
            "text": s.get("text", ""),
            "pronunciation_issues": s.get("pronunciation_issues", "None detected"),
            "fluency": s.get("fluency", "smooth"),
            "mti_detected": s.get("mti_detected", "no"),
            "rhythm": s.get("rhythm", "natural"),
            "intonation": s.get("intonation", "appropriate")
        })

    # MTI deep dive patterns
    mti_patterns = []
    for p in mti_patterns_raw:
        mti_patterns.append({
            "pattern": p.get("pattern", "Unknown Pattern"),
            "score": _clamp(p.get("score", 0)),
            "behaviors": p.get("behaviors", [])
        })

    topic_relevancy = data.get("topic_relevancy", {})

    return {
        "overall_score": overall_score,
        "cefr_level": data.get("cefr_level", metrics.get("cefr_level", "B1")),
        "transcription": transcription,
        "breakdown": {
            "fluency": fluency_score,
            "pronunciation": pron_score,
            "clarity": _clamp(metrics["breakdown"].get("clarity", fluency_score - 5)),
            "grammar": grammar_score,
            "vocabulary": vocab_score,
            "confidence": confidence_score,
            "wpm": wpm,
            "fillers": filler_count,
            "eye_contact": metrics.get("breakdown", {}).get("eye_contact", 85)
        },
        "strengths": data.get("strengths", metrics.get("strengths", [])),
        "focus_areas": data.get("weaknesses", metrics.get("focus_areas", [])),
        "feedback": data.get("qualitative_feedback", {}).get("overall_summary", metrics.get("feedback", "")),
        "amcat_metrics": {
            "pronunciation": {
                "score": pron_score,
                "consonant": _clamp(pron_score - 3),
                "vowel": _clamp(pron_score + 2),
                "stress": _clamp(pron_score - 5)
            },
            "fluency": {
                "score": fluency_score,
                "rate": wpm_score,         # now a 0-100 score, not raw WPM
                "pause": _clamp(100 - fluency_score + 10),
                "fillers": filler_score
            },
            "intonation": {
                "score": _clamp(fluency_score - 5),
                "sentence": _clamp(fluency_score - 3),
                "rise_fall": _clamp(fluency_score - 8),
                "pitch": _clamp(fluency_score - 5)
            },
            "clarity": {
                "score": _clamp(metrics["breakdown"].get("clarity", fluency_score - 5)),
                "end_consonants": _clamp(pron_score - 8),
                "enunciation": _clamp(pron_score - 3),
                "pace": wpm_score
            },
            "mti": {
                "score": mti_score,
                "l1_interference": _clamp(mti_score - 5),
                "retroflex": _clamp(mti_score - 10),
                "vowel_shift": _clamp(mti_score - 5)
            },
            "relevancy": {
                "score": _clamp(topic_relevancy.get("score", 85)),
                "feedback": topic_relevancy.get("feedback", "Topic relevancy assessed.")
            }
        },
        "amcat_insights": [
            {
                "dimension": "Pronunciation Accuracy",
                "score": pron_score,
                "definition": "Measures the precision of individual sounds, consonants, vowels, and word stress.",
                "feedback": data.get("qualitative_feedback", {}).get("delivery_notes", "Pronunciation assessed from transcript.")
            },
            {
                "dimension": "Fluency & Rhythm",
                "score": fluency_score,
                "definition": "Smoothness of speech delivery, including pace, pausing, and absence of filler words.",
                "feedback": data.get("qualitative_feedback", {}).get("overall_summary", "Fluency assessed from timing data.")
            },
            {
                "dimension": "Grammar & Vocabulary",
                "score": grammar_score,
                "definition": "Grammatical accuracy and range and precision of vocabulary used.",
                "feedback": data.get("qualitative_feedback", {}).get("grammar_notes", "") + " " + data.get("qualitative_feedback", {}).get("vocabulary_notes", "")
            },
            {
                "dimension": "Oral Communication",
                "score": overall_score,
                "definition": "Overall effectiveness of spoken communication including clarity, coherence, and impact.",
                "feedback": data.get("qualitative_feedback", {}).get("overall_summary", "Overall communication assessed.")
            },
            {
                "dimension": "Intonation & Stress",
                "score": _clamp(fluency_score - 5),
                "definition": "Pitch modulation, sentence stress patterns, and natural rise/fall patterns in speech.",
                "feedback": data.get("qualitative_feedback", {}).get("delivery_notes", "Intonation assessed from speech patterns.")
            }
        ],
        "amcat_mti_deep_dive": {
            "detected_accent": data.get("mti_detected") or "Neutral / No strong L1 influence detected",
            "patterns": mti_patterns
        },
        "amcat_transcript": {
            "reference_text": topic_prompt or "Candidate spoke on a topic of their choice.",
            "user_text": transcription,
            "error_words": data.get("pronunciation_errors", []),
            "stats": {
                "total_words": len(transcription.split()),
                "speech_rate_wpm": wpm,
                "ideal_wpm_range": "130-160",
                "total_sentences": len(amcat_sentences) or transcription.count('.'),
                "avg_sentence_duration": round(audio_data.get("duration", 0) / max(len(amcat_sentences), 1), 1),
                "longest_pause": audio_data.get("longest_pause", 0),
                "filler_count": filler_count
            },
            "error_summary": {
                "mispronunciation": len(error_log),
                "stutters": 0,
                "unnatural_pauses": timing_summary_count(audio_data.get("words_data", [])),
                "filler_words": filler_count,
                "mti_substitutions": len([e for e in error_log if e.get("category") == "MTI"])
            }
        },
        "amcat_error_log": error_log,
        "amcat_sentences": amcat_sentences,
        "amcat_summary": {
            "top_strengths": data.get("strengths", []),
            "top_improvements": data.get("weaknesses", []),
            "learning_resources": _build_learning_resources(data.get("weaknesses", []))
        },
        "practice_exercises": data.get("practice_exercises", []),
        "improvement_plan": data.get("improvement_plan", {}),
        "next_topic_suggestion": data.get("next_topic_suggestion", ""),
        "api_error": False
    }

def timing_summary_count(words_data: list) -> int:
    """Count unnatural pauses (>1.5s) from word timing data."""
    if not words_data:
        return 0
    count = 0
    last_end = 0
    for i, w in enumerate(words_data):
        start = w.get("start", 0)
        if i > 0 and (start - last_end) > 1.5:
            count += 1
        last_end = w.get("end", 0)
    return count

def _build_learning_resources(weaknesses: list) -> list:
    """Dynamically build learning resources based on detected weaknesses."""
    resources = []
    
    weakness_str = " ".join(weaknesses).lower()
    
    if any(w in weakness_str for w in ["pronunciation", "sound", "consonant", "vowel"]):
        resources.append({
            "area": "Pronunciation",
            "items": [
                {"title": "Sounds of English - BBC Learning English", "type": "Web"},
                {"title": "Phonetics: The Sounds of American English", "type": "YouTube"},
                {"title": "Elsa Speak - AI Pronunciation Coach", "type": "Paid | App"}
            ]
        })
    
    if any(w in weakness_str for w in ["fluency", "filler", "pause", "rhythm", "pace"]):
        resources.append({
            "area": "Fluency & Pace",
            "items": [
                {"title": "Shadowing Technique for Fluency - Language Learning with Netflix", "type": "YouTube"},
                {"title": "TED Talks - Study delivery and pacing of top speakers", "type": "Web"},
                {"title": "Speeko - Public Speaking Coach", "type": "Paid | App"}
            ]
        })
    
    if any(w in weakness_str for w in ["grammar", "structure", "sentence"]):
        resources.append({
            "area": "Grammar",
            "items": [
                {"title": "English Grammar in Use - Raymond Murphy", "type": "Paid"},
                {"title": "Grammarly - Real-time grammar feedback", "type": "Web"},
                {"title": "EnglishClass101 - Grammar Lessons", "type": "YouTube"}
            ]
        })
    
    if any(w in weakness_str for w in ["vocabulary", "word choice", "range"]):
        resources.append({
            "area": "Vocabulary",
            "items": [
                {"title": "Anki - Spaced repetition vocabulary flashcards", "type": "Free"},
                {"title": "Word Power Made Easy - Norman Lewis", "type": "Paid"},
                {"title": "Merriam-Webster Word of the Day", "type": "Web"}
            ]
        })

    if any(w in weakness_str for w in ["mti", "accent", "interference", "retroflex"]):
        resources.append({
            "area": "Accent Neutralization",
            "items": [
                {"title": "Accent Reduction with Rachel's English", "type": "YouTube"},
                {"title": "ChatterFox - AI Accent Coach", "type": "Paid | App"}
            ]
        })

    # Default resource if nothing matched
    if not resources:
        resources.append({
            "area": "General Communication",
            "items": [
                {"title": "Toastmasters International - Practice public speaking", "type": "Web"},
                {"title": "TED Talks - Study effective communicators", "type": "Web"}
            ]
        })
    
    return resources


def _get_fallback_analysis(metrics: Dict[str, Any], audio_data: Dict[str, Any], topic_prompt: str = "") -> Dict[str, Any]:
    transcription = audio_data.get("transcription", "")
    wpm = audio_data.get("wpm", 0)
    filler_count = audio_data.get("filler_count", 0)
    wpm_score = _wpm_to_score(wpm)
    filler_score = _clamp(100 - (filler_count * 8))
    
    pron = metrics["breakdown"]["pronunciation"]
    fluency = metrics["breakdown"]["fluency"]
    clarity = metrics["breakdown"].get("clarity", fluency - 5)
    
    return {
        "overall_score": metrics.get("overall_score", 0),
        "cefr_level": metrics.get("cefr_level", "N/A"),
        "transcription": transcription,
        "breakdown": {
            **metrics.get("breakdown", {}),
            "wpm": wpm,
            "fillers": filler_count
        },
        "strengths": metrics.get("strengths", ["Clear tone", "Consistent effort"]),
        "focus_areas": metrics.get("focus_areas", ["Continue practicing daily"]),
        "feedback": metrics.get("feedback", "Analysis completed with local heuristics.") + " (Note: Detailed AI insights unavailable — high demand or API limit reached.)",
        "amcat_metrics": {
            "pronunciation": { "score": pron, "consonant": pron, "vowel": pron, "stress": _clamp(pron - 5) },
            "fluency": { "score": fluency, "rate": wpm_score, "pause": _clamp(100 - fluency + 10), "fillers": filler_score },
            "intonation": { "score": _clamp(fluency - 5), "sentence": _clamp(fluency - 3), "rise_fall": _clamp(fluency - 8), "pitch": _clamp(fluency - 5) },
            "clarity": { "score": clarity, "end_consonants": _clamp(pron - 8), "enunciation": _clamp(pron - 3), "pace": wpm_score },
            "mti": { "score": 70, "l1_interference": 70, "retroflex": 65, "vowel_shift": 70 },
            "relevancy": { "score": 80, "feedback": "Topic relevancy analysis unavailable — AI processing limit reached." }
        },
        "amcat_insights": [
            { "dimension": "Pronunciation Accuracy", "score": pron, "definition": "Measures the precision of individual sounds, consonants, vowels, and word stress.", "feedback": "Heuristic analysis: Pronunciation is consistent with your level." },
            { "dimension": "Fluency & Rhythm", "score": fluency, "definition": "Smoothness of speech delivery, pace, and absence of filler words.", "feedback": f"Heuristic analysis: Speech rate was {wpm} WPM. Ideal range is 130–160 WPM." },
            { "dimension": "Oral Communication", "score": metrics.get("overall_score", 0), "definition": "Overall effectiveness of spoken communication.", "feedback": "Successfully delivered a spoken sample. Upgrade for AI-detailed feedback." }
        ],
        "amcat_mti_deep_dive": {
            "detected_accent": "Heuristic Analysis Only",
            "patterns": []
        },
        "amcat_transcript": {
            "reference_text": topic_prompt or "Candidate spoke on a topic of their choice.",
            "user_text": transcription,
            "error_words": [],
            "stats": {
                "total_words": len(transcription.split()),
                "speech_rate_wpm": wpm,
                "ideal_wpm_range": "130-160",
                "total_sentences": transcription.count('.'),
                "avg_sentence_duration": 0,
                "longest_pause": 0,
                "filler_count": filler_count
            },
            "error_summary": {
                "mispronunciation": 0,
                "stutters": 0,
                "unnatural_pauses": 0,
                "filler_words": filler_count,
                "mti_substitutions": 0
            }
        },
        "amcat_error_log": [],
        "amcat_sentences": [],
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
        "next_topic_suggestion": "Public Speaking Basics",
        "api_error": True
    }
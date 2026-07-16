from groq import Groq
from google import genai
import os
import json
from typing import Dict, Any
from services.audio_service import detect_stutters
from utils.ai_usage_logger import log_llm_usage

def _get_groq_client():
    api_key = os.environ.get("GROQ_API_KEY")
    if not api_key:
        return None
    return Groq(api_key=api_key)

def _get_gemini_client():
    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        return None
    return genai.Client(api_key=api_key)

async def _call_llm(prompt: str, assessment_id: str | None = None, user_id: str | None = None) -> str:
    """
    Fallback chain:
      1. Groq  llama-3.1-8b-instant  (fastest, json_object mode)
      2. Groq  gemma2-9b-it          (backup model)
      3. Gemini gemini-2.0-flash     (Google free tier)
    Raises RuntimeError if all fail so caller can use heuristic fallback.
    """
    errors = []

    groq_client = _get_groq_client()
    if groq_client:
        for model_id in ("llama-3.1-8b-instant", "gemma2-9b-it"):
            try:
                resp = groq_client.chat.completions.create(
                    model=model_id,
                    messages=[
                        {"role": "system", "content": "You are a certified speech assessment engine. Return ONLY valid JSON — no markdown, no preamble."},
                        {"role": "user",   "content": prompt}
                    ],
                    temperature=0.1,
                    max_tokens=3000,
                    response_format={"type": "json_object"},
                )
                usage = resp.usage
                log_llm_usage(
                    provider="groq",
                    model=model_id,
                    input_tokens=usage.prompt_tokens if usage else 0,
                    output_tokens=usage.completion_tokens if usage else 0,
                    purpose="analysis",
                    assessment_id=assessment_id,
                    user_id=user_id,
                )
                return resp.choices[0].message.content
            except Exception as e:
                errors.append(f"groq/{model_id}: {e}")

    gemini = _get_gemini_client()
    if gemini:
        try:
            resp = gemini.models.generate_content(
                model="gemini-2.0-flash",
                contents=prompt,
            )
            content = resp.text.strip()
            if content.startswith("```json"):
                content = content[7:-3].strip()
            elif content.startswith("```"):
                content = content[3:-3].strip()
            meta = resp.usage_metadata
            log_llm_usage(
                provider="gemini",
                model="gemini-2.0-flash",
                input_tokens=meta.prompt_token_count if meta else 0,
                output_tokens=meta.candidates_token_count if meta else 0,
                purpose="analysis",
                assessment_id=assessment_id,
                user_id=user_id,
            )
            return content
        except Exception as e:
            errors.append(f"gemini/gemini-2.0-flash: {e}")

    raise RuntimeError(f"All LLM providers failed: {errors}")

def _generate_timing_summary(words_data: list) -> str:
    if not words_data:
        return "No timing data available."
    summary_parts = []
    last_end = 0
    for i, w in enumerate(words_data):
        start = w.get("start", 0)
        end   = w.get("end", 0)
        word  = w.get("word", "")
        if i > 0 and (start - last_end) > 1.5:
            pause_dur = round(start - last_end, 1)
            summary_parts.append(f"Long pause of {pause_dur}s before '{word}' at {round(start,1)}s.")
        last_end = end
    if not summary_parts:
        return "Consistent speech pace throughout the recording with no major pauses."
    return " ".join(summary_parts[:5])

def _wpm_to_score(wpm: int) -> int:
    if wpm <= 0:       return 0
    if 130 <= wpm <= 160: return 100
    if wpm < 130:      return max(0, int((wpm / 130) * 100))
    return max(0, int(100 - ((wpm - 160) / 60) * 100))

def _clamp(val: int, lo: int = 0, hi: int = 100) -> int:
    return max(lo, min(hi, val))

async def deep_analyze_speech(
    audio_data: Dict[str, Any],
    metrics: Dict[str, Any],
    topic_id: str = "custom",
    topic_prompt: str = "",
    assessment_id: str | None = None,
    user_id: str | None = None
) -> Dict[str, Any]:
    transcription = audio_data.get("transcription", "")
    words_data    = audio_data.get("words_data", [])

    stutter_data = {
        "stutter_count": audio_data.get("stutter_count", 0),
        "stutter_events": audio_data.get("stutter_events", [])
    }
    if not stutter_data["stutter_events"] and words_data:
        stutter_data = detect_stutters(words_data)

    if not transcription or transcription == "Could not analyze audio." or metrics.get("overall_score") == 0:
        print("Skiipping deep analysis — missing/failed transcription.")
        return _get_fallback_analysis(metrics, audio_data, topic_prompt)

    if not os.environ.get("GROQ_API_KEY") and not os.environ.get("GEMINI_API_KEY"):
        print("Skipping deep analysis — no LLM API keys found.")
        return _get_fallback_analysis(metrics, audio_data, topic_prompt)

    timing_summary  = _generate_timing_summary(words_data)
    transcript_trunc = transcription[:900]
    sentences_raw   = [s.strip() for s in transcription.replace('!','.').replace('?','.').split('.') if len(s.strip()) > 10]
    sentences_json  = json.dumps(sentences_raw[:12])

    prompt = f"""
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
- Total Programmatic Stutters: {stutter_data.get('stutter_count', 0)}
- Programmatic Stutter Events (max 10): {json.dumps(stutter_data.get('stutter_events', [])[:10])}

The following scores have been computed deterministically by the system.
You must use these exact values in your explanations. Do not modify or re-score.
Do NOT generate numeric scores. Scores are computed deterministically by the system. Your role is to explain the candidate's performance in natural language only.

Fluency Score: {metrics['breakdown']['fluency']}
Pronunciation Score: {metrics['breakdown']['pronunciation']}
Grammar Score: {metrics['breakdown']['grammar']}
Vocabulary Score: {metrics['breakdown']['vocabulary']}
Overall Score: {metrics['overall_score']}

[TIMING SUMMARY]
{timing_summary}

STRICT RULES:
- Return ONLY a valid JSON object matching the schema below.
- No markdown. No preamble. No trailing text.
- Qualitative fields must reference actual words/phrases from the transcript.
- If transcript < 20 words, set all qualitative text to: "insufficient_sample"
- Arrays must be actual arrays, even if empty.

REQUIRED JSON SCHEMA:
{{
  "score_explanations": {{
    "fluency": "string explanation of fluency performance",
    "pronunciation": "string explanation of pronunciation performance",
    "grammar": "string explanation of grammar performance",
    "vocabulary": "string explanation of vocabulary performance",
    "overall": "string summary of overall performance"
  }},
  "cefr_level": "B1",
  "mti_detected": null,
  "mti_patterns": [{{"pattern": "", "score": 0, "behaviors": []}}],
  "pronunciation_errors": [{{"word": "", "said_as": "", "correct_ipa": "", "error_type": "substitution", "category": "Pronunciation", "severity": "minor", "timestamp": "0:00"}}],
  "grammar_errors": [{{"original": "", "corrected": "", "rule": ""}}],
  "sentence_analysis": [{{"text": "", "pronunciation_issues": "None detected", "fluency": "smooth", "mti_detected": "no", "rhythm": "natural", "intonation": "appropriate"}}],
  "strengths": ["", "", ""],
  "weaknesses": ["", "", ""],
  "filler_analysis": {{"most_used": "none", "impact_level": "low", "replacement_tip": ""}},
  "qualitative_feedback": {{"overall_summary": "", "delivery_notes": "", "vocabulary_notes": "", "grammar_notes": ""}},
  "topic_relevancy": {{"score": 85, "feedback": ""}},
  "improvement_plan": {{
    "week_1": {{"focus": "", "exercise": "", "daily_minutes": 15}},
    "week_2": {{"focus": "", "exercise": "", "daily_minutes": 15}},
    "week_3": {{"focus": "", "exercise": "", "daily_minutes": 15}}
  }},
  "practice_exercises": [{{"title": "", "description": "", "duration_minutes": 10}}],
  "next_topic_suggestion": "",
  "stutter_analysis": {{
    "stutter_count": 0,
    "stutter_rate_percent": 0.0,
    "most_stuttered_words": [],
    "trigger_sounds": [],
    "stutter_pattern": "none",
    "severity": "none",
    "severity_rationale": "",
    "coaching_tip": ""
  }},
  "mti_deep": {{
    "mti_detected": null,
    "confidence": "low",
    "accent_summary": "",
    "phoneme_errors": [],
    "prosody_issues": [],
    "vowel_issues": [],
    "retroflex_usage": {{"detected": false, "affected_sounds": [], "example_words": [], "severity": "none"}},
    "l1_interference_details": {{"score": 70, "primary_interference_areas": [], "strength_areas": []}},
    "recommendations": []
  }}
}}
"""

    try:
        content = await _call_llm(prompt, assessment_id=assessment_id, user_id=user_id)
        result  = json.loads(content)
        return _map_consolidated_to_amcat(result, metrics, audio_data, topic_prompt, stutter_data)
    except Exception as e:
        print(f"LLM pipeline failed, using heuristic fallback: {e}")
        return _get_fallback_analysis(metrics, audio_data, topic_prompt)

def _map_consolidated_to_amcat(data: Dict[str, Any], metrics: Dict[str, Any], audio_data: Dict[str, Any], topic_prompt: str = "", stutter_data=None) -> Dict[str, Any]:
    stutter_data = stutter_data or {}
    transcription = audio_data.get("transcription", "")
    wpm           = audio_data.get("wpm", 0)
    filler_count  = audio_data.get("filler_count", 0)

    pron_score       = _clamp(metrics["breakdown"]["pronunciation"])
    fluency_score    = _clamp(metrics["breakdown"]["fluency"])
    grammar_score    = _clamp(metrics["breakdown"]["grammar"])
    vocab_score      = _clamp(metrics["breakdown"]["vocabulary"])
    confidence_score = _clamp(metrics["breakdown"]["confidence"])
    overall_score    = _clamp(metrics.get("overall_score", 0))

    wpm_score    = _wpm_to_score(wpm)
    filler_score = _clamp(100 - (filler_count * 8))

    mti_patterns_raw = data.get("mti_patterns", [])
    mti_score = 80 if not data.get("mti_detected") else _clamp(100 - len(mti_patterns_raw) * 10)

    error_log = []
    for err in data.get("pronunciation_errors", []):
        error_log.append({
            "timestamp":   err.get("timestamp", "0:00"),
            "word":        err.get("word", ""),
            "said_as":     err.get("said_as", ""),
            "correct_ipa": err.get("correct_ipa", ""),
            "error_type":  err.get("error_type", "substitution"),
            "severity":    err.get("severity", "minor"),
            "category":    err.get("category", "Pronunciation")
        })

    amcat_sentences = []
    for s in data.get("sentence_analysis", []):
        amcat_sentences.append({
            "text":                 s.get("text", ""),
            "pronunciation_issues": s.get("pronunciation_issues", "None detected"),
            "fluency":              s.get("fluency", "smooth"),
            "mti_detected":         s.get("mti_detected", "no"),
            "rhythm":               s.get("rhythm", "natural"),
            "intonation":           s.get("intonation", "appropriate")
        })

    mti_patterns = [{"pattern": p.get("pattern","Unknown Pattern"), "score": _clamp(p.get("score",0)), "behaviors": p.get("behaviors",[])} for p in mti_patterns_raw]

    topic_relevancy = data.get("topic_relevancy", {})

    return {
        "overall_score": overall_score,
        "cefr_level":    data.get("cefr_level", metrics.get("cefr_level", "B1")),
        "transcription": transcription,
        "breakdown": {
            "fluency":      fluency_score,
            "pronunciation": pron_score,
            "clarity":      _clamp(metrics["breakdown"].get("clarity", fluency_score - 5)),
            "grammar":      grammar_score,
            "vocabulary":   vocab_score,
            "confidence":   confidence_score,
            "wpm":          wpm,
            "fillers":      filler_count,
            "eye_contact":  metrics.get("breakdown", {}).get("eye_contact", 85)
        },
        "strengths":   data.get("strengths",  metrics.get("strengths", [])),
        "focus_areas": data.get("weaknesses", metrics.get("focus_areas", [])),
        "feedback":    data.get("qualitative_feedback", {}).get("overall_summary", metrics.get("feedback", "")),
        "amcat_metrics": {
            "pronunciation": {"score": pron_score,    "consonant": _clamp(pron_score-3),    "vowel": _clamp(pron_score+2),       "stress": _clamp(pron_score-5)},
            "fluency":       {"score": fluency_score, "rate": wpm_score,                    "pause": _clamp(100-fluency_score+10), "fillers": filler_score},
            "intonation":    {"score": _clamp(fluency_score-5), "sentence": _clamp(fluency_score-3), "rise_fall": _clamp(fluency_score-8), "pitch": _clamp(fluency_score-5)},
            "clarity":       {"score": _clamp(metrics["breakdown"].get("clarity", fluency_score-5)), "end_consonants": _clamp(pron_score-8), "enunciation": _clamp(pron_score-3), "pace": wpm_score},
            "mti": {
                "score": mti_score,
                "l1_interference": _clamp(
                    data.get("mti_deep", {}).get("l1_interference_details", {}).get("score", mti_score - 5)
                ),
                "retroflex": _clamp({
                    "none": 95, "mild": 75, "moderate": 55, "severe": 35
                }.get(
                    data.get("mti_deep", {}).get("retroflex_usage", {}).get("severity", "none"), 
                    mti_score - 10
                )),
                "vowel_shift": _clamp(
                    100 - len(data.get("mti_deep", {}).get("vowel_issues", [])) * 12
                )
            },
            "relevancy":     {"score": _clamp(topic_relevancy.get("score", 85)), "feedback": topic_relevancy.get("feedback", "Topic relevancy assessed.")}
        },
        "amcat_insights": [
            {"dimension": "Pronunciation Accuracy", "score": pron_score,    "definition": "Measures the precision of individual sounds, consonants, vowels, and word stress.",        "feedback": data.get("qualitative_feedback",{}).get("delivery_notes",  "Pronunciation assessed from transcript.")},
            {"dimension": "Fluency & Rhythm",       "score": fluency_score, "definition": "Smoothness of speech delivery, including pace, pausing, and absence of filler words.",      "feedback": data.get("qualitative_feedback",{}).get("overall_summary", "Fluency assessed from timing data.")},
            {"dimension": "Grammar & Vocabulary",   "score": grammar_score, "definition": "Grammatical accuracy and range and precision of vocabulary used.",                          "feedback": data.get("qualitative_feedback",{}).get("grammar_notes","") + " " + data.get("qualitative_feedback",{}).get("vocabulary_notes","")},
            {"dimension": "Oral Communication",     "score": overall_score, "definition": "Overall effectiveness of spoken communication including clarity, coherence, and impact.",   "feedback": data.get("qualitative_feedback",{}).get("overall_summary", "Overall communication assessed.")},
            {"dimension": "Intonation & Stress",    "score": _clamp(fluency_score-5), "definition": "Pitch modulation, sentence stress patterns, and natural rise/fall patterns.",    "feedback": data.get("qualitative_feedback",{}).get("delivery_notes",  "Intonation assessed from speech patterns.")}
        ],
        "amcat_mti_deep_dive": {
            "detected_accent": data.get("mti_detected") or "Neutral / No strong L1 influence detected",
            "patterns": mti_patterns
        },
        "amcat_transcript": {
            "reference_text": topic_prompt or "Candidate spoke on a topic of their choice.",
            "user_text":      transcription,
            "error_words":    data.get("pronunciation_errors", []),
            "stats": {
                "total_words":          len(transcription.split()),
                "speech_rate_wpm":      wpm,
                "ideal_wpm_range":      "130-160",
                "total_sentences":      len(amcat_sentences) or transcription.count('.'),
                "avg_sentence_duration": round(audio_data.get("duration", 0) / max(len(amcat_sentences), 1), 1),
                "longest_pause":        audio_data.get("longest_pause", 0),
                "filler_count":         filler_count
            },
            "error_summary": {
                "mispronunciation":  len(error_log),
                "stutters":          data.get("stutter_analysis", {}).get("stutter_count", 0),
                "unnatural_pauses":  timing_summary_count(audio_data.get("words_data", [])),
                "filler_words":      filler_count,
                "mti_substitutions": len([e for e in error_log if e.get("category") == "MTI"])
            }
        },
        "amcat_error_log":  error_log,
        "amcat_sentences":  amcat_sentences,
        "amcat_summary": {
            "top_strengths":    data.get("strengths", []),
            "top_improvements": data.get("weaknesses", []),
            "learning_resources": _build_learning_resources(data.get("weaknesses", []))
        },
        "practice_exercises":    data.get("practice_exercises", []),
        "improvement_plan":      data.get("improvement_plan", {}),
        "next_topic_suggestion": data.get("next_topic_suggestion", ""),
        "stutter_analysis": {
            **data.get("stutter_analysis", {}),
            # Merge in programmatic events not returned by LLM
            "stutter_events": stutter_data.get("stutter_events", [])
        },
        "mti_deep": data.get("mti_deep", {}),
        "api_error": False
    }

def timing_summary_count(words_data: list) -> int:
    if not words_data: return 0
    count, last_end = 0, 0
    for i, w in enumerate(words_data):
        start = w.get("start", 0)
        if i > 0 and (start - last_end) > 1.5:
            count += 1
        last_end = w.get("end", 0)
    return count

def _build_learning_resources(weaknesses: list) -> list:
    resources    = []
    weakness_str = " ".join(weaknesses).lower()
    if any(w in weakness_str for w in ["pronunciation","sound","consonant","vowel"]):
        resources.append({"area":"Pronunciation","items":[{"title":"Sounds of English - BBC Learning English","type":"Web"},{"title":"Phonetics: The Sounds of American English","type":"YouTube"},{"title":"Elsa Speak - AI Pronunciation Coach","type":"Paid | App"}]})
    if any(w in weakness_str for w in ["fluency","filler","pause","rhythm","pace"]):
        resources.append({"area":"Fluency & Pace","items":[{"title":"Shadowing Technique for Fluency","type":"YouTube"},{"title":"TED Talks - Study delivery and pacing","type":"Web"},{"title":"Speeko - Public Speaking Coach","type":"Paid | App"}]})
    if any(w in weakness_str for w in ["grammar","structure","sentence"]):
        resources.append({"area":"Grammar","items":[{"title":"English Grammar in Use - Raymond Murphy","type":"Paid"},{"title":"Grammarly","type":"Web"},{"title":"EnglishClass101 - Grammar Lessons","type":"YouTube"}]})
    if any(w in weakness_str for w in ["vocabulary","word choice","range"]):
        resources.append({"area":"Vocabulary","items":[{"title":"Anki - Spaced repetition flashcards","type":"Free"},{"title":"Word Power Made Easy","type":"Paid"},{"title":"Merriam-Webster Word of the Day","type":"Web"}]})
    if any(w in weakness_str for w in ["mti","accent","interference","retroflex"]):
        resources.append({"area":"Accent Neutralization","items":[{"title":"Accent Reduction with Rachel's English","type":"YouTube"},{"title":"ChatterFox - AI Accent Coach","type":"Paid | App"}]})
    if not resources:
        resources.append({"area":"General Communication","items":[{"title":"Toastmasters International","type":"Web"},{"title":"TED Talks","type":"Web"}]})
    return resources

def _get_fallback_analysis(metrics: Dict[str, Any], audio_data: Dict[str, Any], topic_prompt: str = "") -> Dict[str, Any]:
    transcription = audio_data.get("transcription", "")
    wpm           = audio_data.get("wpm", 0)
    filler_count  = audio_data.get("filler_count", 0)
    wpm_score     = _wpm_to_score(wpm)
    filler_score  = _clamp(100 - (filler_count * 8))
    pron    = metrics["breakdown"]["pronunciation"]
    fluency = metrics["breakdown"]["fluency"]
    clarity = metrics["breakdown"].get("clarity", fluency - 5)
    return {
        "overall_score": metrics.get("overall_score", 0),
        "cefr_level":    metrics.get("cefr_level", "N/A"),
        "transcription": transcription,
        "breakdown":     {**metrics.get("breakdown",{}), "wpm": wpm, "fillers": filler_count},
        "strengths":     metrics.get("strengths",   ["Clear tone","Consistent effort"]),
        "focus_areas":   metrics.get("focus_areas", ["Continue practicing daily"]),
        "feedback":      metrics.get("feedback","Analysis completed with local heuristics.") + " (Note: Detailed AI insights unavailable — high demand or API limit reached.)",
        "amcat_metrics": {
            "pronunciation": {"score":pron,    "consonant":pron,              "vowel":pron,             "stress":_clamp(pron-5)},
            "fluency":       {"score":fluency, "rate":wpm_score,              "pause":_clamp(100-fluency+10), "fillers":filler_score},
            "intonation":    {"score":_clamp(fluency-5), "sentence":_clamp(fluency-3), "rise_fall":_clamp(fluency-8), "pitch":_clamp(fluency-5)},
            "clarity":       {"score":clarity, "end_consonants":_clamp(pron-8),"enunciation":_clamp(pron-3),"pace":wpm_score},
            "mti":           {"score":70,"l1_interference":70,"retroflex":65,"vowel_shift":70},
            "relevancy":     {"score":80,"feedback":"Topic relevancy analysis unavailable — AI processing limit reached."}
        },
        "amcat_insights":[
            {"dimension":"Pronunciation Accuracy","score":pron,    "definition":"Measures the precision of individual sounds.","feedback":"Heuristic analysis: Pronunciation is consistent with your level."},
            {"dimension":"Fluency & Rhythm",       "score":fluency, "definition":"Smoothness of speech delivery.","feedback":f"Heuristic analysis: Speech rate was {wpm} WPM. Ideal range is 130–160 WPM."},
            {"dimension":"Oral Communication",     "score":metrics.get("overall_score",0),"definition":"Overall effectiveness of spoken communication.","feedback":"Successfully delivered a spoken sample. Upgrade for AI-detailed feedback."}
        ],
        "amcat_mti_deep_dive":{"detected_accent":"Heuristic Analysis Only","patterns":[]},
        "amcat_transcript":{
            "reference_text":topic_prompt or "Candidate spoke on a topic of their choice.",
            "user_text":transcription,"error_words":[],
            "stats":{"total_words":len(transcription.split()),"speech_rate_wpm":wpm,"ideal_wpm_range":"130-160","total_sentences":transcription.count('.'),"avg_sentence_duration":0,"longest_pause":0,"filler_count":filler_count},
            "error_summary":{"mispronunciation":0,"stutters":0,"unnatural_pauses":0,"filler_words":filler_count,"mti_substitutions":0}
        },
        "amcat_error_log":[],"amcat_sentences":[],
        "amcat_summary":{"top_strengths":metrics.get("strengths",[]),"top_improvements":metrics.get("focus_areas",[]),"learning_resources":[{"area":"Pronunciation","items":[{"title":"BBC Learning English","type":"Web"}]},{"area":"Fluency","items":[{"title":"Shadowing Technique","type":"YouTube"}]}]},
        "practice_exercises":[],"improvement_plan":{},"next_topic_suggestion":"Public Speaking Basics",
        "stutter_analysis": {
            "stutter_count": 0,
            "stutter_rate_percent": 0.0,
            "most_stuttered_words": [],
            "trigger_sounds": [],
            "stutter_pattern": "none",
            "severity": "none",
            "severity_rationale": "LLM unavailable — heuristic fallback",
            "coaching_tip": "Practice reading aloud slowly, one sentence at a time.",
            "stutter_events": []
        },
        "mti_deep": {
            "mti_detected": None,
            "confidence": "low",
            "accent_summary": "MTI analysis unavailable — heuristic fallback",
            "phoneme_errors": [],
            "prosody_issues": [],
            "vowel_issues": [],
            "retroflex_usage": {"detected": False, "affected_sounds": [], "example_words": [], "severity": "none"},
            "l1_interference_details": {"score": 70, "primary_interference_areas": [], "strength_areas": []},
            "recommendations": []
        },
        "api_error":True
    }
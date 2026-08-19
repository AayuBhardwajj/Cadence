import os
import json
import logging
from typing import Dict, Any
from services.audio_service import detect_stutters
from ml_shared.llm_client import call_llm
from utils.transcript_alignment import align_transcript, _normalize_for_alignment

logger = logging.getLogger(__name__)

def _find_timestamp_for_word(target_word: str, hyp_idx: int, words_data: list) -> str:
    """
    Maps a word's position index (hyp_idx) or string content back to Whisper's
    words_data array to extract the start timestamp (formatted as M:SS).
    If timestamp mapping fails, logs a warning and returns "" (omitted).
    """
    if not words_data or not target_word:
        return ""
    norm_target = _normalize_for_alignment(target_word).lower()

    # 1. Direct match at hyp_idx if within bounds
    if 0 <= hyp_idx < len(words_data):
        w_norm = _normalize_for_alignment(str(words_data[hyp_idx].get("word") or words_data[hyp_idx].get("original") or "")).lower()
        if w_norm == norm_target:
            ts_sec = float(words_data[hyp_idx].get("start", 0.0))
            return f"{int(ts_sec // 60)}:{int(ts_sec % 60):02d}"

    # 2. Search in a small window around hyp_idx
    start_search = max(0, hyp_idx - 5)
    end_search = min(len(words_data), hyp_idx + 6)
    for i in range(start_search, end_search):
        w_norm = _normalize_for_alignment(str(words_data[i].get("word") or words_data[i].get("original") or "")).lower()
        if w_norm == norm_target:
            ts_sec = float(words_data[i].get("start", 0.0))
            return f"{int(ts_sec // 60)}:{int(ts_sec % 60):02d}"

    logger.warning("Could not map timestamp for word '%s' at hypothesis index %d in words_data", target_word, hyp_idx)
    return ""


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

def _segment_into_sentences(transcription: str, words_data: list = None) -> list:
    """
    Segments speech transcription into sentences using word-level timestamp gaps
    (pause >= 1.2s) and punctuation (.!?), with word-chunk fallback for long unpunctuated text.
    """
    if words_data and len(words_data) > 0:
        sentences = []
        curr_words = []
        last_end = 0.0
        for i, w in enumerate(words_data):
            word_str = str(w.get("word") or w.get("original") or "").strip()
            if not word_str:
                continue
            start = w.get("start", 0.0)
            end = w.get("end", 0.0)

            is_pause_boundary = (i > 0 and (start - last_end) >= 1.2)
            is_punct_boundary = len(curr_words) > 0 and curr_words[-1].endswith(('.', '!', '?'))

            if (is_pause_boundary or is_punct_boundary) and curr_words:
                sentence_text = " ".join(curr_words).strip()
                if len(sentence_text) > 5:
                    sentences.append(sentence_text)
                curr_words = []

            curr_words.append(word_str)
            last_end = end

        if curr_words:
            sentence_text = " ".join(curr_words).strip()
            if len(sentence_text) > 5:
                sentences.append(sentence_text)

        if sentences:
            return sentences

    raw_splits = [s.strip() for s in transcription.replace('!', '.').replace('?', '.').split('.') if len(s.strip()) > 5]
    if len(raw_splits) > 1 or not transcription:
        return raw_splits if raw_splits else [transcription]

    words = transcription.split()
    if len(words) <= 15:
        return [transcription]
    chunk_size = 15
    return [" ".join(words[i:i + chunk_size]) for i in range(0, len(words), chunk_size)]


async def deep_analyze_speech(
    audio_data: Dict[str, Any],
    metrics: Dict[str, Any],
    topic_id: str = "custom",
    topic_prompt: str = "",
    reference_passage: str | None = None,
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
        logger.info("Skipping deep analysis — missing/failed transcription.")
        return _get_fallback_analysis(metrics, audio_data, topic_prompt, reference_passage=reference_passage)

    if not os.environ.get("GROQ_API_KEY") and not os.environ.get("GEMINI_API_KEY"):
        logger.info("Skipping deep analysis — no LLM API keys found.")
        return _get_fallback_analysis(metrics, audio_data, topic_prompt, reference_passage=reference_passage)

    timing_summary  = _generate_timing_summary(words_data)
    transcript_trunc = transcription[:900]
    sentences_raw   = _segment_into_sentences(transcription, words_data)
    sentences_json  = json.dumps(sentences_raw[:12])

    pronunciation_schema_block = (
        "" if reference_passage is not None
        else '  "pronunciation_errors": [{"word": "", "said_as": "", "correct_ipa": "", "error_type": "substitution", "category": "Pronunciation", "severity": "minor", "timestamp": "0:00"}],\n'
    )

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
- Distinct feedback must be provided for delivery_notes vs intonation_notes (do NOT duplicate text between fields).
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
{pronunciation_schema_block}  "grammar_errors": [{{"original": "", "corrected": "", "rule": ""}}],
  "sentence_analysis": [{{"text": "", "pronunciation_issues": "None detected", "fluency": "smooth", "mti_detected": "no", "rhythm": "natural", "intonation": "appropriate"}}],
  "strengths": ["", "", ""],
  "weaknesses": ["", "", ""],
  "filler_analysis": {{"most_used": "none", "impact_level": "low", "replacement_tip": ""}},
  "qualitative_feedback": {{"overall_summary": "", "delivery_notes": "", "vocabulary_notes": "", "grammar_notes": "", "intonation_notes": ""}},
  "topic_relevancy": {{"score": 85, "feedback": ""}},
  "improvement_plan": {{
    "week_1": {{"focus": "", "exercise": "", "daily_minutes": 15}},
    "week_2": {{"focus": "", "exercise": "", "daily_minutes": 15}},
    "week_3": {{"focus": "", "exercise": "", "daily_minutes": 15}}
  }},
  "practice_exercises": [{{"title": "", "description": "", "duration_minutes": 10}}],
  "next_topic_suggestion": ""
}}
"""

    try:
        content = await call_llm(
            chain="diagnostic_tier",
            prompt=prompt,
            system_message="You are a certified speech assessment engine. Return ONLY valid JSON — no markdown, no preamble.",
            assessment_id=assessment_id,
            user_id=user_id,
        )
        result  = json.loads(content)
        return _map_consolidated_to_amcat(
            result,
            metrics,
            audio_data,
            topic_prompt,
            stutter_data,
            reference_passage=reference_passage
        )
    except Exception as e:
        logger.error("LLM pipeline failed, using heuristic fallback: %s", e)
        return _get_fallback_analysis(metrics, audio_data, topic_prompt, reference_passage=reference_passage)

def _map_consolidated_to_amcat(
    data: Dict[str, Any],
    metrics: Dict[str, Any],
    audio_data: Dict[str, Any],
    topic_prompt: str = "",
    stutter_data=None,
    reference_passage: str | None = None
) -> Dict[str, Any]:
    stutter_data = stutter_data or {}
    transcription = audio_data.get("transcription", "")
    words_data    = audio_data.get("words_data", [])
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
    if reference_passage is not None and reference_passage.strip():
        aligned_discrepancies = align_transcript(reference_passage, transcription)
        for err in aligned_discrepancies:
            is_high_conf = err.get("high_confidence", False)
            error_type = err.get("error_type", "substitution")
            ref_w = err.get("reference_words", "")
            said_w = err.get("said_words", "")
            cat = err.get("category", "Vocabulary")
            sev = err.get("severity", "medium")
            hyp_idx = err.get("hyp_start_idx", 0)

            if error_type == "substitution":
                word_display = ref_w
                said_as_display = said_w
            elif error_type == "deletion":
                word_display = ref_w
                said_as_display = "(omitted)"
            elif error_type == "insertion":
                word_display = said_w
                said_as_display = f"Added '{said_w}'"
            else:
                word_display = ref_w or said_w
                said_as_display = said_w

            target_word_for_ts = said_w.split()[0] if said_w else (ref_w.split()[0] if ref_w else "")
            ts_str = _find_timestamp_for_word(target_word_for_ts, hyp_idx, words_data)

            error_log.append({
                "timestamp":             ts_str,
                "word":                  word_display,
                "said_as":               said_as_display,
                "correct_ipa":           "",
                "error_type":            error_type,
                "severity":              sev if is_high_conf else "low",
                "category":              cat,
                "excluded_from_scoring": not is_high_conf
            })
    else:
        logger.info("reference_passage is None — using LLM pronunciation_errors fallback path")
        for err in data.get("pronunciation_errors", []):
            error_log.append({
                "timestamp":             err.get("timestamp", "0:00"),
                "word":                  err.get("word", ""),
                "said_as":               err.get("said_as", ""),
                "correct_ipa":           err.get("correct_ipa", ""),
                "error_type":            err.get("error_type", "substitution"),
                "severity":              err.get("severity", "minor"),
                "category":              err.get("category", "Pronunciation"),
                "excluded_from_scoring": False
            })

    for st in stutter_data.get("stutter_events", []):
        ts_sec = float(st.get("timestamp", 0))
        ts_str = f"{int(ts_sec // 60)}:{int(ts_sec % 60):02d}"
        st_type = str(st.get("type", "repetition")).lower()
        error_log.append({
            "timestamp":             ts_str,
            "word":                  st.get("word", ""),
            "said_as":               f"Stutter ({st_type.capitalize()})",
            "correct_ipa":           "",
            "error_type":            st_type,
            "severity":              "moderate" if st_type == "repetition" else "minor",
            "category":              "Fluency",
            "excluded_from_scoring": False
        })

    scored_errors = [e for e in error_log if not e.get("excluded_from_scoring", False)]
    scored_vocab_errors = [e for e in scored_errors if e.get("category") == "Vocabulary" and e.get("error_type") in ("substitution", "deletion")]
    scored_pronunciation_errors = [e for e in scored_errors if e.get("category") == "Pronunciation"]
    scored_mti_errors = [e for e in scored_errors if e.get("category") == "MTI"]

    error_words_list = [
        {"word": e["word"], "said_as": e["said_as"], "error_type": e["error_type"], "category": e["category"]}
        for e in scored_errors if e.get("error_type") in ("substitution", "deletion", "insertion", "mispronunciation")
    ]

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
    q_feedback = data.get("qualitative_feedback", {})

    sentences_raw_count = max(len(_segment_into_sentences(transcription, audio_data.get("words_data", []))), 1)

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
        "feedback":    q_feedback.get("overall_summary", metrics.get("feedback", "")),
        "amcat_metrics": {
            "pronunciation": {"score": pron_score,    "consonant": _clamp(pron_score-3),    "vowel": _clamp(pron_score+2),       "stress": _clamp(pron_score-5)},
            "fluency":       {"score": fluency_score, "rate": wpm_score,                    "pause": _clamp(100-fluency_score+10), "fillers": filler_score},
            "intonation":    {"score": _clamp(fluency_score-5), "sentence": _clamp(fluency_score-3), "rise_fall": _clamp(fluency_score-8), "pitch": _clamp(fluency_score-5)},
            "clarity":       {"score": _clamp(metrics["breakdown"].get("clarity", fluency_score-5)), "end_consonants": _clamp(pron_score-8), "enunciation": _clamp(pron_score-3), "pace": wpm_score},
            "mti": {
                "score": mti_score,
                "l1_interference": mti_score,
                "retroflex":       mti_score,
                "vowel_shift":     mti_score,
            },
            "relevancy":     {"score": _clamp(topic_relevancy.get("score", 85)), "feedback": topic_relevancy.get("feedback", "Topic relevancy assessed.")}
        },
        "amcat_insights": [
            {"dimension": "Pronunciation Accuracy", "score": pron_score,    "definition": "Measures the precision of individual sounds, consonants, vowels, and word stress.",        "feedback": q_feedback.get("delivery_notes", "Pronunciation assessed from transcript.")},
            {"dimension": "Fluency & Rhythm",       "score": fluency_score, "definition": "Smoothness of speech delivery, including pace, pausing, and absence of filler words.",      "feedback": q_feedback.get("overall_summary", "Fluency assessed from timing data.")},
            {"dimension": "Grammar & Vocabulary",   "score": grammar_score, "definition": "Grammatical accuracy and range and precision of vocabulary used.",                          "feedback": (q_feedback.get("grammar_notes","") + " " + q_feedback.get("vocabulary_notes","")).strip() or "Grammar and vocabulary assessed."},
            {"dimension": "Oral Communication",     "score": overall_score, "definition": "Overall effectiveness of spoken communication including clarity, coherence, and impact.",   "feedback": q_feedback.get("overall_summary", "Overall communication assessed.")},
            {"dimension": "Intonation & Stress",    "score": _clamp(fluency_score-5), "definition": "Pitch modulation, sentence stress patterns, and natural rise/fall patterns.",    "feedback": q_feedback.get("intonation_notes") or q_feedback.get("delivery_notes", "Intonation assessed from speech patterns.")}
        ],
        "amcat_mti_deep_dive": {
            "detected_accent": data.get("mti_detected") or "Neutral / No strong L1 influence detected",
            "patterns": mti_patterns
        },
        "amcat_transcript": {
            "reference_text": topic_prompt or "Candidate spoke on a topic of their choice.",
            "user_text":      transcription,
            "error_words":    error_words_list,
            "stats": {
                "total_words":          len(transcription.split()),
                "speech_rate_wpm":      wpm,
                "ideal_wpm_range":      "130-160",
                "total_sentences":      sentences_raw_count,
                "avg_sentence_duration": round(audio_data.get("duration", 0) / sentences_raw_count, 1),
                "longest_pause":        audio_data.get("longest_pause", 0),
                "filler_count":         filler_count
            },
            "error_summary": {
                "mispronunciation":  len(scored_pronunciation_errors),
                "vocabulary_errors": len(scored_vocab_errors),
                "stutters":          stutter_data.get("stutter_count", 0),
                "unnatural_pauses":  timing_summary_count(audio_data.get("words_data", [])),
                "filler_words":      filler_count,
                "mti_substitutions": len(scored_mti_errors)
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
        resources.append({"area":"General Practice","items":[{"title":"BBC Learning English","type":"Web"}]})
    return resources

def _get_fallback_analysis(
    metrics: Dict[str, Any],
    audio_data: Dict[str, Any],
    topic_prompt: str = "",
    reference_passage: str | None = None
) -> Dict[str, Any]:
    transcription = audio_data.get("transcription", "")
    words_data    = audio_data.get("words_data", [])
    wpm           = audio_data.get("wpm", 0)
    filler_count  = audio_data.get("filler_count", 0)
    wpm_score     = _wpm_to_score(wpm)
    filler_score  = _clamp(100 - (filler_count * 8))
    pron    = metrics["breakdown"]["pronunciation"]
    fluency = metrics["breakdown"]["fluency"]
    clarity = metrics["breakdown"].get("clarity", fluency - 5)

    error_log = []
    if reference_passage is not None and reference_passage.strip():
        aligned_discrepancies = align_transcript(reference_passage, transcription)
        for err in aligned_discrepancies:
            is_high_conf = err.get("high_confidence", False)
            error_type = err.get("error_type", "substitution")
            ref_w = err.get("reference_words", "")
            said_w = err.get("said_words", "")
            cat = err.get("category", "Vocabulary")
            sev = err.get("severity", "medium")
            hyp_idx = err.get("hyp_start_idx", 0)

            if error_type == "substitution":
                word_display = ref_w
                said_as_display = said_w
            elif error_type == "deletion":
                word_display = ref_w
                said_as_display = "(omitted)"
            elif error_type == "insertion":
                word_display = said_w
                said_as_display = f"Added '{said_w}'"
            else:
                word_display = ref_w or said_w
                said_as_display = said_w

            target_word_for_ts = said_w.split()[0] if said_w else (ref_w.split()[0] if ref_w else "")
            ts_str = _find_timestamp_for_word(target_word_for_ts, hyp_idx, words_data)

            error_log.append({
                "timestamp":             ts_str,
                "word":                  word_display,
                "said_as":               said_as_display,
                "correct_ipa":           "",
                "error_type":            error_type,
                "severity":              sev if is_high_conf else "low",
                "category":              cat,
                "excluded_from_scoring": not is_high_conf
            })

    stutter_events = audio_data.get("stutter_events", [])
    for st in stutter_events:
        ts_sec = float(st.get("timestamp", 0))
        ts_str = f"{int(ts_sec // 60)}:{int(ts_sec % 60):02d}"
        st_type = str(st.get("type", "repetition")).lower()
        error_log.append({
            "timestamp":             ts_str,
            "word":                  st.get("word", ""),
            "said_as":               f"Stutter ({st_type.capitalize()})",
            "correct_ipa":           "",
            "error_type":            st_type,
            "severity":              "moderate" if st_type == "repetition" else "minor",
            "category":              "Fluency",
            "excluded_from_scoring": False
        })

    scored_errors = [e for e in error_log if not e.get("excluded_from_scoring", False)]
    scored_vocab_errors = [e for e in scored_errors if e.get("category") == "Vocabulary" and e.get("error_type") in ("substitution", "deletion")]
    scored_pronunciation_errors = [e for e in scored_errors if e.get("category") == "Pronunciation"]
    scored_mti_errors = [e for e in scored_errors if e.get("category") == "MTI"]

    error_words_list = [
        {"word": e["word"], "said_as": e["said_as"], "error_type": e["error_type"], "category": e["category"]}
        for e in scored_errors if e.get("error_type") in ("substitution", "deletion", "insertion", "mispronunciation")
    ]

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
            "mti":           {"score":80,"l1_interference":80,"retroflex":85,"vowel_shift":85},
            "relevancy":     {"score":80,"feedback":"Topic relevancy analysis unavailable — AI processing limit reached."}
        },
        "amcat_insights":[
            {"dimension":"Pronunciation Accuracy","score":pron,    "definition":"Measures the precision of individual sounds.","feedback":"Heuristic analysis: Pronunciation is consistent with your level."},
            {"dimension":"Fluency & Rhythm",       "score":fluency, "definition":"Smoothness of speech delivery.","feedback":f"Heuristic analysis: Speech rate was {wpm} WPM. Ideal range is 130–160 WPM."},
            {"dimension":"Oral Communication",     "score":metrics.get("overall_score",0),"definition":"Overall effectiveness of spoken communication.","feedback":"Successfully delivered a spoken sample. Upgrade for AI-detailed feedback."}
        ],
        "amcat_mti_deep_dive": {"detected_accent": "Heuristic Analysis Only", "patterns": []},
        "amcat_transcript":{
            "reference_text":topic_prompt or "Candidate spoke on a topic of their choice.",
            "user_text":transcription,"error_words":error_words_list,
            "stats":{
                "total_words":len(transcription.split()),
                "speech_rate_wpm":wpm,
                "ideal_wpm_range":"130-160",
                "total_sentences":max(len(_segment_into_sentences(transcription, audio_data.get("words_data", []))), 1),
                "avg_sentence_duration":round(audio_data.get("duration", 0) / max(len(_segment_into_sentences(transcription, audio_data.get("words_data", []))), 1), 1),
                "longest_pause":audio_data.get("longest_pause", 0),
                "filler_count":filler_count
            },
            "error_summary":{"mispronunciation":len(scored_pronunciation_errors),"vocabulary_errors":len(scored_vocab_errors),"stutters":audio_data.get("stutter_count", 0),"unnatural_pauses":timing_summary_count(audio_data.get("words_data", [])),"filler_words":filler_count,"mti_substitutions":len(scored_mti_errors)}
        },
        "amcat_error_log":error_log,"amcat_sentences":[],
        "amcat_summary":{"top_strengths":metrics.get("strengths",[]),"top_improvements":metrics.get("focus_areas",[]),"learning_resources":[{"area":"Pronunciation","items":[{"title":"BBC Learning English","type":"Web"}]},{"area":"Fluency","items":[{"title":"Shadowing Technique","type":"YouTube"}]}]},
        "practice_exercises":[],"improvement_plan":{},"next_topic_suggestion":"Public Speaking Basics",
        "api_error":True
    }

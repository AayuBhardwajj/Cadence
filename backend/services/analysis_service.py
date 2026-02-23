from google import genai
import os
import json
from typing import Dict, Any

def _get_gemini_model():
    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        return None
    return genai.Client(api_key=api_key)

async def deep_analyze_speech(transcription: str, metrics: Dict[str, Any], words_data: list = [], topic_id: str = "custom", topic_prompt: str = "") -> Dict[str, Any]:
    """
    Expert speech analysis using Gemini 1.5.
    Returns the rigorous AMCAT-style nested JSON schema.
    """
    if not transcription or transcription == "Could not analyze audio." or metrics.get("overall_score") == 0:
        print("Skipping deep analysis due to missing or failed audio transcription.")
        return {
            "amcat_metrics": {
                "pronunciation": { "score": 0, "consonant": 0, "vowel": 0, "stress": 0 },
                "fluency": { "score": 0, "rate": 0, "pause": 0, "fillers": 0 },
                "intonation": { "score": 0, "sentence": 0, "rise_fall": 0, "pitch": 0 },
                "clarity": { "score": 0, "end_consonants": 0, "enunciation": 0, "pace": 0 },
                "mti": { "score": 0, "l1_interference": 0, "retroflex": 0, "vowel_shift": 0 },
                "relevancy": { "score": 0, "feedback": "Topic relevancy could not be assessed as no audio was processed." }
            },
            "amcat_insights": [],
            "amcat_summary": {
                "top_strengths": ["System ready for analysis"],
                "top_improvements": ["Ensure ffmpeg is installed", "Check microphone permissions"],
                "learning_resources": []
            }
        }

    model = _get_gemini_model()

    # Truncate words_data if it's too massive, just to be safe, but typically it's fine for a 5 min speech
    words_json = json.dumps(words_data[:300]) 

    prompt = f"""
    You are an expert Speech-Language Pathologist and SHL/AMCAT Assessment Evaluator.
    Analyze the following speech transcription, phonetic word-timing data, and basic metrics from a candidate's reading assessment.
    
    Transcription: "{transcription}"
    Word Timing Data: {words_json}
    Basic Metrics: {json.dumps(metrics)}
    Topic ID: "{topic_id}"
    Original Topic Prompt given to user: "{topic_prompt}"
    
    You must return a rigorous, deep-analyzed JSON object exactly matching the following schema.
    Strictly avoid ANY mention of job roles; focus solely on linguistic, phonetic, and speech mechanics.
    All scores must be integers between 0 and 100. Calculate sub-dimensions thoughtfully based on the data.
    Critically: Analyze how well the user's transcription actually addressed the original "Original Topic Prompt". If they just said random things, give a low relevancy score.
    
    REQUIRED EXACT JSON SCHEMA:
    {{
        "amcat_metrics": {{
            "pronunciation": {{ "score": 0-100, "consonant": 0-100, "vowel": 0-100, "stress": 0-100 }},
            "fluency": {{ "score": 0-100, "rate": 0-100, "pause": 0-100, "fillers": 0-100 }},
            "intonation": {{ "score": 0-100, "sentence": 0-100, "rise_fall": 0-100, "pitch": 0-100 }},
            "clarity": {{ "score": 0-100, "end_consonants": 0-100, "enunciation": 0-100, "pace": 0-100 }},
            "mti": {{ "score": 0-100, "l1_interference": 0-100, "retroflex": 0-100, "vowel_shift": 0-100 }},
            "relevancy": {{ "score": 0-100, "feedback": "Detailed feedback on how well they answered the prompt or if they went off-topic" }}
        }},
        "amcat_insights": [
             // Exactly 5 objects here, one for each dimension above
            {{ "dimension": "Pronunciation Accuracy", "score": 0-100, "definition": "...", "feedback": "Must cite specific words from the transcript" }},
            {{ "dimension": "MTI / Accent Neutrality", "score": 0-100, "definition": "...", "feedback": "..." }},
            {{ "dimension": "Fluency & Rhythm", "score": 0-100, "definition": "...", "feedback": "..." }},
            {{ "dimension": "Intonation & Stress", "score": 0-100, "definition": "...", "feedback": "..." }},
            {{ "dimension": "Clarity & Articulation", "score": 0-100, "definition": "...", "feedback": "..." }}
        ],
        "amcat_mti_deep_dive": {{
            "detected_accent": "e.g., Punjabi-Influenced Hindi -> English",
            "patterns": [
                // 3 to 5 objects detailing specific phonetic shifts
                {{ "name": "e.g., 'th' -> 'd/t' substitution", "frequency": 0-100, "behaviors": ["bullet 1", "bullet 2"] }}
            ]
        }},
        "amcat_transcript": {{
            "reference_text": "Assuming a standard business reading passage, reconstruct what the likely reference text was based on the transcription.",
            "user_text": "The verbatim transcription.",
            "error_words": [
                // Array of words the user messed up. Severity can only be "minor", "moderate", or "major".
                {{ "word": "example", "severity": "moderate", "type": "Vowel shift" }}
            ],
            "stats": {{
                "total_words": int,
                "speech_rate_wpm": int,
                "ideal_wpm_range": "130-150",
                "total_sentences": int,
                "avg_sentence_duration": float,
                "longest_pause": float,
                "filler_count": int
            }},
            "error_summary": {{
                "mispronunciation": int, "stutters": int, "unnatural_pauses": int, "filler_words": int, "mti_substitutions": int
            }}
        }},
        "amcat_error_log": [
            // Exact tabular data mapping to specific words in the audio.
            {{ "timestamp": "MM:SS", "word": "word", "said_as": "wurd", "correct_ipa": "wɜːd", "error_type": "type", "severity": "minor|moderate|major", "category": "Pronunciation|Fluency|MTI|Grammar|Style" }}
        ],
        "amcat_sentences": [
            // Break the text down sentence by sentence.
            {{ "text": "Sentence 1.", "pronunciation_issues": "...", "fluency": "...", "mti_detected": "...", "rhythm": "...", "intonation": "..." }}
        ],
        "amcat_summary": {{
            "top_strengths": ["str1", "str2", "str3"],
            "top_improvements": ["imp1", "imp2", "imp3"],
            "learning_resources": [
                {{ "area": "Pronunciation", "items": [
                    {{ "title": "Resource Name", "type": "Free" }} // Type must be "Free", "Paid", "YouTube", or "Web"
                ]}}
            ]
        }}
    }}
    
    Ensure you ONLY output valid, stringified JSON meeting this exact schema. No markdown wrapping.
    """

    try:
        response = model.models.generate_content(
            model='gemini-2.5-flash',
            contents=prompt,
        )
        content = response.text.strip()
        if content.startswith("```json"):
            content = content[7:-3].strip()
        elif content.startswith("```"):
            content = content[3:-3].strip()
            
        return json.loads(content)
    except Exception as e:
        print(f"Error in deep speech analysis: {e}")
        # Return a basic fallback structure using existing metrics so report isn't empty
        return {
            "amcat_metrics": {
                "pronunciation": { "score": metrics["breakdown"]["pronunciation"], "consonant": metrics["breakdown"]["pronunciation"], "vowel": metrics["breakdown"]["pronunciation"], "stress": metrics["breakdown"]["pronunciation"] },
                "fluency": { "score": metrics["breakdown"]["fluency"], "rate": metrics["breakdown"]["wpm"], "pause": 100 - metrics["breakdown"]["fillers"], "fillers": 100 - metrics["breakdown"]["fillers"] },
                "intonation": { "score": metrics["breakdown"]["fluency"], "sentence": metrics["breakdown"]["fluency"], "rise_fall": metrics["breakdown"]["fluency"], "pitch": metrics["breakdown"]["fluency"] },
                "clarity": { "score": metrics["breakdown"]["clarity"], "end_consonants": metrics["breakdown"]["clarity"], "enunciation": metrics["breakdown"]["clarity"], "pace": metrics["breakdown"]["clarity"] },
                "mti": { "score": 70, "l1_interference": 70, "retroflex": 70, "vowel_shift": 70 }, # Est defaults
                "relevancy": { "score": 100, "feedback": "Detailed topic relevancy analysis unavailable due to API limits." }
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
            "api_error": True # Flag for internal tracking
        }

import google.generativeai as genai
import os
import json
from typing import Dict, Any

def _get_gemini_model():
    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        return None
    genai.configure(api_key=api_key)
    return genai.GenerativeModel('gemini-1.5-flash')

async def deep_analyze_speech(transcription: str, metrics: Dict[str, Any]) -> Dict[str, Any]:
    """
    Expert speech analysis using Gemini 1.5.
    Focuses exclusively on speech quality, clarity, and control.
    """
    model = _get_gemini_model()
    if not model:
        print("Gemini API key missing, skipping deep analysis.")
        return {}

    prompt = f"""
    You are an expert Speech-Language Pathologist and Communication Coach.
    Analyze the following speech transcription and metrics from a user's speaking assessment.
    
    Transcription: "{transcription}"
    Metrics: {json.dumps(metrics)}
    
    Provide a comprehensive evaluation focusing ONLY on speech delivery and quality. 
    Strictly avoid ANY mention of job roles, hiring, or career suitability.
    
    Return the analysis in JSON format with the following keys:
    1. "clarity_fluency": (string) Evaluation of how clear and smooth the speech is.
    2. "confidence_tone": (string) Analysis of confidence, tone, and modulation.
    3. "pronunciation_details": (dict) 
        - "mispronounced_words": (list of strings) Words the user likely mispronounced.
        - "struggled_sounds": (list of strings) Specific phonetic sounds or clusters they struggle with.
    4. "grammar_vocabulary": (string) Critique of sentence construction and word choice.
    5. "pacing_control": (string) Analysis of fillers, pauses, and consistency in speed.
    6. "action_plan": (list of dicts) 
        - "weakness": (string) A specific weak area.
        - "example": (string) An example from the transcription.
        - "tip": (string) An actionable improvement suggestion.

    Ensure language is simple, professional, and encouraging.
    """

    try:
        response = model.generate_content(prompt)
        # Handle potential markdown formatting in response
        content = response.text.strip()
        if content.startswith("```json"):
            content = content[7:-3].strip()
        elif content.startswith("```"):
            content = content[3:-3].strip()
            
        return json.loads(content)
    except Exception as e:
        print(f"Error in deep speech analysis: {e}")
        return {
            "error": "Detailed analysis currently unavailable.",
            "clarity_fluency": "Self-assessment recommended for flow and clarity.",
            "confidence_tone": "Analyze your recording for tone and modulation.",
            "pronunciation_details": {"mispronounced_words": [], "struggled_sounds": []},
            "grammar_vocabulary": "Review your transcription for sentence structure.",
            "pacing_control": "Monitor your use of fillers and pacing.",
            "action_plan": []
        }

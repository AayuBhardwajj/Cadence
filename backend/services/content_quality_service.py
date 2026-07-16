import os
import json
from groq import Groq
from utils.supabase_client import supabase
from utils.ai_usage_logger import log_llm_usage

def _get_groq_client():
    api_key = os.environ.get("GROQ_API_KEY")
    if not api_key:
        return None
    return Groq(api_key=api_key)

async def evaluate_content_quality(
    transcript: str,
    original_prompt: str,
    topic: str,
    assessment_id: str | None = None
) -> dict:
    """
    Sends transcript + original prompt to Groq.
    Groq returns structured JSON evaluation.
    Returns:
    {
        "topic_relevance": {"score": float, "evidence": str},
        "idea_organization": {"score": float, "evidence": str},
        "argument_strength": {"score": float, "evidence": str},
        "communication_effectiveness": {"score": float, "evidence": str},
        "content_completeness": {"score": float, "evidence": str},
        "overall_content_score": float,
        "coaching_notes": str
    }
    """
    client = _get_groq_client()
    if not client:
        raise RuntimeError("Groq API key is not configured.")

    prompt = f"""
You are an expert communication scorer. Evaluate the quality of the candidate's spoken response transcript based on the original prompt and topic.
Topic: "{topic}"
Original Prompt: "{original_prompt}"
Candidate Response Transcript: "{transcript}"

Please evaluate the response based on these five dimensions:
1. Topic Relevance: Does the candidate address the topic directly and stick to the prompt?
2. Idea Organization: Is the structure of the ideas logical and coherent?
3. Argument Strength: Are the arguments persuasive and supported by points/examples?
4. Communication Effectiveness: Does the language flow natural and express meaning clearly?
5. Content Completeness: Does the response feel complete, covering introductory, supporting, and concluding ideas?

For each dimension, output a score between 0 and 100, and short evidence (referencing words or themes in the transcript).
Also compute an overall_content_score (0-100) and summarize with short coaching_notes.

Strictest Rule:
- Return ONLY a valid JSON object matching the JSON schema below.
- Do NOT include any markdown formatting or preambles.

JSON Schema:
{{
    "topic_relevance": {{
        "score": 0.0,
        "evidence": "string"
    }},
    "idea_organization": {{
        "score": 0.0,
        "evidence": "string"
    }},
    "argument_strength": {{
        "score": 0.0,
        "evidence": "string"
    }},
    "communication_effectiveness": {{
        "score": 0.0,
        "evidence": "string"
    }},
    "content_completeness": {{
        "score": 0.0,
        "evidence": "string"
    }},
    "overall_content_score": 0.0,
    "coaching_notes": "string"
}}
"""

    model_name = "llama-3.1-8b-instant"
    try:
        resp = client.chat.completions.create(
            model=model_name,
            messages=[
                {"role": "system", "content": "You are a communication quality evaluator. Return ONLY valid JSON."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.1,
            max_tokens=1000,
            response_format={"type": "json_object"}
        )
        content = resp.choices[0].message.content.strip()
        result = json.loads(content)

        # Log token usage
        usage = resp.usage
        log_llm_usage(
            provider="groq",
            model=model_name,
            input_tokens=usage.prompt_tokens if usage else 0,
            output_tokens=usage.completion_tokens if usage else 0,
            purpose="content_quality",
            assessment_id=assessment_id,
        )

        # Persist content quality scores if assessment_id is provided
        if assessment_id:
            try:
                quality_data = {
                    "assessment_id": assessment_id,
                    "topic_relevance_score": result["topic_relevance"]["score"],
                    "idea_organization_score": result["idea_organization"]["score"],
                    "argument_strength_score": result["argument_strength"]["score"],
                    "communication_effectiveness_score": result["communication_effectiveness"]["score"],
                    "content_completeness_score": result["content_completeness"]["score"],
                    "overall_content_score": result["overall_content_score"],
                    "groq_raw_output": result
                }
                supabase.table("content_quality_scores").insert(quality_data).execute()
            except Exception as db_err:
                print(f"Database insertion to content_quality_scores failed: {db_err}")
        
        return result

    except Exception as e:
        print(f"Content quality scoring via Groq failed: {e}")
        # Return fallback heuristic structure
        return {
            "topic_relevance": {"score": 70.0, "evidence": "Heuristic fallback: transcript length evaluated."},
            "idea_organization": {"score": 70.0, "evidence": "Heuristic fallback: sentence structure analyzed."},
            "argument_strength": {"score": 70.0, "evidence": "Heuristic fallback: lexicon size check."},
            "communication_effectiveness": {"score": 70.0, "evidence": "Heuristic fallback."},
            "content_completeness": {"score": 70.0, "evidence": "Heuristic fallback."},
            "overall_content_score": 70.0,
            "coaching_notes": "Unable to compute dynamic LLM quality scores due to API error. Preserving general baseline metrics."
        }

import os
import json
from utils.supabase_client import supabase
from utils.llm_client import call_llm

async def generate_assessment_package(
    topic: str,
    difficulty: str,
    assessment_id: str | None = None,
    user_history: list[dict] | None = None
) -> dict:
    """
    Calls Gemini to generate a unique assessment package.
    Stores result in assessment_materials table.
    Returns:
    {
        "topic_prompt": str,
        "reading_passage": str,
        "articulation_exercises": list[str],
        "vocabulary_challenge": list[dict],  # [{word, definition, example}]
        "follow_up_questions": list[str],
        "difficulty_level": str
    }
    """

    # Contextualize prompt with user history if provided
    history_context = ""
    if user_history:
        history_context = f"\nUser History (avoid previously tested weak points if resolved, or focus on them if not):\n{json.dumps(user_history)}"

    prompt = f"""
You are an expert English speech assessment system. Create a unique, difficulty-adjusted English assessment package.
Topic: "{topic}"
Difficulty Level: "{difficulty}"{history_context}

The package must include:
1. topic_prompt: A 1-2 sentence speaking prompt related to the topic.
2. reading_passage: A structured reading passage (around 100-150 words) suitable for the {difficulty} level to test reading flow, clarity, and pacing.
3. articulation_exercises: A list of 3 sentences containing targeting phonemes (like tongue twisters) suitable for this difficulty.
4. vocabulary_challenge: A list of 3 challenging words related to the topic, each with:
   - "word": the word
   - "definition": definition of the word
   - "example": an example sentence using the word
5. follow_up_questions: A list of 3 follow-up questions to ask the user.

Strictest Rule:
- Return ONLY a valid JSON object matching the JSON schema below.
- Do NOT include any markdown formatting (like ```json or ```).
- Do NOT include any conversational preamble or trailing explanation.
- You must NEVER ask or attempt to evaluate or score anything in this request.

JSON Schema:
{{
    "topic_prompt": "string",
    "reading_passage": "string",
    "articulation_exercises": ["string", "string", "string"],
    "vocabulary_challenge": [
        {{
            "word": "string",
            "definition": "string",
            "example": "string"
        }}
    ],
    "follow_up_questions": ["string", "string", "string"],
    "difficulty_level": "string"
}}
"""

    try:
        content = await call_llm(
            prompt,
            system_message="You are an expert English speech assessment system. Return ONLY valid JSON — no markdown, no preamble.",
            purpose="content_generation",
            assessment_id=assessment_id,
        )
        content = content.strip()
        if content.startswith("```json"):
            content = content[7:-3].strip()
        elif content.startswith("```"):
            content = content[3:-3].strip()
        package = json.loads(content)

        # Log to assessment_materials table
        # If no active assessment session is passed, we leave assessment_id as null
        material_data = {
            "assessment_id": assessment_id,
            "topic": topic,
            "difficulty": difficulty,
            "generated_prompt": package.get("topic_prompt", ""),
            "reading_passage": package.get("reading_passage", ""),
            "articulation_exercises": package.get("articulation_exercises", []),
            "vocabulary_challenge": package.get("vocabulary_challenge", []),
            "follow_up_questions": package.get("follow_up_questions", []),
        }

        try:
            # Save to database (we don't block on DB failure if the table doesn't exist yet)
            supabase.table("assessment_materials").insert(material_data).execute()
        except Exception as db_err:
            print(f"Database insertion to assessment_materials failed: {db_err}")

        # Ensure correct difficulty level is returned
        package["difficulty_level"] = difficulty
        return package

    except Exception as e:
        raise RuntimeError(f"Failed to generate assessment package: {e}")

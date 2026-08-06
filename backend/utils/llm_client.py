import os
import logging
from groq import Groq
from google import genai
from utils.ai_usage_logger import log_llm_usage

logger = logging.getLogger(__name__)

TASK_CHAINS: dict[str, list[str]] = {
    "core_analysis": ["llama-3.3-70b-versatile", "gemini-2.0-flash"],
    "passage_generation": ["openai/gpt-oss-120b", "gemini-2.0-flash"],
    "content_generation": ["qwen/qwen3.6-27b", "gemini-2.0-flash"],
    "content_quality": ["openai/gpt-oss-safeguard-20b", "gemini-2.0-flash"],
}


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


async def call_llm(
    task: str,
    prompt: str,
    system_message: str = "Return ONLY valid JSON — no markdown, no preamble.",
    assessment_id: str | None = None,
    user_id: str | None = None,
    response_format_json: bool = True,
) -> str:
    """
    Task-routed LLM client with model fallback chains.
    """
    if task not in TASK_CHAINS:
        logger.warning(f"Unrecognized LLM task '{task}'. Falling back to 'core_analysis' chain.")
        chain = TASK_CHAINS["core_analysis"]
    else:
        chain = TASK_CHAINS[task]

    errors = []
    groq_client = _get_groq_client()
    gemini_client = _get_gemini_client()

    for model_id in chain:
        if model_id.startswith("gemini"):
            if not gemini_client:
                errors.append(f"gemini/{model_id}: client not initialized (missing API key)")
                continue
            try:
                resp = gemini_client.models.generate_content(
                    model=model_id,
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
                    model=model_id,
                    input_tokens=meta.prompt_token_count if meta else 0,
                    output_tokens=meta.candidates_token_count if meta else 0,
                    purpose=task,
                    assessment_id=assessment_id,
                    user_id=user_id,
                )
                return content
            except Exception as e:
                errors.append(f"gemini/{model_id}: {e}")
        else:
            if not groq_client:
                errors.append(f"groq/{model_id}: client not initialized (missing API key)")
                continue
            try:
                kwargs = {
                    "model": model_id,
                    "messages": [
                        {"role": "system", "content": system_message},
                        {"role": "user", "content": prompt},
                    ],
                    "temperature": 0.1,
                    "max_tokens": 3000,
                }
                if response_format_json:
                    kwargs["response_format"] = {"type": "json_object"}

                resp = groq_client.chat.completions.create(**kwargs)
                usage = resp.usage
                log_llm_usage(
                    provider="groq",
                    model=model_id,
                    input_tokens=usage.prompt_tokens if usage else 0,
                    output_tokens=usage.completion_tokens if usage else 0,
                    purpose=task,
                    assessment_id=assessment_id,
                    user_id=user_id,
                )
                return resp.choices[0].message.content
            except Exception as e:
                errors.append(f"groq/{model_id}: {e}")

    raise RuntimeError(f"All LLM providers for task '{task}' failed: {errors}")


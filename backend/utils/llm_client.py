import os
from groq import Groq
from google import genai
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


async def call_llm(
    prompt: str,
    system_message: str = "Return ONLY valid JSON — no markdown, no preamble.",
    purpose: str = "general",
    assessment_id: str | None = None,
    user_id: str | None = None,
) -> str:
    """
    Shared fallback chain used across services:
      1. Groq  llama-3.1-8b-instant  (fastest, json_object mode)
      2. Groq  gemma2-9b-it          (backup model)
      3. Gemini gemini-2.0-flash     (Google free tier)
    Raises RuntimeError if all fail so caller can use a heuristic fallback.

    `system_message` and `purpose` are caller-supplied so usage logs and prompts
    stay accurate per call-site (e.g. "analysis" vs "content_generation").
    """
    errors = []
    groq_client = _get_groq_client()
    if groq_client:
        for model_id in ("llama-3.1-8b-instant", "gemma2-9b-it"):
            try:
                resp = groq_client.chat.completions.create(
                    model=model_id,
                    messages=[
                        {"role": "system", "content": system_message},
                        {"role": "user", "content": prompt},
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
                    purpose=purpose,
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
                purpose=purpose,
                assessment_id=assessment_id,
                user_id=user_id,
            )
            return content
        except Exception as e:
            errors.append(f"gemini/gemini-2.0-flash: {e}")

    raise RuntimeError(f"All LLM providers failed: {errors}")

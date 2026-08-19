import os
import logging
from groq import Groq
from google import genai
from ml_shared.ai_usage_logger import log_llm_usage

logger = logging.getLogger(__name__)

# Two explicit stakes-tiers for LLM routing. See .ai/Decisions.md D9 for rationale.
TASK_CHAINS: dict[str, list[str]] = {
    "diagnostic_tier": ["openai/gpt-oss-120b", "gemini-3.6-flash"],
    "volume_tier": ["openai/gpt-oss-20b", "gemini-3.1-flash-lite"],
}

_DEFAULT_CHAIN = "volume_tier"


def _get_groq_client() -> Groq | None:
    api_key = os.environ.get("GROQ_API_KEY")
    if not api_key:
        return None
    return Groq(api_key=api_key)


def _get_gemini_client() -> genai.Client | None:
    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        return None
    return genai.Client(api_key=api_key)


async def call_llm(
    chain: str,
    prompt: str,
    system_message: str = "Return ONLY valid JSON — no markdown, no preamble.",
    assessment_id: str | None = None,
    user_id: str | None = None,
    response_format_json: bool = True,
) -> str:
    """
    Stakes-tiered LLM client with per-tier model fallback chains.

    Args:
        chain: Which tier to use. Must be one of:
            - "diagnostic_tier": Groq openai/gpt-oss-120b → Gemini gemini-3.6-flash
            - "volume_tier":     Groq openai/gpt-oss-20b  → Gemini gemini-3.1-flash-lite
        prompt: The user/task prompt to send.
        system_message: Overrides the default system instruction.
        assessment_id: Passed through to ai_usage_logs for cost attribution.
        user_id: Passed through to ai_usage_logs for cost attribution.
        response_format_json: If True, instructs Groq to return JSON mode output.

    Returns:
        The model's text response (stripped of markdown fences if present).

    Raises:
        RuntimeError: If every model in the chain fails.

    See .ai/Decisions.md D9 for the rationale behind the tier split.
    """
    if chain not in TASK_CHAINS:
        logger.warning(
            "Unrecognized LLM chain '%s'. Falling back to '%s'.", chain, _DEFAULT_CHAIN
        )
        chain = _DEFAULT_CHAIN

    errors: list[str] = []
    groq_client = _get_groq_client()
    gemini_client = _get_gemini_client()

    for model_id in TASK_CHAINS[chain]:
        if model_id.startswith("gemini"):
            # ── Gemini branch ──────────────────────────────────────────────────
            if not gemini_client:
                errors.append(f"gemini/{model_id}: client not initialized (missing GEMINI_API_KEY)")
                continue
            try:
                try:
                    resp = gemini_client.models.generate_content(
                        model=model_id,
                        contents=prompt,
                    )
                except Exception as gemini_err:
                    if "UNAVAILABLE" in str(gemini_err):
                        logger.warning(
                            "Gemini model '%s' returned 503 UNAVAILABLE (high demand). Retrying once...", model_id
                        )
                        resp = gemini_client.models.generate_content(
                            model=model_id,
                            contents=prompt,
                        )
                    else:
                        raise gemini_err

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
                    purpose=chain,
                    chain=chain,
                    assessment_id=assessment_id,
                    user_id=user_id,
                )
                return content
            except Exception as e:
                errors.append(f"gemini/{model_id}: {e}")
        else:
            # ── Groq branch ────────────────────────────────────────────────────
            if not groq_client:
                errors.append(f"groq/{model_id}: client not initialized (missing GROQ_API_KEY)")
                continue
            try:
                kwargs: dict = {
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

                try:
                    resp = groq_client.chat.completions.create(**kwargs)
                except Exception as groq_err:
                    if "json_validate_failed" in str(groq_err):
                        logger.warning(
                            "Groq model '%s' returned 400 json_validate_failed. Retrying call once...", model_id
                        )
                        resp = groq_client.chat.completions.create(**kwargs)
                    else:
                        raise groq_err

                usage = resp.usage
                log_llm_usage(
                    provider="groq",
                    model=model_id,
                    input_tokens=usage.prompt_tokens if usage else 0,
                    output_tokens=usage.completion_tokens if usage else 0,
                    purpose=chain,
                    chain=chain,
                    assessment_id=assessment_id,
                    user_id=user_id,
                )
                return resp.choices[0].message.content
            except Exception as e:
                errors.append(f"groq/{model_id}: {e}")

    raise RuntimeError(f"All LLM providers for chain '{chain}' failed: {errors}")

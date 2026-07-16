# backend/utils/ai_usage_logger.py
"""
Shared utility for logging AI provider token usage and estimated costs
to the ai_usage_logs table. All functions are fire-and-forget —
failures are logged but never raised to the caller.
"""

import logging
from utils.supabase_client import supabase

logger = logging.getLogger(__name__)

# Cost per 1M tokens in USD
COST_RATES = {
    "groq": {
        "llama-3.1-8b-instant": {"input": 0.05, "output": 0.08},
        "gemma2-9b-it":         {"input": 0.20, "output": 0.20},
        "llama-3.1-70b-versatile": {"input": 0.59, "output": 0.79},
    },
    "gemini": {
        "gemini-2.0-flash": {"input": 0.075, "output": 0.30},
    },
    "whisper": {
        "base": {"per_minute": 0.006},
        "small": {"per_minute": 0.006},
    }
}

def _estimate_cost(provider: str, model: str, input_tokens: int, output_tokens: int) -> float:
    rates = COST_RATES.get(provider, {}).get(model, {})
    if not rates:
        return 0.0
    input_cost = (input_tokens / 1_000_000) * rates.get("input", 0)
    output_cost = (output_tokens / 1_000_000) * rates.get("output", 0)
    return round(input_cost + output_cost, 6)

def _estimate_whisper_cost(duration_seconds: float, model: str = "base") -> float:
    rate = COST_RATES.get("whisper", {}).get(model, {}).get("per_minute", 0.006)
    return round((duration_seconds / 60) * rate, 6)

def log_llm_usage(
    provider: str,
    model: str,
    input_tokens: int,
    output_tokens: int,
    purpose: str,
    assessment_id: str | None = None,
    user_id: str | None = None,
) -> None:
    """
    Log token usage for a Groq or Gemini call.
    Fire-and-forget — never raises.
    """
    try:
        cost = _estimate_cost(provider, model, input_tokens, output_tokens)
        supabase.table("ai_usage_logs").insert({
            "user_id": user_id,
            "assessment_id": assessment_id,
            "provider": provider,
            "model": model,
            "input_tokens": input_tokens,
            "output_tokens": output_tokens,
            "estimated_cost_usd": cost,
            "purpose": purpose,
        }).execute()
    except Exception as e:
        logger.warning(f"ai_usage_logs insert failed (non-blocking): {e}")

def log_whisper_usage(
    duration_seconds: float,
    model: str = "base",
    assessment_id: str | None = None,
    user_id: str | None = None,
) -> None:
    """
    Log Whisper transcription usage based on audio duration.
    Fire-and-forget — never raises.
    """
    try:
        cost = _estimate_whisper_cost(duration_seconds, model)
        supabase.table("ai_usage_logs").insert({
            "user_id": user_id,
            "assessment_id": assessment_id,
            "provider": "whisper",
            "model": model,
            "input_tokens": None,
            "output_tokens": None,
            "estimated_cost_usd": cost,
            "purpose": "transcription",
        }).execute()
    except Exception as e:
        logger.warning(f"ai_usage_logs whisper insert failed (non-blocking): {e}")

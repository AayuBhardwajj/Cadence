"""
Recommendation and adaptive learning service for Cadence.
Ported to standalone ml-recommendation microservice.
"""

import os
import json
import logging
from datetime import datetime
from typing import Dict, List, Any, Optional
from ml_shared.llm_client import call_llm
from ml_shared.supabase_client import supabase

logger = logging.getLogger(__name__)


SCORE_DIMENSIONS = (
    "fluency",
    "confidence",
    "grammar",
    "pronunciation",
    "vocabulary",
    "clarity",
)


def _extract_score(scores: Dict[str, Any], dimension: str) -> float:
    """
    Extracts a numeric score for a given legitimate score dimension.
    Checks top-level keys first, then nested breakdown dictionary.
    Guarantees booleans (e.g. False) are not treated as numbers.
    """
    if not isinstance(scores, dict):
        return 100.0

    # 1. Direct top-level check (e.g., 'fluency' or 'fluency_score')
    for key in (dimension, f"{dimension}_score"):
        val = scores.get(key)
        if isinstance(val, (int, float)) and not isinstance(val, bool):
            return float(val)

    # 2. Nested breakdown dictionary check
    breakdown = scores.get("breakdown")
    if isinstance(breakdown, dict):
        for key in (dimension, f"{dimension}_score"):
            val = breakdown.get(key)
            if isinstance(val, (int, float)) and not isinstance(val, bool):
                return float(val)

    return 100.0


def rank_weakness_priorities(scores: Dict[str, Any]) -> List[str]:
    """
    Ranks ONLY the six legitimate score dimensions in ascending order of score
    (weakest dimension first). Returns an ordered list of the six dimension names.
    """
    rankable_metrics = {dim: _extract_score(scores, dim) for dim in SCORE_DIMENSIONS}
    sorted_weaknesses = sorted(
        rankable_metrics.items(),
        key=lambda item: item[1],
    )
    return [item[0] for item in sorted_weaknesses]


class RecommendationService:

    @staticmethod
    async def generate_speech_profile(
        user_id: str,
        assessment_id: str,
        scores: Dict[str, Any],
        metrics: Dict[str, Any],
    ) -> Dict[str, Any]:
        """
        Calculates weakness priorities from score breakdown and updates or creates
        the user's speech_profiles row.
        """
        weaknesses = rank_weakness_priorities(scores)

        filler_count = metrics.get('filler_word_count', metrics.get('filler_count', 0))
        identified_issues = {
            'pronunciation': metrics.get('phoneme_errors', metrics.get('pronunciation_errors', [])),
            'fluency':       [f"{filler_count} fillers"] if filler_count > 10 else [],
            'grammar':       metrics.get('grammar_errors', []),
            'vocabulary':    metrics.get('lexical_gaps', []),
        }

        overall = scores.get('overall_score', 50)
        learning_pace = 'fast' if overall > 80 else 'moderate' if overall > 50 else 'slow'

        profile_data = {
            "user_id": user_id,
            "created_from_assessment_id": assessment_id,
            "weakness_priority_1": weaknesses[0],
            "weakness_priority_2": weaknesses[1],
            "weakness_priority_3": weaknesses[2],
            "current_scores":      scores,
            "identified_issues":   identified_issues,
            "learning_pace":       learning_pace,
            "last_updated_at":     datetime.now().isoformat(),
        }

        existing = supabase.table('speech_profiles').select('id').eq('user_id', user_id).execute()
        if existing.data:
            res = supabase.table('speech_profiles').update(profile_data).eq('user_id', user_id).execute()
        else:
            res = supabase.table('speech_profiles').insert(profile_data).execute()

        return res.data[0] if res.data else profile_data

    @staticmethod
    async def update_profile_from_exercise(
        user_id: str,
        exercise_id: str,
        category: str,
        score: int,
        issues_resolved: List[str] = None,
    ) -> Dict[str, Any]:
        """
        Updates speech_profiles and inserts a user_exercise_history record.
        Computes score_delta internally based on performance.
        """
        if issues_resolved is None:
            issues_resolved = []

        # 1. Compute score delta internally (D14)
        score_delta = 5 if score > 80 else 2 if score > 60 else -1

        # 2. Update speech profile
        profile_res = supabase.table('speech_profiles').select('*').eq('user_id', user_id).execute()
        if profile_res.data:
            profile = profile_res.data[0]
            current_scores = profile.get('current_scores', {}) or {}
            identified_issues = profile.get('identified_issues', {}) or {}
            old_score = _extract_score(current_scores, category) if category in SCORE_DIMENSIONS else current_scores.get(category, 50)
            new_score = max(0, min(100, round(old_score + score_delta)))
            current_scores[category] = new_score

            if category in identified_issues:
                identified_issues[category] = [
                    i for i in identified_issues[category] if i not in issues_resolved
                ]

            weaknesses = rank_weakness_priorities(current_scores)

            update_data = {
                "current_scores": current_scores,
                "identified_issues": identified_issues,
                "weakness_priority_1": weaknesses[0] if len(weaknesses) > 0 else profile.get('weakness_priority_1'),
                "weakness_priority_2": weaknesses[1] if len(weaknesses) > 1 else profile.get('weakness_priority_2'),
                "weakness_priority_3": weaknesses[2] if len(weaknesses) > 2 else profile.get('weakness_priority_3'),
                "last_updated_at": datetime.now().isoformat(),
            }
            supabase.table('speech_profiles').update(update_data).eq('user_id', user_id).execute()

        # 3. Insert user exercise history record internally (D14)
        history_record = {
            "user_id": user_id,
            "recommendation_id": exercise_id,
            "score": score,
            "completed_at": datetime.now().isoformat(),
        }
        supabase.table('user_exercise_history').insert(history_record).execute()

        return {"status": "success", "message": "Profile updated based on performance"}

    @staticmethod
    async def generate_recommendations(
        user_id: str,
        pre_generated_exercises: Optional[List[Dict[str, Any]]] = None,
    ) -> List[Dict[str, Any]]:
        """
        Generates 3 prioritized exercise recommendations for the user based on active weaknesses.
        Deactivates previous active recommendations.
        """
        profile_res = (
            supabase.table('speech_profiles')
            .select('*')
            .eq('user_id', user_id)
            .order('last_updated_at', desc=True)
            .limit(1)
            .execute()
        )
        if not profile_res.data:
            return []

        profile = profile_res.data[0]
        weaknesses = [
            profile.get('weakness_priority_1', 'pronunciation'),
            profile.get('weakness_priority_2', 'fluency'),
            profile.get('weakness_priority_3', 'grammar'),
        ]

        recommendations = []
        pre_gen_idx = 0

        for i, category in enumerate(weaknesses):
            limit = 2 if i == 0 else 1
            templates_res = (
                supabase.table('exercise_templates')
                .select('*')
                .eq('skill_category', category)
                .eq('is_active', True)
                .limit(limit)
                .execute()
            )

            for template in templates_res.data:
                issues = (profile.get('identified_issues') or {}).get(category, [])

                if pre_generated_exercises and pre_gen_idx < len(pre_generated_exercises):
                    ex = pre_generated_exercises[pre_gen_idx]
                    dynamic_content = f"{ex.get('title', '')}: {ex.get('description', '')}"
                    pre_gen_idx += 1
                else:
                    dynamic_content = f"Practice your {category} skills."
                    if issues and not pre_generated_exercises:
                        try:
                            prompt = (
                                f"Generate a short, engaging 3-sentence speaking exercise for a user "
                                f"struggling with {category}. Specific issues: {', '.join(str(x) for x in issues)}. Style: Encouraging."
                            )
                            result = await call_llm(
                                chain="volume_tier",
                                prompt=prompt,
                                system_message="You are a speech coaching assistant. Return only plain text — no JSON, no markdown.",
                                user_id=user_id,
                                response_format_json=False,
                            )
                            if result:
                                dynamic_content = result
                        except Exception as e:
                            logger.warning(f"Recommendation LLM call failed: {e}")

                recommendations.append({
                    "user_id": user_id,
                    "template_id": template['id'],
                    "priority_rank": i + 1,
                    "personalization_context": {
                        "why": f"Based on your {category} progress.",
                        "focus_items": issues[:3] if isinstance(issues, list) else [],
                        "dynamic_prompt": dynamic_content,
                    },
                })

        # Deactivate previous active recommendations
        supabase.table('exercise_recommendations').update({"is_active": False}).eq('user_id', user_id).execute()

        # Insert new active recommendations
        if recommendations:
            res = supabase.table('exercise_recommendations').insert(recommendations).execute()
            return res.data
        return []

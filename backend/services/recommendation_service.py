from datetime import datetime
from typing import Dict, List, Any
from .supabase_client import supabase
import json

class RecommendationService:
    @staticmethod
    async def generate_speech_profile(user_id: str, assessment_id: str, scores: Dict[str, int], metrics: Dict[str, Any]):
        """
        Processes assessment results into a persistent speech profile.
        """
        # 1. Rank weaknesses by severity (0-100, lower score = higher severity)
        # Metrics to rank: pronunciation, fluency, grammar, vocabulary, clarity, confidence
        rankable_metrics = {
            'pronunciation': scores.get('pronunciation_score', 100),
            'fluency': scores.get('fluency_score', 100),
            'grammar': scores.get('grammar_score', 100),
            'vocabulary': scores.get('vocabulary_score', 100),
            'clarity': scores.get('clarity_score', 100),
            'confidence': scores.get('confidence_score', 100)
        }
        
        # Sort by score ascending (lowest score first)
        sorted_weaknesses = sorted(rankable_metrics.items(), key=lambda item: item[1])
        
        # 2. Extract Specific Identified Issues
        identified_issues = {
            'pronunciation': metrics.get('phoneme_errors', []),
            'fluency': [f"{metrics.get('filler_word_count', 0)} fillers"] if metrics.get('filler_word_count', 0) > 10 else [],
            'grammar': metrics.get('grammar_errors', []),
            'vocabulary': metrics.get('lexical_gaps', [])
        }
        
        # 3. Determine Learning Pace (based on overall score or history)
        overall = scores.get('overall_score', 50)
        learning_pace = 'fast' if overall > 80 else 'moderate' if overall > 50 else 'slow'
        
        profile_data = {
            "user_id": user_id,
            "created_from_assessment_id": assessment_id,
            "weakness_priority_1": sorted_weaknesses[0][0],
            "weakness_priority_2": sorted_weaknesses[1][0],
            "weakness_priority_3": sorted_weaknesses[2][0],
            "current_scores": scores,
            "identified_issues": identified_issues,
            "learning_pace": learning_pace,
            "last_updated_at": datetime.now().isoformat()
        }
        
        # Up-sert into speech_profiles (simplified check for versioning)
        res = supabase.table('speech_profiles').upsert(profile_data, on_conflict='user_id').execute()
        return res.data

    @staticmethod
    async def generate_recommendations(user_id: str):
        """
        Maps a user's speech profile weaknesses to exercise templates and creates personalized recommendations.
        """
        # 1. Fetch Latest Profile
        profile_res = supabase.table('speech_profiles').select('*').eq('user_id', user_id).order('last_updated_at', descending=True).limit(1).execute()
        if not profile_res.data:
            return []
            
        profile = profile_res.data[0]
        weaknesses = [
            profile['weakness_priority_1'],
            profile['weakness_priority_2'],
            profile['weakness_priority_3']
        ]
        
        # 2. Fetch Templates matching these categories
        # We'll fetch 2 for priority 1, 2 for priority 2, and 1 for priority 3 (total 5)
        recommendations = []
        
        for i, category in enumerate(weaknesses):
            limit = 3 if i == 0 else 2 if i == 1 else 1
            templates_res = supabase.table('exercise_templates').select('*').eq('skill_category', category).eq('is_active', True).limit(limit).execute()
            
            for template in templates_res.data:
                # 3. Personalize Context
                issues = profile['identified_issues'].get(category, [])
                reason = f"Based on your {category} performance."
                if issues:
                    reason = f"You had {len(issues)} specific issues in {category} during your assessment."
                
                recommendations.append({
                    "user_id": user_id,
                    "template_id": template['id'],
                    "priority_rank": i + 1,
                    "personalization_context": {
                        "why": reason,
                        "focus_items": issues[:3] # Limit to top 3 focus items
                    }
                })
        
        # 4. Clear old and Save New Recommendations
        supabase.table('exercise_recommendations').update({"is_active": False}).eq('user_id', user_id).execute()
        res = supabase.table('exercise_recommendations').insert(recommendations).execute()
        
        return res.data

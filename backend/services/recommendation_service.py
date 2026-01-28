import google.generativeai as genai
import os
from utils.supabase_client import supabase
from datetime import datetime
from typing import Dict, List, Any
import json

class RecommendationService:
    @staticmethod
    def _get_gemini_model():
        api_key = os.environ.get("GEMINI_API_KEY")
        if not api_key:
            return None
        genai.configure(api_key=api_key)
        return genai.GenerativeModel('gemini-1.5-flash')

    @staticmethod
    async def generate_speech_profile(user_id: str, assessment_id: str, scores: Dict[str, int], metrics: Dict[str, Any]):
        """
        Processes assessment results into a persistent speech profile.
        """
        # 1. Rank weaknesses by severity (0-100, lower score = higher severity)
        rankable_metrics = {
            'pronunciation': scores.get('pronunciation', scores.get('pronunciation_score', 100)),
            'fluency': scores.get('fluency', scores.get('fluency_score', 100)),
            'grammar': scores.get('grammar', scores.get('grammar_score', 100)),
            'vocabulary': scores.get('vocabulary', scores.get('vocabulary_score', 100)),
            'clarity': scores.get('clarity', scores.get('clarity_score', 100)),
            'confidence': scores.get('confidence', scores.get('confidence_score', 100))
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
        
        # 3. Determine Learning Pace
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
        
        res = supabase.table('speech_profiles').upsert(profile_data, on_conflict='user_id').execute()
        return res.data

    @staticmethod
    async def update_profile_from_exercise(user_id: str, category: str, score_delta: int, issues_resolved: List[str]):
        """
        AI Trains Itself: Incremental profile updates based on exercise performance.
        """
        profile_res = supabase.table('speech_profiles').select('*').eq('user_id', user_id).execute()
        if not profile_res.data:
            return None
            
        profile = profile_res.data[0]
        current_scores = profile.get('current_scores', {})
        identified_issues = profile.get('identified_issues', {})
        
        # Update scores (clamp between 0-100)
        old_score = current_scores.get(category, 50)
        new_score = max(0, min(100, old_score + score_delta))
        current_scores[category] = new_score
        
        # Remove resolved issues
        if category in identified_issues:
            remaining_issues = [i for i in identified_issues[category] if i not in issues_resolved]
            identified_issues[category] = remaining_issues
            
        # Re-calculate priorities
        sorted_weaknesses = sorted(current_scores.items(), key=lambda item: item[1] if isinstance(item[1], (int, float)) else 100)
        
        update_data = {
            "current_scores": current_scores,
            "identified_issues": identified_issues,
            "weakness_priority_1": sorted_weaknesses[0][0] if len(sorted_weaknesses) > 0 else profile['weakness_priority_1'],
            "weakness_priority_2": sorted_weaknesses[1][0] if len(sorted_weaknesses) > 1 else profile['weakness_priority_2'],
            "weakness_priority_3": sorted_weaknesses[2][0] if len(sorted_weaknesses) > 2 else profile['weakness_priority_3'],
            "last_updated_at": datetime.now().isoformat()
        }
        
        res = supabase.table('speech_profiles').update(update_data).eq('user_id', user_id).execute()
        return res.data

    @staticmethod
    async def generate_recommendations(user_id: str):
        """
        Maps a user's speech profile weaknesses to exercise templates and creates personalized recommendations.
        """
        profile_res = supabase.table('speech_profiles').select('*').eq('user_id', user_id).order('last_updated_at', descending=True).limit(1).execute()
        if not profile_res.data:
            return []
            
        profile = profile_res.data[0]
        weaknesses = [
            profile['weakness_priority_1'],
            profile['weakness_priority_2'],
            profile['weakness_priority_3']
        ]
        
        model = RecommendationService._get_gemini_model()
        recommendations = []
        
        for i, category in enumerate(weaknesses):
            limit = 2 if i == 0 else 1
            templates_res = supabase.table('exercise_templates').select('*').eq('skill_category', category).eq('is_active', True).limit(limit).execute()
            
            for template in templates_res.data:
                issues = profile['identified_issues'].get(category, [])
                
                # Dynamic Content Generation
                dynamic_content = f"Practice your {category} skills."
                if model and issues:
                    try:
                        prompt = f"Generate a short, engaging 3-sentence speaking exercise for a user struggling with {category}. Specific issues: {', '.join(issues)}. Style: Encouraging."
                        response = model.generate_content(prompt)
                        dynamic_content = response.text
                    except Exception as e:
                        print(f"Gemini error: {e}")

                recommendations.append({
                    "user_id": user_id,
                    "template_id": template['id'],
                    "priority_rank": i + 1,
                    "personalization_context": {
                        "why": f"Based on your {category} progress.",
                        "focus_items": issues[:3],
                        "dynamic_prompt": dynamic_content
                    }
                })
        
        supabase.table('exercise_recommendations').update({"is_active": False}).eq('user_id', user_id).execute()
        res = supabase.table('exercise_recommendations').insert(recommendations).execute()
        
        return res.data

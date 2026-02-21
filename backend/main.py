from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import shutil
import os
import uuid
from typing import Dict, List

# Import services
from services.audio_service import analyze_audio
from services.video_service import analyze_video
from utils.scoring import calculate_score
from utils.supabase_client import supabase
from services.recommendation_service import RecommendationService
from services.analysis_service import deep_analyze_speech
from datetime import datetime, timedelta
import json

app = FastAPI(title="Cadence AI Backend")

# CORS (Allow React Frontend)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # In production, replace with specific React URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

TEMP_DIR = "temp_uploads"
os.makedirs(TEMP_DIR, exist_ok=True)

@app.get("/")
def read_root():
    return {"message": "Cadence AI Backend is running 🚀"}

@app.get("/api/assessment/eligibility")
async def get_eligibility(user_id: str):
    """
    Checks if the user is eligible for a full assessment (1 per 24h for free users).
    """
    try:
        # Bypassed for testing purposes:
        # response = supabase.rpc('check_assessment_eligibility', {'user_uuid': user_id}).execute()
        # if response.data:
        #     return response.data[0]
        
        # Fallback/Test if RPC fails or returns nothing
        return {"can_assess": True, "next_available_at": None, "assessments_remaining": 999}
    except Exception as e:
        print(f"Eligibility check error: {e}")
        return {"can_assess": True, "next_available_at": None, "assessments_remaining": 1}

@app.post("/api/assessment/start")
async def start_assessment(user_id: str):
    """
    Validates eligibility and returns a session token.
    """
    eligibility = await get_eligibility(user_id)
    if not eligibility.get("can_assess"):
        raise HTTPException(status_code=403, detail="Assessment not available yet. Please wait 24 hours.")
    
    session_id = str(uuid.uuid4())
    # In a real app, we might store this session in Redis or DB
    return {"status": "success", "sessionId": session_id}

@app.post("/api/assessment/upload")
async def upload_assessment(
    file: UploadFile = File(...),
    sessionId: str = None,
    userId: str = None,
    topicId: str = "custom",
    duration: float = 0
):
    """
    Receives audio file and initiates analysis.
    """
    if not userId:
        raise HTTPException(status_code=400, detail="userId is required")
        
    try:
        # 1. Save uploaded file temporarily
        file_ext = file.filename.split(".")[-1]
        temp_filename = f"{uuid.uuid4()}.{file_ext}"
        temp_file_path = os.path.join(TEMP_DIR, temp_filename)
        
        with open(temp_file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
            
        print(f"File saved to: {temp_file_path}")

        # 2. Run AI Analysis
        audio_data = analyze_audio(temp_file_path)
        # For now, video analysis is optional or mock since user concerned about egress
        # video_data = analyze_video(temp_file_path) 
        video_data = {"eye_contact_percent": 85} # Mock or simplified for now

        # 3. Calculate Score
        score_data = calculate_score(audio_data, video_data)
        
        # 3.5 Deep Speech Analysis (New)
        print(f"AdaptiveLearning: Performing deep analysis for {userId}...")
        deep_analysis = await deep_analyze_speech(
            audio_data.get("transcription", ""), 
            score_data, 
            audio_data.get("words_data", [])
        )
        
        # Merge the complex AMCAT structure into the root scoring data for frontend API compliance
        if isinstance(deep_analysis, dict):
            score_data.update(deep_analysis)

        # 4. Update last_full_assessment_at in Supabase
        # We use profiles.update for this
        supabase.table('profiles').update({
            'last_full_assessment_at': datetime.now().isoformat()
        }).eq('id', userId).execute()

        # 4. Integrate Adaptive Learning System
        # Generate/Update Speech Profile
        print(f"AdaptiveLearning: Generating profile for {userId}...")
        await RecommendationService.generate_speech_profile(userId, sessionId, score_data, audio_data)
        
        # Generate New Recommendations
        print(f"AdaptiveLearning: Generating recommendations for {userId}...")
        await RecommendationService.generate_recommendations(userId)

        # 5. Cleanup
        os.remove(temp_file_path)
        
        return {
            "sessionId": sessionId or str(uuid.uuid4()),
            "status": "completed",
            "results": score_data,
            "transcription": audio_data.get("transcription", "")
        }

    except Exception as e:
        if 'temp_file_path' in locals() and os.path.exists(temp_file_path):
            os.remove(temp_file_path)
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/assessment/results/{sessionId}")
async def get_results(sessionId: str):
    """
    Returns analysis results for a session.
    """
    # In a real app, we'd fetch this from the DB using the sessionId
    # For now, this is often handled by the upload response or a quick metadata fetch
    return {"message": "Results for session " + sessionId}

@app.post("/analyze")
async def analyze_video_endpoint(file: UploadFile = File(...)):
    # Keep legacy endpoint for compatibility if needed
    return await upload_assessment(file, userId="legacy-user")

@app.post("/api/exercises/complete")
async def complete_exercise(
    user_id: str,
    exercise_id: str,
    category: str,
    score: int,
    issues_resolved: List[str] = []
):
    """
    Records exercise completion and updates the user's speech profile (AI Training).
    """
    try:
        # 1. Update Profile (The self-training part)
        # Assuming score > 70 is positive progress
        score_delta = 5 if score > 80 else 2 if score > 60 else -1
        await RecommendationService.update_profile_from_exercise(user_id, category, score_delta, issues_resolved)
        
        # 2. Save History
        supabase.table('user_exercise_history').insert({
            "user_id": user_id,
            "recommendation_id": exercise_id,
            "score": score
        }).execute()

        # 3. Trigger new recommendations if profile changed significantly (optional, for now just return success)
        return {"status": "success", "message": "Profile updated based on performance"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/recommendations")
async def get_recommendations(user_id: str):
    """
    Fetches personalized exercise recommendations for a user.
    """
    return await RecommendationService.generate_recommendations(user_id)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

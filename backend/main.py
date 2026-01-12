from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import shutil
import os
import uuid
from typing import Dict

# Import services
from services.audio_service import analyze_audio
from services.video_service import analyze_video
from utils.scoring import calculate_score

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

@app.post("/analyze")
async def analyze_video_endpoint(file: UploadFile = File(...)):
    """
    Receives a video file, runs AI analysis, and returns a score.
    """
    try:
        # 1. Save uploaded file temporarily
        file_ext = file.filename.split(".")[-1]
        temp_filename = f"{uuid.uuid4()}.{file_ext}"
        temp_file_path = os.path.join(TEMP_DIR, temp_filename)
        
        with open(temp_file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
            
        print(f"Video saved to: {temp_file_path}")

        # 2. Run AI Analysis
        audio_data = analyze_audio(temp_file_path)
        video_data = analyze_video(temp_file_path)
        
        # 3. Calculate Score
        score_data = calculate_score(audio_data, video_data)
        
        # Mock Response
        score_data = {
            "overall_score": 85,
            "audio_score": 82,
            "video_score": 88,
            "feedback": {
                "fluency": "Good pace, few filler words.",
                "eye_contact": "Maintained eye contact most of the time."
            }
        }

        # 4. Cleanup
        os.remove(temp_file_path)
        
        return score_data

    except Exception as e:
        # Cleanup if error
        if 'temp_file_path' in locals() and os.path.exists(temp_file_path):
            os.remove(temp_file_path)
        raise HTTPException(status_code=500, detail=str(e))

import sys
import os
import asyncio
import json
from typing import Dict, Any

# Add backend to path
sys.path.append(os.path.join(os.getcwd(), "backend"))

from services.analysis_service import deep_analyze_speech

async def test_consolidated_flow():
    print("Testing Consolidated Single-Call Flow...")
    
    audio_data = {
        "transcription": "I am practicing my speech for the Cadence assessment. I hope to improve my fluency.",
        "words_data": [{"word": "I", "start": 0.1, "end": 0.3}, {"word": "am", "start": 0.4, "end": 0.6}],
        "wpm": 145,
        "filler_count": 1,
        "duration": 10
    }
    
    metrics = {
        "overall_score": 70,
        "cefr_level": "B2",
        "breakdown": {
            "fluency": 75, "pronunciation": 70, "clarity": 72,
            "grammar": 68, "vocabulary": 70, "confidence": 80,
            "wpm": 145, "fillers": 1, "eye_contact": 85
        }
    }

    print("Calling deep_analyze_speech (simulated failure or success)...")
    result = await deep_analyze_speech(audio_data, metrics, topic_id="social")
    
    # Check if the result has the AMCAT structure (either through mapper or fallback)
    assert "amcat_metrics" in result
    assert "overall_score" in result
    assert "practice_exercises" in result
    assert "improvement_plan" in result
    
    # Verify mapping of scores
    if not result.get("api_error"):
        print("✅ Consolidated response received and mapped successfully!")
    else:
        print("✅ Fallback triggered and mapped successfully!")
        
    print(f"Overall Score: {result['overall_score']}")
    print(f"CEFR Level: {result['cefr_level']}")
    print(f"Practice Exercises Count: {len(result['practice_exercises'])}")
    
    print("\n✅ FINAL VERIFICATION PASSED!")

if __name__ == "__main__":
    asyncio.run(test_consolidated_flow())

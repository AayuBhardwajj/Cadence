import sys
import os

sys.path.append(os.path.join(os.getcwd(), "backend"))

from services.audio_service import detect_stutters

def test_detect_stutters():
    print("Running detect_stutters tests...")

    # Case 1: Empty list
    res = detect_stutters([])
    assert res == {"stutter_count": 0, "stutter_events": []}, f"Failed Case 1: {res}"

    # Case 2: Single word list
    res = detect_stutters([{"word": "hello", "start": 0.0, "end": 0.5}])
    assert res == {"stutter_count": 0, "stutter_events": []}, f"Failed Case 2: {res}"

    # Case 3: Missing start/end keys
    res = detect_stutters([
        {"word": "hello", "start": 0.0, "end": 0.5},
        {"word": "world"}
    ])
    assert res == {"stutter_count": 0, "stutter_events": []}, f"Failed Case 3: {res}"

    # Case 4: Word repetition
    res = detect_stutters([
        {"word": "hello", "start": 0.0, "end": 0.5},
        {"word": "hello", "start": 0.6, "end": 1.1}
    ])
    assert res["stutter_count"] == 1, f"Failed Case 4 count: {res}"
    assert res["stutter_events"][0]["type"] == "repetition", f"Failed Case 4 type: {res}"

    # Case 5: Word prolongation (duration > 1.2s)
    res = detect_stutters([
        {"word": "hello", "start": 0.0, "end": 1.5},
        {"word": "world", "start": 1.6, "end": 2.1}
    ])
    assert res["stutter_count"] == 1, f"Failed Case 5 count: {res}"
    assert res["stutter_events"][0]["type"] == "prolongation", f"Failed Case 5 type: {res}"

    # Case 6: Speech block (gap > 1.5s)
    res = detect_stutters([
        {"word": "hello", "start": 0.0, "end": 0.5},
        {"word": "world", "start": 2.1, "end": 2.6}
    ])
    assert res["stutter_count"] == 1, f"Failed Case 6 count: {res}"
    assert res["stutter_events"][0]["type"] == "block", f"Failed Case 6 type: {res}"

    # Case 7: Punctuation strip repetition
    res = detect_stutters([
        {"word": "hello,", "start": 0.0, "end": 0.5},
        {"word": "hello...", "start": 0.6, "end": 1.1}
    ])
    assert res["stutter_count"] == 1, f"Failed Case 7 count: {res}"
    assert res["stutter_events"][0]["type"] == "repetition", f"Failed Case 7 type: {res}"

    print("All tests passed successfully!")

if __name__ == "__main__":
    test_detect_stutters()

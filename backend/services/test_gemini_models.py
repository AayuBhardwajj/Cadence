import os
import sys
from dotenv import load_dotenv
from google import genai

load_dotenv('backend/.env')
load_dotenv('.env')

api_key = os.environ.get('GEMINI_API_KEY')
if not api_key:
    print("No GEMINI_API_KEY found.")
    sys.exit(1)

client = genai.Client(api_key=api_key)

models_to_test = [
    "gemini-3.6-flash",
    "gemini-3.5-flash-lite",
    "gemini-3.1-flash-lite",
    "gemini-3-flash-preview",
    # Additional models to check as reference
    "gemini-3.5-flash",
    "gemini-2.5-flash",
    "gemini-2.5-flash-lite",
    "gemini-2.0-flash",
    "gemini-2.0-flash-lite",
]

print("=== STARTING GEMINI MODEL LIVE GENERATE CALL TESTS ===")
prompt = "Say 'Hello Cadence' in 3 words."

results = {}

for model in models_to_test:
    print(f"\nTesting model: {model}...")
    try:
        resp = client.models.generate_content(
            model=model,
            contents=prompt,
        )
        text = resp.text.strip() if resp and resp.text else "<empty response>"
        print(f"SUCCESS [{model}]: {text}")
        results[model] = {"status": "SUCCESS", "response": text}
    except Exception as e:
        err_msg = str(e)
        print(f"FAILED [{model}]: {err_msg}")
        results[model] = {"status": "FAILED", "error": err_msg}

print("\n=== SUMMARY RESULTS ===")
for model, res in results.items():
    if res["status"] == "SUCCESS":
        print(f"✅ {model}: {res['response']}")
    else:
        print(f"❌ {model}: {res['error']}")

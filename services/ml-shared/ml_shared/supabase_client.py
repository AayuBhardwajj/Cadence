import os
from pathlib import Path
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv()
if not os.environ.get("SUPABASE_URL"):
    backend_env = Path(__file__).resolve().parents[3] / "backend" / ".env"
    if backend_env.exists():
        load_dotenv(backend_env, override=True)

url: str = os.environ.get("SUPABASE_URL", "")
key: str = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", os.environ.get("SUPABASE_ANON_KEY", ""))

if not url or not key:
    print("Warning: Supabase credentials not found in environment variables.")
    supabase = None
else:
    supabase: Client = create_client(url, key)

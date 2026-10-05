import os
from typing import Optional
from supabase import create_client, Client
from ml_shared.env import load_env
from ml_shared.env_guard import assert_env_safe

try:
    load_env()
except RuntimeError as err:
    # If CADENCE_ENV is not set or env file is missing, warn but allow import
    # so assert_env_safe can catch invalid calls or test setups
    pass

url: str = os.environ.get("SUPABASE_URL", "")
key: str = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", os.environ.get("SUPABASE_ANON_KEY", ""))

if not url or not key:
    print("Warning: Supabase credentials not found in environment variables.")
    supabase: Optional[Client] = None
else:
    assert_env_safe(url)
    supabase: Optional[Client] = create_client(url, key)

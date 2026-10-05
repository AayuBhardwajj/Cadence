"""Tests for ml_shared.env_guard — per DECISIONS.md D26.

Cases:
1. CADENCE_ENV unset → RuntimeError from assert_env_safe
2. CADENCE_ENV invalid → RuntimeError from assert_env_safe
3. CADENCE_ENV=dev + local supabase URL → OK (no exception)
4. CADENCE_ENV=dev + fake non-local https URL → RuntimeError (never connects)
5. CADENCE_ENV=prod without CADENCE_ALLOW_PROD → RuntimeError
6. CADENCE_ENV=prod with CADENCE_ALLOW_PROD=1 → OK
7. require_dev_only() under CADENCE_ENV=prod → RuntimeError
"""

import os
import pytest
from unittest.mock import patch


def _env(**overrides):
    """Return an environment dict with CADENCE_ENV and extra overrides."""
    return overrides


# ---------------------------------------------------------------------------
# 1. CADENCE_ENV unset
# ---------------------------------------------------------------------------
def test_unset_env_raises():
    env = {k: v for k, v in os.environ.items() if k not in {"CADENCE_ENV", "CADENCE_ALLOW_PROD"}}
    with patch.dict(os.environ, env, clear=True):
        from ml_shared.env_guard import assert_env_safe
        with pytest.raises(RuntimeError, match="CADENCE_ENV missing or invalid"):
            assert_env_safe("http://127.0.0.1:54321")


# ---------------------------------------------------------------------------
# 2. CADENCE_ENV invalid value
# ---------------------------------------------------------------------------
def test_invalid_env_raises():
    with patch.dict(os.environ, {"CADENCE_ENV": "staging"}, clear=False):
        from ml_shared.env_guard import assert_env_safe
        with pytest.raises(RuntimeError, match="CADENCE_ENV missing or invalid"):
            assert_env_safe("http://127.0.0.1:54321")


# ---------------------------------------------------------------------------
# 3. CADENCE_ENV=dev + local supabase URL → OK
# ---------------------------------------------------------------------------
@pytest.mark.parametrize("url", [
    "http://127.0.0.1:54321",
    "http://localhost:54321",
    "http://[::1]:54321",
    "http://host.docker.internal:54321",
])
def test_dev_local_url_ok(url):
    with patch.dict(os.environ, {"CADENCE_ENV": "dev"}, clear=False):
        from ml_shared.env_guard import assert_env_safe
        # Should not raise
        assert_env_safe(url)


# ---------------------------------------------------------------------------
# 4. CADENCE_ENV=dev + non-local https URL → refused without network call
# ---------------------------------------------------------------------------
def test_dev_nonlocal_url_refused():
    with patch.dict(os.environ, {"CADENCE_ENV": "dev"}, clear=False):
        from ml_shared.env_guard import assert_env_safe
        with pytest.raises(RuntimeError, match="Refusing to connect"):
            # This must raise before any network attempt
            assert_env_safe("https://fakefake.supabase.co")


# ---------------------------------------------------------------------------
# 5. CADENCE_ENV=prod without CADENCE_ALLOW_PROD → refused
# ---------------------------------------------------------------------------
def test_prod_without_allow_refused():
    env = {k: v for k, v in os.environ.items() if k != "CADENCE_ALLOW_PROD"}
    env["CADENCE_ENV"] = "prod"
    with patch.dict(os.environ, env, clear=True):
        from ml_shared.env_guard import assert_env_safe
        with pytest.raises(RuntimeError, match="CADENCE_ALLOW_PROD"):
            assert_env_safe("https://real.supabase.co")


# ---------------------------------------------------------------------------
# 6. CADENCE_ENV=prod with CADENCE_ALLOW_PROD=1 → OK (no host check for prod)
# ---------------------------------------------------------------------------
def test_prod_with_allow_ok():
    with patch.dict(os.environ, {"CADENCE_ENV": "prod", "CADENCE_ALLOW_PROD": "1"}, clear=False):
        from ml_shared.env_guard import assert_env_safe
        # Should not raise — prod only checks CADENCE_ALLOW_PROD, not host
        assert_env_safe("https://real.supabase.co")


# ---------------------------------------------------------------------------
# 7. require_dev_only() under prod → refused
# ---------------------------------------------------------------------------
def test_require_dev_only_under_prod():
    with patch.dict(os.environ, {"CADENCE_ENV": "prod"}, clear=False):
        from ml_shared.env_guard import require_dev_only
        with pytest.raises(RuntimeError, match="Destructive operation permitted ONLY in CADENCE_ENV=dev"):
            require_dev_only()


# ---------------------------------------------------------------------------
# Bonus: require_dev_only() under dev → OK
# ---------------------------------------------------------------------------
def test_require_dev_only_under_dev():
    with patch.dict(os.environ, {"CADENCE_ENV": "dev"}, clear=False):
        from ml_shared.env_guard import require_dev_only
        require_dev_only()  # Should not raise

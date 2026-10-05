"""Environment safety guard for Cadence services and scripts.

Per DECISIONS.md D26:
Guards against accidental network connections to production or non-local hosts.
"""

import os
import urllib.parse
from typing import Optional

ALLOWED_LOCAL_HOSTS = {"localhost", "127.0.0.1", "::1", "host.docker.internal"}
VALID_ENVS = {"dev", "prod"}


def _extract_host(url_or_host: str) -> str:
    """Extract and normalize host from a URL or host:port string."""
    if not url_or_host:
        return ""
    clean = url_or_host.strip().strip("[]").lower()
    if clean in ALLOWED_LOCAL_HOSTS:
        return clean
    if "://" not in url_or_host:
        if ":" in url_or_host and not url_or_host.startswith("["):
            parsed = urllib.parse.urlparse(f"//[{url_or_host}]")
        else:
            parsed = urllib.parse.urlparse(f"//{url_or_host}")
    else:
        parsed = urllib.parse.urlparse(url_or_host)
    host = parsed.hostname or ""
    return host.strip("[]").lower()


def assert_env_safe(supabase_url: Optional[str] = None, db_host: Optional[str] = None) -> None:
    """Assert that the environment and target connection parameters are safe.

    Rules:
    - CADENCE_ENV missing or not in {dev, prod} -> RuntimeError.
    - dev -> host of supabase_url (and db_host if given) must be in
      {localhost, 127.0.0.1, ::1, host.docker.internal} else RuntimeError.
    - prod -> CADENCE_ALLOW_PROD must be '1' else RuntimeError.

    Args:
        supabase_url: The Supabase API/Storage URL to inspect.
        db_host: Optional database host to inspect.

    Raises:
        RuntimeError: If any safety condition is violated.
    """
    cadence_env = os.environ.get("CADENCE_ENV")
    if not cadence_env or cadence_env not in VALID_ENVS:
        raise RuntimeError(
            f"CADENCE_ENV missing or invalid: {repr(cadence_env)}. Must be 'dev' or 'prod'."
        )

    if cadence_env == "dev":
        if supabase_url is not None:
            host = _extract_host(supabase_url)
            if not host or host not in ALLOWED_LOCAL_HOSTS:
                raise RuntimeError(
                    f"Refusing to connect: Supabase host {repr(host)} is not local in dev. "
                    f"Allowed hosts: {sorted(ALLOWED_LOCAL_HOSTS)}."
                )

        if db_host is not None:
            host = _extract_host(db_host)
            if not host or host not in ALLOWED_LOCAL_HOSTS:
                raise RuntimeError(
                    f"Refusing to connect: Database host {repr(host)} is not local in dev. "
                    f"Allowed hosts: {sorted(ALLOWED_LOCAL_HOSTS)}."
                )

    elif cadence_env == "prod":
        if os.environ.get("CADENCE_ALLOW_PROD") != "1":
            raise RuntimeError(
                "CADENCE_ENV is 'prod' but CADENCE_ALLOW_PROD is not set to '1'. "
                "Refusing to proceed against production environment."
            )


def require_dev_only(script_name: str | None = None) -> None:
    """Assert that the current environment is exclusively 'dev'.

    Intended for destructive scripts that insert, update, or delete test data.

    Raises:
        RuntimeError: If CADENCE_ENV is not 'dev'.
    """
    cadence_env = os.environ.get("CADENCE_ENV")
    if cadence_env != "dev":
        target = f" in {script_name}" if script_name else ""
        raise RuntimeError(
            f"Destructive operation{target} permitted ONLY in CADENCE_ENV=dev "
            f"(current value: {repr(cadence_env)}). Refusing to proceed."
        )

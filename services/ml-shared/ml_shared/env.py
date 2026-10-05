"""Environment loader for Cadence ML services and Python tooling.

Per DECISIONS.md D26:
Loads ONLY `<repo-root>/env/<CADENCE_ENV>.env` with override=False.
CADENCE_ENV must be set to 'dev' or 'prod'.
"""

import os
from pathlib import Path
from dotenv import load_dotenv

VALID_ENVS = {"dev", "prod"}


def load_env() -> Path:
    """Load the environment file for the active CADENCE_ENV.

    Returns:
        Path to the loaded environment file.

    Raises:
        RuntimeError: If CADENCE_ENV is unset/invalid or if the env file does not exist.
    """
    cadence_env = os.environ.get("CADENCE_ENV")
    if not cadence_env or cadence_env not in VALID_ENVS:
        raise RuntimeError(
            f"CADENCE_ENV must be set to 'dev' or 'prod' (current value: {repr(cadence_env)})."
        )

    # Resolve repo root using parents[3] from this file:
    # __file__ = <repo-root>/services/ml-shared/ml_shared/env.py
    # parents[0] = ml_shared, parents[1] = ml-shared, parents[2] = services, parents[3] = <repo-root>
    repo_root = Path(__file__).resolve().parents[3]
    env_file = repo_root / "env" / f"{cadence_env}.env"

    if not env_file.is_file():
        raise RuntimeError(
            f"Environment file not found: {env_file}. "
            f"Ensure env/{cadence_env}.env exists before running."
        )

    load_dotenv(dotenv_path=env_file, override=False)
    return env_file

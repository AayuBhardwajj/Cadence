#!/usr/bin/env bash
# flyway-dev.sh — Run Flyway commands against local Supabase CLI dev stack
#
# Reads connection parameters directly into memory from `supabase status -o env`
# or active environment variables (e.g. from env/dev.env).
# Secrets (passwords, JWTs) are never written to disk or echoed.
#
# Usage:
#   ./infrastructure/dev/flyway-dev.sh [goal]
# Examples:
#   ./infrastructure/dev/flyway-dev.sh migrate
#   ./infrastructure/dev/flyway-dev.sh validate
#   ./infrastructure/dev/flyway-dev.sh info

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
MIGRATIONS_DIR="${REPO_ROOT}/infrastructure/migrations"

GOAL="${1:-info}"

# Verify prerequisites
if ! command -v mvn >/dev/null 2>&1; then
  echo "ERROR: 'mvn' (Maven) is not found on PATH." >&2
  exit 1
fi

if ! command -v supabase >/dev/null 2>&1; then
  echo "ERROR: 'supabase' CLI is not found on PATH." >&2
  exit 1
fi

# Verify local Supabase stack is running
if ! (cd "${REPO_ROOT}" && supabase status >/dev/null 2>&1); then
  echo "ERROR: Supabase local dev stack is not running." >&2
  echo "Start the stack from the repository root: supabase start" >&2
  exit 1
fi

# Extract raw DB_URL: prefer environment DB_URL if set, else read from `supabase status -o env`
RAW_DB_URL="${DB_URL:-}"
if [ -z "${RAW_DB_URL}" ]; then
  RAW_DB_URL="$((cd "${REPO_ROOT}" && supabase status -o env 2>/dev/null) \
    | grep '^DB_URL=' \
    | sed -E 's/^DB_URL="?([^"]*)"?$/\1/')"
fi

if [ -z "${RAW_DB_URL}" ]; then
  echo "ERROR: Could not obtain DB_URL from environment or 'supabase status -o env'." >&2
  exit 1
fi

# Parse connection parts in memory using python3 via environment variable (no shell interpolation)
_parsed="$(DB_URL_INPUT="${RAW_DB_URL}" python3 - <<'PYEOF'
import os, sys, urllib.parse
raw = os.environ.get("DB_URL_INPUT", "")
u = urllib.parse.urlparse(raw)
host = u.hostname or '127.0.0.1'
port = u.port or 54322
path = u.path or '/postgres'
user = u.username or 'postgres'
pwd  = u.password or ''
print(f"FLYWAY_USER={user}")
print(f"FLYWAY_PASSWORD={pwd}")
print(f"FLYWAY_URL=jdbc:postgresql://{host}:{port}{path}")
PYEOF
)"

FLYWAY_USER="$(echo "${_parsed}" | grep '^FLYWAY_USER=' | cut -d= -f2-)"
FLYWAY_PASSWORD="$(echo "${_parsed}" | grep '^FLYWAY_PASSWORD=' | cut -d= -f2-)"
FLYWAY_URL="$(echo "${_parsed}" | grep '^FLYWAY_URL=' | cut -d= -f2-)"
unset _parsed RAW_DB_URL

if [ -z "${FLYWAY_URL}" ] || [ -z "${FLYWAY_USER}" ]; then
  echo "ERROR: Failed to parse Flyway connection parameters." >&2
  exit 1
fi

export FLYWAY_URL FLYWAY_USER FLYWAY_PASSWORD

# If goal is migrate, apply bootstrap default privileges before running migrations
if [ "${GOAL}" = "migrate" ]; then
  PROJECT_ID="$(grep -E '^[[:space:]]*project_id[[:space:]]*=' "${REPO_ROOT}/supabase/config.toml" 2>/dev/null | sed -E 's/.*=[[:space:]]*"([^"]+)".*/\1/' || true)"
  if [ -z "${PROJECT_ID}" ]; then
    PROJECT_ID="cadence-dev"
  fi
  DB_CONTAINER="supabase_db_${PROJECT_ID}"
  BOOTSTRAP_SQL="${REPO_ROOT}/infrastructure/dev/bootstrap/00_default_privileges.sql"

  if [ -f "${BOOTSTRAP_SQL}" ]; then
    echo "Applying bootstrap default privileges via ${DB_CONTAINER}..."
    if ! docker exec -i "${DB_CONTAINER}" psql -U postgres -d postgres < "${BOOTSTRAP_SQL}" >/dev/null; then
      echo "ERROR: Failed to apply bootstrap default privileges via ${DB_CONTAINER}." >&2
      exit 1
    fi
  fi
fi

echo "Running Flyway ${GOAL} against local Supabase dev stack..."
cd "${MIGRATIONS_DIR}"
if ! mvn -B -P dev "flyway:${GOAL}"; then
  echo "ERROR: Flyway ${GOAL} failed." >&2
  exit 1
fi

if [ "${GOAL}" = "migrate" ]; then
  echo "Flyway migrate completed successfully."
  echo "Note: The schema history table is located at 'flyway.flyway_schema_history'."
fi

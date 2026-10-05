#!/usr/bin/env bash
# make-env.sh — Generate local development environment files from Supabase local stack
#
# Generates:
#   1. env/dev.env (CADENCE_ENV=dev environment variables)
#   2. infrastructure/.env (RabbitMQ credentials with random password)
#   3. .env.development.local (Vite frontend local configuration)
#
# Usage:
#   ./infrastructure/dev/make-env.sh [--force]

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"

FORCE=0
for arg in "$@"; do
  if [ "$arg" = "--force" ]; then
    FORCE=1
  fi
done

TARGET_DEV_ENV="${REPO_ROOT}/env/dev.env"
TARGET_INFRA_ENV="${REPO_ROOT}/infrastructure/.env"
TARGET_VITE_LOCAL="${REPO_ROOT}/.env.development.local"

# Check if target files exist
if [ "${FORCE}" -eq 0 ]; then
  EXISTING=""
  if [ -f "${TARGET_DEV_ENV}" ]; then EXISTING="${EXISTING} ${TARGET_DEV_ENV}"; fi
  if [ -f "${TARGET_INFRA_ENV}" ]; then EXISTING="${EXISTING} ${TARGET_INFRA_ENV}"; fi
  if [ -f "${TARGET_VITE_LOCAL}" ]; then EXISTING="${EXISTING} ${TARGET_VITE_LOCAL}"; fi

  if [ -n "${EXISTING}" ]; then
    echo "ERROR: Target files already exist:${EXISTING}" >&2
    echo "Use --force to overwrite." >&2
    exit 1
  fi
fi

# Check Supabase CLI and local status
if ! command -v supabase >/dev/null 2>&1; then
  echo "ERROR: 'supabase' CLI not found on PATH." >&2
  exit 1
fi

if ! (cd "${REPO_ROOT}" && supabase status >/dev/null 2>&1); then
  echo "ERROR: Supabase local dev stack is not running." >&2
  echo "Start the stack from the repository root: supabase start" >&2
  exit 1
fi

# Read supabase status into memory
STATUS_RAW="$(cd "${REPO_ROOT}" && supabase status -o env 2>/dev/null)"
if [ -z "${STATUS_RAW}" ]; then
  echo "ERROR: Unable to capture output from 'supabase status -o env'." >&2
  exit 1
fi

# Generate random RabbitMQ password in memory
RABBITMQ_PASS="$(python3 -c 'import secrets; print(secrets.token_hex(16))')"
RABBITMQ_USER="cadence"

# Parse Supabase environment values and write files via python in memory
STATUS_RAW_ENV="${STATUS_RAW}" \
RABBIT_USER="${RABBITMQ_USER}" \
RABBIT_PW="${RABBITMQ_PASS}" \
OUT_DEV="${TARGET_DEV_ENV}" \
OUT_INFRA="${TARGET_INFRA_ENV}" \
OUT_VITE="${TARGET_VITE_LOCAL}" \
python3 - <<'PYEOF'
import os
import sys
import urllib.parse
from pathlib import Path

raw = os.environ.get("STATUS_RAW_ENV", "")
rabbit_user = os.environ.get("RABBIT_USER", "cadence")
rabbit_pw = os.environ.get("RABBIT_PW", "")

out_dev = Path(os.environ["OUT_DEV"])
out_infra = Path(os.environ["OUT_INFRA"])
out_vite = Path(os.environ["OUT_VITE"])

env_vars = {}
for line in raw.splitlines():
    line = line.strip()
    if not line or line.startswith("#") or "=" not in line:
        continue
    k, v = line.split("=", 1)
    k = k.strip()
    v = v.strip().strip('"').strip("'")
    env_vars[k] = v

api_url = env_vars.get("API_URL", "http://127.0.0.1:54321")
anon_key = env_vars.get("ANON_KEY", "")
service_key = env_vars.get("SERVICE_ROLE_KEY", "")
jwt_secret = env_vars.get("JWT_SECRET", "")
db_url = env_vars.get("DB_URL", "postgresql://postgres:postgres@127.0.0.1:54322/postgres")

# Parse DB user and password from db_url
u = urllib.parse.urlparse(db_url)
db_user = u.username or "postgres"
db_password = u.password or "postgres"

# 1. Write env/dev.env
out_dev.parent.mkdir(parents=True, exist_ok=True)
dev_content = f"""# Cadence Development Environment Variables
CADENCE_ENV=dev
SUPABASE_URL={api_url}
SUPABASE_ANON_KEY={anon_key}
SUPABASE_SERVICE_ROLE_KEY={service_key}
SUPABASE_JWT_SECRET={jwt_secret}
DB_URL={db_url}
DB_USER={db_user}
DB_PASSWORD={db_password}
RABBITMQ_HOST=localhost
RABBITMQ_PORT=5672
RABBITMQ_USERNAME={rabbit_user}
RABBITMQ_PASSWORD={rabbit_pw}
REDIS_HOST=localhost
REDIS_PORT=6379
# LLM API keys (leave blank in dev or populate locally; never commit)
GROQ_API_KEY=
GEMINI_API_KEY=
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:5174
STORAGE_BUCKET_NAME=assessment-recordings
"""
out_dev.write_text(dev_content)

# 2. Write infrastructure/.env
out_infra.parent.mkdir(parents=True, exist_ok=True)
infra_content = f"""# RabbitMQ credentials generated for local dev
RABBITMQ_DEFAULT_USER={rabbit_user}
RABBITMQ_DEFAULT_PASS={rabbit_pw}
"""
out_infra.write_text(infra_content)

# 3. Write .env.development.local
out_vite.parent.mkdir(parents=True, exist_ok=True)
vite_content = f"""# Frontend local overrides for Supabase and microservices
VITE_SUPABASE_URL={api_url}
VITE_SUPABASE_ANON_KEY={anon_key}
VITE_API_URL=http://localhost:8000
VITE_CONTENT_SERVICE_URL=http://localhost:8084
VITE_SESSION_SERVICE_URL=http://localhost:8082
VITE_REPORT_SERVICE_URL=http://localhost:8083
VITE_PRACTICE_GAME_SERVICE_URL=http://localhost:8085
"""
out_vite.write_text(vite_content)
PYEOF

unset STATUS_RAW RABBITMQ_PASS

echo "Successfully generated development environment files:"
echo "  - ${TARGET_DEV_ENV}"
echo "  - ${TARGET_INFRA_ENV}"
echo "  - ${TARGET_VITE_LOCAL}"

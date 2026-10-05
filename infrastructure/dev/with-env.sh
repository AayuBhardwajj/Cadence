#!/usr/bin/env bash
# with-env.sh — Run commands with dev or prod environment loaded
#
# Usage:
#   ./infrastructure/dev/with-env.sh <dev|prod> -- <command...>

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"

if [ $# -lt 3 ]; then
  echo "Usage: $0 <dev|prod> -- <command...>" >&2
  exit 1
fi

TARGET_ENV="$1"
shift

if [ "${TARGET_ENV}" != "dev" ] && [ "${TARGET_ENV}" != "prod" ]; then
  echo "ERROR: Invalid environment '${TARGET_ENV}'. Must be 'dev' or 'prod'." >&2
  exit 1
fi

DELIM="$1"
shift

if [ "${DELIM}" != "--" ]; then
  echo "ERROR: Missing '--' separator after environment name." >&2
  echo "Usage: $0 <dev|prod> -- <command...>" >&2
  exit 1
fi

if [ $# -eq 0 ]; then
  echo "ERROR: No command specified." >&2
  exit 1
fi

ENV_FILE="${REPO_ROOT}/env/${TARGET_ENV}.env"

if [ ! -f "${ENV_FILE}" ]; then
  echo "ERROR: Environment file not found: ${ENV_FILE}" >&2
  if [ "${TARGET_ENV}" = "dev" ]; then
    echo "Run ./infrastructure/dev/make-env.sh to generate dev environment files." >&2
  fi
  exit 1
fi

if [ "${TARGET_ENV}" = "prod" ]; then
  if [ "${CADENCE_ALLOW_PROD:-0}" != "1" ]; then
    echo "ERROR: Refusing to run in prod without CADENCE_ALLOW_PROD=1." >&2
    exit 1
  fi

  read -r -p "Type 'prod' to confirm execution against PRODUCTION: " CONFIRMATION
  if [ "${CONFIRMATION}" != "prod" ]; then
    echo "Confirmation aborted. Refusing to run in prod." >&2
    exit 1
  fi
fi

# Source env file with set -a to export all loaded variables
set -a
# shellcheck disable=SC1090
source "${ENV_FILE}"
export CADENCE_ENV="${TARGET_ENV}"
export SPRING_PROFILES_ACTIVE="${TARGET_ENV}"
set +a

exec "$@"

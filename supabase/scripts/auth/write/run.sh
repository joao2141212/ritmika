#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd -- "$SCRIPT_DIR/../../../.." && pwd)"
ENV_FILE="${RITMIKA_AUTH_ENV_FILE:-$REPO_ROOT/.env}"
SCRIPT_FILE="${1:-}"

if [[ -z "$SCRIPT_FILE" ]]; then
    echo "usage: run.sh <supabase/scripts/auth/write/script.mjs> [args]" >&2
    exit 2
fi
if [[ "$SCRIPT_FILE" = /* ]]; then
    SCRIPT_PATH="$SCRIPT_FILE"
else
    SCRIPT_PATH="$REPO_ROOT/$SCRIPT_FILE"
fi

case "$SCRIPT_PATH" in
    "$REPO_ROOT/supabase/scripts/auth/write/"*.mjs) ;;
    *)
        echo "auth_write_script_outside_write_directory" >&2
        exit 2
        ;;
esac

if [[ ! -f "$ENV_FILE" || ! -f "$SCRIPT_PATH" ]]; then
    echo "auth_write_dependency_missing" >&2
    exit 2
fi

set -a
source "$ENV_FILE"
set +a
export SUPABASE_URL="${SUPABASE_URL:-${VITE_SUPABASE_URL:-}}"
: "${SUPABASE_URL:?SUPABASE_URL_missing}"
: "${SUPABASE_SECRET_KEY:?SUPABASE_SECRET_KEY_missing}"

node "$SCRIPT_PATH" "${@:2}"

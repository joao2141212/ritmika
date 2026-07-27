#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd -- "$SCRIPT_DIR/../../../.." && pwd)"
ENV_FILE="${RITMIKA_DB_ENV_FILE:-$REPO_ROOT/.env}"
SQL_FILE="${1:-}"

if [[ -z "$SQL_FILE" ]]; then
    echo "usage: run.sh <supabase/migrations/query.sql>" >&2
    exit 2
fi

if [[ "${RITMIKA_DB_WRITE_CONFIRM:-}" != "yes" ]]; then
    echo "write_confirmation_required" >&2
    exit 2
fi

if [[ "$SQL_FILE" = /* ]]; then
    SQL_PATH="$SQL_FILE"
else
    SQL_PATH="$REPO_ROOT/$SQL_FILE"
fi

case "$SQL_PATH" in
    "$REPO_ROOT/supabase/migrations/"*.sql|"$REPO_ROOT/supabase/scripts/db/write/"*.sql) ;;
    *)
        echo "write_query_outside_allowed_directory" >&2
        exit 2
        ;;
esac

if [[ ! -f "$ENV_FILE" || ! -f "$SQL_PATH" ]]; then
    echo "write_dependency_missing" >&2
    exit 2
fi

set -a
source "$ENV_FILE"
set +a
: "${SUPABASE_DB_URL:?SUPABASE_DB_URL_missing}"

psql "$SUPABASE_DB_URL" \
    --no-psqlrc \
    --quiet \
    --set=ON_ERROR_STOP=1 \
    --file="$SQL_PATH"

printf 'db_write_ok|%s\n' "${SQL_PATH#"$REPO_ROOT/"}"

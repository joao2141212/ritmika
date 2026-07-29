#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
MIGRATION_FILE="$ROOT_DIR/supabase/migrations/20260729001820_workspace_realtime_broadcast.sql"
COMMAND="${1:-status}"
CONFIRMATION="${2:-}"

: "${SUPABASE_ACCESS_TOKEN:?SUPABASE_ACCESS_TOKEN ausente}"
: "${SUPABASE_PROJECT_REF:?SUPABASE_PROJECT_REF ausente}"

query_api() {
  local sql="$1"
  jq -n --arg query "$sql" '{query:$query}' |
    curl -fsS -X POST "https://api.supabase.com/v1/projects/${SUPABASE_PROJECT_REF}/database/query" \
      -H "Authorization: Bearer ${SUPABASE_ACCESS_TOKEN}" \
      -H 'Content-Type: application/json' \
      --data-binary @-
}

case "$COMMAND" in
  plan)
    printf 'migration=%s\nmode=dry-run\nconfirmation=APPLY:workspace-realtime-broadcast\n' "$MIGRATION_FILE"
    ;;
  apply)
    if [[ "$CONFIRMATION" != "APPLY:workspace-realtime-broadcast" ]]; then
      printf 'Dry-run: nenhuma alteração aplicada. Confirme com:\n  %s apply APPLY:workspace-realtime-broadcast\n' "$0"
      exit 2
    fi
    query_api "$(<"$MIGRATION_FILE")" >/dev/null
    printf 'workspace_realtime_broadcast=applied\n'
    ;;
  status)
    query_api "select (select count(*)::int from pg_trigger where tgname = 'ritmika_workspace_broadcast' and not tgisinternal) as trigger_count, exists(select 1 from pg_proc where proname = 'ritmika_broadcast_workspace_change') as function_exists;" |
      jq -c '.'
    ;;
  *)
    printf 'Uso: %s {plan|status|apply [APPLY:workspace-realtime-broadcast]}\n' "$0" >&2
    exit 2
    ;;
esac

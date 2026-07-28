#!/usr/bin/env bash

ritmika_resolve_db_url() {
    : "${SUPABASE_DB_URL:?SUPABASE_DB_URL_missing}"

    if [[ -n "${SUPABASE_DB_POOLER_URL:-}" ]]; then
        RITMIKA_RESOLVED_DB_URL="$SUPABASE_DB_POOLER_URL"
        export RITMIKA_RESOLVED_DB_URL
        return
    fi
    if [[ -n "${RITMIKA_DB_URL_OVERRIDE:-}" ]]; then
        RITMIKA_RESOLVED_DB_URL="$RITMIKA_DB_URL_OVERRIDE"
        export RITMIKA_RESOLVED_DB_URL
        return
    fi

    RITMIKA_RESOLVED_DB_URL="$SUPABASE_DB_URL"
    local without_scheme="${SUPABASE_DB_URL#*://}"
    local credentials="${without_scheme%%@*}"
    local password="${credentials#*:}"
    local host_and_path="${without_scheme#*@}"
    local direct_host="${host_and_path%%:*}"

    if [[ "$direct_host" != db.*.supabase.co ]]; then
        export RITMIKA_RESOLVED_DB_URL
        return
    fi
    if [[ -z "${SUPABASE_ACCESS_TOKEN:-}" ]] || ! command -v curl >/dev/null || ! command -v jq >/dev/null; then
        export RITMIKA_RESOLVED_DB_URL
        return
    fi

    local project_ref="${direct_host#db.}"
    project_ref="${project_ref%.supabase.co}"
    local pooler_json
    if ! pooler_json="$(curl -fsS \
        -H "Authorization: Bearer ${SUPABASE_ACCESS_TOKEN}" \
        "https://api.supabase.com/v1/projects/${project_ref}/config/database/pooler")"; then
        printf '{"app":"ritmika","layer":"db-ops","fn":"resolve_connection","status":"degraded","error":"pooler_config_unavailable"}\n' >&2
        export RITMIKA_RESOLVED_DB_URL
        return
    fi

    local pooler_host pooler_port pooler_user pooler_database
    pooler_host="$(printf '%s' "$pooler_json" | jq -r 'map(select(.database_type == "PRIMARY"))[0].db_host // empty')"
    pooler_port="$(printf '%s' "$pooler_json" | jq -r 'map(select(.database_type == "PRIMARY"))[0].db_port // empty')"
    pooler_user="$(printf '%s' "$pooler_json" | jq -r 'map(select(.database_type == "PRIMARY"))[0].db_user // empty')"
    pooler_database="$(printf '%s' "$pooler_json" | jq -r 'map(select(.database_type == "PRIMARY"))[0].db_name // "postgres"')"

    if [[ -n "$pooler_host" && -n "$pooler_port" && -n "$pooler_user" ]]; then
        RITMIKA_RESOLVED_DB_URL="postgresql://${pooler_user}:${password}@${pooler_host}:${pooler_port}/${pooler_database}?sslmode=require"
    fi
    export RITMIKA_RESOLVED_DB_URL
}

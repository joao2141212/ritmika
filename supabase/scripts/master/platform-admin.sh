#!/usr/bin/env bash
set -euo pipefail

: "${SUPABASE_URL:?SUPABASE_URL ausente}"
: "${SUPABASE_SECRET_KEY:?SUPABASE_SECRET_KEY ausente}"

user_id=""
enabled="true"
apply=false
confirmation=""
while (( "$#" )); do
  case "$1" in
    --user-id) user_id="${2:-}"; shift 2 ;;
    --disable) enabled="false"; shift ;;
    --apply) apply=true; shift ;;
    --confirm) confirmation="${2:-}"; shift 2 ;;
    *) echo "Argumento desconhecido: $1" >&2; exit 2 ;;
  esac
done

[[ "$user_id" =~ ^[0-9a-fA-F-]{36}$ ]] || { echo "--user-id inválido" >&2; exit 2; }
verb="$( [[ "$enabled" == true ]] && echo ENABLE || echo DISABLE )"
expected="PLATFORM_ADMIN:${user_id}:${verb}"

if [[ "$apply" != true ]]; then
  jq -n --arg user_id "$user_id" --arg enabled "$enabled" --arg confirmation "$expected" '{dry_run:true,user_id:$user_id,platform_admin:($enabled == "true"),required_confirmation:$confirmation}'
  exit 0
fi

[[ "$confirmation" == "$expected" ]] || { echo "Confirmação inválida. Use --confirm '${expected}'" >&2; exit 3; }

headers=(
  -H "apikey: ${SUPABASE_SECRET_KEY}"
  -H "Authorization: Bearer ${SUPABASE_SECRET_KEY}"
  -H "Content-Type: application/json"
)

current="$(curl -fsS "${SUPABASE_URL}/auth/v1/admin/users/${user_id}" "${headers[@]}")"
metadata="$(jq -c --argjson enabled "$enabled" '(.app_metadata // {}) + {platform_admin:$enabled}' <<<"$current")"
payload="$(jq -n --argjson metadata "$metadata" '{app_metadata:$metadata}')"
updated="$(curl -fsS -X PUT "${SUPABASE_URL}/auth/v1/admin/users/${user_id}" "${headers[@]}" --data "$payload")"

jq -n --arg user_id "$user_id" --argjson enabled "$enabled" --arg updated_at "$(date -u +%Y-%m-%dT%H:%M:%SZ)" '{status:"updated",user_id:$user_id,platform_admin:$enabled,updated_at:$updated_at}'

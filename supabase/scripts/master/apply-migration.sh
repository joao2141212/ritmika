#!/usr/bin/env bash
set -euo pipefail

: "${SUPABASE_ACCESS_TOKEN:?SUPABASE_ACCESS_TOKEN ausente}"
: "${SUPABASE_PROJECT_REF:?SUPABASE_PROJECT_REF ausente}"

file=""
apply=false
confirmation=""
while (( "$#" )); do
  case "$1" in
    --file) file="${2:-}"; shift 2 ;;
    --apply) apply=true; shift ;;
    --confirm) confirmation="${2:-}"; shift 2 ;;
    *) echo "Argumento desconhecido: $1" >&2; exit 2 ;;
  esac
done

[[ -f "$file" ]] || { echo "--file deve apontar para uma migração existente" >&2; exit 2; }
name="$(basename "$file")"
expected="APPLY_MIGRATION:${SUPABASE_PROJECT_REF}:${name}"

if [[ "$apply" != true ]]; then
  jq -n --arg project "$SUPABASE_PROJECT_REF" --arg file "$file" --arg confirmation "$expected" '{dry_run:true,project:$project,file:$file,required_confirmation:$confirmation}'
  exit 0
fi

[[ "$confirmation" == "$expected" ]] || { echo "Confirmação inválida. Use --confirm '${expected}'" >&2; exit 3; }

payload="$(jq -Rs '{query:.}' "$file")"
response="$(curl -fsS -X POST \
  "https://api.supabase.com/v1/projects/${SUPABASE_PROJECT_REF}/database/query" \
  -H "Authorization: Bearer ${SUPABASE_ACCESS_TOKEN}" \
  -H 'Content-Type: application/json' \
  --data "$payload")"

jq -n --arg project "$SUPABASE_PROJECT_REF" --arg migration "$name" --argjson result "$response" '{status:"applied",project:$project,migration:$migration,result:$result}'

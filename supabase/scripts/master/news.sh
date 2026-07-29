#!/usr/bin/env bash
set -euo pipefail

: "${SUPABASE_URL:?SUPABASE_URL ausente}"
: "${SUPABASE_SECRET_KEY:?SUPABASE_SECRET_KEY ausente}"

command_name="${1:-help}"
shift || true

headers=(
  -H "apikey: ${SUPABASE_SECRET_KEY}"
  -H "Authorization: Bearer ${SUPABASE_SECRET_KEY}"
  -H "Content-Type: application/json"
)
base="${SUPABASE_URL}/rest/v1/ritmika_product_news_entries"

get_arg() {
  local name="$1"
  shift
  while (( "$#" )); do
    if [[ "$1" == "$name" ]]; then
      printf '%s' "${2:-}"
      return 0
    fi
    shift
  done
  return 1
}

has_flag() {
  local name="$1"
  shift
  for value in "$@"; do [[ "$value" == "$name" ]] && return 0; done
  return 1
}

case "$command_name" in
  list)
    curl -fsS "${base}?select=id,workspace_id,title,category,is_published,published_at,updated_at&order=updated_at.desc" "${headers[@]}" | jq .
    ;;

  show)
    id="$(get_arg --id "$@")"
    [[ -n "$id" ]] || { echo "--id é obrigatório" >&2; exit 2; }
    curl -fsS "${base}?id=eq.${id}&select=*" "${headers[@]}" | jq '.[0] // null'
    ;;

  draft)
    file="$(get_arg --file "$@")"
    [[ -f "$file" ]] || { echo "--file deve apontar para um JSON existente" >&2; exit 2; }
    payload="$(jq -c '
      if (.title|type) != "string" or (.summary|type) != "string" or (.body|type) != "string" then
        error("title, summary e body são obrigatórios")
      else
        . + {
          workspace_id: (.workspace_id // null),
          source_id: (.source_id // ("master-script:" + (now|tostring))),
          category: (.category // "produto"),
          is_published: false,
          published_at: null,
          metadata: ((.metadata // {}) + {managed_from:"master-script"})
        }
      end
    ' "$file")"
    source_id="$(jq -r '.source_id' <<<"$payload")"
    expected="DRAFT:${source_id}"
    if ! has_flag --apply "$@"; then
      jq -n --arg action create_draft --arg confirm "$expected" --argjson payload "$payload" '{dry_run:true,action:$action,required_confirmation:$confirm,payload:$payload}'
      exit 0
    fi
    confirmation="$(get_arg --confirm "$@")"
    [[ "$confirmation" == "$expected" ]] || { echo "Confirmação inválida. Use --confirm '${expected}'" >&2; exit 3; }
    curl -fsS -X POST "$base" "${headers[@]}" -H "Prefer: return=representation" --data "$payload" | jq .
    ;;

  publish|unpublish)
    id="$(get_arg --id "$@")"
    [[ -n "$id" ]] || { echo "--id é obrigatório" >&2; exit 2; }
    entry="$(curl -fsS "${base}?id=eq.${id}&select=id,title,workspace_id,is_published" "${headers[@]}" | jq -c '.[0] // empty')"
    [[ -n "$entry" ]] || { echo "Novidade não encontrada" >&2; exit 4; }
    audience="$(jq -r 'if .workspace_id == null then "GLOBAL" else .workspace_id end' <<<"$entry")"
    verb="$( [[ "$command_name" == publish ]] && echo PUBLISH || echo UNPUBLISH )"
    expected="${verb}:${id}:${audience}"
    next_state="$( [[ "$command_name" == publish ]] && echo true || echo false )"
    if ! has_flag --apply "$@"; then
      jq -n --arg action "$command_name" --arg confirm "$expected" --argjson entry "$entry" '{dry_run:true,action:$action,required_confirmation:$confirm,entry:$entry}'
      exit 0
    fi
    confirmation="$(get_arg --confirm "$@")"
    [[ "$confirmation" == "$expected" ]] || { echo "Confirmação inválida. Use --confirm '${expected}'" >&2; exit 3; }
    if [[ "$next_state" == true ]]; then
      payload="$(jq -n --arg at "$(date -u +%Y-%m-%dT%H:%M:%SZ)" '{is_published:true,published_at:$at,updated_at:$at}')"
    else
      payload="$(jq -n --arg at "$(date -u +%Y-%m-%dT%H:%M:%SZ)" '{is_published:false,published_at:null,updated_at:$at}')"
    fi
    curl -fsS -X PATCH "${base}?id=eq.${id}" "${headers[@]}" -H "Prefer: return=representation" --data "$payload" | jq .
    ;;

  help|*)
    cat <<'USAGE'
Uso:
  news.sh list
  news.sh show --id UUID
  news.sh draft --file update.json
  news.sh draft --file update.json --apply --confirm 'DRAFT:SOURCE_ID'
  news.sh publish --id UUID
  news.sh publish --id UUID --apply --confirm 'PUBLISH:UUID:GLOBAL|WORKSPACE_UUID'
  news.sh unpublish --id UUID
  news.sh unpublish --id UUID --apply --confirm 'UNPUBLISH:UUID:GLOBAL|WORKSPACE_UUID'

Sem --apply, toda mutação é apenas dry-run.
USAGE
    ;;
esac

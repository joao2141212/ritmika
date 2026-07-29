#!/usr/bin/env bash
set -euo pipefail

: "${SUPABASE_URL:?SUPABASE_URL ausente}"
: "${SUPABASE_SECRET_KEY:?SUPABASE_SECRET_KEY ausente}"

headers=(
  -H "apikey: ${SUPABASE_SECRET_KEY}"
  -H "Authorization: Bearer ${SUPABASE_SECRET_KEY}"
)

schema="$({ curl -fsS "${SUPABASE_URL}/rest/v1/" "${headers[@]}"; } \
  | jq -c '.definitions.ritmika_product_news_entries.properties // {} | with_entries(.value = {type: .value.type, format: .value.format, description: .value.description})')"

rows="$({ curl -fsS "${SUPABASE_URL}/rest/v1/ritmika_product_news_entries?select=id,is_published,workspace_id&limit=1000" "${headers[@]}"; })"

jq -n \
  --argjson schema "$schema" \
  --argjson rows "$rows" \
  '{
    table: "ritmika_product_news_entries",
    schema: $schema,
    counts: {
      total: ($rows | length),
      published: ($rows | map(select(.is_published == true)) | length),
      drafts: ($rows | map(select(.is_published != true)) | length),
      global_entries: ($rows | map(select(.workspace_id == null)) | length)
    }
  }'

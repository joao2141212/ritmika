#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd -- "$SCRIPT_DIR/../../../.." && pwd)"
ENV_FILE="${RITMIKA_ENV_FILE:-$REPO_ROOT/.env}"
WORKSPACE_ID="${1:-}"

if [[ ! "$WORKSPACE_ID" =~ ^[0-9a-fA-F-]{36}$ ]]; then
  printf 'usage: %s <workspace-id>\n' "$0" >&2
  exit 1
fi

set -a
source "$ENV_FILE"
set +a

profiles_file="$(mktemp)"
checklists_file="$(mktemp)"

curl --compressed -fsS \
  "$SUPABASE_URL/rest/v1/ritmika_profiles?select=id,name,email,auth_user_id,role&workspace_id=eq.$WORKSPACE_ID&role=eq.operator" \
  -H "apikey: $SUPABASE_SECRET_KEY" \
  -H "Authorization: Bearer $SUPABASE_SECRET_KEY" \
  -o "$profiles_file"

curl --compressed -fsS \
  "$SUPABASE_URL/rest/v1/ritmika_checklists?select=id,title,responsible_profile_id,status,items,schedule&workspace_id=eq.$WORKSPACE_ID&status=eq.active" \
  -H "apikey: $SUPABASE_SECRET_KEY" \
  -H "Authorization: Bearer $SUPABASE_SECRET_KEY" \
  -o "$checklists_file"

jq -n \
  --slurpfile profiles "$profiles_file" \
  --slurpfile checklists "$checklists_file" '
    ($checklists[0] // []) as $allChecklists
    | ($profiles[0] // [])
    | map(
        . as $profile
        | ($allChecklists | map(select(.responsible_profile_id == $profile.id))) as $assigned
        | {
            name: $profile.name,
            email: $profile.email,
            profile_id: $profile.id,
            auth_user_id: $profile.auth_user_id,
            active_checklists: ($assigned | length),
            modeled_items: ($assigned | map((.items // []) | length) | add // 0),
            recurring_checklists: ($assigned | map(select(.schedule.is_recurring == true)) | length)
          }
      )
    | sort_by([-.active_checklists, -.modeled_items, .name])
  '

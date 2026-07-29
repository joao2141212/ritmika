#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
AUTH_DIR="$(cd -- "$SCRIPT_DIR/.." && pwd)"
REPO_ROOT="$(cd -- "$AUTH_DIR/../../.." && pwd)"
ENV_FILE="${RITMIKA_ENV_FILE:-$REPO_ROOT/.env}"
WORKSPACE_ID="${RITMIKA_WORKSPACE_ID:-}"

if [[ ! "$WORKSPACE_ID" =~ ^[0-9a-fA-F-]{36}$ ]]; then
  printf '{"fn":"auth.resetWorkspaceOperatorPasswords","status":"error","error":"valid_workspace_id_required"}\n' >&2
  exit 1
fi

if [[ ! -f "$ENV_FILE" ]]; then
  printf '{"fn":"auth.resetWorkspaceOperatorPasswords","status":"error","error":"env_file_not_found"}\n' >&2
  exit 1
fi

set -a
source "$ENV_FILE"
set +a

temporary_password="${RITMIKA_OPERATOR_TEMP_PASSWORD:-}"
if [[ ${#temporary_password} -lt 16 ]]; then
  temporary_password="Rtm!$(openssl rand -hex 10)Aa7"
fi

env_tmp="$(mktemp "${ENV_FILE}.tmp.XXXXXX")"
awk -v password="$temporary_password" '
  BEGIN { replaced = 0 }
  /^RITMIKA_OPERATOR_TEMP_PASSWORD=/ {
    print "RITMIKA_OPERATOR_TEMP_PASSWORD=" password
    replaced = 1
    next
  }
  { print }
  END {
    if (!replaced) print "RITMIKA_OPERATOR_TEMP_PASSWORD=" password
  }
' "$ENV_FILE" > "$env_tmp"
chmod --reference="$ENV_FILE" "$env_tmp" 2>/dev/null || chmod 600 "$env_tmp"
mv "$env_tmp" "$ENV_FILE"

operator_ids=(
  "5af4678d-5cef-4e4f-b5d5-0da166908515"
  "8b62347a-41f0-4641-89f1-fe68730a1361"
  "e972d78a-c7c2-40ac-86ff-e5acf4d872bd"
  "ce748e48-4591-4315-be94-a6ddab74bf42"
  "1dfd021c-e1ec-43e7-a806-38fc7cd91170"
  "cea389d0-6eac-4e1a-b6ee-0bc2c522d52a"
  "2ed3480e-9f44-49dd-9040-278f0d8c07db"
  "7c5bbc5a-ea9a-45ea-98bb-e124d199c58c"
  "7c4db022-816f-48cb-a275-08fbe1a136aa"
  "db1ffb13-ae1b-4323-851c-a14d896d901f"
  "3f0384d1-8da6-455c-a379-9afeb1f21792"
  "29c9ad41-17a2-4612-a988-5293cba7b3f4"
  "75ea5af3-b6aa-41f9-b5ce-6687590889c9"
  "87bf4772-da0f-4984-b975-778b27045754"
  "6cde0f0d-c7fe-4b96-8d14-24946103be26"
)

export RITMIKA_NEW_PASSWORD="$temporary_password"
reset_count=0
for user_id in "${operator_ids[@]}"; do
  "$AUTH_DIR/run.sh" reset-password \
    --user-id "$user_id" \
    --allow-customer \
    --confirm "RESET:${user_id}:CUSTOMER" \
    --apply >/dev/null
  reset_count=$((reset_count + 1))
done
unset RITMIKA_NEW_PASSWORD temporary_password

printf '{"fn":"auth.resetWorkspaceOperatorPasswords","status":"ok","workspaceId":"%s","resetCount":%d,"passwordStoredIn":"RITMIKA_OPERATOR_TEMP_PASSWORD"}\n' \
  "$WORKSPACE_ID" "$reset_count"

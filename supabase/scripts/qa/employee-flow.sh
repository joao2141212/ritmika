#!/usr/bin/env bash
set -euo pipefail

COMMAND="${1:-inspect}"
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
BOUNDARY_MIGRATION="$ROOT_DIR/supabase/migrations/20260729002908_employee_role_boundaries.sql"
NOTIFICATION_BOUNDARY_MIGRATION="$ROOT_DIR/supabase/migrations/20260729011500_employee_notification_boundaries.sql"
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

rest_api() {
  local path="$1"
  local method="${2:-GET}"
  local body="${3:-}"
  local response payload status
  local -a request=(
    -sS -X "$method" "${SUPABASE_URL}${path}"
    -H "apikey: ${SUPABASE_SECRET_KEY}"
    -H "Authorization: Bearer ${SUPABASE_SECRET_KEY}"
    -H 'Content-Type: application/json'
    -H 'Prefer: return=representation'
    -w $'\n%{http_code}'
  )
  if [[ -n "$body" ]]; then request+=(--data-binary "$body"); fi
  response="$(curl "${request[@]}")"
  status="${response##*$'\n'}"
  payload="${response%$'\n'*}"
  if ((status >= 400)); then
    jq -n --arg status "$status" --arg code "$(jq -r '.code // .error_code // empty' <<<"$payload")" --arg message "$(jq -r '.message // .msg // .error // "request_failed"' <<<"$payload")" '{http_status:($status|tonumber),code:$code,message:$message}' >&2
    return 22
  fi
  printf '%s' "$payload"
}

setup_worker() {
  : "${SUPABASE_URL:?SUPABASE_URL ausente}"
  : "${SUPABASE_SECRET_KEY:?SUPABASE_SECRET_KEY ausente}"
  : "${RITMIKA_QA_WORKER_EMAIL:?RITMIKA_QA_WORKER_EMAIL ausente}"
  : "${RITMIKA_QA_WORKER_PASSWORD:?RITMIKA_QA_WORKER_PASSWORD ausente}"

  local apply=false
  local confirmation=""
  shift || true
  while (($#)); do
    case "$1" in
      --apply) apply=true ;;
      --confirm) shift; confirmation="${1:-}" ;;
    esac
    shift || true
  done

  local workspace_id
  workspace_id="$(rest_api '/rest/v1/ritmika_workspaces?select=id&source_system=eq.ritmika_qa' | jq -r 'if length == 1 then .[0].id else empty end')"
  [[ -n "$workspace_id" ]] || { printf 'QA_WORKSPACE_NOT_UNIQUE\n' >&2; exit 3; }

  local expected='CREATE:QA_WORKER'
  local normalized_email
  normalized_email="$(printf '%s' "$RITMIKA_QA_WORKER_EMAIL" | tr '[:upper:]' '[:lower:]')"
  if [[ "$apply" != true ]]; then
    jq -n --arg workspace_id "$workspace_id" --arg confirmation "$expected" '{status:"dry_run",target:"qa_workspace_only",workspace_id:$workspace_id,role:"operator",expected_confirmation:$confirmation}'
    return
  fi
  [[ "$confirmation" == "$expected" ]] || { printf 'CONFIRMATION_MISMATCH\n' >&2; exit 4; }

  local users user_id auth_payload
  users="$(rest_api '/auth/v1/admin/users?page=1&per_page=1000')"
  user_id="$(jq -r --arg email "$normalized_email" 'first((.users // .)[] | select((.email // "" | ascii_downcase) == $email) | .id) // empty' <<<"$users")"
  auth_payload="$(jq -n \
    --arg email "$normalized_email" \
    --arg password "$RITMIKA_QA_WORKER_PASSWORD" \
    '{email:$email,password:$password,email_confirm:true,app_metadata:{role:"operator",account_class:"qa",ritmika_qa:true},user_metadata:{name:"Funcionário QA Ritmika"}}')"

  if [[ -z "$user_id" ]]; then
    user_id="$(rest_api '/auth/v1/admin/users' POST "$auth_payload" | jq -r '.id')"
  else
    rest_api "/auth/v1/admin/users/${user_id}" PUT "$(jq '{password,app_metadata,user_metadata}' <<<"$auth_payload")" >/dev/null
  fi
  [[ "$user_id" =~ ^[0-9a-f-]{36}$ ]] || { printf 'QA_WORKER_AUTH_FAILED\n' >&2; exit 5; }

  local membership membership_id
  membership="$(rest_api "/rest/v1/ritmika_workspace_members?select=id&workspace_id=eq.${workspace_id}&user_id=eq.${user_id}")"
  membership_id="$(jq -r '.[0].id // empty' <<<"$membership")"
  if [[ -n "$membership_id" ]]; then
    rest_api "/rest/v1/ritmika_workspace_members?id=eq.${membership_id}" PATCH '{"role":"operator","is_owner":false,"managed_units":[],"preferences":{"qa_fixture":true}}' >/dev/null
  else
    rest_api '/rest/v1/ritmika_workspace_members' POST "$(jq -n --arg workspace "$workspace_id" --arg user "$user_id" '{workspace_id:$workspace,user_id:$user,source_user_id:("qa-worker:"+$user),role:"operator",is_owner:false,managed_units:[],preferences:{qa_fixture:true}}')" >/dev/null
  fi

  local profiles profile_id
  profiles="$(rest_api "/rest/v1/ritmika_profiles?select=id&workspace_id=eq.${workspace_id}&auth_user_id=eq.${user_id}")"
  profile_id="$(jq -r '.[0].id // empty' <<<"$profiles")"
  if [[ -n "$profile_id" ]]; then
    rest_api "/rest/v1/ritmika_profiles?id=eq.${profile_id}" PATCH "$(jq -n --arg email "$normalized_email" '{name:"Funcionário QA Ritmika",email:$email,role:"operator",is_owner:false,managed_units:[],metadata:{ritmika_qa:true,qa_fixture:true}}')" >/dev/null
  else
    profile_id="$(uuidgen | tr '[:upper:]' '[:lower:]')"
    rest_api '/rest/v1/ritmika_profiles' POST "$(jq -n --arg id "$profile_id" --arg workspace "$workspace_id" --arg user "$user_id" --arg email "$normalized_email" '{id:$id,workspace_id:$workspace,auth_user_id:$user,source_user_id:("qa-worker:"+$user),email:$email,name:"Funcionário QA Ritmika",role:"operator",is_owner:false,managed_units:[],preferences:{},metadata:{ritmika_qa:true,qa_fixture:true}}')" >/dev/null
  fi

  jq -n --arg workspace_id "$workspace_id" --arg user_id "$user_id" '{status:"applied",workspace_id:$workspace_id,user_id:$user_id,role:"operator",credentials_exposed:false}'
}

setup_scenario() {
  : "${SUPABASE_URL:?SUPABASE_URL ausente}"
  : "${SUPABASE_SECRET_KEY:?SUPABASE_SECRET_KEY ausente}"
  : "${RITMIKA_QA_WORKER_EMAIL:?RITMIKA_QA_WORKER_EMAIL ausente}"

  local apply=false
  local confirmation=""
  shift || true
  while (($#)); do
    case "$1" in
      --apply) apply=true ;;
      --confirm) shift; confirmation="${1:-}" ;;
    esac
    shift || true
  done

  local workspace_id worker_profile_id checklist_id expected='CREATE:QA_EMPLOYEE_SCENARIO'
  workspace_id="$(rest_api '/rest/v1/ritmika_workspaces?select=id&source_system=eq.ritmika_qa' | jq -r 'if length == 1 then .[0].id else empty end')"
  [[ -n "$workspace_id" ]] || { printf 'QA_WORKSPACE_NOT_UNIQUE\n' >&2; exit 3; }
  worker_profile_id="$(rest_api "/rest/v1/ritmika_profiles?select=id&workspace_id=eq.${workspace_id}&role=eq.operator&email=eq.${RITMIKA_QA_WORKER_EMAIL}" | jq -r 'if length == 1 then .[0].id else empty end')"
  [[ -n "$worker_profile_id" ]] || { printf 'QA_WORKER_PROFILE_NOT_UNIQUE\n' >&2; exit 3; }

  if [[ "$apply" != true ]]; then
    jq -n --arg workspace_id "$workspace_id" --arg worker_profile_id "$worker_profile_id" --arg confirmation "$expected" '{status:"dry_run",target:"qa_workspace_only",workspace_id:$workspace_id,worker_profile_id:$worker_profile_id,source_id:"qa:employee-flow:v1",expected_confirmation:$confirmation}'
    return
  fi
  [[ "$confirmation" == "$expected" ]] || { printf 'CONFIRMATION_MISMATCH\n' >&2; exit 4; }

  checklist_id="$(rest_api "/rest/v1/ritmika_checklists?select=id&workspace_id=eq.${workspace_id}&source_id=eq.qa%3Aemployee-flow%3Av1" | jq -r '.[0].id // empty')"
  [[ -n "$checklist_id" ]] || checklist_id="$(uuidgen | tr '[:upper:]' '[:lower:]')"

  local payload
  payload="$(jq -n \
    --arg id "$checklist_id" \
    --arg workspace "$workspace_id" \
    --arg worker "$worker_profile_id" \
    '{
      id:$id,
      workspace_id:$workspace,
      source_id:"qa:employee-flow:v1",
      title:"QA · Inspeção operacional completa",
      description:"Atividade isolada para validar atribuição, progresso, conclusão e feedback da interface do funcionário.",
      status:"active",
      checklist_kind:"operational",
      responsible_profile_id:$worker,
      schedule:{frequency:"manual",timezone:"America/Sao_Paulo"},
      usage_policy:"assigned_only",
      variables:{},
      items:[
        {id:"qa-check-1",title:"Confirmar recebimento da atividade",description:"Marque como feito para validar o controle principal.",type:"check",required:true,weight:1},
        {id:"qa-note-2",title:"Registrar observação de QA",description:"Descreva em poucas palavras como a execução ocorreu.",type:"text",required:true,weight:1}
      ],
      metadata:{qa_fixture:true,scenario:"employee_flow",version:1},
      source_payload:{origin:"ritmika_qa_script",scenario:"employee_flow"}
    }')"

  local existing
  existing="$(rest_api "/rest/v1/ritmika_checklists?select=id&workspace_id=eq.${workspace_id}&source_id=eq.qa%3Aemployee-flow%3Av1")"
  if [[ "$(jq 'length' <<<"$existing")" -eq 0 ]]; then
    rest_api '/rest/v1/ritmika_checklists' POST "$payload" >/dev/null
  else
    rest_api "/rest/v1/ritmika_checklists?id=eq.${checklist_id}" PATCH "$(jq 'del(.id,.workspace_id,.source_id)' <<<"$payload")" >/dev/null
  fi

  jq -n --arg workspace_id "$workspace_id" --arg worker_profile_id "$worker_profile_id" --arg checklist_id "$checklist_id" '{status:"applied",workspace_id:$workspace_id,worker_profile_id:$worker_profile_id,checklist_id:$checklist_id,source_id:"qa:employee-flow:v1"}'
}

case "$COMMAND" in
  inspect)
    query_api "
      select table_name, column_name, data_type, is_nullable
      from information_schema.columns
      where table_schema = 'public'
        and table_name in (
          'ritmika_checklists',
          'ritmika_checklist_schedules',
          'ritmika_responses',
          'ritmika_execution_events',
          'ritmika_notifications',
          'ritmika_profiles',
          'ritmika_workspace_members'
        )
      order by table_name, ordinal_position;
    " | jq -c '.'
    ;;
  inventory)
    query_api "
      select w.id as workspace_id, w.source_system,
        count(distinct p.id)::int as profiles,
        count(distinct p.auth_user_id) filter (where p.auth_user_id is not null)::int as linked_profiles,
        count(distinct c.id)::int as checklists
      from public.ritmika_workspaces w
      left join public.ritmika_profiles p on p.workspace_id = w.id
      left join public.ritmika_checklists c on c.workspace_id = w.id
      group by w.id, w.source_system
      order by w.source_system;
    " | jq -c '.'
    ;;
  policies)
    query_api "
      select schemaname, tablename, policyname, cmd, roles, qual, with_check
      from pg_policies
      where schemaname = 'public'
        and tablename in ('ritmika_checklists','ritmika_responses','ritmika_execution_events','ritmika_notifications')
      order by tablename, cmd, policyname;
    " | jq -c '.'
    ;;
  setup-worker)
    setup_worker "$@"
    ;;
  setup-scenario)
    setup_scenario "$@"
    ;;
  verify-scenario)
    query_api "
      select c.id as checklist_id, c.status, c.responsible_profile_id,
        p.role as responsible_role, p.auth_user_id is not null as has_auth,
        count(r.id)::int as executions,
        count(r.id) filter (where r.is_finished)::int as completed_executions
      from public.ritmika_checklists c
      join public.ritmika_workspaces w on w.id = c.workspace_id and w.source_system = 'ritmika_qa'
      left join public.ritmika_profiles p on p.id = c.responsible_profile_id
      left join public.ritmika_responses r on r.checklist_id = c.id and r.profile_id = p.id
      where c.source_id = 'qa:employee-flow:v1'
      group by c.id, c.status, c.responsible_profile_id, p.role, p.auth_user_id;
    " | jq -c '.'
    ;;
  apply-boundaries)
    if [[ "${2:-}" != "APPLY:EMPLOYEE_BOUNDARIES" ]]; then
      jq -n --arg migration "$BOUNDARY_MIGRATION" '{status:"dry_run",migration:$migration,expected_confirmation:"APPLY:EMPLOYEE_BOUNDARIES"}'
      exit 2
    fi
    query_api "$(<"$BOUNDARY_MIGRATION")" >/dev/null
    jq -n '{status:"applied",migration:"employee_role_boundaries"}'
    ;;
  apply-notification-boundaries)
    if [[ "${2:-}" != "APPLY:EMPLOYEE_NOTIFICATION_BOUNDARIES" ]]; then
      jq -n --arg migration "$NOTIFICATION_BOUNDARY_MIGRATION" '{status:"dry_run",migration:$migration,expected_confirmation:"APPLY:EMPLOYEE_NOTIFICATION_BOUNDARIES"}'
      exit 2
    fi
    query_api "$(<"$NOTIFICATION_BOUNDARY_MIGRATION")" >/dev/null
    jq -n '{status:"applied",migration:"employee_notification_boundaries"}'
    ;;
  *)
    printf 'Uso: %s {inspect|inventory|policies|setup-worker|setup-scenario|verify-scenario|apply-boundaries|apply-notification-boundaries}\n' "$0" >&2
    exit 2
    ;;
esac

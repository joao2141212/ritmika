do $$
declare
  primary_workspace_id uuid;
  secondary_workspace_id uuid;
  qa_user_id uuid;
  qa_profile public.ritmika_profiles%rowtype;
begin
  select w.id, m.user_id
    into primary_workspace_id, qa_user_id
  from public.ritmika_workspaces w
  join public.ritmika_workspace_members m
    on m.workspace_id = w.id
   and m.is_owner = true
  where w.source_system = 'ritmika_qa'
    and w.source_id = 'parity-e2e-20260728';

  if primary_workspace_id is null or qa_user_id is null then
    raise exception 'QA_PRIMARY_WORKSPACE_OR_OWNER_MISSING';
  end if;

  select *
    into qa_profile
  from public.ritmika_profiles
  where workspace_id = primary_workspace_id
    and auth_user_id = qa_user_id;

  if qa_profile.id is null then
    raise exception 'QA_PRIMARY_PROFILE_MISSING';
  end if;

  insert into public.ritmika_workspaces (
    name,
    source_system,
    source_id,
    timezone,
    locale,
    metadata
  )
  values (
    'Ritmika QA Secundária',
    'ritmika_qa',
    'multiworkspace-selector-20260728',
    'America/Sao_Paulo',
    'pt-BR',
    jsonb_build_object(
      'qa_fixture', true,
      'purpose', 'multiworkspace-selector-regression'
    )
  )
  on conflict (source_system, source_id) do update
    set name = excluded.name,
        timezone = excluded.timezone,
        locale = excluded.locale,
        metadata = excluded.metadata,
        updated_at = now()
  returning id into secondary_workspace_id;

  insert into public.ritmika_workspace_members (
    workspace_id,
    user_id,
    source_user_id,
    role,
    is_owner,
    managed_units,
    preferences
  )
  values (
    secondary_workspace_id,
    qa_user_id,
    'qa-secondary-owner',
    'admin',
    true,
    '[]'::jsonb,
    '{}'::jsonb
  )
  on conflict (workspace_id, user_id) do update
    set role = excluded.role,
        is_owner = excluded.is_owner,
        managed_units = excluded.managed_units,
        preferences = excluded.preferences,
        updated_at = now();

  insert into public.ritmika_profiles (
    workspace_id,
    source_user_id,
    auth_user_id,
    email,
    name,
    phone,
    role,
    is_owner,
    managed_units,
    preferences,
    metadata
  )
  values (
    secondary_workspace_id,
    'qa-secondary-owner',
    qa_user_id,
    qa_profile.email,
    qa_profile.name,
    qa_profile.phone,
    'admin',
    true,
    '[]'::jsonb,
    '{}'::jsonb,
    jsonb_build_object(
      'qa_fixture', true,
      'purpose', 'multiworkspace-selector-regression'
    )
  )
  on conflict (workspace_id, auth_user_id) where auth_user_id is not null do update
    set role = excluded.role,
        is_owner = excluded.is_owner,
        managed_units = excluded.managed_units,
        preferences = excluded.preferences,
        metadata = excluded.metadata,
        updated_at = now();
end
$$;

select
  w.id as workspace_id,
  w.source_id,
  count(distinct m.id) as memberships,
  count(distinct p.id) as linked_profiles
from public.ritmika_workspaces w
left join public.ritmika_workspace_members m on m.workspace_id = w.id
left join public.ritmika_profiles p
  on p.workspace_id = w.id
 and p.auth_user_id = m.user_id
where w.source_system = 'ritmika_qa'
group by w.id, w.source_id
order by w.source_id;

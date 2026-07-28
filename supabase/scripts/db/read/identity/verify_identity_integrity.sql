with checks as (
  select
    'AUTH_USER_WITHOUT_MEMBERSHIP' as issue_code,
    'error' as severity,
    count(*) as issue_count
  from auth.users u
  where not exists (
    select 1 from public.ritmika_workspace_members m where m.user_id = u.id
  )

  union all

  select
    'MEMBERSHIP_WITHOUT_PROFILE',
    'error',
    count(*)
  from public.ritmika_workspace_members m
  where not exists (
    select 1
    from public.ritmika_profiles p
    where p.workspace_id = m.workspace_id
      and p.auth_user_id = m.user_id
  )

  union all

  select
    'LINKED_PROFILE_WITHOUT_MEMBERSHIP',
    'error',
    count(*)
  from public.ritmika_profiles p
  where p.auth_user_id is not null
    and not exists (
      select 1
      from public.ritmika_workspace_members m
      where m.workspace_id = p.workspace_id
        and m.user_id = p.auth_user_id
    )

  union all

  select
    'PROFILE_MEMBER_ROLE_MISMATCH',
    'error',
    count(*)
  from public.ritmika_profiles p
  join public.ritmika_workspace_members m
    on m.workspace_id = p.workspace_id
   and m.user_id = p.auth_user_id
  where coalesce(p.role, '') <> coalesce(m.role, '')

  union all

  select
    'PROFILE_MEMBER_OWNER_MISMATCH',
    'error',
    count(*)
  from public.ritmika_profiles p
  join public.ritmika_workspace_members m
    on m.workspace_id = p.workspace_id
   and m.user_id = p.auth_user_id
  where p.is_owner is distinct from m.is_owner

  union all

  select
    'PROFILE_MEMBER_UNITS_MISMATCH',
    'warn',
    count(*)
  from public.ritmika_profiles p
  join public.ritmika_workspace_members m
    on m.workspace_id = p.workspace_id
   and m.user_id = p.auth_user_id
  where coalesce(p.managed_units, '[]'::jsonb) <> coalesce(m.managed_units, '[]'::jsonb)

  union all

  select
    'DOMAIN_PROFILE_WITHOUT_AUTH',
    'info',
    count(*)
  from public.ritmika_profiles p
  where p.auth_user_id is null
)
select
  issue_code,
  severity,
  issue_count::text as issue_count
from checks
order by
  case severity when 'error' then 1 when 'warn' then 2 else 3 end,
  issue_code;

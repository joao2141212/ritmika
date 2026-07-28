select
  'identity.summary' as source,
  (select count(*) from auth.users)::text as auth_users,
  (select count(*) from public.ritmika_workspaces)::text as workspaces,
  (select count(*) from public.ritmika_workspace_members)::text as memberships,
  (select count(*) from public.ritmika_profiles)::text as profiles,
  (select count(*) from public.ritmika_profiles where auth_user_id is not null)::text as linked_profiles,
  (select count(*) from public.ritmika_profiles where auth_user_id is null)::text as unlinked_profiles;

select
  'identity.workspace' as source,
  w.id::text as workspace_id,
  w.source_system,
  w.source_id,
  count(distinct m.id)::text as membership_count,
  count(distinct p.id)::text as profile_count,
  count(distinct p.id) filter (where p.auth_user_id is not null)::text as linked_profile_count,
  count(distinct m.id) filter (where m.is_owner)::text as owner_count
from public.ritmika_workspaces w
left join public.ritmika_workspace_members m on m.workspace_id = w.id
left join public.ritmika_profiles p on p.workspace_id = w.id
group by w.id, w.source_system, w.source_id
order by w.source_system, w.source_id;

select
  'identity.auth_user' as source,
  u.id::text as auth_user_id,
  coalesce(split_part(lower(u.email), '@', 2), '') as email_domain,
  substr(md5(lower(coalesce(u.email, ''))), 1, 12) as email_fingerprint,
  case when u.email_confirmed_at is null then 'false' else 'true' end as confirmed,
  count(distinct m.workspace_id)::text as workspace_count,
  count(distinct m.id)::text as membership_count,
  count(distinct p.id)::text as profile_count,
  case
    when bool_or(
      coalesce(p.metadata->>'ritmika_qa', 'false') = 'true'
      or coalesce(m.preferences->>'ritmika_qa', 'false') = 'true'
      or w.source_system = 'ritmika_qa'
    ) then 'qa'
    when count(distinct m.id) > 0 or count(distinct p.id) > 0 then 'customer'
    else 'orphan'
  end as account_class
from auth.users u
left join public.ritmika_workspace_members m on m.user_id = u.id
left join public.ritmika_profiles p on p.auth_user_id = u.id
left join public.ritmika_workspaces w on w.id = coalesce(m.workspace_id, p.workspace_id)
group by u.id, u.email, u.email_confirmed_at
order by account_class, email_fingerprint;

select
  'identity.profile_population' as source,
  p.workspace_id::text as workspace_id,
  coalesce(p.role, '') as role,
  p.is_owner::text as is_owner,
  case when p.auth_user_id is null then 'domain_only' else 'auth_linked' end as identity_kind,
  count(*)::text as row_count
from public.ritmika_profiles p
group by p.workspace_id, p.role, p.is_owner, identity_kind
order by p.workspace_id, identity_kind, p.role, p.is_owner;

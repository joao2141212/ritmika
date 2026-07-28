select
  'qa.profile' as source,
  count(*)::text as row_count,
  coalesce(max(p.role), '') as role,
  coalesce(max(p.is_owner::int)::text, '') as is_owner
from public.ritmika_profiles p
where p.auth_user_id = '26e5912f-d442-4d1e-bfa4-dbc5655aa190'::uuid
  and p.metadata->>'ritmika_qa' = 'true';

select
  'qa.member' as source,
  count(*)::text as row_count,
  coalesce(max(m.role), '') as role,
  coalesce(max(m.is_owner::int)::text, '') as is_owner
from public.ritmika_workspace_members m
where m.user_id = '26e5912f-d442-4d1e-bfa4-dbc5655aa190'::uuid
  and m.preferences->>'ritmika_qa' = 'true';

select
  'qa.workspace' as source,
  count(*)::text as row_count,
  coalesce(max(w.source_id), '') as source_id,
  coalesce(max(w.name), '') as workspace_name
from public.ritmika_workspaces w
where w.source_system = 'ritmika_qa'
  and w.source_id = 'parity-e2e-20260728';

select
  'qa.non_qa_memberships' as source,
  count(*)::text as row_count,
  ''::text as role,
  ''::text as is_owner
from public.ritmika_workspace_members m
join public.ritmika_workspaces w on w.id = m.workspace_id
where m.user_id = '26e5912f-d442-4d1e-bfa4-dbc5655aa190'::uuid
  and w.source_system <> 'ritmika_qa';

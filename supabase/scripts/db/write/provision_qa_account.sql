with qa_workspace as (
  insert into public.ritmika_workspaces (
    source_system,
    source_id,
    name,
    description,
    metadata
  ) values (
    'ritmika_qa',
    'parity-e2e-20260728',
    'Ritmika QA Paridade',
    'Workspace isolado para testes E2E de paridade funcional.',
    jsonb_build_object('ritmika_qa', true, 'purpose', 'parity-e2e')
  )
  on conflict (source_system, source_id) do nothing
  returning id
), selected_workspace as (
  select id from qa_workspace
  union all
  select id
  from public.ritmika_workspaces
  where source_system = 'ritmika_qa'
    and source_id = 'parity-e2e-20260728'
  limit 1
), qa_profile as (
  insert into public.ritmika_profiles (
    id,
    workspace_id,
    source_user_id,
    email,
    name,
    role,
    is_owner,
    metadata,
    auth_user_id
  )
  select
    gen_random_uuid(),
    id,
    'auth:26e5912f-d442-4d1e-bfa4-dbc5655aa190',
    'qa+ritmika-parity-c71436ffd7@example.com',
    'Ritmika QA',
    'admin',
    true,
    jsonb_build_object('ritmika_qa', true, 'purpose', 'parity-e2e'),
    '26e5912f-d442-4d1e-bfa4-dbc5655aa190'::uuid
  from selected_workspace
  on conflict (workspace_id, source_user_id) do nothing
  returning workspace_id
)
insert into public.ritmika_workspace_members (
  workspace_id,
  user_id,
  source_user_id,
  role,
  is_owner,
  preferences
)
select
  id,
  '26e5912f-d442-4d1e-bfa4-dbc5655aa190'::uuid,
  'auth:26e5912f-d442-4d1e-bfa4-dbc5655aa190',
  'admin',
  true,
  jsonb_build_object('ritmika_qa', true)
from selected_workspace
on conflict (workspace_id, user_id) do nothing;

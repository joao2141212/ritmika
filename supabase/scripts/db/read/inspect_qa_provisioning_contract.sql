select
  table_name,
  ordinal_position,
  column_name,
  data_type,
  is_nullable,
  coalesce(column_default, '') as column_default
from information_schema.columns
where table_schema = 'public'
  and table_name in (
    'ritmika_workspaces',
    'ritmika_profiles',
    'ritmika_workspace_members',
    'ritmika_units',
    'ritmika_sectors',
    'ritmika_moments',
    'ritmika_checklists'
  )
order by table_name, ordinal_position;

select
  tc.table_name,
  tc.constraint_type,
  tc.constraint_name,
  coalesce(kcu.column_name, '') as column_name
from information_schema.table_constraints tc
left join information_schema.key_column_usage kcu
  on kcu.constraint_schema = tc.constraint_schema
 and kcu.constraint_name = tc.constraint_name
 and kcu.table_name = tc.table_name
where tc.table_schema = 'public'
  and tc.table_name in (
    'ritmika_workspaces',
    'ritmika_profiles',
    'ritmika_workspace_members',
    'ritmika_units',
    'ritmika_sectors',
    'ritmika_moments',
    'ritmika_checklists'
  )
order by tc.table_name, tc.constraint_type, tc.constraint_name, kcu.ordinal_position;

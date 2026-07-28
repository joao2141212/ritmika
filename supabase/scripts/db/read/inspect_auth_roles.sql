select 'profiles' as source, coalesce(role, '') as role, is_owner, count(*)::text as row_count
from public.ritmika_profiles
group by role, is_owner
order by role, is_owner;

select 'workspace_members' as source, coalesce(role, '') as role, is_owner, count(*)::text as row_count
from public.ritmika_workspace_members
group by role, is_owner
order by role, is_owner;

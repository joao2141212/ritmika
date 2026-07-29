create or replace function private.ritmika_is_workspace_manager(target_workspace_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.ritmika_workspace_members member
    where member.workspace_id = target_workspace_id
      and member.user_id = (select auth.uid())
      and (member.is_owner or member.role in ('owner', 'admin', 'manager'))
  );
$$;

create or replace function private.ritmika_current_profile_id(target_workspace_id uuid)
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select profile.id
  from public.ritmika_profiles profile
  where profile.workspace_id = target_workspace_id
    and profile.auth_user_id = (select auth.uid())
  limit 1;
$$;

drop policy if exists ritmika_checklists_all on public.ritmika_checklists;
drop policy if exists ritmika_checklists_select on public.ritmika_checklists;
drop policy if exists ritmika_checklists_insert on public.ritmika_checklists;
drop policy if exists ritmika_checklists_update on public.ritmika_checklists;
drop policy if exists ritmika_checklists_delete on public.ritmika_checklists;

create policy ritmika_checklists_select
on public.ritmika_checklists for select to authenticated
using (
  private.ritmika_is_workspace_manager(workspace_id)
  or responsible_profile_id = private.ritmika_current_profile_id(workspace_id)
);

create policy ritmika_checklists_insert
on public.ritmika_checklists for insert to authenticated
with check (private.ritmika_is_workspace_manager(workspace_id));

create policy ritmika_checklists_update
on public.ritmika_checklists for update to authenticated
using (private.ritmika_is_workspace_manager(workspace_id))
with check (private.ritmika_is_workspace_manager(workspace_id));

create policy ritmika_checklists_delete
on public.ritmika_checklists for delete to authenticated
using (private.ritmika_is_workspace_manager(workspace_id));

drop policy if exists ritmika_responses_all on public.ritmika_responses;
drop policy if exists ritmika_responses_select on public.ritmika_responses;
drop policy if exists ritmika_responses_insert on public.ritmika_responses;
drop policy if exists ritmika_responses_update on public.ritmika_responses;
drop policy if exists ritmika_responses_delete on public.ritmika_responses;

create policy ritmika_responses_select
on public.ritmika_responses for select to authenticated
using (
  private.ritmika_is_workspace_manager(workspace_id)
  or profile_id = private.ritmika_current_profile_id(workspace_id)
);

create policy ritmika_responses_insert
on public.ritmika_responses for insert to authenticated
with check (
  private.ritmika_is_workspace_manager(workspace_id)
  or profile_id = private.ritmika_current_profile_id(workspace_id)
);

create policy ritmika_responses_update
on public.ritmika_responses for update to authenticated
using (
  private.ritmika_is_workspace_manager(workspace_id)
  or profile_id = private.ritmika_current_profile_id(workspace_id)
)
with check (
  private.ritmika_is_workspace_manager(workspace_id)
  or profile_id = private.ritmika_current_profile_id(workspace_id)
);

create policy ritmika_responses_delete
on public.ritmika_responses for delete to authenticated
using (private.ritmika_is_workspace_manager(workspace_id));

drop policy if exists ritmika_events_all on public.ritmika_execution_events;
drop policy if exists ritmika_events_select on public.ritmika_execution_events;
drop policy if exists ritmika_events_insert on public.ritmika_execution_events;
drop policy if exists ritmika_events_update on public.ritmika_execution_events;
drop policy if exists ritmika_events_delete on public.ritmika_execution_events;

create policy ritmika_events_select
on public.ritmika_execution_events for select to authenticated
using (
  private.ritmika_is_workspace_manager(workspace_id)
  or profile_id = private.ritmika_current_profile_id(workspace_id)
);

create policy ritmika_events_insert
on public.ritmika_execution_events for insert to authenticated
with check (
  private.ritmika_is_workspace_manager(workspace_id)
  or profile_id = private.ritmika_current_profile_id(workspace_id)
);

create policy ritmika_events_update
on public.ritmika_execution_events for update to authenticated
using (private.ritmika_is_workspace_manager(workspace_id))
with check (private.ritmika_is_workspace_manager(workspace_id));

create policy ritmika_events_delete
on public.ritmika_execution_events for delete to authenticated
using (private.ritmika_is_workspace_manager(workspace_id));

create index if not exists ritmika_checklists_workspace_responsible_idx
on public.ritmika_checklists (workspace_id, responsible_profile_id);

create index if not exists ritmika_responses_workspace_profile_idx
on public.ritmika_responses (workspace_id, profile_id);

create index if not exists ritmika_execution_events_workspace_profile_idx
on public.ritmika_execution_events (workspace_id, profile_id);

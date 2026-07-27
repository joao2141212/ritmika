create extension if not exists pgcrypto;
create schema if not exists private;
revoke all on schema private from public;

create table if not exists public.ritmika_workspaces (
  id uuid primary key default gen_random_uuid(),
  source_system text not null default 'konclui',
  source_id text not null,
  name text not null,
  description text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (source_system, source_id)
);

create table if not exists public.ritmika_workspace_members (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.ritmika_workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  source_user_id text,
  role text not null default 'operator',
  is_owner boolean not null default false,
  managed_units jsonb not null default '[]'::jsonb,
  preferences jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, user_id),
  unique (workspace_id, source_user_id)
);

create table if not exists public.ritmika_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  workspace_id uuid not null references public.ritmika_workspaces(id) on delete cascade,
  source_user_id text,
  email text,
  name text not null,
  phone text,
  role text not null default 'operator',
  is_owner boolean not null default false,
  managed_units jsonb not null default '[]'::jsonb,
  preferences jsonb not null default '{}'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, source_user_id)
);

create table if not exists public.ritmika_units (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.ritmika_workspaces(id) on delete cascade,
  source_id text not null,
  name text not null,
  address jsonb not null default '{}'::jsonb,
  timezone text,
  usage_policy text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, source_id)
);

create table if not exists public.ritmika_sectors (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.ritmika_workspaces(id) on delete cascade,
  source_id text not null,
  name text not null,
  system_key text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, source_id)
);

create table if not exists public.ritmika_moments (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.ritmika_workspaces(id) on delete cascade,
  source_id text not null,
  name text not null,
  system_key text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, source_id)
);

create table if not exists public.ritmika_checklists (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.ritmika_workspaces(id) on delete cascade,
  source_id text not null,
  title text not null,
  description text,
  status text not null default 'draft',
  checklist_kind text,
  flow_source_id text,
  unit_id uuid references public.ritmika_units(id) on delete set null,
  sector_id uuid references public.ritmika_sectors(id) on delete set null,
  moment_id uuid references public.ritmika_moments(id) on delete set null,
  responsible_profile_id uuid references public.ritmika_profiles(id) on delete set null,
  schedule jsonb not null default '{}'::jsonb,
  usage_policy text,
  variables jsonb not null default '{}'::jsonb,
  items jsonb not null default '[]'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  source_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, source_id)
);

create table if not exists public.ritmika_responses (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.ritmika_workspaces(id) on delete cascade,
  source_id text not null,
  source_checklist_id text,
  checklist_id uuid references public.ritmika_checklists(id) on delete set null,
  source_user_id text,
  profile_id uuid references public.ritmika_profiles(id) on delete set null,
  unit_id uuid references public.ritmika_units(id) on delete set null,
  is_finished boolean not null default false,
  response_data jsonb not null default '{}'::jsonb,
  response_meta jsonb not null default '{}'::jsonb,
  variables jsonb not null default '{}'::jsonb,
  checklist_snapshot jsonb not null default '{}'::jsonb,
  execution_type text,
  execution_date timestamptz,
  started_at timestamptz,
  completed_at timestamptz,
  effort_kpi numeric,
  quality_kpi numeric,
  ttc numeric,
  qtd_items integer,
  qtd_items_answered integer,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, source_id)
);

create table if not exists public.ritmika_import_runs (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.ritmika_workspaces(id) on delete cascade,
  source_system text not null,
  source_workspace_id text not null,
  status text not null default 'started',
  counts jsonb not null default '{}'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  started_at timestamptz not null default now(),
  finished_at timestamptz
);

create index if not exists ritmika_members_workspace_idx on public.ritmika_workspace_members(workspace_id);
create index if not exists ritmika_profiles_workspace_idx on public.ritmika_profiles(workspace_id);
create index if not exists ritmika_units_workspace_idx on public.ritmika_units(workspace_id);
create index if not exists ritmika_sectors_workspace_idx on public.ritmika_sectors(workspace_id);
create index if not exists ritmika_moments_workspace_idx on public.ritmika_moments(workspace_id);
create index if not exists ritmika_checklists_workspace_idx on public.ritmika_checklists(workspace_id);
create index if not exists ritmika_responses_workspace_idx on public.ritmika_responses(workspace_id);
create index if not exists ritmika_responses_execution_idx on public.ritmika_responses(workspace_id, execution_date);

create or replace function private.ritmika_has_workspace_access(target_workspace_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_catalog
as $$
  select exists (
    select 1
    from public.ritmika_workspace_members m
    where m.workspace_id = target_workspace_id
      and m.user_id = (select auth.uid())
  );
$$;
revoke all on function private.ritmika_has_workspace_access(uuid) from public;
grant execute on function private.ritmika_has_workspace_access(uuid) to authenticated;

alter table public.ritmika_workspaces enable row level security;
alter table public.ritmika_workspace_members enable row level security;
alter table public.ritmika_profiles enable row level security;
alter table public.ritmika_units enable row level security;
alter table public.ritmika_sectors enable row level security;
alter table public.ritmika_moments enable row level security;
alter table public.ritmika_checklists enable row level security;
alter table public.ritmika_responses enable row level security;
alter table public.ritmika_import_runs enable row level security;

grant select, insert, update, delete on public.ritmika_workspaces,
  public.ritmika_profiles,
  public.ritmika_units,
  public.ritmika_sectors,
  public.ritmika_moments,
  public.ritmika_checklists,
  public.ritmika_responses to authenticated;
grant select on public.ritmika_workspace_members, public.ritmika_import_runs to authenticated;

drop policy if exists ritmika_workspaces_select on public.ritmika_workspaces;
create policy ritmika_workspaces_select on public.ritmika_workspaces
  for select to authenticated using (private.ritmika_has_workspace_access(id));
drop policy if exists ritmika_workspaces_insert on public.ritmika_workspaces;
create policy ritmika_workspaces_insert on public.ritmika_workspaces
  for insert to authenticated with check (false);
drop policy if exists ritmika_workspaces_update on public.ritmika_workspaces;
create policy ritmika_workspaces_update on public.ritmika_workspaces
  for update to authenticated using (private.ritmika_has_workspace_access(id)) with check (private.ritmika_has_workspace_access(id));

drop policy if exists ritmika_members_select on public.ritmika_workspace_members;
create policy ritmika_members_select on public.ritmika_workspace_members
  for select to authenticated using (private.ritmika_has_workspace_access(workspace_id));

drop policy if exists ritmika_profiles_select on public.ritmika_profiles;
create policy ritmika_profiles_select on public.ritmika_profiles
  for select to authenticated using (private.ritmika_has_workspace_access(workspace_id));
drop policy if exists ritmika_profiles_update on public.ritmika_profiles;
create policy ritmika_profiles_update on public.ritmika_profiles
  for update to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()));

drop policy if exists ritmika_units_all on public.ritmika_units;
create policy ritmika_units_all on public.ritmika_units
  for all to authenticated using (private.ritmika_has_workspace_access(workspace_id)) with check (private.ritmika_has_workspace_access(workspace_id));
drop policy if exists ritmika_sectors_all on public.ritmika_sectors;
create policy ritmika_sectors_all on public.ritmika_sectors
  for all to authenticated using (private.ritmika_has_workspace_access(workspace_id)) with check (private.ritmika_has_workspace_access(workspace_id));
drop policy if exists ritmika_moments_all on public.ritmika_moments;
create policy ritmika_moments_all on public.ritmika_moments
  for all to authenticated using (private.ritmika_has_workspace_access(workspace_id)) with check (private.ritmika_has_workspace_access(workspace_id));
drop policy if exists ritmika_checklists_all on public.ritmika_checklists;
create policy ritmika_checklists_all on public.ritmika_checklists
  for all to authenticated using (private.ritmika_has_workspace_access(workspace_id)) with check (private.ritmika_has_workspace_access(workspace_id));
drop policy if exists ritmika_responses_all on public.ritmika_responses;
create policy ritmika_responses_all on public.ritmika_responses
  for all to authenticated using (private.ritmika_has_workspace_access(workspace_id)) with check (private.ritmika_has_workspace_access(workspace_id));

drop policy if exists ritmika_import_runs_select on public.ritmika_import_runs;
create policy ritmika_import_runs_select on public.ritmika_import_runs
  for select to authenticated using (private.ritmika_has_workspace_access(workspace_id));

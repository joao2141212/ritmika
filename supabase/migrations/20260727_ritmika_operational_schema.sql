create table if not exists public.ritmika_checklist_items (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.ritmika_workspaces(id) on delete cascade,
  checklist_id uuid not null references public.ritmika_checklists(id) on delete cascade,
  source_id text not null,
  position integer not null default 0,
  title text not null,
  description text,
  item_type text not null default 'check',
  required boolean not null default true,
  weight numeric not null default 1,
  config jsonb not null default '{}'::jsonb,
  evidences jsonb not null default '[]'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (checklist_id, source_id)
);

create table if not exists public.ritmika_products (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.ritmika_workspaces(id) on delete cascade,
  checklist_id uuid not null references public.ritmika_checklists(id) on delete cascade,
  checklist_item_id uuid references public.ritmika_checklist_items(id) on delete set null,
  source_id text not null,
  name text not null,
  category text,
  unit text not null default 'item',
  minimum_quantity numeric,
  supplier text,
  position integer not null default 0,
  active boolean not null default true,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (checklist_id, source_id)
);

create table if not exists public.ritmika_count_entries (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.ritmika_workspaces(id) on delete cascade,
  checklist_id uuid not null references public.ritmika_checklists(id) on delete cascade,
  product_id uuid references public.ritmika_products(id) on delete set null,
  profile_id uuid references public.ritmika_profiles(id) on delete set null,
  source_id text not null,
  count_date date not null,
  weekday text,
  shift text not null default 'unico',
  counted_quantity numeric not null default 0,
  ordered_quantity numeric not null default 0,
  counted_by text,
  notes text,
  status text not null default 'completed',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, source_id)
);

create table if not exists public.ritmika_evidences (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.ritmika_workspaces(id) on delete cascade,
  response_id uuid references public.ritmika_responses(id) on delete cascade,
  checklist_id uuid references public.ritmika_checklists(id) on delete set null,
  checklist_item_id uuid references public.ritmika_checklist_items(id) on delete set null,
  profile_id uuid references public.ritmika_profiles(id) on delete set null,
  source_id text,
  kind text not null default 'photo',
  title text,
  storage_bucket text not null default 'ritmika-evidences',
  storage_path text not null,
  mime_type text,
  size_bytes bigint,
  checksum text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, storage_path)
);

create table if not exists public.ritmika_notifications (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.ritmika_workspaces(id) on delete cascade,
  recipient_profile_id uuid references public.ritmika_profiles(id) on delete cascade,
  source_id text,
  kind text not null default 'system',
  title text not null,
  body text,
  route text,
  entity_type text,
  entity_id text,
  read_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (workspace_id, source_id)
);

create table if not exists public.ritmika_execution_events (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.ritmika_workspaces(id) on delete cascade,
  response_id uuid not null references public.ritmika_responses(id) on delete cascade,
  profile_id uuid references public.ritmika_profiles(id) on delete set null,
  event_type text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.ritmika_workspace_settings (
  workspace_id uuid primary key references public.ritmika_workspaces(id) on delete cascade,
  default_theme text not null default 'light',
  timezone text not null default 'America/Sao_Paulo',
  locale text not null default 'pt-BR',
  settings jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create index if not exists ritmika_items_workspace_idx on public.ritmika_checklist_items(workspace_id, checklist_id, position);
create index if not exists ritmika_products_workspace_idx on public.ritmika_products(workspace_id, checklist_id, position);
create index if not exists ritmika_counts_workspace_date_idx on public.ritmika_count_entries(workspace_id, count_date desc);
create index if not exists ritmika_counts_checklist_idx on public.ritmika_count_entries(workspace_id, checklist_id, count_date desc);
create index if not exists ritmika_evidences_response_idx on public.ritmika_evidences(workspace_id, response_id, created_at desc);
create index if not exists ritmika_notifications_recipient_idx on public.ritmika_notifications(workspace_id, recipient_profile_id, read_at, created_at desc);
create index if not exists ritmika_events_response_idx on public.ritmika_execution_events(workspace_id, response_id, created_at);

insert into public.ritmika_workspace_settings (workspace_id)
select id from public.ritmika_workspaces
on conflict (workspace_id) do update set default_theme = 'light';

insert into public.ritmika_checklist_items (
  workspace_id, checklist_id, source_id, position, title, description,
  item_type, required, weight, config, evidences, metadata
)
select
  c.workspace_id,
  c.id,
  coalesce(item->>'id', c.source_id || '-item-' || elements.ordinality::text),
  elements.ordinality - 1,
  coalesce(item->>'title', item->>'name', item->>'text', 'Item ' || elements.ordinality::text),
  coalesce(item->>'description', item->>'descricao'),
  coalesce(item->>'type', item->>'tipo_resposta', 'check'),
  coalesce((item->>'required')::boolean, (item->>'is_required')::boolean, true),
  coalesce((item->>'weight')::numeric, 1),
  case when jsonb_typeof(item->'config') = 'object' then item->'config' else '{}'::jsonb end,
  case when jsonb_typeof(item->'evidences') = 'array' then item->'evidences' else '[]'::jsonb end,
  item
from public.ritmika_checklists c
cross join lateral jsonb_array_elements(case when jsonb_typeof(c.items) = 'array' then c.items else '[]'::jsonb end)
  with ordinality as elements(item, ordinality)
on conflict (checklist_id, source_id) do update set
  position = excluded.position,
  title = excluded.title,
  description = excluded.description,
  item_type = excluded.item_type,
  required = excluded.required,
  weight = excluded.weight,
  config = excluded.config,
  evidences = excluded.evidences,
  metadata = excluded.metadata,
  updated_at = now();

insert into public.ritmika_products (
  workspace_id, checklist_id, checklist_item_id, source_id, name, category,
  unit, minimum_quantity, supplier, position, metadata
)
select
  i.workspace_id,
  i.checklist_id,
  i.id,
  i.source_id,
  i.title,
  coalesce(i.config->>'category', 'Checklist'),
  coalesce(i.config->>'unit', 'item'),
  coalesce((i.config->>'min')::numeric, (i.config->>'minimum')::numeric),
  i.config->>'supplier',
  i.position,
  i.metadata
from public.ritmika_checklist_items i
on conflict (checklist_id, source_id) do update set
  checklist_item_id = excluded.checklist_item_id,
  name = excluded.name,
  category = excluded.category,
  unit = excluded.unit,
  minimum_quantity = excluded.minimum_quantity,
  supplier = excluded.supplier,
  position = excluded.position,
  metadata = excluded.metadata,
  updated_at = now();

insert into storage.buckets (id, name, public)
values ('ritmika-evidences', 'ritmika-evidences', false)
on conflict (id) do update set public = false;

alter table public.ritmika_checklist_items enable row level security;
alter table public.ritmika_products enable row level security;
alter table public.ritmika_count_entries enable row level security;
alter table public.ritmika_evidences enable row level security;
alter table public.ritmika_notifications enable row level security;
alter table public.ritmika_execution_events enable row level security;
alter table public.ritmika_workspace_settings enable row level security;

grant select, insert, update, delete on public.ritmika_checklist_items,
  public.ritmika_products,
  public.ritmika_count_entries,
  public.ritmika_evidences,
  public.ritmika_notifications,
  public.ritmika_execution_events,
  public.ritmika_workspace_settings to authenticated;

drop policy if exists ritmika_items_all on public.ritmika_checklist_items;
create policy ritmika_items_all on public.ritmika_checklist_items
  for all to authenticated
  using (private.ritmika_has_workspace_access(workspace_id))
  with check (private.ritmika_has_workspace_access(workspace_id));

drop policy if exists ritmika_products_all on public.ritmika_products;
create policy ritmika_products_all on public.ritmika_products
  for all to authenticated
  using (private.ritmika_has_workspace_access(workspace_id))
  with check (private.ritmika_has_workspace_access(workspace_id));

drop policy if exists ritmika_counts_all on public.ritmika_count_entries;
create policy ritmika_counts_all on public.ritmika_count_entries
  for all to authenticated
  using (private.ritmika_has_workspace_access(workspace_id))
  with check (private.ritmika_has_workspace_access(workspace_id));

drop policy if exists ritmika_evidences_all on public.ritmika_evidences;
create policy ritmika_evidences_all on public.ritmika_evidences
  for all to authenticated
  using (private.ritmika_has_workspace_access(workspace_id))
  with check (private.ritmika_has_workspace_access(workspace_id));

drop policy if exists ritmika_notifications_select on public.ritmika_notifications;
create policy ritmika_notifications_select on public.ritmika_notifications
  for select to authenticated
  using (private.ritmika_has_workspace_access(workspace_id));
drop policy if exists ritmika_notifications_insert on public.ritmika_notifications;
create policy ritmika_notifications_insert on public.ritmika_notifications
  for insert to authenticated
  with check (private.ritmika_has_workspace_access(workspace_id));
drop policy if exists ritmika_notifications_update on public.ritmika_notifications;
create policy ritmika_notifications_update on public.ritmika_notifications
  for update to authenticated
  using (private.ritmika_has_workspace_access(workspace_id))
  with check (private.ritmika_has_workspace_access(workspace_id));

drop policy if exists ritmika_events_all on public.ritmika_execution_events;
create policy ritmika_events_all on public.ritmika_execution_events
  for all to authenticated
  using (private.ritmika_has_workspace_access(workspace_id))
  with check (private.ritmika_has_workspace_access(workspace_id));

drop policy if exists ritmika_settings_all on public.ritmika_workspace_settings;
create policy ritmika_settings_all on public.ritmika_workspace_settings
  for all to authenticated
  using (private.ritmika_has_workspace_access(workspace_id))
  with check (private.ritmika_has_workspace_access(workspace_id));

drop policy if exists ritmika_evidence_storage_insert on storage.objects;
create policy ritmika_evidence_storage_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'ritmika-evidences'
    and split_part(name, '/', 1) ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
    and private.ritmika_has_workspace_access(split_part(name, '/', 1)::uuid)
  );

drop policy if exists ritmika_evidence_storage_select on storage.objects;
create policy ritmika_evidence_storage_select on storage.objects
  for select to authenticated
  using (
    bucket_id = 'ritmika-evidences'
    and exists (
      select 1 from public.ritmika_evidences e
      where e.storage_bucket = bucket_id
        and e.storage_path = name
        and private.ritmika_has_workspace_access(e.workspace_id)
    )
  );

drop policy if exists ritmika_evidence_storage_update on storage.objects;
create policy ritmika_evidence_storage_update on storage.objects
  for update to authenticated
  using (
    bucket_id = 'ritmika-evidences'
    and exists (
      select 1 from public.ritmika_evidences e
      where e.storage_bucket = bucket_id
        and e.storage_path = name
        and private.ritmika_has_workspace_access(e.workspace_id)
    )
  )
  with check (bucket_id = 'ritmika-evidences');

drop policy if exists ritmika_evidence_storage_delete on storage.objects;
create policy ritmika_evidence_storage_delete on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'ritmika-evidences'
    and exists (
      select 1 from public.ritmika_evidences e
      where e.storage_bucket = bucket_id
        and e.storage_path = name
        and private.ritmika_has_workspace_access(e.workspace_id)
    )
  );

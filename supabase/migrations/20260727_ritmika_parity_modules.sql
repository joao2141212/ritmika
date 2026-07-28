create table if not exists public.ritmika_evidence_ai_analyses (
    id uuid primary key default gen_random_uuid(),
    workspace_id uuid not null,
    evidence_id uuid,
    response_id uuid,
    status text not null default 'pending',
    score numeric(5, 2),
    alert text,
    summary text,
    analysis jsonb not null default '{}'::jsonb,
    metadata jsonb not null default '{}'::jsonb,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create table if not exists public.ritmika_lms_courses (
    id uuid primary key default gen_random_uuid(),
    workspace_id uuid not null,
    source_id text,
    slug text,
    title text not null,
    description text,
    thumbnail_url text,
    is_published boolean not null default false,
    metadata jsonb not null default '{}'::jsonb,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create table if not exists public.ritmika_lms_modules (
    id uuid primary key default gen_random_uuid(),
    workspace_id uuid not null,
    course_id uuid not null references public.ritmika_lms_courses(id) on delete cascade,
    source_id text,
    title text not null,
    description text,
    position integer not null default 0,
    is_published boolean not null default false,
    deleted_at timestamptz,
    metadata jsonb not null default '{}'::jsonb,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create table if not exists public.ritmika_lms_lessons (
    id uuid primary key default gen_random_uuid(),
    workspace_id uuid not null,
    course_id uuid not null references public.ritmika_lms_courses(id) on delete cascade,
    module_id uuid not null references public.ritmika_lms_modules(id) on delete cascade,
    source_id text,
    title text not null,
    description text,
    content jsonb not null default '{}'::jsonb,
    duration_seconds integer,
    position integer not null default 0,
    is_published boolean not null default false,
    deleted_at timestamptz,
    metadata jsonb not null default '{}'::jsonb,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create table if not exists public.ritmika_lms_lesson_progress (
    id uuid primary key default gen_random_uuid(),
    workspace_id uuid not null,
    profile_id uuid not null,
    lesson_id uuid not null references public.ritmika_lms_lessons(id) on delete cascade,
    progress_percent numeric(5, 2) not null default 0,
    last_position_seconds integer not null default 0,
    completed_at timestamptz,
    metadata jsonb not null default '{}'::jsonb,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    unique (workspace_id, profile_id, lesson_id)
);

create table if not exists public.ritmika_product_ideas (
    id uuid primary key default gen_random_uuid(),
    workspace_id uuid not null,
    author_profile_id uuid,
    title text not null,
    description text,
    status text not null default 'open',
    category text,
    metadata jsonb not null default '{}'::jsonb,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create table if not exists public.ritmika_product_idea_votes (
    id uuid primary key default gen_random_uuid(),
    workspace_id uuid not null,
    idea_id uuid not null references public.ritmika_product_ideas(id) on delete cascade,
    profile_id uuid not null,
    created_at timestamptz not null default now(),
    unique (workspace_id, idea_id, profile_id)
);

create table if not exists public.ritmika_product_news_entries (
    id uuid primary key default gen_random_uuid(),
    workspace_id uuid,
    source_id text,
    title text not null,
    summary text,
    body text,
    category text not null default 'new',
    published_at timestamptz,
    is_published boolean not null default false,
    metadata jsonb not null default '{}'::jsonb,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create table if not exists public.ritmika_support_settings (
    workspace_id uuid primary key,
    whatsapp_url text,
    email text,
    tutorials jsonb not null default '[]'::jsonb,
    faq jsonb not null default '[]'::jsonb,
    metadata jsonb not null default '{}'::jsonb,
    updated_at timestamptz not null default now()
);

create table if not exists public.ritmika_ai_credit_wallets (
    workspace_id uuid primary key,
    included_credits integer not null default 0,
    purchased_credits integer not null default 0,
    consumed_credits integer not null default 0,
    reset_at timestamptz,
    metadata jsonb not null default '{}'::jsonb,
    updated_at timestamptz not null default now()
);

create table if not exists public.ritmika_workspace_billing (
    workspace_id uuid primary key,
    plan_name text,
    status text,
    currency text not null default 'BRL',
    amount_cents integer,
    period_end timestamptz,
    metadata jsonb not null default '{}'::jsonb,
    updated_at timestamptz not null default now()
);

create table if not exists public.ritmika_workspace_api_settings (
    workspace_id uuid primary key,
    endpoint_url text,
    webhook_url text,
    public_key text,
    metadata jsonb not null default '{}'::jsonb,
    updated_at timestamptz not null default now()
);

create index if not exists ritmika_evidence_ai_analyses_workspace_created_idx on public.ritmika_evidence_ai_analyses (workspace_id, created_at desc);
create index if not exists ritmika_lms_courses_workspace_published_idx on public.ritmika_lms_courses (workspace_id, is_published, updated_at desc);
create index if not exists ritmika_lms_modules_course_position_idx on public.ritmika_lms_modules (workspace_id, course_id, deleted_at, position);
create index if not exists ritmika_lms_lessons_module_position_idx on public.ritmika_lms_lessons (workspace_id, module_id, deleted_at, position);
create index if not exists ritmika_lms_progress_profile_idx on public.ritmika_lms_lesson_progress (workspace_id, profile_id, lesson_id);
create index if not exists ritmika_product_ideas_workspace_status_idx on public.ritmika_product_ideas (workspace_id, status, created_at desc);
create index if not exists ritmika_product_news_published_idx on public.ritmika_product_news_entries (workspace_id, is_published, published_at desc);

alter table public.ritmika_evidence_ai_analyses enable row level security;
alter table public.ritmika_lms_courses enable row level security;
alter table public.ritmika_lms_modules enable row level security;
alter table public.ritmika_lms_lessons enable row level security;
alter table public.ritmika_lms_lesson_progress enable row level security;
alter table public.ritmika_product_ideas enable row level security;
alter table public.ritmika_product_idea_votes enable row level security;
alter table public.ritmika_product_news_entries enable row level security;
alter table public.ritmika_support_settings enable row level security;
alter table public.ritmika_ai_credit_wallets enable row level security;
alter table public.ritmika_workspace_billing enable row level security;
alter table public.ritmika_workspace_api_settings enable row level security;

do $$
begin
    if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'ritmika_evidence_ai_analyses' and policyname = 'ritmika_evidence_ai_analyses_workspace') then
        create policy ritmika_evidence_ai_analyses_workspace on public.ritmika_evidence_ai_analyses for all using (private.ritmika_has_workspace_access(workspace_id)) with check (private.ritmika_has_workspace_access(workspace_id));
    end if;
    if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'ritmika_lms_courses' and policyname = 'ritmika_lms_courses_workspace') then
        create policy ritmika_lms_courses_workspace on public.ritmika_lms_courses for all using (private.ritmika_has_workspace_access(workspace_id)) with check (private.ritmika_has_workspace_access(workspace_id));
    end if;
    if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'ritmika_lms_modules' and policyname = 'ritmika_lms_modules_workspace') then
        create policy ritmika_lms_modules_workspace on public.ritmika_lms_modules for all using (private.ritmika_has_workspace_access(workspace_id)) with check (private.ritmika_has_workspace_access(workspace_id));
    end if;
    if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'ritmika_lms_lessons' and policyname = 'ritmika_lms_lessons_workspace') then
        create policy ritmika_lms_lessons_workspace on public.ritmika_lms_lessons for all using (private.ritmika_has_workspace_access(workspace_id)) with check (private.ritmika_has_workspace_access(workspace_id));
    end if;
    if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'ritmika_lms_lesson_progress' and policyname = 'ritmika_lms_lesson_progress_workspace') then
        create policy ritmika_lms_lesson_progress_workspace on public.ritmika_lms_lesson_progress for all using (private.ritmika_has_workspace_access(workspace_id)) with check (private.ritmika_has_workspace_access(workspace_id));
    end if;
    if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'ritmika_product_ideas' and policyname = 'ritmika_product_ideas_workspace') then
        create policy ritmika_product_ideas_workspace on public.ritmika_product_ideas for all using (private.ritmika_has_workspace_access(workspace_id)) with check (private.ritmika_has_workspace_access(workspace_id));
    end if;
    if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'ritmika_product_idea_votes' and policyname = 'ritmika_product_idea_votes_workspace') then
        create policy ritmika_product_idea_votes_workspace on public.ritmika_product_idea_votes for all using (private.ritmika_has_workspace_access(workspace_id)) with check (private.ritmika_has_workspace_access(workspace_id));
    end if;
    if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'ritmika_product_news_entries' and policyname = 'ritmika_product_news_entries_select') then
        create policy ritmika_product_news_entries_select on public.ritmika_product_news_entries for select using (workspace_id is null or private.ritmika_has_workspace_access(workspace_id));
    end if;
    if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'ritmika_product_news_entries' and policyname = 'ritmika_product_news_entries_write') then
        create policy ritmika_product_news_entries_write on public.ritmika_product_news_entries for all using (workspace_id is not null and private.ritmika_has_workspace_access(workspace_id)) with check (workspace_id is not null and private.ritmika_has_workspace_access(workspace_id));
    end if;
    if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'ritmika_support_settings' and policyname = 'ritmika_support_settings_workspace') then
        create policy ritmika_support_settings_workspace on public.ritmika_support_settings for all using (private.ritmika_has_workspace_access(workspace_id)) with check (private.ritmika_has_workspace_access(workspace_id));
    end if;
    if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'ritmika_ai_credit_wallets' and policyname = 'ritmika_ai_credit_wallets_workspace') then
        create policy ritmika_ai_credit_wallets_workspace on public.ritmika_ai_credit_wallets for select using (private.ritmika_has_workspace_access(workspace_id));
    end if;
    if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'ritmika_workspace_billing' and policyname = 'ritmika_workspace_billing_workspace') then
        create policy ritmika_workspace_billing_workspace on public.ritmika_workspace_billing for select using (private.ritmika_has_workspace_access(workspace_id));
    end if;
    if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'ritmika_workspace_api_settings' and policyname = 'ritmika_workspace_api_settings_workspace') then
        create policy ritmika_workspace_api_settings_workspace on public.ritmika_workspace_api_settings for all using (private.ritmika_has_workspace_access(workspace_id)) with check (private.ritmika_has_workspace_access(workspace_id));
    end if;
end;
$$;

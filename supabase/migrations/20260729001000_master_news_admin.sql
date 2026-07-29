begin;

create or replace function public.ritmika_is_platform_admin()
returns boolean
language sql
stable
security definer
set search_path = public, auth
as $$
    select coalesce(
        (auth.jwt() -> 'app_metadata' ->> 'platform_admin')::boolean,
        false
    );
$$;

revoke all on function public.ritmika_is_platform_admin() from public;
grant execute on function public.ritmika_is_platform_admin() to authenticated;

alter table public.ritmika_product_news_entries enable row level security;

drop policy if exists ritmika_product_news_entries_platform_admin_all
    on public.ritmika_product_news_entries;
create policy ritmika_product_news_entries_platform_admin_all
    on public.ritmika_product_news_entries
    for all
    to authenticated
    using (public.ritmika_is_platform_admin())
    with check (public.ritmika_is_platform_admin());

drop policy if exists ritmika_workspaces_platform_admin_select
    on public.ritmika_workspaces;
create policy ritmika_workspaces_platform_admin_select
    on public.ritmika_workspaces
    for select
    to authenticated
    using (public.ritmika_is_platform_admin());

create index if not exists ritmika_product_news_entries_master_status_idx
    on public.ritmika_product_news_entries (is_published, updated_at desc);

create index if not exists ritmika_product_news_entries_master_workspace_idx
    on public.ritmika_product_news_entries (workspace_id, updated_at desc);

commit;

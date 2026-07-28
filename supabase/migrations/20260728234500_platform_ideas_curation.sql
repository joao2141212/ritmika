create table if not exists public.ritmika_platform_admins (
    user_id uuid primary key references auth.users(id) on delete cascade,
    role text not null default 'owner' check (role in ('owner', 'curator')),
    active boolean not null default true,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

alter table public.ritmika_platform_admins enable row level security;

drop policy if exists "platform admins can read own access" on public.ritmika_platform_admins;
create policy "platform admins can read own access"
on public.ritmika_platform_admins
for select
to authenticated
using (user_id = auth.uid() and active);

alter table public.ritmika_product_ideas
    add column if not exists priority text not null default 'none'
        check (priority in ('none', 'low', 'medium', 'high', 'critical')),
    add column if not exists admin_note text,
    add column if not exists curated_at timestamptz,
    add column if not exists curated_by uuid references auth.users(id) on delete set null;

create or replace function public.ritmika_is_platform_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
    select exists (
        select 1
        from public.ritmika_platform_admins administrator
        where administrator.user_id = auth.uid()
          and administrator.active
    );
$$;

create or replace function public.ritmika_admin_list_ideas(
    p_status text default null,
    p_priority text default null,
    p_workspace_id uuid default null,
    p_search text default null
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
    result jsonb;
    normalized_search text := nullif(
        regexp_replace(
            translate(
                lower(trim(coalesce(p_search, ''))),
                'áàâãäéèêëíìîïóòôõöúùûüç',
                'aaaaaeeeeiiiiooooouuuuc'
            ),
            '\s+',
            ' ',
            'g'
        ),
        ''
    );
begin
    if not public.ritmika_is_platform_admin() then
        raise exception 'PLATFORM_ADMIN_REQUIRED' using errcode = '42501';
    end if;

    select coalesce(jsonb_agg(to_jsonb(item) order by item.created_at desc), '[]'::jsonb)
    into result
    from (
        select
            idea.id,
            idea.workspace_id,
            workspace.name as workspace_name,
            idea.author_profile_id,
            profile.name as author_name,
            profile.email as author_email,
            idea.title,
            idea.description,
            idea.category,
            idea.status,
            idea.priority,
            idea.admin_note,
            idea.created_at,
            idea.updated_at,
            idea.curated_at,
            count(vote.id)::integer as vote_count
        from public.ritmika_product_ideas idea
        left join public.ritmika_workspaces workspace on workspace.id = idea.workspace_id
        left join public.ritmika_profiles profile on profile.id = idea.author_profile_id
        left join public.ritmika_product_idea_votes vote on vote.idea_id = idea.id
        where (p_status is null or p_status = '' or idea.status = p_status)
          and (p_priority is null or p_priority = '' or idea.priority = p_priority)
          and (p_workspace_id is null or idea.workspace_id = p_workspace_id)
          and (
              normalized_search is null
              or regexp_replace(
                  translate(
                      lower(concat_ws(' ', idea.title, idea.description, idea.category, workspace.name, profile.name, profile.email)),
                      'áàâãäéèêëíìîïóòôõöúùûüç',
                      'aaaaaeeeeiiiiooooouuuuc'
                  ),
                  '\s+',
                  ' ',
                  'g'
              ) like '%' || normalized_search || '%'
          )
        group by idea.id, workspace.name, profile.name, profile.email
    ) item;

    return result;
end;
$$;

create or replace function public.ritmika_admin_update_idea(
    p_idea_id uuid,
    p_status text,
    p_priority text,
    p_admin_note text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
    updated_idea public.ritmika_product_ideas;
begin
    if not public.ritmika_is_platform_admin() then
        raise exception 'PLATFORM_ADMIN_REQUIRED' using errcode = '42501';
    end if;

    if p_status not in ('open', 'in_progress', 'planned', 'closed', 'declined') then
        raise exception 'INVALID_IDEA_STATUS' using errcode = '22023';
    end if;

    if p_priority not in ('none', 'low', 'medium', 'high', 'critical') then
        raise exception 'INVALID_IDEA_PRIORITY' using errcode = '22023';
    end if;

    update public.ritmika_product_ideas
    set status = p_status,
        priority = p_priority,
        admin_note = nullif(trim(coalesce(p_admin_note, '')), ''),
        curated_at = now(),
        curated_by = auth.uid(),
        updated_at = now()
    where id = p_idea_id
    returning * into updated_idea;

    if updated_idea.id is null then
        raise exception 'IDEA_NOT_FOUND' using errcode = 'P0002';
    end if;

    return to_jsonb(updated_idea);
end;
$$;

grant execute on function public.ritmika_is_platform_admin() to authenticated;
grant execute on function public.ritmika_admin_list_ideas(text, text, uuid, text) to authenticated;
grant execute on function public.ritmika_admin_update_idea(uuid, text, text, text) to authenticated;

create index if not exists ritmika_product_ideas_platform_queue_idx
on public.ritmika_product_ideas (status, priority, created_at desc);

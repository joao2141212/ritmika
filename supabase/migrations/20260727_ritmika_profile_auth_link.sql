alter table public.ritmika_profiles
  drop constraint if exists ritmika_profiles_id_fkey;

alter table public.ritmika_profiles
  add column if not exists auth_user_id uuid references auth.users(id) on delete set null;

create unique index if not exists ritmika_profiles_workspace_auth_idx
  on public.ritmika_profiles(workspace_id, auth_user_id)
  where auth_user_id is not null;

drop policy if exists ritmika_profiles_update on public.ritmika_profiles;
create policy ritmika_profiles_update on public.ritmika_profiles
  for update to authenticated
  using (auth_user_id = (select auth.uid()))
  with check (auth_user_id = (select auth.uid()));

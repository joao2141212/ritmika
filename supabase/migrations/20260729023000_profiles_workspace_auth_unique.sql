do $$
begin
    alter table public.ritmika_profiles
        alter column id set default gen_random_uuid();

    if not exists (
        select 1
        from pg_constraint
        where conname = 'ritmika_profiles_workspace_auth_user_key'
          and conrelid = 'public.ritmika_profiles'::regclass
    ) then
        alter table public.ritmika_profiles
            add constraint ritmika_profiles_workspace_auth_user_key
            unique (workspace_id, auth_user_id);
    end if;
end
$$;

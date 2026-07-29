-- Invalidação multiempresa por Broadcast. O payload sinaliza somente qual
-- tabela mudou; o cliente relê os dados sob RLS e nunca recebe dados de outro
-- workspace pelo evento.

create or replace function public.ritmika_broadcast_workspace_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  workspace_value text;
begin
  workspace_value := coalesce(
    to_jsonb(new)->>'workspace_id',
    to_jsonb(old)->>'workspace_id'
  );

  if workspace_value is null then
    if tg_op = 'DELETE' then return old; end if;
    return new;
  end if;

  perform realtime.broadcast_changes(
    'workspace:' || workspace_value,
    tg_op,
    tg_op,
    tg_table_name,
    tg_table_schema,
    new,
    old
  );

  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;

revoke all on function public.ritmika_broadcast_workspace_change() from public;
revoke all on function public.ritmika_broadcast_workspace_change() from anon;
revoke all on function public.ritmika_broadcast_workspace_change() from authenticated;

drop policy if exists "ritmika workspace members receive broadcasts" on realtime.messages;
create policy "ritmika workspace members receive broadcasts"
on realtime.messages
for select
to authenticated
using (
  (select realtime.topic()) like 'workspace:%'
  and exists (
    select 1
    from public.ritmika_workspace_members member
    where member.user_id = (select auth.uid())
      and member.workspace_id::text = split_part((select realtime.topic()), ':', 2)
  )
);

do $$
declare
  target record;
begin
  for target in
    select columns.table_schema, columns.table_name
    from information_schema.columns
    where columns.column_name = 'workspace_id'
      and columns.table_schema = 'public'
      and columns.table_name like 'ritmika\_%' escape '\'
  loop
    execute format(
      'drop trigger if exists ritmika_workspace_broadcast on %I.%I',
      target.table_schema,
      target.table_name
    );
    execute format(
      'create trigger ritmika_workspace_broadcast after insert or update or delete on %I.%I for each row execute function public.ritmika_broadcast_workspace_change()',
      target.table_schema,
      target.table_name
    );
  end loop;
end;
$$;

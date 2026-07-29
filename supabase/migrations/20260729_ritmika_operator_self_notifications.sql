begin;

create or replace function public.ritmika_notify_self(
  p_workspace_id uuid,
  p_source_id text,
  p_kind text default 'system',
  p_title text default 'Atualização do workspace',
  p_body text default null,
  p_route text default '/app/notifications',
  p_entity_type text default null,
  p_entity_id text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns public.ritmika_notifications
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
declare
  v_profile_id uuid;
  v_notification public.ritmika_notifications;
begin
  if auth.uid() is null or not private.ritmika_has_workspace_access(p_workspace_id) then
    raise exception 'workspace_access_denied' using errcode = '42501';
  end if;

  v_profile_id := private.ritmika_current_profile_id(p_workspace_id);
  if v_profile_id is null then
    raise exception 'workspace_profile_not_found' using errcode = '42501';
  end if;

  insert into public.ritmika_notifications (
    workspace_id,
    recipient_profile_id,
    source_id,
    kind,
    title,
    body,
    route,
    entity_type,
    entity_id,
    metadata
  ) values (
    p_workspace_id,
    v_profile_id,
    coalesce(nullif(p_source_id, ''), 'self:' || gen_random_uuid()::text),
    coalesce(nullif(p_kind, ''), 'system'),
    coalesce(nullif(p_title, ''), 'Atualização do workspace'),
    p_body,
    coalesce(nullif(p_route, ''), '/app/notifications'),
    p_entity_type,
    p_entity_id,
    coalesce(p_metadata, '{}'::jsonb)
  )
  on conflict (workspace_id, source_id) do update set
    title = excluded.title,
    body = excluded.body,
    route = excluded.route,
    entity_type = excluded.entity_type,
    entity_id = excluded.entity_id,
    metadata = excluded.metadata
  returning * into v_notification;

  return v_notification;
end;
$$;

revoke all on function public.ritmika_notify_self(uuid, text, text, text, text, text, text, text, jsonb) from public;
grant execute on function public.ritmika_notify_self(uuid, text, text, text, text, text, text, text, jsonb) to authenticated;

comment on function public.ritmika_notify_self(uuid, text, text, text, text, text, text, text, jsonb)
is 'Cria ou atualiza uma notificação somente para o próprio perfil autenticado no workspace informado.';

commit;

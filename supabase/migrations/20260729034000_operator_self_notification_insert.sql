create policy "ritmika_notifications_insert_self"
on public.ritmika_notifications
for insert
to authenticated
with check (
  recipient_profile_id = private.ritmika_current_profile_id(workspace_id)
);

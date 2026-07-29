-- Managers can manage workspace notifications. Employees can only read and
-- acknowledge notifications addressed to them or broadcast to the workspace.
BEGIN;

DROP POLICY IF EXISTS ritmika_notifications_select ON public.ritmika_notifications;
DROP POLICY IF EXISTS ritmika_notifications_insert ON public.ritmika_notifications;
DROP POLICY IF EXISTS ritmika_notifications_update ON public.ritmika_notifications;

CREATE POLICY ritmika_notifications_select
ON public.ritmika_notifications
FOR SELECT TO authenticated
USING (
  private.ritmika_is_workspace_manager(workspace_id)
  OR recipient_profile_id IS NULL
  OR recipient_profile_id = private.ritmika_current_profile_id(workspace_id)
);

CREATE POLICY ritmika_notifications_insert
ON public.ritmika_notifications
FOR INSERT TO authenticated
WITH CHECK (private.ritmika_is_workspace_manager(workspace_id));

CREATE POLICY ritmika_notifications_update
ON public.ritmika_notifications
FOR UPDATE TO authenticated
USING (
  private.ritmika_is_workspace_manager(workspace_id)
  OR recipient_profile_id = private.ritmika_current_profile_id(workspace_id)
)
WITH CHECK (
  private.ritmika_is_workspace_manager(workspace_id)
  OR recipient_profile_id = private.ritmika_current_profile_id(workspace_id)
);

COMMIT;

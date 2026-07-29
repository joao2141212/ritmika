import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const json = (body: Record<string, unknown>, status = 200) => new Response(
  JSON.stringify(body),
  { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
);

Deno.serve(async (request) => {
  const correlationId = crypto.randomUUID();
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (request.method !== 'POST') return json({ error: 'method_not_allowed', correlationId }, 405);
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const publishableKey = Deno.env.get('SUPABASE_ANON_KEY') || Deno.env.get('SUPABASE_PUBLISHABLE_KEY') || '';
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    const authorization = request.headers.get('Authorization') || '';
    if (!supabaseUrl || !publishableKey || !serviceRoleKey || !authorization) {
      return json({ error: 'server_auth_not_configured', correlationId }, 500);
    }
    const callerClient = createClient(supabaseUrl, publishableKey, {
      global: { headers: { Authorization: authorization } },
      auth: { persistSession: false },
    });
    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: callerData, error: callerError } = await callerClient.auth.getUser();
    if (callerError || !callerData.user) return json({ error: 'unauthorized', correlationId }, 401);

    const body = await request.json();
    const workspaceId = String(body?.workspace_id || '');
    const targetUserId = String(body?.user_id || '');
    const password = String(body?.password || '');
    if (!/^[0-9a-f-]{36}$/i.test(workspaceId) || !/^[0-9a-f-]{36}$/i.test(targetUserId)) {
      return json({ error: 'invalid_target', correlationId }, 400);
    }
    if (password.length < 12) return json({ error: 'password_minimum_12_chars', correlationId }, 400);

    const { data: callerMembership, error: callerMembershipError } = await adminClient
      .from('ritmika_workspace_members')
      .select('role,is_owner')
      .eq('workspace_id', workspaceId)
      .eq('user_id', callerData.user.id)
      .maybeSingle();
    if (callerMembershipError) throw callerMembershipError;
    const callerRole = String(callerMembership?.role || '').toLowerCase();
    if (!callerMembership || (!callerMembership.is_owner && !['owner', 'admin', 'manager'].includes(callerRole))) {
      return json({ error: 'manager_permission_required', correlationId }, 403);
    }

    const { data: targetMembership, error: targetMembershipError } = await adminClient
      .from('ritmika_workspace_members')
      .select('user_id')
      .eq('workspace_id', workspaceId)
      .eq('user_id', targetUserId)
      .maybeSingle();
    if (targetMembershipError) throw targetMembershipError;
    if (!targetMembership) return json({ error: 'target_outside_workspace', correlationId }, 404);

    const { error: updateError } = await adminClient.auth.admin.updateUserById(targetUserId, {
      password,
      user_metadata: {
        password_reset_by: callerData.user.id,
        password_reset_at: new Date().toISOString(),
        must_change_password: true,
      },
    });
    if (updateError) throw updateError;
    console.info(JSON.stringify({ app: 'ritmika', layer: 'edge-function', fn: 'reset-member-password', status: 'ok', correlationId, workspaceId, targetUserId, actorUserId: callerData.user.id }));
    return json({ status: 'password_reset', correlationId });
  } catch (error) {
    console.error(JSON.stringify({ app: 'ritmika', layer: 'edge-function', fn: 'reset-member-password', status: 'error', correlationId, error: error instanceof Error ? error.message : String(error) }));
    return json({ error: 'password_reset_failed', correlationId }, 500);
  }
});

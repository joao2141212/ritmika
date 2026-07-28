import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-ritmika-correlation-id, x-ritmika-client',
  'Access-Control-Expose-Headers': 'x-ritmika-correlation-id',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const errorText = (error: unknown) => error instanceof Error ? error.message : String(error);

const json = (body: Record<string, unknown>, status = 200) => {
    const correlationId = body?.correlationId;
    if (status >= 400) {
        console.warn(JSON.stringify({
            app: 'ritmika',
            layer: 'edge-function',
            level: status >= 500 ? 'error' : 'warn',
            at: new Date().toISOString(),
            eventId: crypto.randomUUID(),
            file: 'supabase/functions/invite-user/index.ts',
            function: 'invite-user.jsonResponse',
            operation: 'invite-user.response',
            errorCode: `EDGE_HTTP_${status}`,
            correlationId,
            statusCode: status,
            error: errorText(body?.error || 'Edge Function response error').slice(0, 500),
            stack: new Error().stack?.slice(0, 2000),
        }));
    }
    return new Response(JSON.stringify(body), {
        status,
        headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
            ...(correlationId ? { 'x-ritmika-correlation-id': String(correlationId) } : {}),
        },
    });
};

const logError = (correlationId: string, fn: string, error: unknown, context: Record<string, unknown> = {}) => {
    console.error(JSON.stringify({
        app: 'ritmika',
        layer: 'edge-function',
        level: 'error',
        at: new Date().toISOString(),
        eventId: crypto.randomUUID(),
        file: 'supabase/functions/invite-user/index.ts',
        function: `invite-user.${fn}`,
        operation: `invite-user.${fn}`,
        errorCode: context.errorCode || 'EDGE_FUNCTION_ERROR',
        fn: `invite-user.${fn}`,
        status: 'error',
        correlationId,
        ...context,
        error: errorText(error),
    }));
};

Deno.serve(async (request) => {
  const correlationId = request.headers.get('x-ritmika-correlation-id') || crypto.randomUUID();
    if (request.method === 'OPTIONS') {
        return new Response('ok', {
            headers: { ...corsHeaders, 'x-ritmika-correlation-id': correlationId },
        });
    }
    if (request.method !== 'POST') return json({ error: 'Método não permitido.', correlationId }, 405);

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!supabaseUrl || !serviceRoleKey) {
        logError(correlationId, 'configuration', new Error('Credenciais do backend não configuradas.'));
        return json({ error: 'Backend de convite não configurado.', correlationId }, 500);
    }

    const admin = createClient(supabaseUrl, serviceRoleKey, {
        auth: { autoRefreshToken: false, persistSession: false },
    });
    const authorization = request.headers.get('Authorization') || '';
    const accessToken = authorization.replace(/^Bearer\s+/i, '').trim();
    if (!accessToken) return json({ error: 'Autenticação necessária.', correlationId }, 401);

    try {
        const { data: authData, error: authError } = await admin.auth.getUser(accessToken);
        if (authError || !authData.user) return json({ error: 'Sessão inválida.', correlationId }, 401);

        const { data: actor, error: actorError } = await admin
            .from('ritmika_profiles')
            .select('id,workspace_id,role,is_owner')
            .eq('auth_user_id', authData.user.id)
            .maybeSingle();
        if (actorError) throw actorError;
        if (!actor || !(actor.is_owner || ['owner', 'admin', 'manager'].includes(String(actor.role || '').toLowerCase()))) {
            return json({ error: 'Apenas gestores podem convidar usuários.', correlationId }, 403);
        }

        const payload = await request.json();
        const name = String(payload?.name || '').trim();
        const email = String(payload?.email || '').trim().toLowerCase();
        const role = String(payload?.role || 'operator').trim().toLowerCase();
        const managedUnits = Array.isArray(payload?.managed_units)
            ? payload.managed_units.map((value: unknown) => String(value)).filter(Boolean)
            : [];
        if (!name || !email || !email.includes('@')) return json({ error: 'Nome e e-mail são obrigatórios.', correlationId }, 400);
        if (!['admin', 'manager', 'operator', 'viewer'].includes(role)) return json({ error: 'Perfil de acesso inválido.', correlationId }, 400);

        if (managedUnits.length > 0) {
            const { data: validUnits, error: unitsError } = await admin
                .from('ritmika_units')
                .select('id')
                .eq('workspace_id', actor.workspace_id)
                .in('id', managedUnits);
            if (unitsError) throw unitsError;
            if ((validUnits || []).length !== new Set(managedUnits).size) {
                return json({ error: 'Uma ou mais unidades não pertencem ao workspace.', correlationId }, 400);
            }
        }

        const { data: invited, error: inviteError } = await admin.auth.admin.inviteUserByEmail(email, {
            data: { name, role, workspace_id: actor.workspace_id },
        });
        if (inviteError) throw inviteError;
        if (!invited.user) throw new Error('O provedor não retornou o usuário convidado.');

        const { data: profile, error: profileError } = await admin
            .from('ritmika_profiles')
            .upsert({
                workspace_id: actor.workspace_id,
                auth_user_id: invited.user.id,
                email,
                name,
                role,
                managed_units: managedUnits,
                metadata: { invited_by_profile_id: actor.id, invite_correlation_id: correlationId },
                updated_at: new Date().toISOString(),
            }, { onConflict: 'workspace_id,auth_user_id' })
            .select('id,workspace_id,auth_user_id,email,name,role,managed_units')
            .single();
        if (profileError) throw profileError;

        return json({ profile, correlationId }, 201);
    } catch (error) {
        logError(correlationId, 'request', error);
        return json({ error: errorText(error), correlationId }, 500);
    }
});

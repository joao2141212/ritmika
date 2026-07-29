import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-ritmika-correlation-id, x-ritmika-client',
  'Access-Control-Expose-Headers': 'x-ritmika-correlation-id',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const errorText = (error: unknown) => {
    if (error instanceof Error) return error.message;
    if (typeof error === 'string') return error;
    if (error && typeof error === 'object') {
        const value = error as Record<string, unknown>;
        const fields = ['message', 'details', 'hint', 'code']
            .map((key) => value[key] ? `${key}=${String(value[key])}` : '')
            .filter(Boolean);
        if (fields.length > 0) return fields.join(' | ');
        try {
            return JSON.stringify(value);
        } catch {
            return 'Erro não serializável.';
        }
    }
    return String(error);
};

const responseCaller = (stack: string | undefined) => {
    const frame = String(stack || '')
        .split('\n')
        .find((line) => line.includes('/index.ts') && !line.includes('jsonResponse'));
    const match = frame?.match(/at\s+(?:async\s+)?([^\s(]+).*index\.ts:(\d+):(\d+)/);
    return match ? `${match[1]}@${match[2]}:${match[3]}` : 'unknown';
};

const json = (body: Record<string, unknown>, status = 200) => {
    const correlationId = body?.correlationId;
    if (status >= 400) {
        const stack = new Error().stack;
        console.warn(JSON.stringify({
            app: 'ritmika',
            layer: 'edge-function',
            level: status >= 500 ? 'error' : 'warn',
            at: new Date().toISOString(),
            eventId: crypto.randomUUID(),
            file: 'supabase/functions/invite-user/index.ts',
            function: responseCaller(stack) === 'unknown' ? 'invite-user.jsonResponse' : responseCaller(stack),
            operation: 'invite-user.response',
            errorCode: `EDGE_HTTP_${status}`,
            correlationId,
            statusCode: status,
            error: errorText(body?.error || 'Edge Function response error').slice(0, 500),
            stack: stack?.slice(0, 2000),
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

const findAuthUserByEmail = async (
    admin: ReturnType<typeof createClient>,
    email: string,
) => {
    const perPage = 200;
    for (let page = 1; ; page += 1) {
        const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
        if (error) throw error;
        const match = data.users.find((user) => String(user.email || '').toLowerCase() === email);
        if (match) return match;
        if (data.users.length < perPage) return null;
    }
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
    const secretKey = Deno.env.get('SUPABASE_SECRET_KEY');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const adminKey = secretKey?.startsWith('sb_secret_') ? secretKey : serviceRoleKey;
    if (!supabaseUrl || !adminKey) {
        logError(correlationId, 'configuration', new Error('Credenciais do backend não configuradas.'));
        return json({ error: 'Backend de convite não configurado.', correlationId }, 500);
    }

    const admin = createClient(supabaseUrl, adminKey, {
        auth: { autoRefreshToken: false, persistSession: false },
    });
    const authorization = request.headers.get('Authorization') || '';
    const accessToken = authorization.replace(/^Bearer\s+/i, '').trim();
    if (!accessToken) return json({ error: 'Autenticação necessária.', correlationId }, 401);

    try {
        const { data: authData, error: authError } = await admin.auth.getUser(accessToken);
        if (authError || !authData.user) return json({ error: 'Sessão inválida.', correlationId }, 401);

        const payload = await request.json();
        const requestedWorkspaceId = String(payload?.workspace_id || '').trim();
        const name = String(payload?.name || '').trim();
        const email = String(payload?.email || '').trim().toLowerCase();
        const role = String(payload?.role || 'operator').trim().toLowerCase();
        const managedUnits = Array.isArray(payload?.managed_units)
            ? payload.managed_units.map((value: unknown) => String(value)).filter(Boolean)
            : [];
        if (!name || !email || !email.includes('@')) return json({ error: 'Nome e e-mail são obrigatórios.', correlationId }, 400);
        if (!['admin', 'manager', 'operator', 'viewer'].includes(role)) return json({ error: 'Perfil de acesso inválido.', correlationId }, 400);

        const { data: actorMemberships, error: actorError } = await admin
            .from('ritmika_workspace_members')
            .select('id,workspace_id,role,is_owner')
            .eq('user_id', authData.user.id);
        if (actorError) throw actorError;

        if (!requestedWorkspaceId && (actorMemberships || []).length > 1) {
            return json({ error: 'Selecione a empresa ativa para convidar usuários.', correlationId }, 409);
        }

        const actor = (actorMemberships || []).find((membership) => (
            membership.workspace_id === requestedWorkspaceId
            || (!requestedWorkspaceId && actorMemberships?.length === 1)
        ));
        if (!actor) {
            return json({ error: 'A empresa selecionada não pertence ao usuário autenticado.', correlationId }, 403);
        }
        if (!(actor.is_owner || ['owner', 'admin', 'manager'].includes(String(actor.role || '').toLowerCase()))) {
            return json({ error: 'Apenas gestores podem convidar usuários.', correlationId }, 403);
        }

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

        let invitedUser = await findAuthUserByEmail(admin, email);
        let invitationCreated = false;
        if (!invitedUser) {
            const { data: invited, error: inviteError } = await admin.auth.admin.inviteUserByEmail(email, {
                data: { name, role, workspace_id: actor.workspace_id },
            });
            if (inviteError) throw inviteError;
            if (!invited.user) throw new Error('O provedor não retornou o usuário convidado.');
            invitedUser = invited.user;
            invitationCreated = true;
        }

        const now = new Date().toISOString();
        const { data: membership, error: membershipError } = await admin
            .from('ritmika_workspace_members')
            .upsert({
                workspace_id: actor.workspace_id,
                user_id: invitedUser.id,
                role,
                is_owner: false,
                managed_units: managedUnits,
                preferences: {},
                updated_at: now,
            }, { onConflict: 'workspace_id,user_id' })
            .select('id,workspace_id,user_id,role,is_owner,managed_units,preferences')
            .single();
        if (membershipError) {
            logError(correlationId, 'membership-upsert', membershipError, {
                workspaceId: actor.workspace_id,
                invitedUserId: invitedUser.id,
                errorCode: 'INVITE_MEMBERSHIP_UPSERT_FAILED',
            });
            throw membershipError;
        }

        const { data: profile, error: profileError } = await admin
            .from('ritmika_profiles')
            .upsert({
                workspace_id: actor.workspace_id,
                auth_user_id: invitedUser.id,
                email,
                name,
                role,
                is_owner: false,
                managed_units: managedUnits,
                preferences: {},
                metadata: { invited_by_membership_id: actor.id, invite_correlation_id: correlationId },
                updated_at: now,
            }, { onConflict: 'workspace_id,auth_user_id' })
            .select('id,workspace_id,auth_user_id,email,name,role,managed_units')
            .single();
        if (profileError) {
            logError(correlationId, 'profile-upsert', profileError, {
                workspaceId: actor.workspace_id,
                invitedUserId: invitedUser.id,
                membershipId: membership.id,
                errorCode: 'INVITE_PROFILE_UPSERT_FAILED',
            });
            throw profileError;
        }

        return json({ profile, membership, invitationCreated, correlationId }, invitationCreated ? 201 : 200);
    } catch (error) {
        logError(correlationId, 'request', error);
        return json({ error: errorText(error), correlationId }, 500);
    }
});

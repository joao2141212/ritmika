import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-ritmika-correlation-id, x-ritmika-client',
    'Access-Control-Expose-Headers': 'x-ritmika-correlation-id',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const allowedRoles = ['admin', 'manager', 'operator', 'viewer'];
const managerRoles = ['owner', 'admin', 'manager'];
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
            file: 'supabase/functions/manage-member/index.ts',
            function: 'manage-member.response',
            operation: 'manage-member.response',
            errorCode: `EDGE_HTTP_${status}`,
            correlationId,
            statusCode: status,
            error: errorText(body?.error || 'Edge Function response error').slice(0, 500),
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

const logError = (
    correlationId: string,
    fn: string,
    error: unknown,
    context: Record<string, unknown> = {},
) => {
    console.error(JSON.stringify({
        app: 'ritmika',
        layer: 'edge-function',
        level: 'error',
        at: new Date().toISOString(),
        eventId: crypto.randomUUID(),
        file: 'supabase/functions/manage-member/index.ts',
        function: `manage-member.${fn}`,
        operation: `manage-member.${fn}`,
        errorCode: context.errorCode || 'MANAGE_MEMBER_ERROR',
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
    if (request.method !== 'POST') {
        return json({ error: 'Método não permitido.', correlationId }, 405);
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const secretKey = Deno.env.get('SUPABASE_SECRET_KEY');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const adminKey = secretKey?.startsWith('sb_secret_') ? secretKey : serviceRoleKey;
    if (!supabaseUrl || !adminKey) {
        logError(correlationId, 'configuration', new Error('Credenciais administrativas ausentes.'));
        return json({ error: 'Backend de usuários não configurado.', correlationId }, 500);
    }

    const admin = createClient(supabaseUrl, adminKey, {
        auth: { autoRefreshToken: false, persistSession: false },
    });
    const accessToken = (request.headers.get('Authorization') || '')
        .replace(/^Bearer\s+/i, '')
        .trim();
    if (!accessToken) return json({ error: 'Autenticação necessária.', correlationId }, 401);

    try {
        const { data: authData, error: authError } = await admin.auth.getUser(accessToken);
        if (authError || !authData.user) {
            return json({ error: 'Sessão inválida.', correlationId }, 401);
        }

        const payload = await request.json();
        const workspaceId = String(payload?.workspace_id || '').trim();
        const profileId = String(payload?.profile_id || '').trim();
        const requestedRole = String(payload?.role || '').trim().toLowerCase();
        const managedUnits = Array.isArray(payload?.managed_units)
            ? [...new Set(payload.managed_units.map((value: unknown) => String(value)).filter(Boolean))]
            : null;
        const metadataPatch = payload?.metadata && typeof payload.metadata === 'object' && !Array.isArray(payload.metadata)
            ? payload.metadata
            : null;

        if (!workspaceId || !profileId) {
            return json({ error: 'Empresa e perfil são obrigatórios.', correlationId }, 400);
        }

        const { data: actor, error: actorError } = await admin
            .from('ritmika_workspace_members')
            .select('id,workspace_id,role,is_owner')
            .eq('workspace_id', workspaceId)
            .eq('user_id', authData.user.id)
            .maybeSingle();
        if (actorError) throw actorError;
        if (!actor) {
            return json({ error: 'A empresa selecionada não pertence ao usuário autenticado.', correlationId }, 403);
        }
        if (!(actor.is_owner || managerRoles.includes(String(actor.role || '').toLowerCase()))) {
            return json({ error: 'Apenas gestores podem alterar usuários.', correlationId }, 403);
        }

        const { data: target, error: targetError } = await admin
            .from('ritmika_profiles')
            .select('id,workspace_id,auth_user_id,role,is_owner,managed_units,metadata')
            .eq('workspace_id', workspaceId)
            .eq('id', profileId)
            .maybeSingle();
        if (targetError) throw targetError;
        if (!target) return json({ error: 'Perfil não encontrado nesta empresa.', correlationId }, 404);

        const nextRole = requestedRole || String(target.role || 'operator').toLowerCase();
        if (!allowedRoles.includes(nextRole) && !(target.is_owner && nextRole === 'owner')) {
            return json({ error: 'Perfil de acesso inválido.', correlationId }, 400);
        }
        if (target.is_owner && nextRole !== String(target.role || '').toLowerCase()) {
            return json({ error: 'O papel do proprietário não pode ser alterado por esta operação.', correlationId }, 409);
        }

        const nextManagedUnits = managedUnits ?? (Array.isArray(target.managed_units) ? target.managed_units : []);
        if (nextManagedUnits.length > 0) {
            const { data: validUnits, error: unitsError } = await admin
                .from('ritmika_units')
                .select('id')
                .eq('workspace_id', workspaceId)
                .in('id', nextManagedUnits);
            if (unitsError) throw unitsError;
            if ((validUnits || []).length !== nextManagedUnits.length) {
                return json({ error: 'Uma ou mais unidades não pertencem à empresa.', correlationId }, 400);
            }
        }

        const now = new Date().toISOString();
        let membership = null;
        if (target.auth_user_id) {
            const membershipResult = await admin
                .from('ritmika_workspace_members')
                .upsert({
                    workspace_id: workspaceId,
                    user_id: target.auth_user_id,
                    role: nextRole,
                    is_owner: Boolean(target.is_owner),
                    managed_units: nextManagedUnits,
                    updated_at: now,
                }, { onConflict: 'workspace_id,user_id' })
                .select('id,workspace_id,user_id,role,is_owner,managed_units,preferences')
                .single();
            if (membershipResult.error) {
                logError(correlationId, 'membership-upsert', membershipResult.error, {
                    workspaceId,
                    profileId,
                    targetUserId: target.auth_user_id,
                    errorCode: 'MEMBER_MEMBERSHIP_UPSERT_FAILED',
                });
                throw membershipResult.error;
            }
            membership = membershipResult.data;
        }

        const profileResult = await admin
            .from('ritmika_profiles')
            .update({
                role: nextRole,
                is_owner: Boolean(target.is_owner),
                managed_units: nextManagedUnits,
                metadata: metadataPatch
                    ? { ...(target.metadata || {}), ...metadataPatch }
                    : target.metadata || {},
                updated_at: now,
            })
            .eq('workspace_id', workspaceId)
            .eq('id', profileId)
            .select('id,workspace_id,auth_user_id,email,name,phone,role,is_owner,managed_units,preferences,metadata')
            .single();
        if (profileResult.error) {
            logError(correlationId, 'profile-update', profileResult.error, {
                workspaceId,
                profileId,
                targetUserId: target.auth_user_id || null,
                membershipId: membership?.id || null,
                errorCode: 'MEMBER_PROFILE_UPDATE_FAILED',
            });
            throw profileResult.error;
        }

        return json({
            profile: profileResult.data,
            membership,
            correlationId,
        });
    } catch (error) {
        logError(correlationId, 'request', error);
        return json({ error: errorText(error), correlationId }, 500);
    }
});

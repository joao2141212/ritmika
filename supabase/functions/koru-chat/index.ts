import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-ritmika-correlation-id, x-ritmika-client',
  'Access-Control-Expose-Headers': 'x-ritmika-correlation-id',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const errorText = (error: unknown) => error instanceof Error ? error.message : String(error);

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
            file: 'supabase/functions/koru-chat/index.ts',
            function: responseCaller(stack) === 'unknown' ? 'koru-chat.jsonResponse' : responseCaller(stack),
            operation: 'koru-chat.response',
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
        file: 'supabase/functions/koru-chat/index.ts',
        function: `koru-chat.${fn}`,
        operation: `koru-chat.${fn}`,
        errorCode: context.errorCode || 'EDGE_FUNCTION_ERROR',
        fn: `koru-chat.${fn}`,
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
        return json({ error: 'Backend da Koru não configurado.', correlationId }, 500);
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
            .select('id,workspace_id')
            .eq('auth_user_id', authData.user.id)
            .maybeSingle();
        if (actorError) throw actorError;
        if (!actor) return json({ error: 'Perfil do workspace não encontrado.', correlationId }, 403);

        const payload = await request.json();
        const message = String(payload?.message || '').trim();
        if (!message) return json({ error: 'Digite uma pergunta para a Koru.', correlationId }, 400);

        const [responsesResult, profilesResult, unitsResult] = await Promise.all([
            admin
                .from('ritmika_responses')
                .select('is_finished,execution_date,started_at,created_at,profile_id,metadata')
                .eq('workspace_id', actor.workspace_id)
                .limit(5000),
            admin
                .from('ritmika_profiles')
                .select('id,name,email')
                .eq('workspace_id', actor.workspace_id),
            admin
                .from('ritmika_units')
                .select('id,name')
                .eq('workspace_id', actor.workspace_id),
        ]);
        if (responsesResult.error) throw responsesResult.error;
        if (profilesResult.error) throw profilesResult.error;
        if (unitsResult.error) throw unitsResult.error;

        const responses = responsesResult.data || [];
        const profiles = profilesResult.data || [];
        const now = Date.now();
        const completed = responses.filter((row) => Boolean(row.is_finished)).length;
        const inProgress = responses.filter((row) => !row.is_finished && (row.started_at || row.metadata?.status === 'in_progress')).length;
        const overdue = responses.filter((row) => {
            const dueAt = row.execution_date || row.started_at || row.created_at;
            return !row.is_finished && dueAt && new Date(dueAt).getTime() < now;
        }).length;
        const pending = Math.max(responses.length - completed, 0);
        const profileNames = new Map(profiles.map((profile) => [String(profile.id), profile.name || profile.email || 'Usuário']));
        const pendingByProfile = new Map<string, number>();
        responses.forEach((row) => {
            if (row.is_finished || !row.profile_id) return;
            const key = String(row.profile_id);
            pendingByProfile.set(key, (pendingByProfile.get(key) || 0) + 1);
        });
        const followUp = Array.from(pendingByProfile.entries())
            .sort((left, right) => right[1] - left[1])
            .slice(0, 3)
            .map(([profileId, count]) => `${profileNames.get(profileId) || 'Usuário'} (${count})`);
        const normalized = message.toLocaleLowerCase();
        let reply = `No workspace há ${responses.length} execuções observadas: ${completed} finalizadas, ${pending} pendentes e ${overdue} atrasadas.`;
        if (normalized.includes('atras') || normalized.includes('alert')) {
            reply = `Os principais alertas são ${overdue} execuções atrasadas e ${inProgress} iniciadas sem finalização. Usuários com mais pendências: ${followUp.length ? followUp.join(', ') : 'nenhum identificado'}.`;
        } else if (normalized.includes('unidade')) {
            reply = `O workspace tem ${unitsResult.data?.length || 0} unidades cadastradas. No período consultado, há ${responses.length} execuções observadas e ${completed} finalizadas.`;
        } else if (normalized.includes('acompanh') || normalized.includes('quem')) {
            reply = followUp.length
                ? `Acompanhamento prioritário: ${followUp.join(', ')}. O total de pendências observadas é ${pending}.`
                : 'Não há usuários com pendências identificadas na fonte consultada.';
        } else if (normalized.includes('semana') || normalized.includes('hoje')) {
            reply = `A fonte consultada retornou ${responses.length} execuções. O recorte temporal informado pela pergunta deve ser aplicado no próximo refinamento; neste momento, ${overdue} estão atrasadas e ${completed} finalizadas.`;
        }

        return json({
            reply,
            source: 'ritmika_supabase',
            metrics: { total: responses.length, completed, pending, inProgress, overdue, units: unitsResult.data?.length || 0 },
            correlationId,
        });
    } catch (error) {
        logError(correlationId, 'request', error);
        return json({ error: 'Não foi possível consultar os dados operacionais.', correlationId }, 500);
    }
});

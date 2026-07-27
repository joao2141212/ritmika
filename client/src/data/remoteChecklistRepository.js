import { supabase } from '../lib/supabase';
import { logger } from '../lib/logger';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const isUuid = (value) => UUID_PATTERN.test(String(value || ''));

const errorText = (error) => (error instanceof Error ? error.message : String(error));

const reportError = (fn, error, context = {}) => {
    logger.error({
        fn: 'remoteChecklistRepository.' + fn,
        status: 'error',
        ...context,
        error: errorText(error),
    });
};

const requireSupabase = () => {
    if (!supabase) {
        throw new Error('Supabase remoto não está configurado.');
    }
    return supabase;
};

const unwrap = (fn, result, context = {}) => {
    if (result.error) {
        reportError(fn, result.error, context);
        throw result.error;
    }
    return result.data;
};

const makeClientId = (prefix) => {
    const randomId = globalThis.crypto?.randomUUID?.();
    return prefix + '-' + (randomId || Date.now() + '-' + Math.random().toString(36).slice(2, 10));
};

const getWorkspaceContext = async () => {
    const client = requireSupabase();
    let authResult;

    try {
        authResult = await client.auth.getUser();
    } catch (error) {
        reportError('getWorkspaceContext.auth', error);
        throw error;
    }

    if (authResult.error) {
        reportError('getWorkspaceContext.auth', authResult.error);
        throw authResult.error;
    }

    const user = authResult.data?.user;
    if (!user) {
        throw new Error('Sessão autenticada não encontrada.');
    }

    const membersResult = await client
        .from('ritmika_workspace_members')
        .select('workspace_id,role,is_owner')
        .eq('user_id', user.id)
        .order('is_owner', { ascending: false })
        .limit(1);
    const members = unwrap('getWorkspaceContext.members', membersResult, { userId: user.id });
    const member = members?.[0];

    if (!member?.workspace_id) {
        throw new Error('Usuário autenticado não possui workspace no Ritmika.');
    }

    return {
        userId: user.id,
        user,
        workspaceId: member.workspace_id,
        member,
    };
};

const getReferenceMaps = async (workspaceId) => {
    const client = requireSupabase();
    const [unitsResult, sectorsResult, momentsResult, profilesResult] = await Promise.all([
        client.from('ritmika_units').select('id,source_id,name').eq('workspace_id', workspaceId),
        client.from('ritmika_sectors').select('id,source_id,name').eq('workspace_id', workspaceId),
        client.from('ritmika_moments').select('id,source_id,name').eq('workspace_id', workspaceId),
        client
            .from('ritmika_profiles')
            .select('id,source_user_id,auth_user_id,name,email,role')
            .eq('workspace_id', workspaceId),
    ]);

    const toMap = (rows = [], key) => new Map(rows.map((row) => [String(row[key]), row]));

    return {
        units: toMap(unwrap('getReferenceMaps.units', unitsResult, { workspaceId }), 'id'),
        sectors: toMap(unwrap('getReferenceMaps.sectors', sectorsResult, { workspaceId }), 'id'),
        moments: toMap(unwrap('getReferenceMaps.moments', momentsResult, { workspaceId }), 'id'),
        profiles: toMap(unwrap('getReferenceMaps.profiles', profilesResult, { workspaceId }), 'id'),
    };
};

const normalizeItem = (item, index, checklistId) => {
    const raw = item && typeof item === 'object' ? item : {};
    const title = raw.title || raw.name || raw.text || 'Item ' + (index + 1);
    const type = raw.type || raw.tipo_resposta || 'check';
    const required = raw.required ?? raw.is_required ?? raw.obrigatorio !== false;

    return {
        ...raw,
        id: raw.id || checklistId + '-item-' + (index + 1),
        name: raw.name || title,
        title,
        text: raw.text || title,
        description: raw.description || raw.descricao || '',
        type,
        order: raw.order ?? raw.ordem ?? index,
        required: Boolean(required),
        is_required: Boolean(required),
        allow_not_applicable: Boolean(raw.allow_not_applicable || raw.allowNotApplicable),
        weight: Number(raw.weight ?? raw.peso ?? 1),
        evidences: Array.isArray(raw.evidences) ? raw.evidences : [],
        config: raw.config && typeof raw.config === 'object' ? raw.config : {},
    };
};

const toProduct = (item, index, checklistId) => ({
    id: item.id || checklistId + '-item-' + (index + 1),
    checklist_id: checklistId,
    nome: item.title || item.name || item.text || 'Item ' + (index + 1),
    categoria: item.config?.category || item.category || 'Checklist',
    unidade: item.config?.unit || item.unit || 'item',
    ordem: item.order ?? item.ordem ?? index + 1,
    ativo: true,
    tipo_resposta: item.type || 'check',
    obrigatorio: item.required !== false && item.is_required !== false,
    quantidade_minima: item.config?.min ?? item.config?.minimum ?? null,
});

const mapChecklist = (row, references) => {
    const schedule = row.schedule && typeof row.schedule === 'object' ? row.schedule : {};
    const metadata = row.metadata && typeof row.metadata === 'object' ? row.metadata : {};
    const profile = row.responsible_profile_id
        ? references.profiles.get(String(row.responsible_profile_id))
        : null;
    const items = (Array.isArray(row.items) ? row.items : [])
        .map((item, index) => normalizeItem(item, index, String(row.id)));
    const sourceStatus = row.status || 'draft';
    const status = ['active', 'published'].includes(sourceStatus) ? 'ativo' : sourceStatus;
    const frequency = schedule.schedule_recurrence_type
        || (schedule.is_recurring ? 'recorrente' : 'manual');

    return {
        ...row,
        source_status: sourceStatus,
        status,
        nome: row.title || 'Checklist sem título',
        title: row.title || 'Checklist sem título',
        descricao: row.description || '',
        description: row.description || '',
        tipo: row.checklist_kind || 'operacional',
        frequencia: frequency,
        turno_ativado: Boolean(metadata.turno_ativado || schedule.turno_ativado),
        responsaveis: profile?.name ? [profile.name] : [],
        user_name: profile?.name || null,
        user_id: row.responsible_profile_id || null,
        schedule,
        schedule_recurrence_type: schedule.schedule_recurrence_type || null,
        schedule_time: schedule.schedule_time || null,
        schedule_start_date: schedule.schedule_start_date || null,
        schedule_end_date: schedule.schedule_end_date || null,
        schedule_interval: Number(schedule.schedule_interval || 1),
        schedule_day_of_week: schedule.schedule_day_of_week ?? null,
        items,
        produtos_checklist: items.map((item, index) => toProduct(item, index, String(row.id))),
    };
};

const getRawChecklist = async (workspaceId, id) => {
    const client = requireSupabase();
    const column = isUuid(id) ? 'id' : 'source_id';
    const result = await client
        .from('ritmika_checklists')
        .select('*')
        .eq('workspace_id', workspaceId)
        .eq(column, String(id))
        .maybeSingle();
    return unwrap('getRawChecklist', result, { workspaceId, checklistId: String(id) });
};

const toStorageStatus = (status) => {
    if (['ativo', 'active', 'published'].includes(status)) return 'active';
    if (['archived', 'arquivado'].includes(status)) return 'archived';
    return 'draft';
};

const toWritePayload = (payload, workspaceId, existing = null) => {
    const items = Array.isArray(payload.items) ? payload.items : [];
    const schedule = payload.schedule && typeof payload.schedule === 'object'
        ? payload.schedule
        : {
            schedule_recurrence_type: payload.schedule_recurrence_type || 'manual',
            schedule_time: payload.schedule_time || null,
            schedule_start_date: payload.schedule_start_date || null,
            schedule_end_date: payload.schedule_end_date || null,
            schedule_interval: Number(payload.schedule_interval || 1),
            schedule_day_of_week: payload.schedule_day_of_week ?? null,
        };
    const safeSourcePayload = {
        title: payload.title || payload.nome || '',
        description: payload.description || payload.descricao || '',
        status: payload.status || 'inativo',
        items,
        schedule,
        unit: payload.unit || null,
        sector: payload.sector || null,
        moment: payload.moment || null,
        user_name: payload.user_name || null,
    };

    return {
        workspace_id: workspaceId,
        source_id: existing?.source_id || makeClientId('ritmika-checklist'),
        title: payload.title || payload.nome || 'Novo checklist',
        description: payload.description || payload.descricao || null,
        status: toStorageStatus(payload.status),
        checklist_kind: payload.checklist_kind || payload.tipo || 'operacional',
        flow_source_id: payload.flow_source_id || null,
        unit_id: isUuid(payload.unit_id) ? payload.unit_id : null,
        sector_id: isUuid(payload.sector_id) ? payload.sector_id : null,
        moment_id: isUuid(payload.moment_id) ? payload.moment_id : null,
        responsible_profile_id: isUuid(payload.responsible_profile_id)
            ? payload.responsible_profile_id
            : (isUuid(payload.user_id) ? payload.user_id : null),
        schedule,
        usage_policy: payload.usage_policy || null,
        variables: payload.variables && typeof payload.variables === 'object' ? payload.variables : {},
        items,
        metadata: {
            ...(existing?.metadata && typeof existing.metadata === 'object' ? existing.metadata : {}),
            ...(payload.metadata && typeof payload.metadata === 'object' ? payload.metadata : {}),
            display_unit: payload.unit || null,
            display_sector: payload.sector || null,
            display_moment: payload.moment || null,
        },
        source_payload: safeSourcePayload,
        updated_at: new Date().toISOString(),
    };
};

const getResponseRow = async (workspaceId, id) => {
    const client = requireSupabase();
    const result = await client
        .from('ritmika_responses')
        .select('*')
        .eq('workspace_id', workspaceId)
        .eq('id', String(id))
        .maybeSingle();
    return unwrap('getResponseRow', result, { workspaceId, executionId: String(id) });
};

const mapExecution = (row) => {
    if (!row) return null;
    const metadata = row.metadata && typeof row.metadata === 'object' ? row.metadata : {};
    return {
        id: row.id,
        source_id: row.source_id,
        checklist_id: row.checklist_id,
        status: row.is_finished ? 'completed' : (metadata.status || 'in_progress'),
        answers: row.response_data || {},
        started_at: row.started_at || row.execution_date,
        completed_at: row.completed_at || null,
        created_at: row.created_at,
        updated_at: row.updated_at,
        retry_count: Number(metadata.retry_count || 0),
        progress: Number(metadata.progress || 0),
        score: metadata.score ?? null,
        metadata,
    };
};

const getProfileForUser = async (workspaceId, userId) => {
    const client = requireSupabase();
    const result = await client
        .from('ritmika_profiles')
        .select('id,name,email,role')
        .eq('workspace_id', workspaceId)
        .eq('auth_user_id', userId)
        .maybeSingle();
    return unwrap('getProfileForUser', result, { workspaceId, userId });
};

export const remoteChecklistRepository = {
    async getManagerList() {
        const context = await getWorkspaceContext();
        const client = requireSupabase();
        const result = await client
            .from('ritmika_checklists')
            .select('*')
            .eq('workspace_id', context.workspaceId)
            .order('created_at', { ascending: false });
        const rows = unwrap('getManagerList', result, { workspaceId: context.workspaceId });
        const references = await getReferenceMaps(context.workspaceId);
        return (rows || []).map((row) => mapChecklist(row, references));
    },

    async getAll() {
        const checklists = await this.getManagerList();
        return checklists.filter((checklist) => ['ativo', 'active', 'published'].includes(checklist.status));
    },

    async getById(id) {
        const context = await getWorkspaceContext();
        const row = await getRawChecklist(context.workspaceId, id);
        if (!row) return null;
        const references = await getReferenceMaps(context.workspaceId);
        return mapChecklist(row, references);
    },

    async getProdutos(checklistId) {
        const checklist = await this.getById(checklistId);
        return checklist?.produtos_checklist || [];
    },

    async create(payload) {
        const context = await getWorkspaceContext();
        const client = requireSupabase();
        const result = await client
            .from('ritmika_checklists')
            .insert(toWritePayload(payload, context.workspaceId))
            .select('*')
            .single();
        const row = unwrap('create', result, { workspaceId: context.workspaceId });
        const references = await getReferenceMaps(context.workspaceId);
        return mapChecklist(row, references);
    },

    async update(id, updates) {
        const context = await getWorkspaceContext();
        const current = await getRawChecklist(context.workspaceId, id);
        if (!current) return null;
        const references = await getReferenceMaps(context.workspaceId);
        const merged = { ...mapChecklist(current, references), ...updates };
        const client = requireSupabase();
        const result = await client
            .from('ritmika_checklists')
            .update(toWritePayload(merged, context.workspaceId, current))
            .eq('workspace_id', context.workspaceId)
            .eq('id', current.id)
            .select('*')
            .single();
        const row = unwrap('update', result, { workspaceId: context.workspaceId, checklistId: String(id) });
        return mapChecklist(row, references);
    },

    async archive(id) {
        const context = await getWorkspaceContext();
        const client = requireSupabase();
        const result = await client
            .from('ritmika_checklists')
            .update({ status: 'archived', updated_at: new Date().toISOString() })
            .eq('workspace_id', context.workspaceId)
            .eq('id', String(id));
        unwrap('archive', result, { workspaceId: context.workspaceId, checklistId: String(id) });
        return true;
    },

    async publish(id, status = 'ativo') {
        const context = await getWorkspaceContext();
        const client = requireSupabase();
        const result = await client
            .from('ritmika_checklists')
            .update({ status: toStorageStatus(status), updated_at: new Date().toISOString() })
            .eq('workspace_id', context.workspaceId)
            .eq('id', String(id));
        unwrap('publish', result, { workspaceId: context.workspaceId, checklistId: String(id) });
        return true;
    },

    async startExecution(checklistId, metadata = {}) {
        const context = await getWorkspaceContext();
        const checklist = await this.getById(checklistId);
        if (!checklist) throw new Error('Checklist não encontrado.');

        const now = new Date().toISOString();
        const profile = await getProfileForUser(context.workspaceId, context.userId);
        const executionMetadata = {
            status: 'in_progress',
            progress: 0,
            retry_count: 0,
            user_name: metadata.user_name || profile?.name || context.user.email || 'Operador',
            ...metadata,
        };
        const client = requireSupabase();
        const result = await client
            .from('ritmika_responses')
            .insert({
                workspace_id: context.workspaceId,
                source_id: makeClientId('ritmika-execution'),
                source_checklist_id: checklist.source_id || null,
                checklist_id: checklist.id,
                profile_id: profile?.id || null,
                is_finished: false,
                response_data: {},
                response_meta: { source: 'ritmika' },
                variables: checklist.variables || {},
                checklist_snapshot: {
                    id: checklist.id,
                    title: checklist.title,
                    items: checklist.items || [],
                },
                execution_type: metadata.execution_type || 'manual',
                execution_date: now,
                started_at: now,
                qtd_items: (checklist.items || []).filter((item) => item.type !== 'separator').length,
                qtd_items_answered: 0,
                metadata: executionMetadata,
            })
            .select('*')
            .single();
        return mapExecution(unwrap('startExecution', result, {
            workspaceId: context.workspaceId,
            checklistId: String(checklistId),
        }));
    },

    async saveExecution(id, updates = {}) {
        const context = await getWorkspaceContext();
        const current = await getResponseRow(context.workspaceId, id);
        if (!current) return null;
        const currentMetadata = current.metadata && typeof current.metadata === 'object'
            ? current.metadata
            : {};
        const nextMetadata = {
            ...currentMetadata,
            ...(updates.metadata && typeof updates.metadata === 'object' ? updates.metadata : {}),
        };
        if (updates.status) nextMetadata.status = updates.status;
        if (updates.progress !== undefined) nextMetadata.progress = updates.progress;

        const patch = {
            response_data: updates.answers ?? current.response_data ?? {},
            metadata: nextMetadata,
            updated_at: new Date().toISOString(),
        };
        const client = requireSupabase();
        const result = await client
            .from('ritmika_responses')
            .update(patch)
            .eq('workspace_id', context.workspaceId)
            .eq('id', String(id))
            .select('*')
            .single();
        return mapExecution(unwrap('saveExecution', result, {
            workspaceId: context.workspaceId,
            executionId: String(id),
        }));
    },

    async completeExecution(id, answers = {}) {
        const context = await getWorkspaceContext();
        const current = await getResponseRow(context.workspaceId, id);
        if (!current) return null;
        const checklist = await this.getById(current.checklist_id);
        const items = (checklist?.items || []).filter((item) => item.type !== 'separator');
        const answered = items.filter((item) => answers[item.id] !== undefined
            && answers[item.id] !== null
            && answers[item.id] !== '').length;
        const progress = items.length ? Math.round((answered / items.length) * 100) : 100;
        const currentMetadata = current.metadata && typeof current.metadata === 'object'
            ? current.metadata
            : {};
        const now = new Date().toISOString();
        const client = requireSupabase();
        const result = await client
            .from('ritmika_responses')
            .update({
                response_data: answers,
                is_finished: true,
                completed_at: now,
                qtd_items_answered: answered,
                metadata: {
                    ...currentMetadata,
                    status: 'completed',
                    progress,
                    score: progress,
                },
                updated_at: now,
            })
            .eq('workspace_id', context.workspaceId)
            .eq('id', String(id))
            .select('*')
            .single();
        return mapExecution(unwrap('completeExecution', result, {
            workspaceId: context.workspaceId,
            executionId: String(id),
        }));
    },

    async retryExecution(id) {
        const context = await getWorkspaceContext();
        const current = await getResponseRow(context.workspaceId, id);
        if (!current) return null;
        const currentMetadata = current.metadata && typeof current.metadata === 'object'
            ? current.metadata
            : {};
        const now = new Date().toISOString();
        const client = requireSupabase();
        const result = await client
            .from('ritmika_responses')
            .update({
                response_data: {},
                is_finished: false,
                started_at: now,
                completed_at: null,
                qtd_items_answered: 0,
                metadata: {
                    ...currentMetadata,
                    status: 'in_progress',
                    progress: 0,
                    score: null,
                    retry_count: Number(currentMetadata.retry_count || 0) + 1,
                },
                updated_at: now,
            })
            .eq('workspace_id', context.workspaceId)
            .eq('id', String(id))
            .select('*')
            .single();
        return mapExecution(unwrap('retryExecution', result, {
            workspaceId: context.workspaceId,
            executionId: String(id),
        }));
    },
};

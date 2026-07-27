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
        checklist_snapshot: row.checklist_snapshot || null,
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

const mapProduct = (row) => ({
    id: row.id,
    checklist_id: row.checklist_id,
    checklist_item_id: row.checklist_item_id || null,
    source_id: row.source_id,
    nome: row.name,
    categoria: row.category || 'Checklist',
    unidade: row.unit || 'item',
    ordem: row.position ?? 0,
    ativo: row.active !== false,
    tipo_resposta: row.metadata?.response_type || 'numeric',
    obrigatorio: row.metadata?.required !== false,
    quantidade_minima: row.minimum_quantity === null || row.minimum_quantity === undefined
        ? null
        : Number(row.minimum_quantity),
    fornecedor: row.supplier || null,
    metadata: row.metadata || {},
});

const mapCountEntry = (row, product, profile) => ({
    ...row,
    produto_id: row.product_id,
    checklist_id: row.checklist_id,
    data_contagem: row.count_date,
    dia_semana: row.weekday,
    turno: row.shift,
    quantidade_contada: Number(row.counted_quantity || 0),
    quantidade_pedida: Number(row.ordered_quantity || 0),
    retirado_por: row.counted_by || profile?.name || '',
    observacoes: row.notes || '',
    status: row.status === 'completed' ? 'completo' : row.status,
    produtos_checklist: product ? {
        id: product.id,
        nome: product.nome,
        categoria: product.categoria,
        unidade: product.unidade,
    } : null,
    profiles: profile ? { id: profile.id, name: profile.name } : null,
});

const mapNotification = (row) => ({
    ...row,
    read: Boolean(row.read_at),
    is_read: Boolean(row.read_at),
    createdAt: row.created_at,
});

const safeFileName = (name) => String(name || 'evidencia')
    .normalize('NFKD')
    .replace(/[^\w.-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 100) || 'evidencia';

const resolveProfileId = async (workspaceId, value, fallbackUserId) => {
    const client = requireSupabase();
    if (value) {
        const byId = await client
            .from('ritmika_profiles')
            .select('id')
            .eq('workspace_id', workspaceId)
            .eq('id', String(value))
            .maybeSingle();
        if (byId.data) return byId.data.id;

        const byAuthId = await client
            .from('ritmika_profiles')
            .select('id')
            .eq('workspace_id', workspaceId)
            .eq('auth_user_id', String(value))
            .maybeSingle();
        if (byAuthId.data) return byAuthId.data.id;
    }

    const current = await getProfileForUser(workspaceId, fallbackUserId);
    return current?.id || null;
};

const syncNormalizedChecklist = async (workspaceId, checklist) => {
    const client = requireSupabase();
    const sourceItems = Array.isArray(checklist.items) ? checklist.items : [];
    if (sourceItems.length === 0) return;

    const itemRows = sourceItems.map((raw, index) => {
        const item = normalizeItem(raw, index, String(checklist.id));
        return {
            workspace_id: workspaceId,
            checklist_id: checklist.id,
            source_id: String(raw?.id || item.id),
            position: Number(item.order ?? index),
            title: item.title,
            description: item.description || null,
            item_type: item.type || 'check',
            required: item.required !== false,
            weight: Number(item.weight || 1),
            config: item.config || {},
            evidences: Array.isArray(item.evidences) ? item.evidences : [],
            metadata: raw && typeof raw === 'object' ? raw : {},
            updated_at: new Date().toISOString(),
        };
    });

    const itemsResult = await client
        .from('ritmika_checklist_items')
        .upsert(itemRows, { onConflict: 'checklist_id,source_id' })
        .select('*');
    const items = unwrap('syncNormalizedChecklist.items', itemsResult, {
        workspaceId,
        checklistId: checklist.id,
    }) || [];

    const productRows = items.map((item) => ({
        workspace_id: workspaceId,
        checklist_id: checklist.id,
        checklist_item_id: item.id,
        source_id: item.source_id,
        name: item.title,
        category: item.config?.category || 'Checklist',
        unit: item.config?.unit || 'item',
        minimum_quantity: item.config?.min === null || item.config?.min === undefined
            ? (item.config?.minimum === null || item.config?.minimum === undefined
                ? null
                : Number(item.config.minimum))
            : Number(item.config.min),
        supplier: item.config?.supplier || null,
        position: item.position,
        active: true,
        metadata: {
            ...item.metadata,
            required: item.required,
            response_type: item.item_type,
        },
        updated_at: new Date().toISOString(),
    }));

    if (productRows.length > 0) {
        const productsResult = await client
            .from('ritmika_products')
            .upsert(productRows, { onConflict: 'checklist_id,source_id' })
            .select('id');
        unwrap('syncNormalizedChecklist.products', productsResult, {
            workspaceId,
            checklistId: checklist.id,
        });
    }
};

const mapExecutionRows = async (workspaceId, rows) => {
    const client = requireSupabase();
    const checklistIds = [...new Set((rows || []).map((row) => row.checklist_id).filter(Boolean))];
    const profileIds = [...new Set((rows || []).map((row) => row.profile_id).filter(Boolean))];
    const [checklistsResult, profilesResult] = await Promise.all([
        checklistIds.length
            ? client.from('ritmika_checklists').select('id,title,status').eq('workspace_id', workspaceId).in('id', checklistIds)
            : Promise.resolve({ data: [], error: null }),
        profileIds.length
            ? client.from('ritmika_profiles').select('id,name,email,role').eq('workspace_id', workspaceId).in('id', profileIds)
            : Promise.resolve({ data: [], error: null }),
    ]);
    const checklists = unwrap('mapExecutionRows.checklists', checklistsResult, { workspaceId }) || [];
    const profiles = unwrap('mapExecutionRows.profiles', profilesResult, { workspaceId }) || [];
    const checklistMap = new Map(checklists.map((row) => [String(row.id), row]));
    const profileMap = new Map(profiles.map((row) => [String(row.id), row]));

    return (rows || []).map((row) => {
        const execution = mapExecution(row);
        const checklist = checklistMap.get(String(row.checklist_id));
        const profile = profileMap.get(String(row.profile_id));
        return {
            ...execution,
            user_name: row.metadata?.user_name || profile?.name || row.source_user_id || 'Usuário',
            checklist_title: checklist?.title || row.checklist_snapshot?.title || 'Checklist',
            checklist: checklist ? {
                id: checklist.id,
                title: checklist.title,
                status: checklist.status,
            } : null,
            profile: profile || null,
        };
    });
};

const recordExecutionEvent = async (workspaceId, responseId, profileId, eventType, payload = {}) => {
    try {
        const result = await requireSupabase()
            .from('ritmika_execution_events')
            .insert({
                workspace_id: workspaceId,
                response_id: responseId,
                profile_id: profileId || null,
                event_type: eventType,
                payload,
            });
        unwrap('recordExecutionEvent.' + eventType, result, {
            workspaceId,
            executionId: responseId,
        });
    } catch (error) {
        reportError('recordExecutionEvent.' + eventType, error, {
            workspaceId,
            executionId: responseId,
        });
    }
};

const mapCountRows = async (workspaceId, rows) => {
    const client = requireSupabase();
    const productIds = [...new Set((rows || []).map((row) => row.product_id).filter(Boolean))];
    const [productsResult, profilesResult] = await Promise.all([
        productIds.length
            ? client.from('ritmika_products').select('*').eq('workspace_id', workspaceId).in('id', productIds)
            : Promise.resolve({ data: [], error: null }),
        client.from('ritmika_profiles').select('id,name,email,role').eq('workspace_id', workspaceId),
    ]);
    const products = unwrap('mapCountRows.products', productsResult, { workspaceId }) || [];
    const profiles = unwrap('mapCountRows.profiles', profilesResult, { workspaceId }) || [];
    const productMap = new Map(products.map((row) => [String(row.id), mapProduct(row)]));
    const profileMap = new Map(profiles.map((row) => [String(row.id), row]));
    return (rows || []).map((row) => mapCountEntry(
        row,
        productMap.get(String(row.product_id)),
        profileMap.get(String(row.profile_id)),
    ));
};

const resolveChecklistForWorkspace = async (workspaceId, id) => {
    const checklist = await getRawChecklist(workspaceId, id);
    if (!checklist) {
        throw new Error('Checklist não encontrado.');
    }
    return checklist;
};

const getDashboardPeriod = (periodDays = 30) => {
    if (String(periodDays).toLowerCase() === 'all') {
        return {
            days: 'all',
            startIso: null,
            endIso: null,
            label: 'Todo o histórico',
        };
    }

    const days = Math.min(Math.max(Number(periodDays) || 30, 1), 365);
    const end = new Date();
    end.setHours(24, 0, 0, 0);
    const start = new Date(end);
    start.setDate(start.getDate() - days);

    return {
        days,
        startIso: start.toISOString(),
        endIso: end.toISOString(),
        label: `Últimos ${days} dias`,
    };
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
        const context = await getWorkspaceContext();
        const checklist = await resolveChecklistForWorkspace(context.workspaceId, checklistId);
        const result = await requireSupabase()
            .from('ritmika_products')
            .select('*')
            .eq('workspace_id', context.workspaceId)
            .eq('checklist_id', checklist.id)
            .order('position', { ascending: true });
        const rows = unwrap('getProdutos', result, {
            workspaceId: context.workspaceId,
            checklistId: checklist.id,
        }) || [];
        if (rows.length > 0) return rows.map(mapProduct);

        return (Array.isArray(checklist.items) ? checklist.items : [])
            .map((item, index) => toProduct(normalizeItem(item, index, String(checklist.id)), index, String(checklist.id)));
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
        await syncNormalizedChecklist(context.workspaceId, row);
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
        await syncNormalizedChecklist(context.workspaceId, row);
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

    async createCountEntry(entry) {
        const rows = await this.createCountEntries([entry]);
        return rows[0] || null;
    },

    async createCountEntries(entries = []) {
        if (!Array.isArray(entries) || entries.length === 0) return [];
        const context = await getWorkspaceContext();
        const checklistIds = [...new Set(entries.map((entry) => entry.checklist_id).filter(Boolean).map(String))];
        if (checklistIds.length !== 1) {
            throw new Error('Uma contagem em lote deve pertencer a um único checklist.');
        }
        const checklist = await resolveChecklistForWorkspace(context.workspaceId, checklistIds[0]);
        const client = requireSupabase();
        const productsResult = await client
            .from('ritmika_products')
            .select('*')
            .eq('workspace_id', context.workspaceId)
            .eq('checklist_id', checklist.id)
            .order('position', { ascending: true });
        const products = unwrap('createCountEntries.products', productsResult, {
            workspaceId: context.workspaceId,
            checklistId: checklist.id,
        }) || [];
        const productMap = new Map();
        products.forEach((product) => {
            productMap.set(String(product.id), product);
            productMap.set(String(product.source_id), product);
        });
        const currentProfile = await getProfileForUser(context.workspaceId, context.userId);
        const rows = [];

        for (const entry of entries) {
            const product = entry.produto_id ? productMap.get(String(entry.produto_id)) : null;
            if (entry.produto_id && !product) {
                throw new Error('Produto de contagem não pertence ao checklist informado.');
            }
            const requestedProfile = entry.profile_id || entry.user_id;
            const profileId = requestedProfile && String(requestedProfile) !== String(currentProfile?.id)
                ? await resolveProfileId(context.workspaceId, requestedProfile, context.userId)
                : currentProfile?.id || null;
            rows.push({
                workspace_id: context.workspaceId,
                checklist_id: checklist.id,
                product_id: product?.id || null,
                profile_id: profileId,
                source_id: entry.source_id || makeClientId('ritmika-count'),
                count_date: entry.data_contagem || entry.count_date || new Date().toISOString().slice(0, 10),
                weekday: entry.dia_semana || entry.weekday || null,
                shift: entry.turno || entry.shift || 'unico',
                counted_quantity: Number(entry.quantidade_contada ?? entry.counted_quantity ?? 0),
                ordered_quantity: Number(entry.quantidade_pedida ?? entry.ordered_quantity ?? 0),
                counted_by: entry.retirado_por || entry.counted_by || currentProfile?.name || context.user.email || null,
                notes: entry.observacoes || entry.notes || null,
                status: entry.status === 'completo' ? 'completed' : (entry.status || 'completed'),
                metadata: entry.metadata && typeof entry.metadata === 'object' ? entry.metadata : {},
            });
        }

        const result = await client
            .from('ritmika_count_entries')
            .insert(rows)
            .select('*');
        const created = unwrap('createCountEntries', result, {
            workspaceId: context.workspaceId,
            checklistId: checklist.id,
        }) || [];
        return mapCountRows(context.workspaceId, created);
    },

    async getCountEntriesByChecklist(checklistId, dataInicio, dataFim) {
        const context = await getWorkspaceContext();
        const checklist = await resolveChecklistForWorkspace(context.workspaceId, checklistId);
        let query = requireSupabase()
            .from('ritmika_count_entries')
            .select('*')
            .eq('workspace_id', context.workspaceId)
            .eq('checklist_id', checklist.id)
            .order('count_date', { ascending: false })
            .order('created_at', { ascending: false });
        if (dataInicio) query = query.gte('count_date', dataInicio);
        if (dataFim) query = query.lte('count_date', dataFim);
        const result = await query;
        const rows = unwrap('getCountEntriesByChecklist', result, {
            workspaceId: context.workspaceId,
            checklistId: checklist.id,
        }) || [];
        return mapCountRows(context.workspaceId, rows);
    },

    async getCountEntriesByProduct(productId, dataInicio, dataFim) {
        const context = await getWorkspaceContext();
        const client = requireSupabase();
        let productResult = null;
        if (isUuid(productId)) {
            productResult = await client
                .from('ritmika_products')
                .select('id')
                .eq('workspace_id', context.workspaceId)
                .eq('id', String(productId))
                .maybeSingle();
        }
        if (!productResult?.data) {
            productResult = await client
                .from('ritmika_products')
                .select('id')
                .eq('workspace_id', context.workspaceId)
                .eq('source_id', String(productId))
                .limit(1)
                .maybeSingle();
        }
        const product = unwrap('getCountEntriesByProduct.product', productResult, {
            workspaceId: context.workspaceId,
            productId: String(productId),
        });
        if (!product) return [];

        let query = client
            .from('ritmika_count_entries')
            .select('*')
            .eq('workspace_id', context.workspaceId)
            .eq('product_id', product.id)
            .order('count_date', { ascending: false });
        if (dataInicio) query = query.gte('count_date', dataInicio);
        if (dataFim) query = query.lte('count_date', dataFim);
        const result = await query;
        return mapCountRows(context.workspaceId, unwrap('getCountEntriesByProduct', result, {
            workspaceId: context.workspaceId,
            productId: product.id,
        }) || []);
    },

    async updateCountEntry(id, updates = {}) {
        const context = await getWorkspaceContext();
        const client = requireSupabase();
        const currentResult = await client
            .from('ritmika_count_entries')
            .select('*')
            .eq('workspace_id', context.workspaceId)
            .eq('id', String(id))
            .maybeSingle();
        const current = unwrap('updateCountEntry.current', currentResult, {
            workspaceId: context.workspaceId,
            countEntryId: String(id),
        });
        if (!current) return null;
        const productValue = updates.produto_id || updates.product_id;
        let productId = current.product_id;
        if (productValue) {
            const productResult = await client
                .from('ritmika_products')
                .select('id')
                .eq('workspace_id', context.workspaceId)
                .eq('id', String(productValue))
                .maybeSingle();
            const product = unwrap('updateCountEntry.product', productResult, {
                workspaceId: context.workspaceId,
                countEntryId: String(id),
            });
            if (!product) throw new Error('Produto de contagem não encontrado.');
            productId = product.id;
        }
        const requestedProfile = updates.profile_id || updates.user_id;
        const profileId = requestedProfile
            ? await resolveProfileId(context.workspaceId, requestedProfile, context.userId)
            : current.profile_id;
        const result = await client
            .from('ritmika_count_entries')
            .update({
                product_id: productId,
                profile_id: profileId,
                count_date: updates.data_contagem || updates.count_date || current.count_date,
                weekday: updates.dia_semana || updates.weekday || current.weekday,
                shift: updates.turno || updates.shift || current.shift,
                counted_quantity: updates.quantidade_contada ?? updates.counted_quantity ?? current.counted_quantity,
                ordered_quantity: updates.quantidade_pedida ?? updates.ordered_quantity ?? current.ordered_quantity,
                counted_by: updates.retirado_por || updates.counted_by || current.counted_by,
                notes: updates.observacoes ?? updates.notes ?? current.notes,
                status: updates.status === 'completo' ? 'completed' : (updates.status || current.status),
                updated_at: new Date().toISOString(),
            })
            .eq('workspace_id', context.workspaceId)
            .eq('id', String(id))
            .select('*')
            .single();
        const updated = unwrap('updateCountEntry', result, {
            workspaceId: context.workspaceId,
            countEntryId: String(id),
        });
        return (await mapCountRows(context.workspaceId, [updated]))[0] || null;
    },

    async deleteCountEntry(id) {
        const context = await getWorkspaceContext();
        const result = await requireSupabase()
            .from('ritmika_count_entries')
            .delete()
            .eq('workspace_id', context.workspaceId)
            .eq('id', String(id));
        unwrap('deleteCountEntry', result, {
            workspaceId: context.workspaceId,
            countEntryId: String(id),
        });
        return true;
    },

    async listExecutions(checklistId, options = {}) {
        const context = await getWorkspaceContext();
        let resolvedChecklistId = null;
        if (checklistId) {
            resolvedChecklistId = (await resolveChecklistForWorkspace(context.workspaceId, checklistId)).id;
        }
        const limit = Math.min(Number(options.limit || 100), 1000);
        const offset = Math.max(Number(options.offset || 0), 0);
        let query = requireSupabase()
            .from('ritmika_responses')
            .select('*')
            .eq('workspace_id', context.workspaceId)
            .order('execution_date', { ascending: false, nullsFirst: false })
            .range(offset, offset + limit - 1);
        if (resolvedChecklistId) query = query.eq('checklist_id', resolvedChecklistId);
        if (options.from) query = query.gte('execution_date', options.from);
        if (options.to) query = query.lte('execution_date', options.to);
        if (options.status === 'completed') query = query.eq('is_finished', true);
        if (options.status === 'in_progress') query = query.eq('is_finished', false);
        const result = await query;
        const rows = unwrap('listExecutions', result, {
            workspaceId: context.workspaceId,
            checklistId: resolvedChecklistId,
        }) || [];
        return mapExecutionRows(context.workspaceId, rows);
    },

    async getExecution(id) {
        const context = await getWorkspaceContext();
        const row = await getResponseRow(context.workspaceId, id);
        if (!row) return null;
        const execution = (await mapExecutionRows(context.workspaceId, [row]))[0] || null;
        if (!execution) return null;
        execution.evidence = await this.listEvidence(row.id);
        return execution;
    },

    async createNotification({
        recipientProfileId = null,
        sourceId,
        kind = 'system',
        title,
        body,
        route = '/notifications',
        entityType = null,
        entityId = null,
        metadata = {},
    } = {}) {
        const context = await getWorkspaceContext();
        const profile = recipientProfileId
            ? null
            : await getProfileForUser(context.workspaceId, context.userId);
        const result = await requireSupabase()
            .from('ritmika_notifications')
            .insert({
                workspace_id: context.workspaceId,
                recipient_profile_id: recipientProfileId || profile?.id || null,
                source_id: sourceId || makeClientId('ritmika-notification'),
                kind,
                title: title || 'Atualização do workspace',
                body: body || null,
                route,
                entity_type: entityType,
                entity_id: entityId ? String(entityId) : null,
                metadata,
            })
            .select('*')
            .single();
        return mapNotification(unwrap('createNotification', result, {
            workspaceId: context.workspaceId,
        }));
    },

    async getNotifications(limit = 100) {
        const context = await getWorkspaceContext();
        const profile = await getProfileForUser(context.workspaceId, context.userId);
        const result = await requireSupabase()
            .from('ritmika_notifications')
            .select('*')
            .eq('workspace_id', context.workspaceId)
            .order('created_at', { ascending: false })
            .limit(Math.min(Number(limit || 100), 500));
        const rows = unwrap('getNotifications', result, { workspaceId: context.workspaceId }) || [];
        return rows
            .filter((row) => !row.recipient_profile_id || row.recipient_profile_id === profile?.id)
            .map(mapNotification);
    },

    async markNotificationRead(id) {
        const context = await getWorkspaceContext();
        const result = await requireSupabase()
            .from('ritmika_notifications')
            .update({ read_at: new Date().toISOString() })
            .eq('workspace_id', context.workspaceId)
            .eq('id', String(id))
            .select('*')
            .single();
        return mapNotification(unwrap('markNotificationRead', result, {
            workspaceId: context.workspaceId,
            notificationId: String(id),
        }));
    },

    async markAllNotificationsRead() {
        const notifications = await this.getNotifications(500);
        const unreadIds = notifications.filter((notification) => !notification.read).map((notification) => notification.id);
        if (unreadIds.length === 0) return 0;
        const context = await getWorkspaceContext();
        const result = await requireSupabase()
            .from('ritmika_notifications')
            .update({ read_at: new Date().toISOString() })
            .eq('workspace_id', context.workspaceId)
            .in('id', unreadIds);
        unwrap('markAllNotificationsRead', result, {
            workspaceId: context.workspaceId,
            count: unreadIds.length,
        });
        return unreadIds.length;
    },

    async getDashboardData(periodDays = 30) {
        const context = await getWorkspaceContext();
        const client = requireSupabase();
        const period = getDashboardPeriod(periodDays);
        const nowIso = new Date().toISOString();
        const scopedToPeriod = (query) => {
            if (!period.startIso) return query;
            return query.gte('execution_date', period.startIso).lt('execution_date', period.endIso);
        };
        const [checklistsResult, responsesResult, totalResult, completedResult, overdueResult, unreadResult] = await Promise.all([
            client
                .from('ritmika_checklists')
                .select('id,title,status,items,schedule,unit_id,sector_id,moment_id,metadata')
                .eq('workspace_id', context.workspaceId)
                .order('title', { ascending: true }),
            scopedToPeriod(client
                .from('ritmika_responses')
                .select('id,checklist_id,profile_id,source_user_id,is_finished,response_data,execution_date,started_at,completed_at,qtd_items,qtd_items_answered,metadata,created_at,updated_at,checklist_snapshot')
                .eq('workspace_id', context.workspaceId)
                .order('execution_date', { ascending: false, nullsFirst: false })
                .limit(1000)),
            scopedToPeriod(client.from('ritmika_responses').select('id', { count: 'exact', head: true }).eq('workspace_id', context.workspaceId)),
            scopedToPeriod(client.from('ritmika_responses').select('id', { count: 'exact', head: true }).eq('workspace_id', context.workspaceId).eq('is_finished', true)),
            scopedToPeriod(client.from('ritmika_responses').select('id', { count: 'exact', head: true }).eq('workspace_id', context.workspaceId).eq('is_finished', false).lt('execution_date', nowIso)),
            client.from('ritmika_notifications').select('id', { count: 'exact', head: true }).eq('workspace_id', context.workspaceId).is('read_at', null),
        ]);
        const checklistRows = unwrap('getDashboardData.checklists', checklistsResult, { workspaceId: context.workspaceId }) || [];
        const responseRows = unwrap('getDashboardData.responses', responsesResult, { workspaceId: context.workspaceId }) || [];
        if (totalResult.error) {
            reportError('getDashboardData.total', totalResult.error, { workspaceId: context.workspaceId });
            throw totalResult.error;
        }
        if (completedResult.error) {
            reportError('getDashboardData.completed', completedResult.error, { workspaceId: context.workspaceId });
            throw completedResult.error;
        }
        if (overdueResult.error) {
            reportError('getDashboardData.overdue', overdueResult.error, { workspaceId: context.workspaceId });
            throw overdueResult.error;
        }
        if (unreadResult.error) {
            reportError('getDashboardData.notifications', unreadResult.error, { workspaceId: context.workspaceId });
            throw unreadResult.error;
        }
        const checklistMap = new Map(checklistRows.map((row) => [String(row.id), row]));
        const now = Date.now();
        const taskFromRow = (row) => {
            const checklist = checklistMap.get(String(row.checklist_id));
            const dueDate = row.execution_date || row.started_at || row.created_at;
            const dueTime = dueDate ? new Date(dueDate).getTime() : now;
            const delta = dueTime - now;
            const title = checklist?.title || row.checklist_snapshot?.title || 'Checklist';
            return {
                id: row.checklist_id,
                response_id: row.id,
                execution_id: row.id,
                title,
                due_at: dueDate,
                startTime: dueDate ? new Date(dueDate).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : 'Sem horário',
                delay: delta < 0 ? Math.max(1, Math.round(Math.abs(delta) / 60000)) + ' min' : null,
                dueIn: delta >= 0 ? (delta < 3600000 ? Math.max(1, Math.round(delta / 60000)) + ' min' : new Date(dueTime).toLocaleString('pt-BR')) : null,
                status: row.is_finished ? 'completed' : (row.metadata?.status || 'pending'),
            };
        };
        const incompleteRows = responseRows.filter((row) => !row.is_finished);
        const lateRows = incompleteRows.filter((row) => {
            const dueDate = row.execution_date || row.started_at || row.created_at;
            return dueDate && new Date(dueDate).getTime() < now;
        });
        const upcomingRows = incompleteRows.filter((row) => {
            const dueDate = row.execution_date || row.started_at || row.created_at;
            return !dueDate || new Date(dueDate).getTime() >= now;
        });
        const lateIds = new Set(lateRows.map((row) => String(row.id)));
        const nowRows = incompleteRows.filter((row) => !lateIds.has(String(row.id)));
        const inProgress = incompleteRows.filter((row) => row.metadata?.status === 'in_progress').length;
        const totalScheduled = Number(totalResult.count || 0);
        const completed = Number(completedResult.count || 0);

        return {
            workspace_id: context.workspaceId,
            period,
            checklists: checklistRows,
            stats: {
                totalScheduled,
                completed,
                pending: Math.max(totalScheduled - completed, 0),
                inProgress,
                overdue: Number(overdueResult.count || 0),
                completionRate: totalScheduled ? Math.round((completed / totalScheduled) * 100) : 0,
                unreadNotifications: Number(unreadResult.count || 0),
            },
            tasks: {
                late: lateRows.slice(0, 12).map(taskFromRow),
                now: nowRows.slice(0, 12).map(taskFromRow),
                upcoming: upcomingRows.slice(0, 12).map(taskFromRow),
            },
            recentExecutions: await mapExecutionRows(context.workspaceId, responseRows.slice(0, 12)),
        };
    },

    async getTeam() {
        const context = await getWorkspaceContext();
        const client = requireSupabase();
        const [profilesResult, responsesResult] = await Promise.all([
            client
                .from('ritmika_profiles')
                .select('id,name,email,role,is_owner,managed_units,metadata')
                .eq('workspace_id', context.workspaceId)
                .order('name', { ascending: true }),
            client
                .from('ritmika_responses')
                .select('profile_id,is_finished,metadata,effort_kpi,quality_kpi,ttc')
                .eq('workspace_id', context.workspaceId)
                .limit(5000),
        ]);
        const profiles = unwrap('getTeam.profiles', profilesResult, { workspaceId: context.workspaceId }) || [];
        const responses = unwrap('getTeam.responses', responsesResult, { workspaceId: context.workspaceId }) || [];
        const scoreMap = new Map();
        responses.forEach((response) => {
            if (!response.profile_id) return;
            const current = scoreMap.get(String(response.profile_id)) || { total: 0, completed: 0, scoreTotal: 0, scored: 0 };
            current.total += 1;
            if (response.is_finished) current.completed += 1;
            const rawScores = [
                Number(response.metadata?.score),
                Number(response.effort_kpi),
                Number(response.quality_kpi),
                Number(response.ttc),
            ].filter((value) => Number.isFinite(value));
            const score = rawScores.length > 0
                ? (rawScores.reduce((total, value) => total + (value >= 0 && value <= 1 ? value * 100 : value), 0) / rawScores.length)
                : null;
            if (Number.isFinite(score)) {
                current.scoreTotal += score;
                current.scored += 1;
            }
            scoreMap.set(String(response.profile_id), current);
        });
        return profiles
            .map((profile) => {
                const score = scoreMap.get(String(profile.id)) || { total: 0, completed: 0, scoreTotal: 0, scored: 0 };
                return {
                    ...profile,
                    points: score.completed,
                    completed_count: score.completed,
                    execution_count: score.total,
                    completion_rate: score.total ? Math.round((score.completed / score.total) * 100) : 0,
                    average_score: score.scored ? Math.round(score.scoreTotal / score.scored) : 0,
                };
            })
            .sort((left, right) => right.points - left.points || left.name.localeCompare(right.name));
    },

    async getSettings() {
        const context = await getWorkspaceContext();
        const profile = await getProfileForUser(context.workspaceId, context.userId);
        const result = await requireSupabase()
            .from('ritmika_workspace_settings')
            .select('*')
            .eq('workspace_id', context.workspaceId)
            .maybeSingle();
        return {
            profile,
            workspace: unwrap('getSettings.workspace', result, { workspaceId: context.workspaceId }) || {
                default_theme: 'light',
                timezone: 'America/Sao_Paulo',
                locale: 'pt-BR',
                settings: {},
            },
        };
    },

    async updateProfile(updates = {}) {
        const context = await getWorkspaceContext();
        const profile = await getProfileForUser(context.workspaceId, context.userId);
        if (!profile) throw new Error('Perfil do workspace não encontrado.');
        const result = await requireSupabase()
            .from('ritmika_profiles')
            .update({
                name: updates.name || profile.name,
                phone: updates.phone ?? profile.phone,
                preferences: updates.preferences && typeof updates.preferences === 'object'
                    ? updates.preferences
                    : profile.preferences || {},
                updated_at: new Date().toISOString(),
            })
            .eq('workspace_id', context.workspaceId)
            .eq('id', profile.id)
            .select('id,workspace_id,email,name,phone,role,is_owner,preferences,metadata')
            .single();
        return unwrap('updateProfile', result, {
            workspaceId: context.workspaceId,
            profileId: profile.id,
        });
    },

    async updateWorkspaceSettings(updates = {}) {
        const context = await getWorkspaceContext();
        const currentResult = await requireSupabase()
            .from('ritmika_workspace_settings')
            .select('*')
            .eq('workspace_id', context.workspaceId)
            .maybeSingle();
        const current = unwrap('updateWorkspaceSettings.current', currentResult, {
            workspaceId: context.workspaceId,
        }) || {};
        const result = await requireSupabase()
            .from('ritmika_workspace_settings')
            .upsert({
                workspace_id: context.workspaceId,
                default_theme: 'light',
                timezone: updates.timezone || current.timezone || 'America/Sao_Paulo',
                locale: updates.locale || current.locale || 'pt-BR',
                settings: updates.settings && typeof updates.settings === 'object'
                    ? updates.settings
                    : current.settings || {},
                updated_at: new Date().toISOString(),
            })
            .select('*')
            .single();
        return unwrap('updateWorkspaceSettings', result, { workspaceId: context.workspaceId });
    },

    async uploadEvidence({ responseId, checklistId, itemId, file, kind, title } = {}) {
        if (!file) throw new Error('Selecione um arquivo de evidência.');
        if (file.size > 25 * 1024 * 1024) throw new Error('A evidência deve ter no máximo 25 MB.');
        const context = await getWorkspaceContext();
        const client = requireSupabase();
        const response = responseId ? await getResponseRow(context.workspaceId, responseId) : null;
        const resolvedChecklistId = response?.checklist_id || (checklistId
            ? (await resolveChecklistForWorkspace(context.workspaceId, checklistId)).id
            : null);
        if (!resolvedChecklistId) throw new Error('Informe o checklist da evidência.');
        let item = null;
        if (itemId) {
            const byId = isUuid(itemId)
                ? await client.from('ritmika_checklist_items').select('id').eq('workspace_id', context.workspaceId).eq('checklist_id', resolvedChecklistId).eq('id', String(itemId)).maybeSingle()
                : { data: null, error: null };
            item = unwrap('uploadEvidence.itemById', byId, { workspaceId: context.workspaceId }) || null;
            if (!item) {
                const bySource = await client
                    .from('ritmika_checklist_items')
                    .select('id')
                    .eq('workspace_id', context.workspaceId)
                    .eq('checklist_id', resolvedChecklistId)
                    .eq('source_id', String(itemId))
                    .maybeSingle();
                item = unwrap('uploadEvidence.itemBySource', bySource, { workspaceId: context.workspaceId }) || null;
            }
        }
        const profile = await getProfileForUser(context.workspaceId, context.userId);
        const path = [
            context.workspaceId,
            response?.id || 'draft',
            item?.id || String(itemId || 'general'),
            makeClientId('evidence') + '-' + safeFileName(file.name),
        ].join('/');
        const bucket = client.storage.from('ritmika-evidences');
        const uploadResult = await bucket.upload(path, file, {
            upsert: false,
            contentType: file.type || 'application/octet-stream',
        });
        if (uploadResult.error) {
            reportError('uploadEvidence.storage', uploadResult.error, {
                workspaceId: context.workspaceId,
                responseId: response?.id || null,
            });
            throw uploadResult.error;
        }
        const evidenceResult = await client
            .from('ritmika_evidences')
            .insert({
                workspace_id: context.workspaceId,
                response_id: response?.id || null,
                checklist_id: resolvedChecklistId,
                checklist_item_id: item?.id || null,
                profile_id: profile?.id || null,
                source_id: makeClientId('ritmika-evidence'),
                kind: kind || (file.type?.startsWith('image/') ? 'photo' : 'document'),
                title: title || file.name,
                storage_bucket: 'ritmika-evidences',
                storage_path: path,
                mime_type: file.type || null,
                size_bytes: file.size || null,
                metadata: {
                    item_source_id: itemId ? String(itemId) : null,
                    original_name: file.name || null,
                },
            })
            .select('*')
            .single();
        const evidence = unwrap('uploadEvidence', evidenceResult, {
            workspaceId: context.workspaceId,
            responseId: response?.id || null,
        });
        try {
            await this.createNotification({
                recipientProfileId: profile?.id || null,
                sourceId: `evidence-upload:${evidence.id}`,
                kind: 'evidence_uploaded',
                title: 'Evidência anexada',
                body: title || file.name || 'Uma nova evidência foi anexada ao workspace.',
                route: '/notifications',
                entityType: 'evidence',
                entityId: evidence.id,
                metadata: {
                    response_id: response?.id || null,
                    checklist_id: resolvedChecklistId,
                    checklist_item_id: item?.id || null,
                },
            });
        } catch (notificationError) {
            reportError('uploadEvidence.notification', notificationError, {
                workspaceId: context.workspaceId,
                evidenceId: evidence.id,
            });
        }
        return this.getEvidenceUrl(evidence);
    },

    async getEvidenceUrl(evidence) {
        const sourceUrl = evidence?.metadata?.source_url;
        if (sourceUrl) {
            return {
                ...evidence,
                url: sourceUrl,
                isHistorical: Boolean(evidence?.metadata?.historical_import),
            };
        }
        if (!evidence?.storage_bucket || !evidence?.storage_path) {
            return {
                ...evidence,
                url: null,
                isHistorical: Boolean(evidence?.metadata?.historical_import),
            };
        }
        const client = requireSupabase();
        const result = await client
            .storage
            .from(evidence.storage_bucket || 'ritmika-evidences')
            .createSignedUrl(evidence.storage_path, 60 * 60);
        if (result.error) {
            reportError('getEvidenceUrl', result.error, { evidenceId: evidence.id });
            throw result.error;
        }
        return {
            ...evidence,
            url: result.data?.signedUrl || null,
            isHistorical: Boolean(evidence?.metadata?.historical_import),
        };
    },

    async listEvidence(responseId) {
        const context = await getWorkspaceContext();
        const result = await requireSupabase()
            .from('ritmika_evidences')
            .select('*')
            .eq('workspace_id', context.workspaceId)
            .eq('response_id', String(responseId))
            .order('created_at', { ascending: false });
        const rows = unwrap('listEvidence', result, {
            workspaceId: context.workspaceId,
            responseId: String(responseId),
        }) || [];
        return Promise.all(rows.map((row) => this.getEvidenceUrl(row).catch((error) => {
            reportError('listEvidence.url', error, { evidenceId: row.id });
            return { ...row, url: null };
        })));
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
        const execution = mapExecution(unwrap('startExecution', result, {
            workspaceId: context.workspaceId,
            checklistId: String(checklistId),
        }));
        await recordExecutionEvent(context.workspaceId, execution.id, profile?.id, 'started', {
            checklist_id: checklist.id,
            execution_type: executionMetadata.execution_type || 'manual',
        });
        try {
            await this.createNotification({
                recipientProfileId: profile?.id || null,
                sourceId: `execution-started:${execution.id}`,
                kind: 'execution_started',
                title: 'Execução iniciada',
                body: checklist.title || 'Um checklist foi iniciado.',
                route: `/checklists/${checklist.id}/details`,
                entityType: 'execution',
                entityId: execution.id,
                metadata: { checklist_id: checklist.id },
            });
        } catch (notificationError) {
            reportError('startExecution.notification', notificationError, {
                workspaceId: context.workspaceId,
                executionId: execution.id,
            });
        }
        return execution;
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
        const execution = mapExecution(unwrap('saveExecution', result, {
            workspaceId: context.workspaceId,
            executionId: String(id),
        }));
        await recordExecutionEvent(context.workspaceId, execution.id, current.profile_id, 'saved', {
            progress: nextMetadata.progress || 0,
        });
        return execution;
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
        const execution = mapExecution(unwrap('completeExecution', result, {
            workspaceId: context.workspaceId,
            executionId: String(id),
        }));
        await recordExecutionEvent(context.workspaceId, execution.id, current.profile_id, 'completed', {
            progress,
            score: progress,
        });
        try {
            await this.createNotification({
                recipientProfileId: current.profile_id || null,
                sourceId: `execution-completed:${execution.id}`,
                kind: 'execution_completed',
                title: 'Execução concluída',
                body: `Checklist concluído com ${progress}% de progresso.`,
                route: `/checklists/${current.checklist_id}/details`,
                entityType: 'execution',
                entityId: execution.id,
                metadata: {
                    checklist_id: current.checklist_id,
                    progress,
                    score: progress,
                },
            });
        } catch (notificationError) {
            reportError('completeExecution.notification', notificationError, {
                workspaceId: context.workspaceId,
                executionId: execution.id,
            });
        }
        return execution;
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
        const execution = mapExecution(unwrap('retryExecution', result, {
            workspaceId: context.workspaceId,
            executionId: String(id),
        }));
        await recordExecutionEvent(context.workspaceId, execution.id, current.profile_id, 'retried', {
            retry_count: Number(currentMetadata.retry_count || 0) + 1,
        });
        try {
            await this.createNotification({
                recipientProfileId: current.profile_id || null,
                sourceId: `execution-retried:${execution.id}:${execution.metadata?.retry_count || 0}`,
                kind: 'execution_retried',
                title: 'Execução reiniciada',
                body: 'A execução foi reaberta para uma nova tentativa.',
                route: `/checklists/${current.checklist_id}/details`,
                entityType: 'execution',
                entityId: execution.id,
                metadata: {
                    checklist_id: current.checklist_id,
                    retry_count: execution.metadata?.retry_count || 0,
                },
            });
        } catch (notificationError) {
            reportError('retryExecution.notification', notificationError, {
                workspaceId: context.workspaceId,
                executionId: execution.id,
            });
        }
        return execution;
    },
};

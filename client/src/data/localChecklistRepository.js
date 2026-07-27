import { cloneProductionChecklistFixtures } from './productionChecklistFixtures';
import { logger } from '../lib/logger';

const CHECKLISTS_KEY = 'ritmika.production.checklists.v1';
const CONTAGENS_KEY = 'ritmika.production.contagens.v1';
const EXECUTIONS_KEY = 'ritmika.checklist.executions.v1';

const clone = (value) => JSON.parse(JSON.stringify(value));

const getStorage = () => {
    if (typeof window === 'undefined' || !window.localStorage) {
        return null;
    }
    return window.localStorage;
};

const read = (key, fallback) => {
    const storage = getStorage();
    if (!storage) return clone(fallback);

    try {
        const raw = storage.getItem(key);
        if (!raw) return clone(fallback);
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : clone(fallback);
    } catch (error) {
        logger.error({
            fn: 'localChecklistRepository.read',
            key,
            status: 'error',
            error: error instanceof Error ? error.message : String(error),
        });
        return clone(fallback);
    }
};

const write = (key, value) => {
    const storage = getStorage();
    if (!storage) return;

    try {
        storage.setItem(key, JSON.stringify(value));
    } catch (error) {
        logger.error({
            fn: 'localChecklistRepository.write',
            key,
            status: 'error',
            error: error instanceof Error ? error.message : String(error),
        });
        throw error;
    }
};

const readChecklists = () => read(CHECKLISTS_KEY, []);

const ensureSeeded = () => {
    const checklists = readChecklists();
    if (checklists.length > 0) return checklists;

    const fixtures = cloneProductionChecklistFixtures();
    write(CHECKLISTS_KEY, fixtures);
    return fixtures;
};

const makeId = (prefix) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const normalizeChecklist = (payload = {}) => {
    const id = payload.id || makeId('local-checklist');
    const items = Array.isArray(payload.items) ? payload.items : [];
    const normalizedItems = items.map((item, index) => ({
        ...item,
        id: item.id || `${id}-item-${index + 1}`,
        title: item.title || item.text || `Item ${index + 1}`,
        text: item.text || item.title || `Item ${index + 1}`,
        type: item.type || item.tipo_resposta || 'boolean',
        order: item.order ?? item.ordem ?? index,
        required: item.required ?? item.is_required !== false,
        is_required: item.is_required ?? item.required !== false,
        weight: Number(item.weight ?? item.peso ?? 1),
        evidences: Array.isArray(item.evidences) ? item.evidences : [],
        config: item.config && typeof item.config === 'object' ? item.config : {},
    }));
    const products = Array.isArray(payload.produtos_checklist)
        ? payload.produtos_checklist
        : normalizedItems.map((item, index) => ({
            id: `${id}-item-${index + 1}`,
            checklist_id: id,
            nome: item.title || item.text || `Item sintético ${index + 1}`,
            categoria: 'Checklist',
            unidade: 'item',
            ordem: index + 1,
            ativo: true,
            tipo_resposta: item.type || 'boolean',
            obrigatorio: item.is_required !== false,
        }));

    return {
        id,
        nome: payload.nome || payload.title || 'Novo checklist local',
        title: payload.title || payload.nome || 'Novo checklist local',
        descricao: payload.descricao || payload.description || 'Checklist criado no modo local.',
        description: payload.description || payload.descricao || 'Checklist criado no modo local.',
        tipo: payload.tipo || 'operacional',
        turno_ativado: Boolean(payload.turno_ativado),
        frequencia: payload.frequencia || 'manual',
        responsaveis: Array.isArray(payload.responsaveis) ? payload.responsaveis : [],
        status: payload.status || 'ativo',
        created_at: payload.created_at || new Date().toISOString(),
        updated_at: payload.updated_at || payload.created_at || new Date().toISOString(),
        items: normalizedItems,
        unit_id: payload.unit_id ?? null,
        sector_id: payload.sector_id ?? null,
        moment_id: payload.moment_id ?? null,
        user_id: payload.user_id ?? null,
        usage_policy: payload.usage_policy ?? null,
        adhoc_mode: payload.adhoc_mode || 'disabled',
        adhoc_visible_to_unit: Boolean(payload.adhoc_visible_to_unit),
        adhoc_visible_sector_ids: Array.isArray(payload.adhoc_visible_sector_ids)
            ? payload.adhoc_visible_sector_ids
            : [],
        adhoc_visible_user_ids: Array.isArray(payload.adhoc_visible_user_ids)
            ? payload.adhoc_visible_user_ids
            : [],
        schedule: payload.schedule && typeof payload.schedule === 'object'
            ? payload.schedule
            : {
                mode: payload.schedule_recurrence_type || 'manual',
                time: payload.schedule_time || null,
                startDate: payload.schedule_start_date || null,
                endDate: payload.schedule_end_date || null,
                interval: payload.schedule_interval || 1,
                weekdays: payload.schedule_day_of_week == null
                    ? []
                    : [payload.schedule_day_of_week],
            },
        schedule_time: payload.schedule_time || payload.schedule?.time || null,
        schedule_start_date: payload.schedule_start_date || payload.schedule?.startDate || null,
        schedule_end_date: payload.schedule_end_date || payload.schedule?.endDate || null,
        schedule_recurrence_type: payload.schedule_recurrence_type || payload.schedule?.mode || 'manual',
        schedule_interval: Number(payload.schedule_interval || payload.schedule?.interval || 1),
        schedule_day_of_week: payload.schedule_day_of_week ?? payload.schedule?.weekdays?.[0] ?? null,
        produtos_checklist: products.map((product, index) => ({
            ...product,
            id: product.id || `${id}-produto-${index + 1}`,
            checklist_id: id,
            ordem: product.ordem || index + 1,
            ativo: product.ativo !== false,
        })),
    };
};

const enrichContagem = (contagem, checklists) => {
    const checklist = checklists.find((item) => item.id === contagem.checklist_id);
    const produto = checklist?.produtos_checklist?.find((item) => item.id === contagem.produto_id);

    return {
        ...contagem,
        produtos_checklist: produto || null,
        profiles: contagem.profiles || { name: contagem.retirado_por || 'Gestor Local' },
    };
};

const withinDateRange = (value, start, end) => {
    if (!value) return true;
    const date = String(value).slice(0, 10);
    return (!start || date >= start) && (!end || date <= end);
};

export const localChecklistRepository = {
    getAll(options = {}) {
        const checklists = ensureSeeded();
        const visible = options.includeInactive
            ? checklists
            : checklists.filter((checklist) => checklist.status !== 'inativo');
        return clone(
            visible.sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)))
        );
    },

    getManagerList() {
        return this.getAll({ includeInactive: true });
    },

    getById(id) {
        const checklist = ensureSeeded().find((item) => String(item.id) === String(id));
        return checklist ? clone(checklist) : null;
    },

    getProdutos(checklistId) {
        const checklist = ensureSeeded().find((item) => String(item.id) === String(checklistId));
        return clone(
            (checklist?.produtos_checklist || [])
                .filter((product) => product.ativo !== false)
                .sort((a, b) => (a.ordem || 0) - (b.ordem || 0))
        );
    },

    create(payload) {
        const checklists = readChecklists();
        const checklist = normalizeChecklist(payload);
        write(CHECKLISTS_KEY, [...checklists, checklist]);
        return clone(checklist);
    },

    update(id, updates) {
        const checklists = readChecklists();
        const index = checklists.findIndex((item) => String(item.id) === String(id));
        if (index < 0) return null;

        const updated = normalizeChecklist({ ...checklists[index], ...updates, id: checklists[index].id });
        checklists[index] = updated;
        write(CHECKLISTS_KEY, checklists);
        return clone(updated);
    },

    archive(id) {
        const checklists = readChecklists();
        const index = checklists.findIndex((item) => String(item.id) === String(id));
        if (index < 0) return false;

        checklists[index] = { ...checklists[index], status: 'inativo' };
        write(CHECKLISTS_KEY, checklists);
        return true;
    },

    publish(id, status = 'ativo') {
        return this.update(id, {
            status,
            updated_at: new Date().toISOString(),
        });
    },

    getExecution(id) {
        const execution = read(EXECUTIONS_KEY, [])
            .find((item) => String(item.id) === String(id));
        return execution ? clone(execution) : null;
    },

    getExecutions(checklistId) {
        return clone(
            read(EXECUTIONS_KEY, [])
                .filter((item) => String(item.checklist_id) === String(checklistId))
                .sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)))
        );
    },

    startExecution(checklistId, metadata = {}) {
        const checklist = this.getById(checklistId);
        if (!checklist) throw new Error('Checklist não encontrado');

        const now = new Date().toISOString();
        const execution = {
            id: makeId('local-execution'),
            checklist_id: checklist.id,
            status: 'in_progress',
            answers: {},
            started_at: now,
            completed_at: null,
            created_at: now,
            updated_at: now,
            retry_count: 0,
            ...metadata,
        };
        write(EXECUTIONS_KEY, [...read(EXECUTIONS_KEY, []), execution]);
        return clone(execution);
    },

    saveExecution(id, updates = {}) {
        const executions = read(EXECUTIONS_KEY, []);
        const index = executions.findIndex((item) => String(item.id) === String(id));
        if (index < 0) return null;

        executions[index] = {
            ...executions[index],
            ...updates,
            updated_at: new Date().toISOString(),
        };
        write(EXECUTIONS_KEY, executions);
        return clone(executions[index]);
    },

    completeExecution(id, answers = {}) {
        const execution = this.getExecution(id);
        if (!execution) return null;

        const checklist = this.getById(execution.checklist_id);
        const items = (checklist?.items || []).filter((item) => item.type !== 'separator');
        const answered = items.filter((item) => {
            const value = answers[item.id];
            return value !== undefined && value !== null && value !== '';
        }).length;
        const now = new Date().toISOString();
        return this.saveExecution(id, {
            answers,
            status: 'completed',
            completed_at: now,
            progress: items.length ? Math.round((answered / items.length) * 100) : 100,
            score: items.length ? Math.round((answered / items.length) * 100) : 100,
        });
    },

    retryExecution(id) {
        const execution = this.getExecution(id);
        if (!execution) return null;
        const now = new Date().toISOString();
        return this.saveExecution(id, {
            status: 'in_progress',
            answers: {},
            started_at: now,
            completed_at: null,
            progress: 0,
            retry_count: (execution.retry_count || 0) + 1,
        });
    },

    getContagens(checklistId, dataInicio, dataFim) {
        const checklists = ensureSeeded();
        const contagens = read(CONTAGENS_KEY, [])
            .filter((item) => String(item.checklist_id) === String(checklistId))
            .filter((item) => withinDateRange(item.data_contagem, dataInicio, dataFim))
            .sort((a, b) => String(b.data_contagem).localeCompare(String(a.data_contagem)));

        return clone(contagens.map((item) => enrichContagem(item, checklists)));
    },

    getContagensByProduto(produtoId, dataInicio, dataFim) {
        const checklists = ensureSeeded();
        const contagens = read(CONTAGENS_KEY, [])
            .filter((item) => String(item.produto_id) === String(produtoId))
            .filter((item) => withinDateRange(item.data_contagem, dataInicio, dataFim))
            .sort((a, b) => String(b.data_contagem).localeCompare(String(a.data_contagem)));

        return clone(contagens.map((item) => enrichContagem(item, checklists)));
    },

    createContagem(payload) {
        const contagens = read(CONTAGENS_KEY, []);
        const contagem = {
            ...payload,
            id: payload.id || makeId('local-contagem'),
            created_at: payload.created_at || new Date().toISOString(),
            status: payload.status || 'completo',
        };
        write(CONTAGENS_KEY, [...contagens, contagem]);
        return clone(contagem);
    },

    createContagens(payloads = []) {
        const contagens = read(CONTAGENS_KEY, []);
        const created = payloads.map((payload) => ({
            ...payload,
            id: payload.id || makeId('local-contagem'),
            created_at: payload.created_at || new Date().toISOString(),
            status: payload.status || 'completo',
        }));
        write(CONTAGENS_KEY, [...contagens, ...created]);
        return clone(created);
    },

    updateContagem(id, updates) {
        const contagens = read(CONTAGENS_KEY, []);
        const index = contagens.findIndex((item) => String(item.id) === String(id));
        if (index < 0) return null;

        contagens[index] = { ...contagens[index], ...updates };
        write(CONTAGENS_KEY, contagens);
        return clone(contagens[index]);
    },

    deleteContagem(id) {
        const contagens = read(CONTAGENS_KEY, []);
        const next = contagens.filter((item) => String(item.id) !== String(id));
        if (next.length === contagens.length) return false;

        write(CONTAGENS_KEY, next);
        return true;
    },

    reset() {
        write(CHECKLISTS_KEY, cloneProductionChecklistFixtures());
        write(CONTAGENS_KEY, []);
        write(EXECUTIONS_KEY, []);
        return true;
    },
};

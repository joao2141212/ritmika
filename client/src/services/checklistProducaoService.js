// Checklists de Produção
import { localChecklistRepository } from '../data/localChecklistRepository';
import { remoteChecklistRepository } from '../data/remoteChecklistRepository';

const isLocalData = () => import.meta.env.VITE_DATA_MODE !== 'remote';

export const checklistProducaoService = {
    async getAll() {
        if (isLocalData()) {
            return localChecklistRepository.getAll();
        }

        return remoteChecklistRepository.getAll();
    },

    async getManagerList() {
        if (isLocalData()) {
            return localChecklistRepository.getManagerList();
        }

        return remoteChecklistRepository.getManagerList();
    },

    async getById(id) {
        if (isLocalData()) {
            return localChecklistRepository.getById(id);
        }

        return remoteChecklistRepository.getById(id);
    },

    async getProdutos(checklistId) {
        if (isLocalData()) {
            return localChecklistRepository.getProdutos(checklistId);
        }

        return remoteChecklistRepository.getProdutos(checklistId);
    },

// Checklist writes
    async create(checklist) {
        if (isLocalData()) {
            return localChecklistRepository.create(checklist);
        }

        return remoteChecklistRepository.create(checklist);
    },

    async update(id, updates) {
        if (isLocalData()) {
            return localChecklistRepository.update(id, updates);
        }

        return remoteChecklistRepository.update(id, updates);
    },

    async archive(id) {
        if (isLocalData()) {
            return localChecklistRepository.archive(id);
        }

        return remoteChecklistRepository.archive(id);
    },

    async publish(id, status = 'ativo') {
        if (isLocalData()) {
            return localChecklistRepository.publish(id, status);
        }

        return remoteChecklistRepository.publish(id, status);
    },

    async startExecution(checklistId, metadata = {}) {
        if (isLocalData()) {
            return localChecklistRepository.startExecution(checklistId, metadata);
        }

        return remoteChecklistRepository.startExecution(checklistId, metadata);
    },

    async saveExecution(id, updates = {}) {
        if (isLocalData()) {
            return localChecklistRepository.saveExecution(id, updates);
        }

        return remoteChecklistRepository.saveExecution(id, updates);
    },

    async completeExecution(id, answers = {}) {
        if (isLocalData()) {
            return localChecklistRepository.completeExecution(id, answers);
        }

        return remoteChecklistRepository.completeExecution(id, answers);
    },

    async retryExecution(id) {
        if (isLocalData()) {
            return localChecklistRepository.retryExecution(id);
        }

        return remoteChecklistRepository.retryExecution(id);
    }
};

export const contagemService = {
    async create(contagem) {
        if (isLocalData()) {
            return localChecklistRepository.createContagem(contagem);
        }

        return remoteChecklistRepository.createCountEntry(contagem);
    },

    async createBatch(contagens) {
        if (isLocalData()) {
            return localChecklistRepository.createContagens(contagens);
        }

        return remoteChecklistRepository.createCountEntries(contagens);
    },

    async getByChecklist(checklistId, dataInicio, dataFim) {
        if (isLocalData()) {
            return localChecklistRepository.getContagens(checklistId, dataInicio, dataFim);
        }

        return remoteChecklistRepository.getCountEntriesByChecklist(checklistId, dataInicio, dataFim);
    },

    async getByProduto(produtoId, dataInicio, dataFim) {
        if (isLocalData()) {
            return localChecklistRepository.getContagensByProduto(produtoId, dataInicio, dataFim);
        }

        return remoteChecklistRepository.getCountEntriesByProduct(produtoId, dataInicio, dataFim);
    },

    async update(id, updates) {
        if (isLocalData()) {
            return localChecklistRepository.updateContagem(id, updates);
        }

        return remoteChecklistRepository.updateCountEntry(id, updates);
    },

    async delete(id) {
        if (isLocalData()) {
            return localChecklistRepository.deleteContagem(id);
        }

        return remoteChecklistRepository.deleteCountEntry(id);
    }
};

export const executionService = {
    async getByChecklist(checklistId, options = {}) {
        if (isLocalData()) return [];
        return remoteChecklistRepository.listExecutions(checklistId, options);
    },

    async getById(id) {
        if (isLocalData()) return null;
        return remoteChecklistRepository.getExecution(id);
    }
};

export const dashboardService = {
    async getData(periodDays) {
        if (isLocalData()) {
            return {
                stats: {
                    totalScheduled: 0,
                    completed: 0,
                    pending: 0,
                    inProgress: 0,
                    overdue: 0,
                    completionRate: 0,
                    unreadNotifications: 0,
                },
                tasks: { late: [], now: [], upcoming: [] },
                recentExecutions: [],
                checklists: [],
            };
        }
        return remoteChecklistRepository.getDashboardData(periodDays);
    }
};

export const notificationService = {
    async getAll(limit = 100) {
        if (isLocalData()) return [];
        return remoteChecklistRepository.getNotifications(limit);
    },

    async create(payload) {
        if (isLocalData()) return null;
        return remoteChecklistRepository.createNotification(payload);
    },

    async markRead(id) {
        if (isLocalData()) return null;
        return remoteChecklistRepository.markNotificationRead(id);
    },

    async markAllRead() {
        if (isLocalData()) return 0;
        return remoteChecklistRepository.markAllNotificationsRead();
    }
};

export const evidenceService = {
    async list(responseId) {
        if (isLocalData()) return [];
        return remoteChecklistRepository.listEvidence(responseId);
    },

    async upload(payload) {
        if (isLocalData()) throw new Error('Evidências remotas exigem o modo remoto.');
        return remoteChecklistRepository.uploadEvidence(payload);
    }
};

export const teamService = {
    async getAll() {
        if (isLocalData()) return [];
        return remoteChecklistRepository.getTeam();
    }
};

export const settingsService = {
    async get() {
        if (isLocalData()) return { profile: null, workspace: { default_theme: 'light', settings: {} } };
        return remoteChecklistRepository.getSettings();
    },

    async updateProfile(updates) {
        if (isLocalData()) return updates;
        return remoteChecklistRepository.updateProfile(updates);
    },

    async updateWorkspaceSettings(updates) {
        if (isLocalData()) return updates;
        return remoteChecklistRepository.updateWorkspaceSettings(updates);
    }
};

// Helpers
export const getDiaSemana = (date) => {
    const dias = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SAB'];
    return dias[new Date(date).getDay()];
};

export const formatDate = (date) => {
    return new Date(date).toISOString().split('T')[0];
};

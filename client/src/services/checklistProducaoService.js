// Checklists de Produção
import { remoteChecklistRepository as rawRemoteChecklistRepository } from '../data/remoteChecklistRepository';
import { createCachedRepository } from '../lib/serverState';

const remoteChecklistRepository = createCachedRepository(rawRemoteChecklistRepository, 'workspace');

export const checklistProducaoService = {
    async getAll() {
        return remoteChecklistRepository.getAll();
    },

    async getManagerList() {
        return remoteChecklistRepository.getManagerList();
    },

    async getReferences() {
        return remoteChecklistRepository.getReferences();
    },

    async getChecklistFolders() {
        return remoteChecklistRepository.getChecklistFolders();
    },

    async createChecklistFolder(name) {
        return remoteChecklistRepository.createChecklistFolder(name);
    },

    async moveChecklistsToFolder(ids, folderId = null) {
        return remoteChecklistRepository.moveChecklistsToFolder(ids, folderId);
    },

    async getById(id) {
        return remoteChecklistRepository.getById(id);
    },

    async getProdutos(checklistId) {
        return remoteChecklistRepository.getProdutos(checklistId);
    },

// Checklist writes
    async create(checklist) {
        return remoteChecklistRepository.create(checklist);
    },

    async update(id, updates) {
        return remoteChecklistRepository.update(id, updates);
    },

    async archive(id) {
        return remoteChecklistRepository.archive(id);
    },

    async publish(id, status = 'ativo') {
        return remoteChecklistRepository.publish(id, status);
    },

    async bulkUpdateStatus(ids, status = 'ativo') {
        return remoteChecklistRepository.bulkUpdateChecklistStatus(ids, status);
    },

    async archiveMany(ids) {
        return remoteChecklistRepository.archiveMany(ids);
    },

    async startExecution(checklistId, metadata = {}) {
        return remoteChecklistRepository.startExecution(checklistId, metadata);
    },

    async saveExecution(id, updates = {}) {
        return remoteChecklistRepository.saveExecution(id, updates);
    },

    async completeExecution(id, answers = {}) {
        return remoteChecklistRepository.completeExecution(id, answers);
    },

    async retryExecution(id) {
        return remoteChecklistRepository.retryExecution(id);
    }
};

export const contagemService = {
    async create(contagem) {
        return remoteChecklistRepository.createCountEntry(contagem);
    },

    async createBatch(contagens) {
        return remoteChecklistRepository.createCountEntries(contagens);
    },

    async getByChecklist(checklistId, dataInicio, dataFim) {
        return remoteChecklistRepository.getCountEntriesByChecklist(checklistId, dataInicio, dataFim);
    },

    async getByProduto(produtoId, dataInicio, dataFim) {
        return remoteChecklistRepository.getCountEntriesByProduct(produtoId, dataInicio, dataFim);
    },

    async update(id, updates) {
        return remoteChecklistRepository.updateCountEntry(id, updates);
    },

    async delete(id) {
        return remoteChecklistRepository.deleteCountEntry(id);
    }
};

export const executionService = {
    async getByChecklist(checklistId, options = {}) {
        return remoteChecklistRepository.listExecutions(checklistId, options);
    },

    async getById(id) {
        return remoteChecklistRepository.getExecution(id);
    }
};

export const dashboardService = {
    async getData(periodDays) {
        return remoteChecklistRepository.getDashboardData(periodDays);
    },

    async askKoru(message, context = {}) {
        return remoteChecklistRepository.askKoru(message, context);
    }
};

export const notificationService = {
    async getAll(limit = 100) {
        return remoteChecklistRepository.getNotifications(limit);
    },

    async getGrid(options = {}) {
        return remoteChecklistRepository.getNotificationGrid(options);
    },

    async create(payload) {
        return remoteChecklistRepository.createNotification(payload);
    },

    async markRead(id) {
        return remoteChecklistRepository.markNotificationRead(id);
    },

    async markAllRead() {
        return remoteChecklistRepository.markAllNotificationsRead();
    }
};

export const evidenceService = {
    async list(responseId) {
        return remoteChecklistRepository.listEvidence(responseId);
    },

    async upload(payload) {
        return remoteChecklistRepository.uploadEvidence(payload);
    }
};

export const teamService = {
    async getAll() {
        return remoteChecklistRepository.getTeam();
    }
};

export const settingsService = {
    async get() {
        return remoteChecklistRepository.getSettings();
    },

    async updateProfile(updates) {
        return remoteChecklistRepository.updateProfile(updates);
    },

    async updateWorkspaceSettings(updates) {
        return remoteChecklistRepository.updateWorkspaceSettings(updates);
    },

    async getUnits() {
        return remoteChecklistRepository.getUnits();
    },

    async createUnit(payload) {
        return remoteChecklistRepository.createUnit(payload);
    },

    async updateUnit(id, payload) {
        return remoteChecklistRepository.updateUnit(id, payload);
    },

    async archiveUnit(id) {
        return remoteChecklistRepository.archiveUnit(id);
    },

    async getSectors() {
        return remoteChecklistRepository.getSectors();
    },

    async createSector(payload) {
        return remoteChecklistRepository.createSector(payload);
    },

    async updateSector(id, payload) {
        return remoteChecklistRepository.updateSector(id, payload);
    },

    async getAiCreditSummary() {
        return remoteChecklistRepository.getAiCreditSummary();
    },

    async getBillingSettings() {
        return remoteChecklistRepository.getBillingSettings();
    },

    async getApiSettings() {
        return remoteChecklistRepository.getApiSettings();
    },

    async updateApiSettings(updates) {
        return remoteChecklistRepository.updateApiSettings(updates);
    },

    async inviteUser(payload) {
        return remoteChecklistRepository.inviteUser(payload);
    },

    async archiveSector(id) {
        return remoteChecklistRepository.archiveSector(id);
    },

    async getUsers() {
        return remoteChecklistRepository.getUsers();
    },

    async updateUser(id, updates) {
        return remoteChecklistRepository.updateTeamMember(id, updates);
    }
};

export const parityService = {
    async getAiAnalyses(filters) {
        return remoteChecklistRepository.getAiAnalyses(filters);
    },

    async getCourses() {
        return remoteChecklistRepository.getCourses();
    },

    async getCourseContent(courseId) {
        return remoteChecklistRepository.getCourseContent(courseId);
    },

    async updateLessonProgress(lessonId, updates) {
        return remoteChecklistRepository.updateLessonProgress(lessonId, updates);
    },

    async isPlatformAdmin() {
        return remoteChecklistRepository.isPlatformAdmin();
    },

    async getPlatformIdeas(filters) {
        return remoteChecklistRepository.getPlatformIdeas(filters);
    },

    async updatePlatformIdea(ideaId, updates) {
        return remoteChecklistRepository.updatePlatformIdea(ideaId, updates);
    },

    async getIdeas(filters) {
        return remoteChecklistRepository.getIdeas(filters);
    },

    async createIdea(payload) {
        return remoteChecklistRepository.createIdea(payload);
    },

    async toggleIdeaVote(ideaId) {
        return remoteChecklistRepository.toggleIdeaVote(ideaId);
    },

    async getNewsEntries(filters) {
        return remoteChecklistRepository.getNewsEntries(filters);
    },

    async getPlatformNewsEntries() {
        return remoteChecklistRepository.getPlatformNewsEntries();
    },

    async getPlatformWorkspaces() {
        return remoteChecklistRepository.getPlatformWorkspaces();
    },

    async savePlatformNewsEntry(entry) {
        return remoteChecklistRepository.savePlatformNewsEntry(entry);
    },

    async setPlatformNewsPublished(id, isPublished) {
        return remoteChecklistRepository.setPlatformNewsPublished(id, isPublished);
    },

    async getSupportSettings() {
        return remoteChecklistRepository.getSupportSettings();
    },

    async getAiCreditSummary() {
        return remoteChecklistRepository.getAiCreditSummary();
    },

    async getBillingSettings() {
        return remoteChecklistRepository.getBillingSettings();
    },

    async getApiSettings() {
        return remoteChecklistRepository.getApiSettings();
    },

    async updateApiSettings(updates) {
        return remoteChecklistRepository.updateApiSettings(updates);
    },
};

// Helpers
export const getDiaSemana = (date) => {
    const dias = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SAB'];
    return dias[new Date(date).getDay()];
};

export const formatDate = (date) => {
    return new Date(date).toISOString().split('T')[0];
};

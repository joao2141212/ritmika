import { supabase } from '../lib/supabase';

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

        const { data, error } = await supabase
            .from('contagens')
            .insert([contagem])
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    async createBatch(contagens) {
        if (isLocalData()) {
            return localChecklistRepository.createContagens(contagens);
        }

        const { data, error } = await supabase
            .from('contagens')
            .insert(contagens)
            .select();

        if (error) throw error;
        return data;
    },

    async getByChecklist(checklistId, dataInicio, dataFim) {
        if (isLocalData()) {
            return localChecklistRepository.getContagens(checklistId, dataInicio, dataFim);
        }

        let query = supabase
            .from('contagens')
            .select(`
                *,
                produtos_checklist (nome, categoria, unidade),
                profiles (name)
            `)
            .eq('checklist_id', checklistId)
            .order('data_contagem', { ascending: false });

        if (dataInicio) {
            query = query.gte('data_contagem', dataInicio);
        }
        if (dataFim) {
            query = query.lte('data_contagem', dataFim);
        }

        const { data, error } = await query;

        if (error) throw error;
        return data;
    },

    async getByProduto(produtoId, dataInicio, dataFim) {
        if (isLocalData()) {
            return localChecklistRepository.getContagensByProduto(produtoId, dataInicio, dataFim);
        }

        let query = supabase
            .from('contagens')
            .select('*')
            .eq('produto_id', produtoId)
            .order('data_contagem', { ascending: false });

        if (dataInicio) {
            query = query.gte('data_contagem', dataInicio);
        }
        if (dataFim) {
            query = query.lte('data_contagem', dataFim);
        }

        const { data, error } = await query;

        if (error) throw error;
        return data;
    },

    async update(id, updates) {
        if (isLocalData()) {
            return localChecklistRepository.updateContagem(id, updates);
        }

        const { data, error } = await supabase
            .from('contagens')
            .update(updates)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    async delete(id) {
        if (isLocalData()) {
            return localChecklistRepository.deleteContagem(id);
        }

        const { error } = await supabase
            .from('contagens')
            .delete()
            .eq('id', id);

        if (error) throw error;
        return true;
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

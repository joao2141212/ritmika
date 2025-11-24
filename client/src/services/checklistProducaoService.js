import { supabase } from '../lib/supabase';

// Checklists de Produção
export const checklistProducaoService = {
    async getAll() {
        const { data, error } = await supabase
            .from('checklists_producao')
            .select('*, produtos_checklist(*)')
            .eq('status', 'ativo')
            .order('created_at', { ascending: false });

        if (error) throw error;
        return data;
    },

    async getById(id) {
        const { data, error } = await supabase
            .from('checklists_producao')
            .select('*, produtos_checklist(*)')
            .eq('id', id)
            .single();

        if (error) throw error;
        return data;
    },

    async getProdutos(checklistId) {
        const { data, error } = await supabase
            .from('produtos_checklist')
            .select('*')
            .eq('checklist_id', checklistId)
            .eq('ativo', true)
            .order('ordem', { ascending: true });

        if (error) throw error;
        return data;
    }
};

// Contagens (Inventário)
export const contagemService = {
    async create(contagem) {
        const { data, error } = await supabase
            .from('contagens')
            .insert([contagem])
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    async createBatch(contagens) {
        const { data, error } = await supabase
            .from('contagens')
            .insert(contagens)
            .select();

        if (error) throw error;
        return data;
    },

    async getByChecklist(checklistId, dataInicio, dataFim) {
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

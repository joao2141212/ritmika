// Mock data for Ritmika demo - all frontend data
export const mockUsers = [
    { id: 1, name: 'Pedro Duarte', email: 'pedro@ritmika.com', password: '123456', role: 'admin' },
    { id: 2, name: 'João Silva', email: 'joao@ritmika.com', password: '123456', role: 'employee' },
    { id: 3, name: 'Maria Santos', email: 'maria@ritmika.com', password: '123456', role: 'employee' },
    { id: 4, name: 'Ana Costa', email: 'ana@ritmika.com', password: '123456', role: 'employee' },
    { id: 5, name: 'Carlos Oliveira', email: 'carlos@ritmika.com', password: '123456', role: 'employee' },
    { id: 6, name: 'Beatriz Lima', email: 'beatriz@ritmika.com', password: '123456', role: 'employee' },
    { id: 7, name: 'Cliente Demo', email: 'cliente@demo', password: '123456', role: 'cliente' }
];

// Sistema de persistência com localStorage
export const STORAGE_KEYS = {
    checklists: 'ritmika_checklists',
    submissions: 'ritmika_submissions',
    tasks: 'ritmika_tasks',
    team: 'ritmika_team',
    dashboard: 'ritmika_dashboard'
};

// Funções de persistência
export const storage = {
    get: (key, defaultValue = []) => {
        try {
            const data = localStorage.getItem(key);
            return data ? JSON.parse(data) : defaultValue;
        } catch {
            return defaultValue;
        }
    },
    set: (key, data) => {
        try {
            localStorage.setItem(key, JSON.stringify(data));
        } catch (error) {
            console.error('Erro ao salvar no localStorage:', error);
        }
    },
    remove: (key) => localStorage.removeItem(key)
};

export const mockChecklists = [
    {
        id: 1,
        title: 'Abertura de Loja',
        description: 'Procedimentos matinais obrigatórios para início das operações',
        items: [
            { id: 'i1', text: 'Verificar temperatura do freezer', type: 'text', is_required: true },
            { id: 'i2', text: 'Chão está limpo?', type: 'boolean', is_required: true },
            { id: 'i3', text: 'Foto do balcão', type: 'photo', is_required: false },
            { id: 'i4', text: 'Assinatura do responsável', type: 'signature', is_required: true }
        ]
    },
    {
        id: 2,
        title: 'Fechamento de Caixa',
        description: 'Conferência de valores e segurança ao final do expediente',
        items: [
            { id: 'i5', text: 'Valor em dinheiro confere?', type: 'boolean', is_required: true },
            { id: 'i6', text: 'Cartões processados corretamente?', type: 'boolean', is_required: true },
            { id: 'i7', text: 'Caixa registrado no sistema', type: 'boolean', is_required: true },
            { id: 'i8', text: 'Assinatura do responsável', type: 'signature', is_required: true }
        ]
    },
    {
        id: 3,
        title: 'Limpeza Semanal',
        description: 'Checklist profundo de higiene e organização semanal',
        items: [
            { id: 'i9', text: 'Geladeira limpa internamente', type: 'boolean', is_required: true },
            { id: 'i10', text: 'Freezer descongelado e limpo', type: 'boolean', is_required: true },
            { id: 'i11', text: 'Armários organizados', type: 'boolean', is_required: true },
            { id: 'i12', text: 'Pisos lavados com desinfetante', type: 'boolean', is_required: true },
            { id: 'i13', text: 'Vidrarias polidas', type: 'boolean', is_required: true },
            { id: 'i14', text: 'Foto da área após limpeza', type: 'photo', is_required: true }
        ]
    },
    {
        id: 4,
        title: 'Recebimento de Mercadoria',
        description: 'Verificação de qualidade e quantidade de produtos recebidos',
        items: [
            { id: 'i15', text: 'Nota fiscal conferida', type: 'boolean', is_required: true },
            { id: 'i16', text: 'Produtos na validade', type: 'boolean', is_required: true },
            { id: 'i17', text: 'Temperatura de transporte adequada', type: 'boolean', is_required: true },
            { id: 'i18', text: 'Embalagens íntegras', type: 'boolean', is_required: true },
            { id: 'i19', text: 'Quantidade recebida confere', type: 'boolean', is_required: true }
        ]
    },
    {
        id: 5,
        title: 'Manutenção de Equipamentos',
        description: 'Verificação periódica do estado dos equipamentos',
        items: [
            { id: 'i20', text: 'Funcionamento da geladeira OK', type: 'boolean', is_required: true },
            { id: 'i21', text: 'Funcionamento do freezer OK', type: 'boolean', is_required: true },
            { id: 'i22', text: 'Funcionamento do fogão OK', type: 'boolean', is_required: true },
            { id: 'i23', text: 'Funcionamento da cafeteira OK', type: 'boolean', is_required: true },
            { id: 'i24', text: 'Lâmpadas funcionando', type: 'boolean', is_required: false }
        ]
    },
    {
        id: 6,
        title: 'Controle de Qualidade',
        description: 'Verificações de qualidade dos alimentos preparados',
        items: [
            { id: 'i25', text: 'Temperatura de armazenamento adequada', type: 'number', is_required: true },
            { id: 'i26', text: 'Produtos dentro da validade', type: 'boolean', is_required: true },
            { id: 'i27', text: 'Rotulagem correta', type: 'boolean', is_required: true },
            { id: 'i28', text: 'Higiene do ambiente OK', type: 'boolean', is_required: true }
        ]
    }
];

export const mockDashboardData = {
    stats: {
        activeChecklists: 12,
        completedToday: 8,
        teamMembers: 6,
        efficiency: '94%'
    },
    recentActivity: [
        {
            id: 1,
            user_name: 'Maria Santos',
            checklist_title: 'Abertura de Loja',
            submitted_at: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
            status: 'completed'
        },
        {
            id: 2,
            user_name: 'João Silva',
            checklist_title: 'Fechamento de Caixa',
            submitted_at: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
            status: 'completed'
        },
        {
            id: 3,
            user_name: 'Ana Costa',
            checklist_title: 'Limpeza Semanal',
            submitted_at: new Date(Date.now() - 1000 * 60 * 60 * 4).toISOString(),
            status: 'completed'
        }
    ],
    tasks: {
        late: [
            {
                id: 1,
                title: 'Abertura de Loja',
                delay: '45 min',
                description: 'Procedimentos matinais obrigatórios',
                items: [
                    { id: 'i1', text: 'Verificar temperatura do freezer', type: 'text', is_required: true },
                    { id: 'i2', text: 'Chão está limpo?', type: 'boolean', is_required: true }
                ]
            },
            {
                id: 2,
                title: 'Verificação de Temperatura',
                delay: '10 min',
                description: 'Controle de qualidade',
                items: [
                    { id: 'i25', text: 'Temperatura de armazenamento adequada', type: 'number', is_required: true }
                ]
            }
        ],
        now: [
            {
                id: 3,
                title: 'Limpeza do Salão',
                dueIn: '2 horas',
                description: 'Limpeza geral antes do almoço',
                items: [
                    { id: 'i7', text: 'Mesas limpas', type: 'boolean', is_required: true },
                    { id: 'i8', text: 'Chão varrido', type: 'boolean', is_required: true },
                    { id: 'i9', text: 'Banheiro higienizado', type: 'boolean', is_required: true }
                ]
            },
            {
                id: 4,
                title: 'Recebimento de Mercadoria',
                dueIn: '4 horas',
                description: 'Conferência de nota fiscal',
                items: [
                    { id: 'i15', text: 'Nota fiscal conferida', type: 'boolean', is_required: true }
                ]
            }
        ],
        upcoming: [
            { id: 5, title: 'Fechamento de Caixa', startTime: '22:00', items: [] },
            { id: 6, title: 'Contagem de Estoque', startTime: '23:00', items: [] }
        ]
    }
};

export const mockTeamData = [
    { id: 1, name: 'Pedro Duarte', role: 'admin', points: 1250, email: 'pedro@ritmika.com' },
    { id: 2, name: 'João Silva', role: 'employee', points: 980, email: 'joao@ritmika.com' },
    { id: 3, name: 'Maria Santos', role: 'employee', points: 850, email: 'maria@ritmika.com' },
    { id: 4, name: 'Ana Costa', role: 'employee', points: 720, email: 'ana@ritmika.com' },
    { id: 5, name: 'Carlos Oliveira', role: 'employee', points: 650, email: 'carlos@ritmika.com' },
    { id: 6, name: 'Beatriz Lima', role: 'employee', points: 580, email: 'beatriz@ritmika.com' },
    { id: 7, name: 'Cliente Demo', role: 'cliente', points: 500, email: 'cliente@demo' }
].sort((a, b) => b.points - a.points);

// Simulate API delays
export const simulateApiDelay = (ms = 300) => new Promise(resolve => setTimeout(resolve, ms));

// Função para resetar todos os dados (para desenvolvimento)
export const resetAllData = () => {
    Object.values(STORAGE_KEYS).forEach(key => {
        localStorage.removeItem(key);
    });
    initializeData();
    console.log('Todos os dados foram resetados!');
};

// API simulada para checklists
export const checklistAPI = {
    async getAll() {
        await simulateApiDelay();
        return storage.get(STORAGE_KEYS.checklists);
    },

    async getById(id) {
        await simulateApiDelay();
        const checklists = storage.get(STORAGE_KEYS.checklists);
        return checklists.find(c => c.id === parseInt(id));
    },

    async create(checklistData) {
        await simulateApiDelay();
        const checklists = storage.get(STORAGE_KEYS.checklists);
        const newChecklist = {
            ...checklistData,
            id: Date.now(), // ID único baseado em timestamp
            created_at: new Date().toISOString()
        };
        checklists.push(newChecklist);
        storage.set(STORAGE_KEYS.checklists, checklists);
        return newChecklist;
    },

    async update(id, checklistData) {
        await simulateApiDelay();
        const checklists = storage.get(STORAGE_KEYS.checklists);
        const index = checklists.findIndex(c => c.id === parseInt(id));
        if (index !== -1) {
            checklists[index] = { ...checklists[index], ...checklistData };
            storage.set(STORAGE_KEYS.checklists, checklists);
            return checklists[index];
        }
        throw new Error('Checklist not found');
    },

    async delete(id) {
        await simulateApiDelay();
        const checklists = storage.get(STORAGE_KEYS.checklists);
        const filtered = checklists.filter(c => c.id !== parseInt(id));
        storage.set(STORAGE_KEYS.checklists, filtered);
        return true;
    }
};

// API simulada para submissões
export const submissionAPI = {
    async submit(checklistId, answers, userId = 1) {
        await simulateApiDelay(500); // Simular processamento

        const checklists = storage.get(STORAGE_KEYS.checklists);
        const checklist = checklists.find(c => c.id === parseInt(checklistId));

        if (!checklist) throw new Error('Checklist not found');

        const submission = {
            id: Date.now(),
            checklist_id: parseInt(checklistId),
            user_id: userId,
            answers,
            submitted_at: new Date().toISOString(),
            status: 'completed'
        };

        // Salvar submissão
        const submissions = storage.get(STORAGE_KEYS.submissions);
        submissions.push(submission);
        storage.set(STORAGE_KEYS.submissions, submissions);

        // Atualizar pontos do usuário
        const team = storage.get(STORAGE_KEYS.team);
        const userIndex = team.findIndex(u => u.id === userId);
        if (userIndex !== -1) {
            const pointsEarned = 10 + Object.keys(answers).length;
            team[userIndex].points += pointsEarned;
            storage.set(STORAGE_KEYS.team, team.sort((a, b) => b.points - a.points));

            // Atualizar dashboard
            const dashboard = storage.get(STORAGE_KEYS.dashboard);
            dashboard.stats.completedToday += 1;
            dashboard.recentActivity.unshift({
                id: submission.id,
                user_name: team[userIndex].name,
                checklist_title: checklist.title,
                submitted_at: submission.submitted_at,
                status: 'completed'
            });
            dashboard.recentActivity = dashboard.recentActivity.slice(0, 5);
            storage.set(STORAGE_KEYS.dashboard, dashboard);

            return { ...submission, pointsEarned };
        }

        return submission;
    }
};

// Inicializar dados padrão se não existirem
const initializeData = () => {
    // Checklists padrão
    if (!storage.get(STORAGE_KEYS.checklists).length) {
        storage.set(STORAGE_KEYS.checklists, mockChecklists);
    }

    // Equipe padrão
    if (!storage.get(STORAGE_KEYS.team).length) {
        storage.set(STORAGE_KEYS.team, mockTeamData);
    }

    // Dashboard padrão
    if (!storage.get(STORAGE_KEYS.dashboard)) {
        storage.set(STORAGE_KEYS.dashboard, mockDashboardData);
    }
};

// Executar inicialização após todas as definições
initializeData();

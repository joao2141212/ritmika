-- Schema de Produção - Checklists Reais do Cliente
-- Baseado no guia: guia-dados-clone-konclui

-- Drop existing if needed (cuidado em produção!)
-- DROP TABLE IF EXISTS contagens CASCADE;
-- DROP TABLE IF EXISTS produtos_checklist CASCADE;
-- DROP TABLE IF EXISTS checklists_producao CASCADE;

-- Tabela de Checklists de Produção
CREATE TABLE IF NOT EXISTS public.checklists_producao (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    nome VARCHAR NOT NULL,
    tipo VARCHAR CHECK (tipo IN ('cozinha', 'bebidas')),
    responsaveis TEXT[],
    frequencia VARCHAR CHECK (frequencia IN ('diaria', 'semanal', 'mensal')),
    turno_ativado BOOLEAN DEFAULT false,
    turnos TEXT[] DEFAULT ARRAY['dia', 'noite'],
    periodo_dias INTEGER DEFAULT 7,
    status VARCHAR DEFAULT 'ativo' CHECK (status IN ('ativo', 'inativo')),
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    criado_por UUID REFERENCES public.profiles(id)
);

-- Tabela de Produtos por Checklist
CREATE TABLE IF NOT EXISTS public.produtos_checklist (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    checklist_id UUID REFERENCES public.checklists_producao(id) ON DELETE CASCADE,
    nome VARCHAR NOT NULL,
    categoria VARCHAR,
    quantidade_minima INTEGER,
    unidade VARCHAR,
    fornecedor VARCHAR,
    estoque_padrao VARCHAR,
    ordem INTEGER DEFAULT 0,
    ativo BOOLEAN DEFAULT true,
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de Contagens (registros de inventário)
CREATE TABLE IF NOT EXISTS public.contagens (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    produto_id UUID REFERENCES public.produtos_checklist(id) ON DELETE CASCADE,
    checklist_id UUID REFERENCES public.checklists_producao(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.profiles(id),
    data_contagem DATE NOT NULL,
    dia_semana VARCHAR CHECK (dia_semana IN ('SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SAB', 'DOM')),
    turno VARCHAR CHECK (turno IN ('dia', 'noite', 'unico')),
    quantidade_contada DECIMAL(10,2),
    quantidade_pedida DECIMAL(10,2),
    retirado_por VARCHAR,
    observacoes TEXT,
    status VARCHAR DEFAULT 'completo' CHECK (status IN ('completo', 'pendente', 'cancelado')),
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_produtos_checklist_id ON public.produtos_checklist(checklist_id);
CREATE INDEX IF NOT EXISTS idx_contagens_produto_id ON public.contagens(produto_id);
CREATE INDEX IF NOT EXISTS idx_contagens_checklist_id ON public.contagens(checklist_id);
CREATE INDEX IF NOT EXISTS idx_contagens_data ON public.contagens(data_contagem);
CREATE INDEX IF NOT EXISTS idx_contagens_user_id ON public.contagens(user_id);

-- Enable RLS
ALTER TABLE public.checklists_producao ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.produtos_checklist ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contagens ENABLE ROW LEVEL SECURITY;

-- Policies para checklists_producao
CREATE POLICY "Checklists viewable by authenticated users"
    ON public.checklists_producao FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Admins can manage checklists"
    ON public.checklists_producao FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Policies para produtos_checklist
CREATE POLICY "Produtos viewable by authenticated users"
    ON public.produtos_checklist FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Admins can manage produtos"
    ON public.produtos_checklist FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Policies para contagens
CREATE POLICY "Users can view own contagens"
    ON public.contagens FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());

CREATE POLICY "Admins can view all contagens"
    ON public.contagens FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

CREATE POLICY "Authenticated users can create contagens"
    ON public.contagens FOR INSERT
    TO authenticated
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own contagens"
    ON public.contagens FOR UPDATE
    TO authenticated
    USING (user_id = auth.uid());

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_checklists_producao_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.atualizado_em = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_checklists_producao_timestamp
    BEFORE UPDATE ON public.checklists_producao
    FOR EACH ROW
    EXECUTE FUNCTION update_checklists_producao_updated_at();

-- Seed de Produção - Dados Reais do Cliente
-- 2 Checklists: Cozinha (74 produtos) + Bebidas (27 produtos)

-- Inserir Checklist 1: COZINHA
INSERT INTO public.checklists_producao (nome, tipo, responsaveis, frequencia, turno_ativado, turnos, periodo_dias, status)
VALUES (
    'Check-List Cozinha',
    'cozinha',
    ARRAY['Diana', 'Aline'],
    'diaria',
    true,
    ARRAY['dia', 'noite'],
    7,
    'ativo'
) RETURNING id;

-- Guardar o ID para usar depois (substitua pelo ID real após executar)
-- Para facilitar, vamos usar uma variável temporária
DO $$
DECLARE
    checklist_cozinha_id UUID;
    checklist_bebidas_id UUID;
BEGIN
    -- Pegar ID do checklist de cozinha
    SELECT id INTO checklist_cozinha_id 
    FROM public.checklists_producao 
    WHERE nome = 'Check-List Cozinha' 
    LIMIT 1;

    -- Inserir 74 produtos da COZINHA
    INSERT INTO public.produtos_checklist (checklist_id, nome, categoria, quantidade_minima, unidade, ordem) VALUES
    -- BEBIDAS (1)
    (checklist_cozinha_id, 'Água 5L', 'Bebidas', 3, 'litro', 1),
    
    -- FARINHAS E BASES (4)
    (checklist_cozinha_id, 'Farinha Trigo', 'Farinhas e Bases', 1, 'kg', 2),
    (checklist_cozinha_id, 'Farinha Sêmola', 'Farinhas e Bases', 1, 'kg', 3),
    (checklist_cozinha_id, 'Bag Polpa', 'Farinhas e Bases', 1, 'un', 4),
    (checklist_cozinha_id, 'Fermento', 'Farinhas e Bases', 1, 'un', 5),
    
    -- QUEIJOS (9)
    (checklist_cozinha_id, 'Mussarela', 'Queijos', 2, 'kg', 6),
    (checklist_cozinha_id, 'Parmesão', 'Queijos', 1, 'kg', 7),
    (checklist_cozinha_id, 'Gorgonzola', 'Queijos', 1, 'kg', 8),
    (checklist_cozinha_id, 'Provolone', 'Queijos', 4, 'kg', 9),
    (checklist_cozinha_id, 'Ricota', 'Queijos', 1, 'kg', 10),
    (checklist_cozinha_id, 'Búfala', 'Queijos', 1, 'kg', 11),
    (checklist_cozinha_id, 'Burrata', 'Queijos', 10, 'un', 12),
    (checklist_cozinha_id, 'Cream Cheese', 'Queijos', 1, 'kg', 13),
    (checklist_cozinha_id, 'Catupiry', 'Queijos', 1, 'kg', 14),
    
    -- CARNES E EMBUTIDOS (10)
    (checklist_cozinha_id, 'Peperoni', 'Carnes e Embutidos', 1, 'kg', 15),
    (checklist_cozinha_id, 'Calabresa', 'Carnes e Embutidos', 1, 'kg', 16),
    (checklist_cozinha_id, 'Parma Picado', 'Carnes e Embutidos', 2, 'kg', 17),
    (checklist_cozinha_id, 'Parma Fatiado', 'Carnes e Embutidos', 1, 'kg', 18),
    (checklist_cozinha_id, 'Presunto Cozido', 'Carnes e Embutidos', 3, 'kg', 19),
    (checklist_cozinha_id, 'Bacon Fatiado', 'Carnes e Embutidos', 1, 'kg', 20),
    (checklist_cozinha_id, 'Salame Italiano', 'Carnes e Embutidos', 4, 'kg', 21),
    (checklist_cozinha_id, 'Linguiça Blumenau', 'Carnes e Embutidos', 3, 'kg', 22),
    (checklist_cozinha_id, 'Lombo Defumado', 'Carnes e Embutidos', 1, 'kg', 23),
    (checklist_cozinha_id, 'Camarão', 'Carnes e Embutidos', 10, 'un', 24),
    
    -- PROTEÍNAS (3)
    (checklist_cozinha_id, 'Frango KG', 'Proteínas', 3, 'kg', 25),
    (checklist_cozinha_id, 'Filé Anchova', 'Proteínas', 1, 'kg', 26),
    (checklist_cozinha_id, 'Trufa', 'Proteínas', 1, 'un', 27),
    
    -- VEGETAIS E COMPLEMENTOS (5)
    (checklist_cozinha_id, 'Shitáke', 'Vegetais e Complementos', 10, 'un', 28),
    (checklist_cozinha_id, 'Azeitona Preta Fatiada', 'Vegetais e Complementos', 1, 'kg', 29),
    (checklist_cozinha_id, 'Azeitona Verde Inteira', 'Vegetais e Complementos', 1, 'kg', 30),
    (checklist_cozinha_id, 'Azeitona Preta Inteira', 'Vegetais e Complementos', 1, 'kg', 31),
    (checklist_cozinha_id, 'Brócolis Friarieli', 'Vegetais e Complementos', 1, 'kg', 32),
    
    -- ÓLEOS E AZEITES (3)
    (checklist_cozinha_id, 'Óleo de Soja', 'Óleos e Azeites', 1, 'litro', 33),
    (checklist_cozinha_id, 'Azeite Oliva 5L', 'Óleos e Azeites', 1, 'litro', 34),
    (checklist_cozinha_id, 'Vinagre Balsâmico 900mL', 'Óleos e Azeites', 1, 'un', 35),
    
    -- MOLHOS E TEMPEROS (8)
    (checklist_cozinha_id, 'Mostarda Escura', 'Molhos e Temperos', 1, 'un', 36),
    (checklist_cozinha_id, 'Mostarda Dijon', 'Molhos e Temperos', 1, 'un', 37),
    (checklist_cozinha_id, 'Mel Uva', 'Molhos e Temperos', 1, 'un', 38),
    (checklist_cozinha_id, 'Nutella', 'Molhos e Temperos', 1, 'un', 39),
    (checklist_cozinha_id, 'Kit Kat', 'Molhos e Temperos', 1, 'un', 40),
    (checklist_cozinha_id, 'Pistache', 'Molhos e Temperos', 1, 'kg', 41),
    (checklist_cozinha_id, 'Kinder', 'Molhos e Temperos', 1, 'un', 42),
    (checklist_cozinha_id, 'Vinagre de Vinho Tinto', 'Molhos e Temperos', 1, 'litro', 43),
    
    -- CONDIMENTOS (3)
    (checklist_cozinha_id, 'Orégano', 'Condimentos', 1, 'un', 44),
    (checklist_cozinha_id, 'Tomate Seco', 'Condimentos', 1, 'kg', 45),
    (checklist_cozinha_id, 'Amêndoa Laminada', 'Condimentos', 1, 'kg', 46),
    
    -- LATICÍNIOS (3)
    (checklist_cozinha_id, 'Creme de Leite 200G', 'Laticínios', 1, 'un', 47),
    (checklist_cozinha_id, 'Ovomaltine', 'Laticínios', 1, 'un', 48),
    (checklist_cozinha_id, 'Sal', 'Laticínios', 1, 'kg', 49),
    
    -- AÇÚCAR/DOCES (1)
    (checklist_cozinha_id, 'Açúcar', 'Açúcar/Doces', 1, 'kg', 50),
    
    -- LIMPEZA E HIGIENE (11)
    (checklist_cozinha_id, 'Pano Multiuso Perfex', 'Limpeza e Higiene', 1, 'pacote', 51),
    (checklist_cozinha_id, 'Detergente', 'Limpeza e Higiene', 3, 'un', 52),
    (checklist_cozinha_id, 'Álcool 70', 'Limpeza e Higiene', 3, 'litro', 53),
    (checklist_cozinha_id, 'QBOA', 'Limpeza e Higiene', 1, 'un', 54),
    (checklist_cozinha_id, 'Esponja', 'Limpeza e Higiene', 1, 'un', 55),
    (checklist_cozinha_id, 'Luva Nitrílica', 'Limpeza e Higiene', 1, 'caixa', 56),
    (checklist_cozinha_id, 'Luva Limpeza', 'Limpeza e Higiene', 1, 'par', 57),
    (checklist_cozinha_id, 'Plástico Filme', 'Limpeza e Higiene', 1, 'rolo', 58),
    (checklist_cozinha_id, 'Bobina Porcionar', 'Limpeza e Higiene', 1, 'rolo', 59);

END $$;

-- Inserir Checklist 2: BEBIDAS
INSERT INTO public.checklists_producao (nome, tipo, responsaveis, frequencia, turno_ativado, periodo_dias, status)
VALUES (
    'Contagem Estoque Pizza/Bebidas',
    'bebidas',
    ARRAY['Equipe'],
    'semanal',
    false,
    7,
    'ativo'
);

-- Inserir 27 produtos de BEBIDAS
DO $$
DECLARE
    checklist_bebidas_id UUID;
BEGIN
    SELECT id INTO checklist_bebidas_id 
    FROM public.checklists_producao 
    WHERE nome = 'Contagem Estoque Pizza/Bebidas' 
    LIMIT 1;

    INSERT INTO public.produtos_checklist (checklist_id, nome, categoria, quantidade_minima, unidade, fornecedor, estoque_padrao, ordem) VALUES
    -- ÁGUA E GELO (3)
    (checklist_bebidas_id, 'Gelo 10kg', 'Água e Gelo', 15, 'PACOTE', 'GELO BRASIL', '15/32', 1),
    (checklist_bebidas_id, 'Água c/gás 12un', 'Água e Gelo', 12, 'FDO', 'AMBEV', '12', 2),
    (checklist_bebidas_id, 'Água s/gás 12un', 'Água e Gelo', 12, 'FDO', 'AMBEV', '12', 3),
    
    -- REFRIGERANTES (6)
    (checklist_bebidas_id, 'Coca-cola 12un', 'Refrigerantes', 6, 'FDO', 'FEMSA', '6', 4),
    (checklist_bebidas_id, 'Coca-cola zero 6un', 'Refrigerantes', 20, 'FDO', 'FEMSA', '20', 5),
    (checklist_bebidas_id, 'Guaraná Antártica 12un', 'Refrigerantes', 3, 'FDO', 'AMBEV', '3', 6),
    (checklist_bebidas_id, 'Guaraná Antártica Zero 12un', 'Refrigerantes', 3, 'FDO', 'AMBEV', '3', 7),
    (checklist_bebidas_id, 'Soda Limonada 12un', 'Refrigerantes', 2, 'FDO', 'AMBEV', '2', 8),
    (checklist_bebidas_id, 'Corona 24un', 'Refrigerantes', 30, 'CX', 'AMBEV', '30/42', 9),
    
    -- SUCOS DEL VALLE (6)
    (checklist_bebidas_id, 'Suco Del Valle PÊSSEGO 6un', 'Sucos Del Valle', 2, 'FDO', 'FEMSA', '2', 10),
    (checklist_bebidas_id, 'Suco Del Valle GOIABA 6un', 'Sucos Del Valle', 1, 'FDO', 'FEMSA', '1', 11),
    (checklist_bebidas_id, 'Suco Del Valle UVA 6un', 'Sucos Del Valle', 4, 'FDO', 'FEMSA', '4', 12),
    (checklist_bebidas_id, 'Suco Del Valle MARACUJÁ 6un', 'Sucos Del Valle', 2, 'FDO', 'FEMSA', '2', 13),
    (checklist_bebidas_id, 'Suco Del Valle MANGA 6un', 'Sucos Del Valle', 2, 'FDO', 'FEMSA', '2', 14),
    (checklist_bebidas_id, 'Tônica Schweeppes ZERO 6un', 'Sucos Del Valle', 10, 'FDO', 'FEMSA', '10', 15),
    
    -- CERVEJAS (7)
    (checklist_bebidas_id, 'Corona Zero 24un', 'Cervejas', 3, 'CX', 'AMBEV', '3', 16),
    (checklist_bebidas_id, 'Stella Pure Gold 24un', 'Cervejas', 20, 'CX', 'AMBEV', '20', 17),
    (checklist_bebidas_id, 'Stella 24un', 'Cervejas', 5, 'CX', 'AMBEV', '5', 18),
    (checklist_bebidas_id, 'Spaten 24un', 'Cervejas', 4, 'CX', 'AMBEV', '4', 19),
    (checklist_bebidas_id, 'Red Bull Zero 250ml pac 4un', 'Cervejas', 2, 'PAC', 'AMBEV', '2', 20),
    (checklist_bebidas_id, 'Red Bull 250ml pac 6un', 'Cervejas', 2, 'PAC', 'AMBEV', '2', 21),
    (checklist_bebidas_id, 'Beats 269ml Lata AZUL 8un', 'Cervejas', 1, 'CX', 'AMBEV', '1', 22),
    
    -- ENERGÉTICOS E OUTROS (2)
    (checklist_bebidas_id, 'Beats 269ml Lata VERMELHA 8un', 'Energéticos e Outros', 1, 'CX', 'AMBEV', '1', 23),
    (checklist_bebidas_id, 'Beats 269ml Lata GT 8un', 'Energéticos e Outros', 1, 'CX', 'AMBEV', '1', 24);

END $$;

-- Seed data for Ritmika demo
-- Run this AFTER creating users via Supabase Auth UI or API

-- Insert demo checklists
INSERT INTO public.checklists (title, description, items) VALUES
(
    'Abertura de Loja',
    'Procedimentos matinais obrigatórios para início das operações',
    '[
        {"id": "i1", "text": "Verificar temperatura do freezer", "type": "text", "is_required": true},
        {"id": "i2", "text": "Chão está limpo?", "type": "boolean", "is_required": true},
        {"id": "i3", "text": "Foto do balcão", "type": "photo", "is_required": false},
        {"id": "i4", "text": "Assinatura do responsável", "type": "signature", "is_required": true}
    ]'::jsonb
),
(
    'Fechamento de Caixa',
    'Conferência de valores e segurança ao final do expediente',
    '[
        {"id": "i5", "text": "Valor em dinheiro confere?", "type": "boolean", "is_required": true},
        {"id": "i6", "text": "Cartões processados corretamente?", "type": "boolean", "is_required": true},
        {"id": "i7", "text": "Caixa registrado no sistema", "type": "boolean", "is_required": true},
        {"id": "i8", "text": "Assinatura do responsável", "type": "signature", "is_required": true}
    ]'::jsonb
),
(
    'Limpeza Semanal',
    'Checklist profundo de higiene e organização semanal',
    '[
        {"id": "i9", "text": "Geladeira limpa internamente", "type": "boolean", "is_required": true},
        {"id": "i10", "text": "Freezer descongelado e limpo", "type": "boolean", "is_required": true},
        {"id": "i11", "text": "Armários organizados", "type": "boolean", "is_required": true},
        {"id": "i12", "text": "Pisos lavados com desinfetante", "type": "boolean", "is_required": true},
        {"id": "i13", "text": "Vidrarias polidas", "type": "boolean", "is_required": true},
        {"id": "i14", "text": "Foto da área após limpeza", "type": "photo", "is_required": true}
    ]'::jsonb
),
(
    'Recebimento de Mercadoria',
    'Verificação de qualidade e quantidade de produtos recebidos',
    '[
        {"id": "i15", "text": "Nota fiscal conferida", "type": "boolean", "is_required": true},
        {"id": "i16", "text": "Quantidade de itens confere", "type": "boolean", "is_required": true},
        {"id": "i17", "text": "Produtos sem avarias", "type": "boolean", "is_required": true},
        {"id": "i18", "text": "Temperatura de transporte adequada", "type": "number", "is_required": true},
        {"id": "i19", "text": "Foto dos produtos recebidos", "type": "photo", "is_required": false}
    ]'::jsonb
),
(
    'Manutenção de Equipamentos',
    'Verificação periódica de estado dos equipamentos',
    '[
        {"id": "i20", "text": "Fogão funcionando corretamente", "type": "boolean", "is_required": true},
        {"id": "i21", "text": "Geladeira resfriando adequadamente", "type": "boolean", "is_required": true},
        {"id": "i22", "text": "Exaustor limpo e operacional", "type": "boolean", "is_required": true},
        {"id": "i23", "text": "Equipamentos sem vazamentos", "type": "boolean", "is_required": true},
        {"id": "i24", "text": "Observações adicionais", "type": "text", "is_required": false}
    ]'::jsonb
),
(
    'Controle de Qualidade',
    'Verificação de qualidade dos alimentos preparados',
    '[
        {"id": "i25", "text": "Temperatura de armazenamento adequada", "type": "number", "is_required": true},
        {"id": "i26", "text": "Produtos dentro da validade", "type": "boolean", "is_required": true},
        {"id": "i27", "text": "Rotulagem correta", "type": "boolean", "is_required": true},
        {"id": "i28", "text": "Higiene do ambiente OK", "type": "boolean", "is_required": true}
    ]'::jsonb
);

-- Note: Users must be created via Supabase Auth first
-- Then you can manually update their profiles with points and roles
-- Example:
-- UPDATE public.profiles SET role = 'admin', points = 1250 WHERE email = 'pedro@ritmika.com';
-- UPDATE public.profiles SET points = 980 WHERE email = 'joao@ritmika.com';

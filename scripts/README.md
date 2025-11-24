# Scripts de Setup - Ritmika

Esta pasta contém scripts e arquivos SQL para configuração do Supabase.

## Arquivos SQL

- **supabase_schema.sql** - Schema completo do banco (tabelas, RLS, triggers)
- **supabase_functions.sql** - Funções auxiliares (incremento de pontos, etc)
- **supabase_seed.sql** - Dados iniciais (checklists demo)

## Scripts Node.js

- **setup_supabase.js** - Script automatizado (requer service_role key)
- **setup_supabase_direct.js** - Script alternativo com requisições HTTP diretas

## Como Usar

### Opção 1: Manual (Recomendado)
Siga as instruções em `../MANUAL_SETUP.md`

### Opção 2: Script Automatizado
```bash
node scripts/setup_supabase.js
```

**Nota:** Os scripts automatizados podem falhar devido a permissões da API. 
O método manual via Supabase Dashboard é mais confiável.

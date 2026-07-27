# scripts.md

Automação histórica de setup, schema, seed e deploy. Antes de executar um script, conferir o efeito externo e preferir os scripts canônicos de supabase/scripts/db para operações atuais do banco.

## Arquivos

- README.md: inventário e instruções da automação.
- deploy_db.js: orquestração de deploy de banco.
- deploy_producao.js: orquestração do deploy de produção.
- deploy_supabase.js: deploy da configuração Supabase.
- setup_supabase.js: setup Supabase pela integração principal.
- setup_supabase_direct.js: setup Supabase por conexão direta.
- supabase_functions.sql: funções SQL históricas.
- supabase_schema.sql: schema base histórico.
- supabase_schema_producao.sql: schema de produção histórico.
- supabase_seed.sql: seed base histórico.
- supabase_seed_producao.sql: seed de produção histórico.

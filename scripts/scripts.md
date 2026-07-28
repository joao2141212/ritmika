# scripts.md

Mapa canônico da pasta legada `scripts/`. Estes arquivos são bootstrap antigo e
não são a entrada de manutenção do Ritmika atual. Use `../SCRIPT_REGISTRY.md` e
`../supabase/scripts/` para operações reais.

## SQL legado

- `supabase_schema.sql`: schema histórico; foi saneado para não obter role de metadata editável e restringe a trigger privilegiada.
- `supabase_schema_producao.sql`: variante histórica de produção.
- `supabase_functions.sql`: funções auxiliares do modelo histórico.
- `supabase_seed.sql`: dados demonstrativos históricos; não usar como fixture de cliente.
- `supabase_seed_producao.sql`: seed histórico de produção; não usar como fixture de cliente.

## Executores legados

- `deploy_db.js` e `deploy_producao.js`: exigem `SUPABASE_DB_URL`; não contêm connection string.
- `deploy_supabase.js`: exige `SUPABASE_URL`, `SUPABASE_SECRET_KEY` moderna e `RITMIKA_BOOTSTRAP_PASSWORD`.
- `setup_supabase.js` e `setup_supabase_direct.js`: exigem as mesmas variáveis e mantêm role somente em `app_metadata`.

Nenhum executor contém credencial, senha demo ou projeto Supabase fixo. As
chaves `sb_secret_` são enviadas somente em `apikey`, nunca como Bearer/JWT.

`README.md` mantém as instruções históricas e aponta de volta para este mapa.

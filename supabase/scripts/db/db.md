# db.md

## Finalidade

Scripts de banco e Storage do Ritmika, separados por intenção operacional.

## Subpastas

- `read/`: consultas e verificações sem mutação.
- `write/`: migrações, espelhamento e alterações com confirmação.
- `runtime/`: conexão, allowlist de arquivos SQL e execução controlada via
  `psql`.
- `lib/`: compatibilidade para resolução de conexão usada por scripts antigos.

## Caminho canônico

- Leitura: `npm run supabase:db:read -- supabase/scripts/db/read/<arquivo>.sql`
- Escrita: `RITMIKA_DB_WRITE_CONFIRM=yes npm run supabase:db:write -- --apply supabase/scripts/db/write/<arquivo>.sql`

O runner aceita também arquivos em `supabase/migrations/`. O caminho deve ser
explícito e terminar em `.sql`; arquivos fora das raízes permitidas são
rejeitados.

## Fonte da conexão

O runner procura `SUPABASE_DB_URL`, `SUPABASE_DATABASE_URL`, `POSTGRES_URL` ou
`DATABASE_URL` no ambiente local. A URL nunca é exibida em logs.

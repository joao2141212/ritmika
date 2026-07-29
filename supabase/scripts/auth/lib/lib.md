# lib.md

Arquivos compartilhados pelos comandos de identidade.

- `admin-api.ts`: cliente server-side para Auth Admin e PostgREST usando exclusivamente `SUPABASE_SECRET_KEY` no formato `sb_secret_`; pagina usuários, consulta tabelas, aplica PATCH e emite telemetria estruturada.
- `cli.ts`: argumentos, flags, UUID, booleanos, listas CSV e saída JSON.

Esses módulos não executam operações sozinhos. A secret key permanece apenas no ambiente local ignorado pelo Git.

A secret é enviada somente no cabeçalho `apikey`. Ela nunca é tratada como JWT nem enviada em `Authorization: Bearer`.

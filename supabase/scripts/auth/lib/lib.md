# lib.md

Arquivos compartilhados pelos comandos de identidade.

- `admin-api.mjs`: cliente server-side para Auth Admin e PostgREST usando `SUPABASE_SECRET_KEY` ou o nome legado `SUPABASE_SERVICE_ROLE_KEY`; pagina usuários, consulta tabelas, aplica PATCH e emite telemetria estruturada.
- `cli.mjs`: argumentos, flags, UUID, booleanos, listas CSV e saída JSON.

Esses módulos não executam operações sozinhos. A secret key permanece apenas no ambiente local ignorado pelo Git.

Chaves `sb_secret_` são enviadas somente em `apikey`; apenas a service-role JWT legada é enviada também como `Authorization: Bearer`. Essa separação evita o `401 Invalid JWT` das chaves opacas novas.

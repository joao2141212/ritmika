# scripts.md

## Finalidade

Este diretório concentra operações administrativas, de leitura, escrita e
validação do Ritmika. O código executável novo usa TypeScript/ESM via `tsx`.

## Contratos

- `auth/` contém operações de identidade, sessões QA, memberships e acesso.
- `db/` contém runners SQL, validações de dados e operações de Storage.
- `runtime/` contém o processo comum, carregamento local do `.env` e execução
  de subprocessos.
- Arquivos `.sh` mantidos em subpastas são somente compatibilidade para chamadas
  antigas; o caminho canônico deve ser o runner `.ts` ou o script npm equivalente.
- SQL continua em SQL, porque é a linguagem nativa do banco. TypeScript apenas
  controla seleção, confirmação, conexão e telemetria da execução.

## Comandos canônicos

- `npm run supabase:typecheck`
- `npm run supabase:auth -- help`
- `npm run supabase:auth:read -- help`
- `npm run supabase:auth:write -- help`
- `npm run supabase:db:read -- help`
- `npm run supabase:db:write -- help`

## Segurança e custo

Os runners carregam o `.env` ignorado localmente e nunca imprimem chaves.
Leituras SQL exigem um arquivo permitido. Escritas SQL exigem
`--apply` e `RITMIKA_DB_WRITE_CONFIRM=yes`. Nenhum runner novo executa
alteração por padrão.

## Evidência de manutenção

Depois de alterar scripts, rodar `npm run supabase:typecheck` e registrar o
resultado no handoff operacional do projeto. Não usar `@ts-nocheck` para
esconder incompatibilidades de contrato.

# App Fork Manifest

## Status

- Projeto: `ritmika`
- Alvo: `https://app.konclui.com/`
- Nível atual: `L2 do original + primeiro slice local reconstruído`
- Recon segura: `/Users/pedroduarte/Documents/fork-builds/ritmika/recon`
- Data: 2026-07-27, America/Sao_Paulo

## Recon segura sem sessão

| Viewport | Rota observada | Requests sanitizados | Console | Page errors |
|---|---:|---:|---:|---:|
| 1440x900 | `/login` | 84 | 0 | 0 |
| 1024x900 | `/login` | 76 | 0 | 0 |
| 390x844 | `/login` | 72 | 0 | 0 |

Nenhuma fixture, screenshot, cookie, token, storage value ou corpo de resposta
foi persistido nessa captura.

## Superfície autenticada observada

`SOURCE`, somente leitura no Chrome autorizado:

- `/`
- `/checklists`
- `/checklist/setup/12073`
- `/notifications`
- `/ai-evidence-analyses`
- `/configurations`
- `/courses`
- `/help`
- `/ideas`
- `/news`

## Contrato de rede parcial

Base observada: `https://dfxsntdrtzidbuauvxdx.supabase.co`

### Método e status confirmados diretamente

| Método | Caminho | Status | Efeito observado |
|---|---|---:|---|
| GET | `/rest/v1/support_settings` | 200 | leitura de configurações de suporte |
| POST | `/rest/v1/rpc/fn_has_user_workspace_access` | 200 | verificação de acesso ao workspace |
| POST | `/rest/v1/rpc/fn_feature_flags` | 200 | leitura de flags de funcionalidade |

### Caminhos observados, método/payload ainda pendentes

- `/auth/v1/user`
- `/rest/v1/workspace_users`
- `/rest/v1/workspaces`
- `/rest/v1/vw_workspace_billing`
- `/rest/v1/flows`
- `/rest/v1/checklists`
- `/rest/v1/vw_inventory_checklists`
- `/rest/v1/units`
- `/rest/v1/sectors`
- `/rest/v1/moments`
- `/rest/v1/user_sectors_units`
- `/rest/v1/rpc/fn_manager_adhoc_checklists`
- `/rest/v1/responses`
- `/rest/v1/notifications_names`
- `/rest/v1/rpc/fn_notifications_grid_data`
- `/rest/v1/evidence_ai_analyses`
- `/rest/v1/users`
- `/rest/v1/user_quick_switch_pins`
- `/rest/v1/lms_courses`
- `/rest/v1/lms_lesson_progress`
- `/rest/v1/help_tutorials`
- `/rest/v1/product_ideas`
- `/rest/v1/product_idea_votes`
- `/rest/v1/product_news_entries`
- `/rest/v1/rpc/fn_ai_credit_wallet_summary`

## Classificação

- `SOURCE`: rotas, DOM, endpoints e três métodos/status foram observados.
- `PARTIAL`: contratos completos, filtros, paginação, shapes e relações ainda não foram registrados.
- `GUESS`: regras privadas, RLS, permissões e efeitos server-side.
- `REBUILT`: lista, busca, criação, contagem, histórico e persistência local do primeiro slice.

## Slice local validado

O modo padrão do cliente é local quando `VITE_DATA_MODE` não é `remote`.

- Fixtures sintéticas isoladas em `client/src/data/productionChecklistFixtures.js`.
- Repositório local com chaves versionadas `ritmika.production.*`.
- Supabase não inicializa no modo local; o caminho remoto continua disponível com `VITE_DATA_MODE=remote`.
- Rotas validadas: `/checklists`, `/checklists/new`, `/checklists/:id/contagem` e `/checklists/:id/historico`.
- Smoke validado: busca por `Bebidas`, criação de contagem com 2 produtos, histórico após reload e criação de checklist após reload.

## Próxima fatia vertical

Expandir localmente `checklists`:

1. detalhe/setup conectado ao mesmo repositório;
2. edição e arquivamento com estados de erro e retry;
3. API local substituta, se o contrato necessário for fechado;
4. teste responsivo e matriz de estados.

O fork local não deve depender do Supabase original para iniciar.

## UI Distillation Compiler

- Pacote: `tools/ui-distiller`.
- Estado: núcleo implementado e validado com typecheck, 4 testes puros e uma captura do fork local.
- Evidência local gerada em `tools/ui-distiller/evidence/clone/ritmika-checklists/` e ignorada pelo Git.
- Notion/Trello: sem source trace ou parity report executado, pois nenhuma sessão sintética autorizada foi fornecida.

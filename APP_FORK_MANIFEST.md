# App Fork Manifest

## Status

- Projeto: `ritmika`
- Alvo: `https://app.konclui.com/`
- Nível atual: `L3 do original + vertical remoto operacional no Ritmika`
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

## Contrato de rede observado e parcial

Base observada: `https://dfxsntdrtzidbuauvxdx.supabase.co`

### Método e status confirmados diretamente

| Método | Caminho | Status | Efeito observado |
|---|---|---:|---|
| GET | `/rest/v1/support_settings` | 200 | leitura de configurações de suporte |
| POST | `/rest/v1/rpc/fn_has_user_workspace_access` | 200 | verificação de acesso ao workspace |
| POST | `/rest/v1/rpc/fn_feature_flags` | 200 | leitura de flags de funcionalidade |
| GET | `/rest/v1/checklists` | 200 | leitura paginada de modelos de checklist |
| GET | `/rest/v1/responses` | 200 | leitura paginada de respostas do workspace |

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

- `SOURCE`: rotas, DOM, Network/CDP, endpoints REST/RPC, paginação e respostas
  foram observados no painel autenticado.
- `PARTIAL`: contratos completos de módulos não exercitados, filtros de todas
  as telas, mídia/evidências, jobs e efeitos server-side ainda não foram
  registrados.
- `GUESS`: regras privadas, RLS, permissões e efeitos server-side.
- `REBUILT`: lista, busca, criação, contagem, histórico, execução, dashboard,
  equipe, configurações, notificações e persistência remota do vertical.

## Extração REST validada

O replay read-only da rede autorizada recuperou 58 checklists, 2 unidades, 25
setores, 4 momentos, 16 perfis e 5.300 respostas. A paginação foi refeita com
ordenação estável por ID depois que o primeiro replay por offset apresentou uma
duplicação. Cada lote corrigido foi salvo em staging local antes da importação
e o resultado final fechou em 5.300 IDs únicos. O procedimento reutilizável
está em `/Users/pedroduarte/Documents/fork-builds/tools/app-fork-recovery/REST_NETWORK_EXTRACTION_METHOD.md`.

## Slice local validado

O modo padrão do cliente é local quando `VITE_DATA_MODE` não é `remote`.

- Fixtures sintéticas isoladas em `client/src/data/productionChecklistFixtures.js`.
- Repositório local com chaves versionadas `ritmika.production.*`.
- Supabase não inicializa no modo local; o caminho remoto continua disponível com `VITE_DATA_MODE=remote`.
- Rotas validadas: `/checklists`, `/checklists/new`, `/checklists/:id/contagem` e `/checklists/:id/historico`.
- Smoke validado: busca por `Bebidas`, criação de contagem com 2 produtos, histórico após reload e criação de checklist após reload.

## Próximo gap controlado

Completar somente os contratos ainda não comprovados da fonte:

1. importação retroativa de mídia/evidências, se o endpoint de origem for
   exercitado em leitura autorizada;
2. notificações históricas da fonte, se o contrato REST/RPC for fechado;
3. testes responsivos e matriz de estados em telas publicadas.

O fork local não deve depender do Supabase original para iniciar.

## UI Distillation Compiler

- Pacote: `tools/ui-distiller`.
- Estado: núcleo implementado e validado com typecheck, 4 testes puros e uma captura do fork local.
- Evidência local gerada em `tools/ui-distiller/evidence/clone/ritmika-checklists/` e ignorada pelo Git.
- Notion/Trello: sem source trace ou parity report executado, pois nenhuma sessão sintética autorizada foi fornecida.

## Atualização operacional 2026-07-27

- O cliente remoto do Ritmika está ativo com a migração
  `supabase/migrations/20260727_ritmika_operational_schema.sql`.
- O schema normalizado contém itens, produtos, contagens, evidências privadas,
  notificações, eventos de execução e configurações do workspace. O backfill
  confirmou 351 itens e 351 produtos, com RLS ativo.
- O bucket `ritmika-evidences` é privado; a interface usa upload autenticado e
  URL assinada por tempo limitado.
- O dashboard remoto lê 5.302 respostas da cópia no Ritmika, com 1.977
  finalizadas, 3.325 pendentes e 58 checklists disponíveis.
- Equipe, Configurações, Contagem, Histórico, Detalhes e Notificações agora
  leem o modelo remoto. A interface publicada do cliente usa white mode.
- O build Vite e o lint do cliente passaram. A validação autenticada local
  confirmou `/`, `/checklists`, `/notifications`, `/team`, `/settings`,
  `/:id/contagem`, `/:id/historico`, `/:id/details` e `/:id/execute`.
- Limite atual: a mídia/evidência histórica do Koncluí ainda não foi importada
  porque os endpoints de mídia da fonte permanecem fora do contrato REST
  exercitado. A funcionalidade de evidência no Ritmika está pronta para novos
  uploads sem alterar a fonte.

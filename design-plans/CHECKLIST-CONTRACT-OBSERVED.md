# Contrato observado: checklist do Koncluí

Data da captura: 2026-07-27

## Limite de segurança

O Koncluí foi tratado como aplicação de cliente em operação. A captura foi
read-only: navegação, DOM acessível, estados visíveis, bundle público e
metadados redigidos de rede. Não houve criação, edição, publicação, atribuição,
exclusão, envio de formulário, upload, leitura de cookies, armazenamento local,
tokens, corpos de requisição ou dados persistidos de clientes.

## Superfície funcional observada

- Lista de checklists com busca, filtros por coluna, status, unidade, setor,
  momento, responsável, recorrência e horário.
- Entrada de criação com criação manual ou assistência Koru AI.
- Editor com status ativo/inativo, preview e ordenação de itens.
- Tipos de item: Check, Avaliativo, Texto, Data/Hora, Numérico, Lista de
  Seleção, GPS, Código de Barras/QR Code, Separador e Assinatura.
- Configuração do item: título, descrição rica, peso, obrigatório, não se
  aplica, tipo de resposta, regra de visibilidade e evidências.
- Agenda: recorrente, execução única ou apenas pontual; data inicial, horário
  limite, frequência, intervalo, dias da semana e data final opcional.
- Contexto de execução: unidade, setor, momento e responsável padrão.
- Execução pontual: desabilitada, painel, app ou painel e app.
- Respostas: resumo, por item e respostas individuais, com data prevista,
  início, conclusão, duração, usuário, status e score.
- Indicadores observados: pontualidade, esforço, qualidade, evolução do score,
  respostas iniciadas/agendadas e ausência de resposta no período.

## Rede redigida

Origem observada: cliente Supabase consumido pelo frontend do Koncluí. Somente
host, método e caminho foram mantidos; query values, headers e bodies foram
omitidos.

### Recursos REST

- `GET /rest/v1/checklists`
- `GET /rest/v1/vw_inventory_checklists`
- `GET /rest/v1/units`
- `GET /rest/v1/sectors`
- `GET /rest/v1/moments`
- `GET /rest/v1/workspace_users`
- `GET /rest/v1/workspaces`
- `GET /rest/v1/flows`
- `GET /rest/v1/responses`
- `GET /rest/v1/feature_flags`
- `GET /rest/v1/templates`
- `GET /rest/v1/tag_associations`
- `GET /rest/v1/support_settings`

Filtros observados: `id`, `workspace_id`, `user_id`, `deleted_at`, `order`,
`limit`, `select`, `type`, `entity_id` e `entity_type`.

### RPCs observadas

- `POST /rest/v1/rpc/get_checklist_responses_by_period`
- `POST /rest/v1/rpc/fn_checklist_responses`
- `POST /rest/v1/rpc/fn_checklist_response_filters`
- `POST /rest/v1/rpc/fn_has_user_workspace_access`
- `POST /rest/v1/rpc/fn_feature_flags`
- `POST /rest/v1/rpc/fn_manager_adhoc_checklists`
- `POST /rest/v1/rpc/fn_ai_credit_wallet_summary`

Shapes de argumentos observados sem valores:

- `get_checklist_responses_by_period`: `p_checklist_id`, `p_start_date`,
  `p_end_date`.
- `fn_checklist_responses`: `p_checklist_id`.
- `fn_checklist_response_filters`: `p_checklist_id`.
- `fn_has_user_workspace_access`: `p_user_id`.
- `fn_feature_flags`: `p_surface`, `p_keys[]`.
- `fn_ai_credit_wallet_summary`: `p_workspace_id`.

## Campos de criação observados no bundle público

O frontend monta o contrato de criação com `title`, `unit_id`, `sector_id`,
`moment_id`, `user_id`, `description`, `usage_policy`, `adhoc_mode`,
`adhoc_visible_to_unit`, `adhoc_visible_sector_ids`,
`adhoc_visible_user_ids`, campos de agenda, `status` e `items`.

Cada item normalizado inclui `name`, `critical`, `config` e `evidences`; o
frontend também transporta peso, obrigatório, não se aplica, ordem, labels e
meta de análise quando disponíveis.

## Implementação atual no Ritmika

- `client/src/data/remoteChecklistRepository.js`: boundary Supabase para
  modelos, status, execução, contagem, evidências e notificações.
- `client/src/services/checklistProducaoService.js`: fachada remota única para
  modelos, execução e contagem; não há fallback local no runtime.
- `client/src/components/ChecklistWorkspace.jsx`: lista branca de gestão,
  busca, filtros, publicação e entrada de execução.
- `client/src/components/ChecklistBuilderWorkspace.jsx`: editor com itens,
  evidências, agenda, atribuição, execução pontual e preview.
- `client/src/components/ChecklistExecutionWorkspace.jsx`: respostas,
  progresso, validação de obrigatórios, conclusão e retry.
- `client/src/styles/checklist-workspace.css`: visual white mode do slice.

## Limites que permanecem

O schema/RLS/function body do banco do cliente, uploads de evidência, app móvel
do operador, notificações, análises IA e diferencial automatizado continuam
pendentes. O banco Supabase do Ritmika não foi migrado nem ativado nesta etapa.

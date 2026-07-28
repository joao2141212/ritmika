# REAL-PARITY-ROADMAP.md

Roadmap executável para transformar o Ritmika em uma reconstrução funcional,
persistente e verificável do Koncluí. Este documento define trabalho pendente;
não transforma presença de dados, HTTP 200 ou um mock em paridade comprovada.

## Objetivo

Entregar uma aplicação Ritmika real, hospedada e multi-tenant, com:

- frontend white mode, responsivo e acessível;
- Supabase como boundary remoto de produção;
- nenhum mock ou fixture no caminho de produção;
- operações de checklist, execução, contagem, evidência, notificação, equipe
  e configuração persistidas;
- paridade verificável com a superfície observada do Koncluí;
- fonte Koncluí usada somente para leitura, extração e comparação.

## Controle de entrega e evidências em 2026-07-28

Legenda: `[x]` implementado e testado; `[~]` implementado, mas com prova
faltante; `[ ]` ainda não concluído.

### Concluído e testado

- [x] CBM nativo reativado: índice `ready`, 2.677 nós e 3.468 arestas; a
  investigação nativa foi usada para auth, arquitetura e rastreamento. O
  índice exclui migrations/scripts SQL e fixtures; esses caminhos são
  verificados pelos wrappers canônicos de leitura/escrita.
- [x] Web compila e passa lint: `npm run build`, `npm run lint` e `git diff
  --check` concluídos sem erro. Restam apenas o aviso de chunk grande e o
  aviso de dados do `baseline-browser-mapping` desatualizados.
- [x] Migration `20260727_ritmika_parity_modules.sql` aplicada no Supabase;
  as 12 tabelas estão presentes, com RLS habilitado e policies criadas.
- [x] Boundary web remoto ligado ao Supabase para dashboard, checklists,
  execução, contagem, histórico, equipe, notificações, configurações,
  análises IA, LMS, ajuda, ideias e novidades.
- [x] Leitura de dados-base comprovada: 58 checklists, 5.302 respostas, 17
  perfis (16 migrados e 1 QA), 2 unidades, 25 setores, 4 momentos e 2
  workspaces (1 migrado e 1 QA isolado).
- [x] Conta QA criada no Auth com confirmação administrativa, senha guardada
  no Keychain local (`ritmika-qa-e2e-password`) e identidade registrada em
  `client/.env.qa.local`. O perfil e o membro foram vinculados a um workspace
  QA isolado, sem acesso ao workspace do cliente.
- [x] Login de tela da QA comprovado no app local: sessão persistiu após
  reload, dashboard e `/checklists` abriram com dados remotos vazios, e o
  navegador registrou zero erros de console.
- [x] Fixtures QA reais e idempotentes semeados no workspace isolado: unidade,
  setor, momento, checklist, resposta, notificação, créditos/análise IA, LMS,
  ideia/voto, novidade, suporte, API e billing. A segunda execução do seed não
  duplicou os registros; a execução pela UI acrescentou 1 resposta e 2
  notificações como efeito funcional esperado.
- [x] Sweep REST autenticado da QA passou com `200` nas 18 superfícies; após os
  fluxos UI, ficaram 2 respostas e 3 notificações, e 1 linha nas demais. O RLS
  permitiu somente o workspace QA.

### Implementado, mas ainda não provado ponta a ponta

- [~] Conta do cliente: já existe 1 usuário Auth confirmado ligado a 1 perfil,
  portanto não foi criada duplicata. A igualdade literal do email com o
  Koncluí não foi declarada como provada porque a fonte canônica permanece
  somente leitura e o identificador não foi exposto nesta auditoria.
- [x] Login QA: o formulário chama `signInWithPassword`, o Auth service
  respondeu `200`, a sessão carregou o perfil admin no workspace QA e a UI
  abriu `/` e `/checklists` após login e reload.
- [~] Estados das telas autenticadas: login, dashboard vazio e biblioteca vazia
  já foram provados na UI. Ainda falta a matriz E2E populada para loading,
  sucesso, erro e ações de cada módulo usando os fixtures QA. A matriz populada
  encontrou e corrigiu o crash da aba Unidades quando `address` chega como
  JSONB; a revalidação visual dessa correção ficou pendente porque o servidor
  local caiu, enquanto lint e build já passaram.
- [~] Mocks: a busca nativa no runtime `client/src` não encontrou fixture,
  `localStorage` de demonstração ou repositório local; a pasta raiz `fixtures/`
  contém somente documentação e precisa continuar fora do caminho de produção.
- [~] Telemetria: `cbm_sonda(login)` encontrou o fluxo `Login → handleSubmit →
  AuthContext.login`; `cbm_telemetria(paridade)` não encontrou fonte de runtime
  viva, então ainda falta ingestão de traces reais para provar o comportamento
  em execução.

### Ainda não concluído

- [ ] As 12 tabelas novas estão vazias: IA, análises, LMS, ideias, votos,
  novidades, suporte, billing e API ainda não receberam migração de dados.
- [ ] A auditoria ampla do contrato observado ainda aponta 24 relações e 10
  rotinas ausentes; a migration aplicada cobre somente os 12 módulos novos.
- [~] Parte desse resultado é divergência nominal, não ausência de capacidade:
  `checklists`, `responses`, `units`, `sectors`, `moments`, `workspaces`,
  `workspace_users`, `users`, `evidence_ai_analyses`, módulos LMS, ideias,
  votos, novidades, suporte, billing e API têm equivalentes `ritmika_*` já
  persistidos ou ligados ao código. O próximo passo é expor adapters seguros
  somente onde o contrato REST/RPC exigir o nome e shape canônicos.
- [ ] Gaps nominais ainda sem adapter comprovado: `flows`,
  `vw_inventory_checklists`, `feature_flags`, `templates`, `tag_associations`,
  `user_quick_switch_pins`, `user_sectors_units`, `vw_kpis_mv`,
  `vw_workspace_billing` e as RPCs públicas de respostas, filtros, flags,
  adhoc, créditos e acesso ao workspace. Não criar duplicatas antes de fechar
  seus shapes, tenant scope e comportamento de erro.
- [ ] `invite-user` e `koru-chat` existem no código local, mas seus endpoints
  remotos retornaram `404`; falta publicar e testar as Edge Functions.
- [ ] Mobile não iniciado: o repositório atual contém o web client, sem pacote
  mobile. A próxima fase deve capturar os fluxos mobile do Koncluí somente para
  leitura e criar uma matriz própria de telas, ações, dados e testes. Já existe
  uma captura responsiva do `ritmika-local` em 1440x900, 1024x900 e 390x844,
  com 118 requests e zero erros de console por viewport; isso é baseline do
  nosso web e não prova do mobile canônico.

### Próxima sequência executável

1. Executar a matriz E2E autenticada usando a conta QA isolada, começando por
   estados vazios e depois por fixtures QA reais, sem usar dados do cliente.
2. Migrar o contrato restante de relações/RPCs e os dados dos 12 módulos,
   sempre com tenant/workspace e idempotência.
3. Publicar as duas Edge Functions e testar convite/Koru em ambiente remoto.
4. Rodar E2E autenticado por módulo e registrar cada evidência nesta matriz.
5. Abrir a fase mobile separada, começando pela captura read-only do fluxo
   mobile canônico.

## Estado atual comprovado

O CBM reancorado no projeto Users-pedroduarte-Documents-ritmika classifica a
implementação como uma vertical remota operacional, nível L3, e não como
paridade completa de backend.

O banco possui, no último check canônico:

- 58 checklists;
- 351 itens/produtos normalizados;
- 5.302 respostas importadas;
- 17 perfis (16 migrados do cliente e 1 QA);
- 627 referências históricas de evidências;
- 2 unidades, 25 setores, 4 momentos, 1 workspace migrado e 1 workspace QA.

Já existe um dashboard remoto com janela de 7, 30, 90 dias e histórico,
evidências históricas rotuladas, upload privado e notificações novas. Isso é
base funcional, não fechamento 1:1.

## Baseline vivo do Koncluí capturado em 2026-07-27

A sessão autenticada do Koncluí foi observada somente para leitura em
`https://app.konclui.com/`. A captura confirmou a superfície abaixo:

- `/`: período customizável e atalhos, filtros de unidade/setor/usuário/momento,
  cards de agendamento, taxa de conclusão, rankings por usuário/unidade/setor,
  evolução de score/pontualidade/esforço/qualidade, tabela paginada, colunas e
  exportação;
- `/checklists`: busca, filtros por coluna, status, unidade, setor, momento,
  responsável, recorrência e horário, pasta, ações em massa, colunas,
  paginação e criação;
- `/checklist/add`: criação manual ou Koru AI, status, preview e tipos Check,
  Avaliativo, Texto, Data/Hora, Numérico, Lista, GPS, QR Code, Separador e
  Assinatura;
- `/notifications`: filtros, paginação, estatísticas por canal/equipe e
  leitura das notificações;
- `/ai-evidence-analyses`, `/configurations`, `/courses`, `/help`, `/ideas` e
  `/news`: módulos de análise de evidência, workspace, LMS, suporte,
  comunidade e changelog.

Chamadas REST observadas, com valores, headers e corpos sensíveis omitidos:

- dashboard/checklists: `vw_kpis_mv`, `responses`, `checklists`,
  `vw_inventory_checklists`, `flows`, `units`, `sectors`, `moments`,
  `workspace_users`, `user_sectors_units`;
- RPCs: `fn_has_user_workspace_access`, `fn_feature_flags`,
  `fn_ai_credit_wallet_summary`, `fn_notifications_grid_data`,
  `fn_notifications_grid_count` e `fn_notifications_grid_stats`;
- módulos adicionais: `evidence_ai_analyses`, `lms_courses`, `lms_modules`,
  `lms_lessons`, `lms_lesson_progress`, `product_ideas`,
  `product_idea_votes`, `product_news_entries`, `users`,
  `user_quick_switch_pins`, `workspaces` e `vw_workspace_billing`.

O estado atual do Ritmika agora expõe rotas e serviços equivalentes para
Análises IA, Cursos, Ajuda, Ideias e Novidades, além das abas de Configurações
para Créditos IA, Financeiro e API. A leitura canônica
`supabase/scripts/db/read/verify_konclui_parity_surface.sql` retornou as 24
relações e as 10 RPCs observadas como `missing` no banco original do Ritmika.
O contrato equivalente foi criado em
`supabase/migrations/20260727_ritmika_parity_modules.sql` e aplicado no
Supabase em 2026-07-28 pelo wrapper canônico, com RLS por workspace. A
verificação pós-escrita encontrou as 12 relações presentes, RLS habilitado e
policies criadas. A superfície ampla observada do Koncluí continua sendo um
gap separado: as 24 relações e 10 rotinas desse inventário ainda retornam
`missing` no banco do Ritmika e exigem uma migração/integração adicional.

Implementações verticais concluídas no código:

- builder remoto consulta unidades, setores, momentos e perfis e grava os IDs
  reais no checklist;
- configurações remotas têm CRUD de unidades/setores, permissões de usuários,
  preferências, créditos, financeiro e endpoints públicos de API;
- notificações têm filtros, enriquecimento de perfil/unidade, estatísticas,
  paginação, leitura e abertura da rota;
- análises IA, LMS/progresso, ideias/votos, novidades e ajuda têm rotas,
  serviços Supabase e estados vazios/erro sem fixtures.
- biblioteca ativa de checklists tem filtros remotos por status/unidade/setor,
  seleção visível, publicação/rascunho/arquivamento em lote e exportação CSV;
  as ações usam `ritmika_checklists` com escopo do workspace;
- dashboard remoto aceita período customizado, unidade, setor e usuário, aplica
  os filtros nas consultas de respostas/checklists e expõe as opções vindas do
  mesmo workspace;
- LMS permite selecionar uma aula, ler o conteúdo carregado e marcar conclusão
  por upsert remoto de progresso; clicar na aula não altera progresso sozinho.

Limites ainda abertos para o aceite 1:1: filtros de momento/responsável/pasta e
paginação/colunas da biblioteca, evolução completa do dashboard, convite de
usuários, Koru AI e as 24 relações/10 RPCs observadas no Koncluí. A migração
equivalente continua não aplicada no Supabase até o gate de escrita ser
confirmado.

Aliases de rota já adicionados sem duplicar lógica:

- `/checklist/add` reutiliza o builder remoto;
- `/configurations` reutiliza a configuração remota existente.

## Auditoria de controles ocultos e integração de tela, 2026-07-27

O segundo passe foi feito contra os controles DOM visíveis do Koncluí, sem
mutar a conta observada. Os gaps agora cobertos no Ritmika são:

- dashboard: personalização de widgets persistida em `ritmika_workspace_settings`,
  detalhamento remoto com colunas selecionáveis, filtros de momento, paginação
  e exportação CSV;
- checklists: modo tabela alinhado ao alvo, filtros por coluna, unidade/setor/
  momento/pasta, paginação 20/50/100, seleção por página, colunas, ações em
  massa, criação de pasta e movimentação persistida em `metadata.folder_id`;
  o modo cartões anterior continua disponível;
- usuários: busca por nome/e-mail, abas Todos/Gestores/Operadores, filtro por
  unidade e formulário Novo usuário;
- backend de usuário: `supabase/functions/invite-user/index.ts` valida token,
  papel gestor, workspace e unidades antes de convidar e criar o perfil remoto.
- suporte/Koru: dashboard ganhou os dois botões do alvo; `supabase/functions/
  koru-chat/index.ts` consulta respostas, perfis e unidades reais antes de
  responder alertas e acompanhamento no chat.

Provas desta etapa: `npm run lint`, `npm run build` e `git diff --check`
retornaram código 0; o build ainda emite apenas o aviso de chunk grande e o
pacote `baseline-browser-mapping` desatualizado. O CBM CLI foi reindexado com
2.661 nós e 3.439 arestas. A função Edge não foi publicada nem executada;
`deno check` não pôde rodar porque `deno` não está instalado. O cliente local
carrega sem autenticação, então a prova DOM autenticada do Ritmika continua
pendente.

Gaps restantes para aceite operacional: publicar as Edge Functions, confirmar e
aplicar `supabase/migrations/20260727_ritmika_parity_modules.sql`, validar a
chave única usada no upsert de perfil convidado, conectar Koru IA e completar
as relações/RPCs do contrato vivo que seguem ausentes. A verificação de schema
equivalente usa `supabase/scripts/db/read/verify_parity_modules_v2.sql`, pois a
versão anterior tinha ambiguidade de `tablename`.

## Regras de execução

1. Koncluí é somente leitura. Nenhum clique, request, alteração de permissão,
   upload, exclusão ou mudança de configuração será feito na fonte.
2. Supabase é o banco de produção do Ritmika. Toda leitura ou escrita passa
   pelos scripts canônicos em supabase/scripts/db.
3. Mocks, local repositories e fixtures só podem aparecer em desenvolvimento
   isolado ou testes explicitamente identificados. O caminho remoto de
   produção deve falhar de forma visível se o Supabase não estiver configurado.
4. Toda escrita deve ser tenant-scoped, idempotente, auditável e ter caminho de
   criação, listagem, inspeção, retry e arquivamento/exclusão conforme a
   autorização do domínio.
5. Toda função com banco ou I/O deve ter telemetria estruturada. Um console.log
   não fecha o fluxo.
6. Cada comportamento só é considerado paridade quando houver contrato de
   origem, implementação no Ritmika e prova de execução no mesmo cenário.
7. Dados reais de cliente não serão usados como fixture sintética. Capturas
   históricas ficam com proveniência e fora do Git quando forem artefatos.

## Fases e critérios de aceite

### Fase 0. Governança e baseline

Status: parcialmente concluída.

- Manter os MDs canônicos por pasta.
- Manter scripts compactos de leitura e escrita do Supabase.
- Criar um inventário de rotas, módulos, entidades, ações e estados do
  Koncluí, cada item com classificação SOURCE, PARTIAL, REBUILT ou UNKNOWN.
- Fixar uma captura de baseline do Ritmika em viewport 1440x932, 1024x900 e
  390x844.

Aceite: cada lacuna possui um arquivo/rota responsável, uma fonte de prova,
um critério de conclusão e um comando de validação.

### Fase 1. Contratos de dados e boundary remoto

Status: parcial; lacuna P0 de superfície Koncluí confirmada.

- Revisar schema Supabase contra todas as entidades observadas:
  workspace, perfil, unidade, setor, momento, checklist, versão, item,
  produto, agenda, resposta, evento, evidência, notificação e configuração.
- Garantir chaves de origem estáveis e importação idempotente.
- Garantir RLS por workspace e autorização por papel.
- Remover fallback silencioso para mock/local no runtime remoto.
- Expor health/readiness sem mascarar erro de autenticação ou banco.
- Cobrir create, list, get, update, retry, archive e delete quando aplicável.
- Decidir o contrato Ritmika para as relações/RPCs observadas no Koncluí e
  migrar somente após definir origem, tenant, RLS e lifecycle de cada uma.

Aceite: uma operação executada na UI remota aparece no banco correto, isolada
por tenant, sobrevive a reload e pode ser inspecionada sem acessar a fonte.

### Fase 2. Paridade de dashboard

Status: parcial.

- Fechar semântica do período, timezone e limites inclusivos contra a fonte.
- Implementar contagens agendado, não iniciado, iniciado, atrasado e
  finalizado com os mesmos critérios.
- Implementar ranking por usuário, unidade e setor.
- Implementar taxa de conclusão, evolução de pontualidade, esforço,
  qualidade e score.
- Implementar filtros de unidade, setor, usuário, momento e período.
- Implementar detalhamento paginado, colunas e exportação.
- Cobrir loading, vazio, erro, dados degradados e ação ocupada.

Aceite: a mesma janela e os mesmos filtros produzem contrato comparável de
dados e DOM no Koncluí e no Ritmika, com diferenças explicadas por timestamp
ou dado ausente.

### Fase 3. Paridade de checklists e agenda

Status: parcial.

- Fechar catálogo, busca, filtros, paginação e detalhe.
- Fechar builder com seções, itens, respostas, produtos, obrigatoriedade,
  tipos, ordem e versão.
- Fechar unidades, setores, momentos, usuários, responsáveis e agenda.
- Persistir publicação, desativação, edição e histórico de versão.
- Garantir que cada item exibido tenha caminho de criação e atualização.

Aceite: criar ou editar um checklist no Ritmika produz uma entidade persistida,
recarregável e executável, sem depender de mock ou estado local.

### Fase 4. Lifecycle de execução e contagem

Status: parcial e ainda não certificado 1:1.

- Fechar início, rascunho, andamento, conclusão, falha, retry, cancelamento
  e reabertura conforme o contrato observado.
- Persistir respostas, progresso, score, pontualidade, esforço, qualidade,
  usuário, timestamps e eventos.
- Fechar contagem de produtos, quantidades, unidade de medida, salvamento
  parcial, submissão, revisão e histórico.
- Garantir reload em cada transição e impedir duplicação por retry.
- Fechar histórico, detalhe e PDF com os dados da execução real.

Aceite: uma execução completa ou interrompida pode ser retomada, inspecionada
e refletida no dashboard depois de reload e de uma nova sessão.

### Fase 5. Evidências e mídia

Status: mirror privado concluído no banco; prova de UI publicada ainda pendente.

- Criar mirror idempotente das mídias históricas para bucket privado do
  Ritmika, preservando source URL, source id, checksum, MIME e item de origem.
- Manter fallback histórico explícito somente quando o mirror não for possível.
- Fechar upload, preview, download assinado, erro, retry e associação ao item.
- Evitar expor URL privada ou segredo no frontend.
- Validar disponibilidade e integridade de uma amostra e da contagem total.

Aceite: a evidência histórica abre pelo storage privado do Ritmika e continua
disponível sem depender da sessão ou do bucket público do Koncluí. O check atual
confirmou 627/627 cópias privadas e uma URL assinada gerada com sucesso.

### Fase 6. Notificações, equipe e configurações

Status: notificações novas persistidas para evidência e lifecycle de execução;
histórico de origem pendente.

- Mapear a origem observável das notificações históricas; se não houver
  exportação confiável, registrar a lacuna em vez de inventar eventos.
- Fechar criação, destinatário, leitura individual, marcar todas, rota e
  atualização em tempo real quando o contrato exigir.
- Fechar gestão de equipe, papéis, unidades gerenciadas e isolamento.
- Fechar configurações persistidas, preferências e valores padrão.

Aceite: qualquer notificação produzida por uma ação real aparece após reload,
é filtrada pelo destinatário correto e pode ser marcada como lida.

### Fase 7. Paridade visual e acessibilidade

Status: white mode implementado nas rotas remotas; varredura completa pendente.

- Eliminar dark mode residual das telas em escopo remoto.
- Comparar layout, tipografia, espaçamento, ícones, cores, estados e
  densidade contra as capturas de referência.
- Validar 1440x932, 1024x900 e 390x844.
- Cobrir foco, teclado, labels, contraste, modal, tabela, gráficos e erro.
- Testar loading, empty, success, error, degraded e busy/disabled.

Aceite: cada rota possui comparação DOM/boxes e visual, sem clipping,
overlap, valor oculto ou ação inacessível.

### Fase 8. QA diferencial e publicação

Status: pendente como fechamento formal.

- Criar uma matriz por rota, ação, estado, entidade, fonte de prova e
  resultado esperado.
- Rodar testes automatizados, lint e build.
- Rodar smoke autenticado no Ritmika em sessão nova.
- Validar endpoints/queries reais, não somente HTTP 200.
- Aplicar migrations somente pelos wrappers canônicos e executar o check
  operacional depois.
- Publicar no Git/Netlify, aguardar o bundle novo e validar o fluxo publicado.
- Registrar commit, bundle, timestamp, gaps e rollback.

Aceite: todos os itens críticos têm prova de dados, DOM/estado e execução
publicada. Gaps restantes ficam explícitos e classificados, sem marcar
paridade completa por inferência.

## Ordem de implementação

1. Boundary remoto, RLS, lifecycle e remoção de fallback silencioso.
2. Contratos de checklist, agenda, execução e contagem.
3. Dashboard e detalhes derivados dos mesmos registros.
4. Mirror privado e lifecycle de evidências.
5. Notificações, equipe e configurações.
6. White mode, acessibilidade e estados de todas as rotas.
7. Matriz diferencial, smoke publicado e fechamento.

## Scripts e provas canônicas

- Leitura única do banco:
  supabase/scripts/db/read/run.sh
  supabase/scripts/db/read/verify_operational_state.sql
- Escrita nomeada:
  supabase/scripts/db/write/apply_historical_evidence_refs.sh
- Build: npm run build em client.
- Lint: npm run lint em client.
- Código: reancorar no CBM antes de descoberta estrutural.

Nenhuma dessas provas sozinha significa paridade. O fechamento exige a
combinação banco + contrato + UI + execução publicada.

## Diário de execução

- 2026-07-27: CBM-Anchor reancorado no projeto correto; o mapa confirmou uma
  vertical remota operacional L3, ainda sem paridade completa.
- 2026-07-27, commit 43c34e7: builds de produção passaram a forçar o caminho
  remoto, impedindo fallback silencioso para demo/local. O modo local ficou
  restrito ao desenvolvimento não-prod explícito.
- 2026-07-27: build e lint passaram após a correção; segue pendente a prova
  autenticada do bundle publicado e as fases de lifecycle/diferencial.
- 2026-07-27, commits 0a0b631 e e15f99f: início, conclusão e retry de execução
  passaram a persistir notificações; as 627 mídias históricas foram espelhadas
  no bucket privado, com checksum, proveniência e prova de URL assinada.
- 2026-07-27: baseline autenticado do Koncluí capturado em modo read-only;
  dashboard, checklists, notificações, configurações, análises IA, LMS,
  suporte, ideias e novidades foram mapeados por DOM e chamadas REST redigidas.
- 2026-07-27: a lista do Koncluí exibiu zero checklists para a conta observada,
  enquanto o dashboard exibiu 721 agendamentos; essa divergência foi registrada
  como evidência de escopo/consulta, não tratada como ausência universal de dados.
- 2026-07-27: o check `verify_konclui_parity_surface.sql` confirmou 24 relações
  e 10 RPCs do contrato vivo ausentes no Supabase do Ritmika; o gap virou P0 de
  schema/importação e não será coberto por mock.

## Definition of Done

O Ritmika só será marcado como paridade real quando:

- não houver caminho de produção dependente de mock;
- todos os módulos críticos tiverem lifecycle remoto e RLS;
- dados, evidências e notificações tiverem proveniência e comportamento
  explicados;
- as rotas críticas tiverem prova diferencial em três viewports;
- reload, nova sessão, retry e erro tiverem comportamento validado;
- build, lint, migrations, smoke e publicação tiverem sinais recentes;
- os limites inevitáveis da fonte estiverem documentados, não escondidos.
## Registro de execução 2026-07-27

- Login publicado em white mode, responsivo nos viewports desktop, tablet e mobile; a varredura pública terminou sem achados altos.
- Dashboard remoto ganhou exportação CSV da fila carregada, respeitando aba e período selecionados.
- O ciclo de execução remoto já cobre salvar, concluir, retry/reabrir, eventos e notificações idempotentes.
- A leitura `supabase/scripts/db/read/verify_security_state.sql` confirmou 16/16 tabelas Ritmika com RLS, 21 policies em 16 tabelas, nenhuma tabela RLS sem policy e bucket de evidências privado.
- Ainda sem certificação: smoke autenticado no bundle publicado, paridade visual/DOM das telas protegidas do Koncluí e prova diferencial completa de filtros/rankings/gráficos em sessão autenticada.

## Registro de execução 2026-07-28

- O commit `d6a4e81` foi publicado em `origin/main`; o bundle novo chegou ao
  `ritmikapp.netlify.app` e substituiu o deploy antigo.
- O card de checklist tinha `height: 200px` e `overflow: hidden` no bundle
  publicado, cortando os botões. A regra foi corrigida para altura automática
  e overflow visível em `client/src/styles/checklist-workspace.css`.
- Smoke QA publicado: o modo cartões exibiu os três botões completos; o clique
  real em `Executar` abriu a execução do checklist sem erro.
- Matriz autenticada publicada: dashboard, checklists, equipe, notificações,
  configurações, cursos, ajuda, ideias, novidades e análises IA abriram com os
  dados do workspace QA e zero erros de console.
- As oito abas de Configurações abriram, incluindo Unidades com endereço JSONB,
  sem crash React, loading preso ou erro de console.
- A execução QA foi salva e concluída na produção: UI em `2/2`, `100%` e
  `Execução concluída`; REST autenticado retornou `200` para login, perfil e
  respostas, com `is_finished=true` e `completed_at` presente.
- `evidence/` permanece fora do commit por ser artefato gerado de captura,
  não dependência de runtime nem do deploy.
- Permanecem fora deste fechamento: comparação visual diferencial completa com
  o Koncluí, validação mobile dedicada, lifecycle completo de mídias e prova
  de deploy das Edge Functions.

## Registro complementar de execução 2026-07-28

- O commit `192aa93` corrigiu o layout mobile: em até 760px a sidebar inicia
  recolhida, ocupa 64px e o conteúdo deixa de ser comprimido.
- Produção foi revalidada em `390x844`: 10 rotas, sidebar fechada, conteúdo
  responsivo, zero overflow horizontal e zero erros de console. O card de
  checklist ficou sem clipping; a execução mobile foi aberta, salva e
  concluída por teclado com `2/2` e `100%`.
- Produção foi revalidada no tablet calibrado para `1024x900`: 10 rotas, zero
  overflow horizontal e zero erros de console; o card manteve todas as ações
  dentro da caixa.
- A aba Configurações mobile carregou após cerca de 7 segundos de restauração
  da sessão QA; depois disso exibiu Perfil e permaneceu sem overflow ou erro.
- As Edge Functions locais existem em `supabase/functions/invite-user` e
  `supabase/functions/koru-chat`, mas ambas retornaram `404` no Supabase
  publicado. `supabase functions list` exige `SUPABASE_ACCESS_TOKEN`, que não
  está no ambiente, no `.env` do projeto ou nos caminhos locais do CLI.
- O mirror privado de mídias continua com a prova anterior de `627/627`
  cópias e URL assinada; a prova de upload/preview/download pela interface
  ainda não foi certificada.

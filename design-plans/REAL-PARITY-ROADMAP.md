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

## Estado atual comprovado

O CBM reancorado no projeto Users-pedroduarte-Documents-ritmika classifica a
implementação como uma vertical remota operacional, nível L3, e não como
paridade completa de backend.

O banco possui, no último check canônico:

- 58 checklists;
- 351 itens/produtos normalizados;
- 5.302 respostas importadas;
- 16 perfis;
- 627 referências históricas de evidências;
- 2 unidades, 25 setores e 4 momentos.

Já existe um dashboard remoto com janela de 7, 30, 90 dias e histórico,
evidências históricas rotuladas, upload privado e notificações novas. Isso é
base funcional, não fechamento 1:1.

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

Status: parcial.

- Revisar schema Supabase contra todas as entidades observadas:
  workspace, perfil, unidade, setor, momento, checklist, versão, item,
  produto, agenda, resposta, evento, evidência, notificação e configuração.
- Garantir chaves de origem estáveis e importação idempotente.
- Garantir RLS por workspace e autorização por papel.
- Remover fallback silencioso para mock/local no runtime remoto.
- Expor health/readiness sem mascarar erro de autenticação ou banco.
- Cobrir create, list, get, update, retry, archive e delete quando aplicável.

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

Status: referências históricas parciais; cópia privada pendente.

- Criar mirror idempotente das mídias históricas para bucket privado do
  Ritmika, preservando source URL, source id, checksum, MIME e item de origem.
- Manter fallback histórico explícito somente quando o mirror não for possível.
- Fechar upload, preview, download assinado, erro, retry e associação ao item.
- Evitar expor URL privada ou segredo no frontend.
- Validar disponibilidade e integridade de uma amostra e da contagem total.

Aceite: a evidência histórica abre pelo storage privado do Ritmika e continua
disponível sem depender da sessão ou do bucket público do Koncluí.

### Fase 6. Notificações, equipe e configurações

Status: notificações novas parciais; histórico de origem pendente.

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

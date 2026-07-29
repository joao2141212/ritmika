# Ritmika UI/UX Roadmap

Atualizado em 2026-07-28. Fonte de prova: varredura autenticada em produção usando workspace QA isolado.

## Referências de produto

- Linear custom views e filtros: views salvas, compartilháveis e orientadas a foco operacional. Referência: https://linear.app/docs/custom-views e https://linear.app/docs/filters
- Notion database views: a mesma base pode aparecer como tabela, board, calendário, lista ou dashboard, cada uma com filtros, ordenação e propriedades próprias. Referência: https://www.notion.com/help/views-filters-and-sorts
- GitBook docs structure: informação de suporte precisa de navegação estruturada, seções claras e descoberta fácil. Referência: https://gitbook.com/docs/docs-site/site-structure
- Slack unread/activity: notificações precisam priorizar leitura, limpar estado e manter contagem confiável. Referência: https://slack.com/help/articles/226410907-View-all-your-unread-messages

## Evidência atual

- Produção: https://ritmikapp.netlify.app/
- Commit publicado validado antes da varredura: `98b8ec8`
- Workspace QA: `9f3d0144-d2ed-408c-b7a2-b1e5f212c9bb`
- Smoke backend `manage-member`: passou com correlation id `cba34a22-787b-476c-a90c-e1639fc0203e`
- Varredura autenticada: 9 rotas desktop + 9 rotas mobile, HTTP 200, sem erro JS, sem overflow horizontal detectado.
- Screenshots:
  - `evidence/prod-auth-desktop-dashboard.png`
  - `evidence/prod-auth-mobile-dashboard.png`
  - `evidence/prod-auth-desktop-checklists.png`
  - `evidence/prod-auth-mobile-checklists.png`
  - `evidence/prod-auth-desktop-team.png`
  - `evidence/prod-auth-mobile-team.png`
  - `evidence/prod-auth-desktop-configurations.png`
  - `evidence/prod-auth-mobile-configurations.png`

## Roadmap UI

### P0 - Mobile operacional

- Dashboard mobile: os botões flutuantes "Abrir central de suporte" e "Abrir Koru IA" cobrem conteúdo e comprimem a área útil. Critério de aceite: nenhum botão flutuante pode cobrir cards, tabelas ou ações primárias em 390px de largura; o usuário precisa conseguir rolar até o fim sem conteúdo encoberto.
- Checklist mobile: controles aparecem empilhados em excesso antes do conteúdo. Critério de aceite: filtros secundários e ações em massa devem ficar em drawer/sheet ou barra compacta; o primeiro card/lista precisa aparecer sem rolagem longa em workspace com poucos itens.
- Sidebar mobile: o rail fixo reduz largura útil e cria sensação de app desktop comprimido. Critério de aceite: navegação mobile deve usar rail recolhido realmente mínimo ou bottom/nav drawer, preservando espaço para o conteúdo.
- Botões com rótulos longos: "Personalizar dashboard" quebra e disputa espaço com sino/atualizar. Critério de aceite: ações secundárias viram ícones com tooltip/label acessível ou menu "Mais" em mobile.

### P1 - Densidade e hierarquia desktop

- Checklists desktop: há busca, status tabs, filtros, pasta, modo tabela/cartões/colunas e ações em massa competindo no mesmo topo. Critério de aceite: separar "visão atual" de "operações em lote"; ações em massa só ficam proeminentes após seleção.
- Cards de métricas: bons para leitura rápida, mas ocupam área demais quando o próximo trabalho está em tabela. Critério de aceite: métricas de apoio podem virar faixa compacta quando há lista operacional abaixo.
- Team desktop: melhorou em relação a lista pura, mas o painel de colaborador ainda mistura identidade, performance e acesso no mesmo card. Critério de aceite: separar "pessoa/acesso" de "performance" com affordance clara para edição.

### P2 - Consistência visual

- Login: está estável, mas visualmente ainda parece tela mínima e isolada do produto operacional. Critério de aceite: manter foco de login, mas trazer contexto de workspace/app sem virar landing page.
- Configurações mobile: tabs quebram em múltiplas linhas e deixam a tela menos previsível. Critério de aceite: usar tabs horizontais roláveis ou agrupamento por categorias com busca.

## Roadmap UX

### P0 - Fluxos que precisam ser naturais

- Checklists: criar, publicar, executar, ver histórico e arquivar precisam estar no mesmo modelo mental. Critério de aceite: cada checklist deve ter CTA primário óbvio, ações secundárias agrupadas e retorno claro para histórico/detalhes.
- Filtros: filtros recorrentes devem poder ser salvos como views, inspirado em Linear/Notion. Critério de aceite: usuário escolhe filtros, salva view do workspace e alterna entre views sem reconstruir a consulta.
- Notificações: contagem, busca, filtros e marcar como lida precisam priorizar "o que exige ação agora". Critério de aceite: inbox com não lidas, responsáveis, origem e ação de limpar estado em lote.

### P1 - Operação escalável

- Dashboard: hoje mostra muita configuração antes das filas. Critério de aceite: em mobile, fila de trabalho e atrasados aparecem antes de filtros avançados; filtros avançados ficam recolhidos.
- Configurações: precisa suportar busca global por configuração. Critério de aceite: campo "Buscar configuração" encontra usuário, unidade, setor, API, notificações e financeiro.
- Equipe: "Gerenciar acessos" precisa ser testado como fluxo completo, não só botão. Critério de aceite: abrir, alterar papel/unidades, salvar, recarregar e confirmar membership/profile sem divergência.

### P2 - Ajuda e aprendizagem

- Ajuda: deve virar central navegável e contextual, não só texto. Critério de aceite: guias organizados por tarefa, com links para tela correspondente.
- Cursos: cards grandes funcionam com poucos cursos, mas precisam de lista/densidade quando crescer. Critério de aceite: alternar card/lista e filtros por status/progresso.

## Gaps operacionais descobertos

- Scripts de auth exigem `.env` carregado. Rodar diretamente falha com `SUPABASE_URL_or_SECRET_KEY_missing`; comando comprovado: `npx --yes dotenv-cli -e .env -- node ...`
- `supabase/scripts/auth/read/workspace.mjs --json` sem `--workspace-id` falha com `workspace_id_must_be_uuid`. Precisa de mensagem de ajuda melhor ou default QA explícito.
- `supabase/scripts/auth/read/production-ui-sweep.mjs` foi criado, mas o repositório ainda não tem `playwright` como dependência local. Ele funciona como contrato de QA quando a dependência estiver disponível ou quando rodado no runtime do Codex.
- Varredura autenticada profunda ainda não clicou ações internas como executar checklist, revisar perfil, salvar configurações, marcar notificação e abrir curso. Isso é o próximo bloco de prova.

## Auditoria visual e funcional em produção - 29/07/2026

### Entregue e comprovado

- Portal Gestor: dashboard modular, filtros contidos, métricas responsivas e cards operacionais com dados reais.
- Configurações > Setores: chaves técnicas ocultas, busca tolerante a acentos e espaços, cards responsivos e ações humanas.
- App Operacional Ritmika: Home, Histórico, Avisos, Perfil e execução de checklist autenticados com conta QA operacional.
- Responsividade operacional: Home validada em 390 x 844 sem overflow horizontal.
- Persistência: execução QA salva com 2/2 respostas, recarregada mantendo texto e progresso, e concluída com 100%.
- Hierarquia: 3 contas, 2 workspaces e memberships separados entre cliente Konclui e workspace QA; inventário repetível em `supabase/scripts/auth/read/inspect-auth-hierarchy.cjs`.

### Achados adicionados ao roadmap

- P0 UI: nunca expor códigos internos de evento ou estado, como `EXECUTION_COMPLETED`, `EXECUTION_STARTED` e `completed`. Critério de aceite: toda enumeração técnica precisa de rótulo humano e fallback neutro.
- P0 UX: a execução precisa voltar para a lista da superfície de origem. Critério de aceite: no App Operacional, “Voltar à lista” retorna para `/app`; no Gestor, retorna para `/checklists`.
- P0 QA: manter credencial operacional isolada recuperável sem imprimir segredo. Critério de aceite: reset explícito da conta QA, persistência apenas em `.env` ignorado e validação por login real.
- P1 UX: avisos devem comunicar categoria, título, contexto e data em linguagem humana. O código técnico permanece apenas na telemetria.

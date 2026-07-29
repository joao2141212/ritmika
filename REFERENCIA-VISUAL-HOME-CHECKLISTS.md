# Referência visual: Home e Checklists

## Arquivos preservados

- `docs/ui-references/operational-mobile-reference.png`
- `docs/ui-references/dashboard-checklist-reference.png`
- `docs/ui-references/shared-card-language-reference.png`
- `docs/ui-references/modular-dashboard-reference.png`
- `docs/ui-references/mobile-schedule-reference.png`
- `docs/ui-references/bento-activity-manager-reference.png`

Essas imagens são referências de composição e interação. Dados, pessoas, valores,
gráficos e textos nelas não são fixtures nem conteúdo a ser copiado.

### Agenda e rotina do App Operacional

`mobile-schedule-reference.png` orienta especificamente o App Operacional
Ritmika:

- alternância simples entre Hoje e Agenda;
- faixa semanal compacta;
- tarefas ordenadas por horário e prioridade;
- cartões empilhados com status semântico;
- detalhe da atividade com contexto, participantes, prazo, evidências e ação;
- lembretes e notificações relacionados à execução;
- ação rápida para iniciar ou continuar uma atividade.

Os dados exibidos serão derivados das atribuições, agendas, respostas,
checklists, usuários e notificações reais do workspace.

Referência recebida em 28/07/2026:

- `docs/ui-references/dashboard-checklist-reference.png`

## O que aproveitar

- Hierarquia imediata: título, contexto curto, indicadores e conteúdo operacional.
- Indicadores compactos com ícone, valor dominante e variação/status em uma
  cápsula discreta.
- Um bloco principal de progresso ocupando a maior área, acompanhado por um
  resumo lateral simples.
- Cores semânticas consistentes para estados, prioridades e progresso.
- Checklists e tarefas em linhas densas e escaneáveis, com responsável, prazo,
  prioridade, status e progresso visíveis sem abrir detalhes.
- Cartões brancos sobre fundo neutro, bordas suaves, cantos arredondados e
  espaçamento regular.
- Ação principal evidente e ações secundárias visualmente subordinadas.

## Tradução para a Home do App Operacional Ritmika

- Manter saudação, data/turno e estado de sincronização no topo.
- Usar o bloco dominante para progresso diário de checklists, não para métricas
  administrativas.
- Exibir indicadores compactos de pendentes, em andamento, concluídos e atrasados.
- Mostrar a próxima ação prioritária sem exigir navegação ou filtragem prévia.
- Em telas pequenas, empilhar os blocos preservando a ordem de importância.

## Tradução para Checklists

- No App Operacional Ritmika, usar cartões grandes e acionáveis para o trabalho do dia.
- No desktop operacional, permitir uma visão tabular escaneável quando a densidade
  de itens justificar.
- Exibir sempre status, prazo, prioridade, progresso e responsável quando
  aplicáveis.
- A linha ou cartão inteiro deve abrir o checklist; a ação principal deve ter
  alvo de toque confortável.
- Filtros ficam recolhidos por padrão e mostram chips apenas para critérios ativos.

## Limites

- A referência orienta composição, densidade e hierarquia, não uma cópia literal.
- O App Operacional Ritmika continua separado do Portal Gestor.
- O Portal Gestor responsivo e o App Operacional Ritmika serão distribuídos como
  aplicativos reais com Capacitor; ambos devem respeitar safe areas, toque,
  teclado, retomada, offline, sincronização e navegação nativa.
- Métricas de administração, personalização do dashboard e controles em massa
  pertencem ao Portal Gestor, não à experiência operacional.

## Linguagem compartilhada de cartões

- Portal Gestor e App Operacional Ritmika usam a mesma família visual de cartões:
  cantos amplos, fundo claro, hierarquia tipográfica forte e estados por cor.
- No Portal Gestor, os cartões podem concentrar métricas, tendências, comparações
  e atalhos administrativos.
- No App Operacional, os cartões priorizam contexto imediato, progresso e uma
  ação principal executável.
- A consistência é visual e comportamental; a densidade e as permissões continuam
  específicas de cada superfície.
- “Funcionário”, “Employee App” e variações não são nomes de produto nem devem
  aparecer como marca ou título na interface. O nome exibido é Ritmika; “App
  Operacional” é apenas a nomenclatura arquitetural para distinguir a superfície.

## Referência modular adicional

Referência recebida em 28/07/2026:

- `docs/ui-references/modular-dashboard-reference.png`

Padrões aproveitáveis:

- Grade modular com cartões de tamanhos distintos conforme a importância da
  informação, evitando blocos artificialmente uniformes.
- Indicadores circulares e minigráficos para progresso, tendência e distribuição.
- Seletor de período dentro do contexto do próprio cartão.
- Busca acompanhada por chips de filtros ativos, individualmente removíveis.
- Ação principal inserida no cartão relacionado, sem obrigar o usuário a procurar
  uma barra de ações distante.
- Estados secundários representados com baixa intensidade visual, reservando a
  cor forte para decisão, alerta ou progresso.
- Cartões com título, valor, contexto e ação em posições previsíveis.
- Uso de espaço negativo para separar grupos sem multiplicar bordas e divisores.

Aplicação no Portal Gestor:

- Combinar cartões executivos, tendências, distribuição e atividade recente em
  uma grade responsiva com prioridades claras.
- Permitir filtros globais apenas quando afetam vários blocos; filtros específicos
  permanecem dentro do cartão correspondente.
- Usar chips removíveis para tornar o estado atual da consulta sempre visível.
- Evitar uma coleção de números sem consequência: cada métrica deve oferecer
  detalhe, comparação ou próxima ação.

Aplicação no App Operacional Ritmika:

- Reduzir a grade a uma coluna principal ou duas colunas apenas quando houver
  largura real.
- Transformar métricas em contexto de execução: progresso do dia, prazo, pendências,
  sincronização e próxima atividade.
- Manter uma ação dominante por cartão e alvos de toque amplos.
- Usar minigráficos somente quando ajudarem uma decisão imediata; não reproduzir
  painéis financeiros ou administrativos no fluxo operacional.

Direção de identidade:

- A composição, a modularidade e o contraste são referências.
- A paleta alaranjada da imagem não substitui automaticamente o verde e os tons
  semânticos do Ritmika.
- O resultado deve parecer parte do mesmo produto nas duas superfícies, sem
  confundir suas responsabilidades.
- Nenhuma tela será considerada pronta apenas por semelhança visual: estados de
  carregamento, vazio, erro, sincronização, responsividade e ações reais precisam
  ser comprovados.

## Aplicação comprovável da referência bento

- Portal Gestor: fila convertida em activity manager com busca real, pulso de
  atrasadas/agora/próximas e card prioritário assimétrico.
- App Operacional: busca tolerante a acentos e espaços, filtros rápidos por
  situação e contagens derivadas das atribuições reais.
- Nenhum dado visual da referência foi copiado; os cartões continuam ligados ao
  Supabase e ao workspace autenticado.

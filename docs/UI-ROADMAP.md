# Roadmap de UI do Ritmika

Status: referência de implementação
Atualizado em: 2026-07-28
Escopo: interface web white-mode first. O Konclui é a referência funcional e
operacional. O Ritmika não deve fazer uma cópia literal de pixels.

## 1. Decisão de produto e evidência de partida

Este documento transforma a auditoria visual em decisões implementáveis. Ele
existe para que uma correção futura use critérios explícitos, e não memória de
uma conversa ou preferência estética isolada.

Evidências observadas no Ritmika publicado em 2026-07-28:

1. Em Checklists, no modo card, os botões de ação ficam abaixo da área visível.
   Na amostra observada, o card terminava em y=908,76 para uma viewport de 868px
   e o botão Executar terminava em y=888,2. A ação primária ficou parcialmente
   inacessível.
2. Em Cursos, uma aula exibiu o payload serializado
   {"blocks":[...]} em vez do conteúdo legível para a pessoa.
3. Em Checklists, filtros de status, busca, unidade, setor, momento, pasta,
   colunas, ações em massa e filtros por coluna competem simultaneamente pela
   atenção. Em 1280x800 a tabela exige rolagem horizontal para encontrar ações.
4. Em áreas operacionais há rótulos de implementação expostos, como completed,
   open, active, UUIDs e nomes internos de plano ou ambiente.
5. Ideias, Novidades e Cursos usam linhas muito largas tratadas como cards:
   deixam espaço vazio, afastam a ação do contexto e não dão a densidade de uma
   lista operacional nem o foco de um card real.
6. Notificações contém métricas redundantes, filtros comprimidos, colunas
   vazias, mensagem truncada e ações apenas por ícone.
7. Unidades e Setores exibem ao mesmo tempo o CTA de criação e um formulário de
   criação aberto, duplicando a mesma intenção.

Essas observações são o ponto de partida. Elas não autorizam uma mudança sem
preservar os fluxos, os dados remotos e a paridade funcional já existente.

## 2. Referências que orientam o desenho

| Referência | Uso específico no Ritmika | O que não copiar |
| --- | --- | --- |
| Konclui, benchmark visual manual e somente leitura em 2026-07-28 | Densidade operacional de Checklists, resumo antes da lista, busca e controles de tabela concentrados, ações secundárias em menu | Cores, fontes, geometria ou qualquer dado do cliente |
| [Linear: Filters](https://linear.app/docs/filters) e [Custom Views](https://linear.app/docs/custom-views) | Busca como ponto de partida, filtros ativos visíveis, filtros avançados sob demanda, visão salva quando houver necessidade comprovada | Estética dark, linguagem de issues ou estrutura de produto de engenharia |
| [Airtable: Views](https://support.airtable.com/docs/en/getting-started-with-airtable-views) | Colunas como configuração de visualização, tabela densa para trabalho recorrente e campos opcionais fora da largura padrão | Transformar todo dado em planilha ou expor metadados sem contexto |
| [Intercom: Inbox](https://www.intercom.com/help/en/articles/6258745-the-inbox-explained) e [Search and filter](https://www.intercom.com/help/en/articles/6516006-inbox-search-and-filter) | Hierarquia de inbox para Notificações: evento, contexto, quando ocorreu, estado e detalhe sob demanda | Modelo de atendimento ao cliente quando o domínio for execução operacional |
| [Stripe Dashboard](https://docs.stripe.com/dashboard/basics) | Formulários de configuração com contexto, ações salvas perto da alteração e termos de domínio em vez de chaves técnicas | Layout, identidade visual ou complexidade financeira |
| [GitBook UI](https://gitbook.com/docs/resources) e [Blocks](https://gitbook.com/docs/content-editor/blocks) | Leitor de curso: conteúdo em blocos legíveis, contexto da aula e navegação clara entre conteúdo e próximo passo | Converter o LMS em uma base de documentação genérica |

Regra de uso das referências: cada uma fornece um padrão limitado e nomeado.
Nenhuma delas é licença para importar um estilo inteiro ou adicionar controles
que não resolvam uma tarefa real no Ritmika.

## 3. Princípios visuais obrigatórios

### 3.1 Hierarquia antes de decoração

Cada tela deve comunicar, nesta ordem:

1. Onde a pessoa está e qual objeto está operando.
2. Qual é a decisão ou ação primária possível agora.
3. O estado que muda a decisão: status, responsável, prazo, falha ou progresso.
4. Detalhes e ações secundárias, revelados no contexto.

Resumo, filtro, conteúdo e ação não devem ocupar o mesmo peso visual.

### 3.2 Lista, tabela ou card são escolhas diferentes

| Quando usar | Estrutura esperada |
| --- | --- |
| Trabalho recorrente sobre muitos itens, comparação e seleção em massa | Tabela ou lista densa, com título clicável, poucas colunas úteis e ações secundárias em menu |
| Explorar até três objetos com contexto visual próprio | Card compacto com uma ação primária visível |
| Detalhe de uma entidade, configuração ou passo de fluxo | Painel ou página de detalhe com grupos semânticos |
| Nenhum dado disponível | Estado vazio que diga o que falta e ofereça o próximo passo produtivo |

É proibido usar uma linha horizontal de largura total como card apenas para
arredondar bordas. Se o objeto for uma linha operacional, ele deve operar como
lista ou tabela.

### 3.3 Ação primária sempre alcançável

- Um card deve manter sua ação principal visível sem a pessoa precisar adivinhar
  que existe conteúdo cortado.
- Uma tabela precisa expor a ação principal no recorte de 1280x800 ou permitir
  abrir o item inteiro pelo título.
- Ações destrutivas ou raras entram em menu contextual com rótulo.
- Ícones isolados precisam de tooltip e nome acessível. Quando a consequência
  não for óbvia, o rótulo textual é obrigatório.

### 3.4 Linguagem de domínio, não linguagem de implementação

- Status, planos, eventos e categorias devem ter um mapa de apresentação em
  português.
- UUIDs, chaves de integração, nomes de ambiente e payloads nunca são conteúdo
  padrão de uma tela. Quando úteis, ficam em Detalhes técnicos com opção de
  copiar.
- Valores ausentes devem aparecer como Não informado, Sem responsável ou um
  equivalente de domínio, nunca como vazio ambiguo.

### 3.5 Densidade responsiva

O alvo mínimo de desktop é 1280x800, além do desktop amplo e do mobile.
Responsividade não significa apenas encolher:

- ocultar ou mover colunas secundárias para detalhes;
- manter título, status e ação principal;
- agrupar filtros avançados;
- preservar alvos de toque e foco;
- evitar widgets flutuantes sobre o conteúdo ou sobre CTAs.

## 4. Sistema visual a consolidar

### 4.1 Tokens e consistência

Antes de introduzir novos componentes, consolidar tokens semânticos já usados
pela aplicação:

| Categoria | Decisão |
| --- | --- |
| Superfície | Fundo da página, superfície de trabalho, superfície elevada e superfície de estado vazia distinguíveis sem criar caixas em excesso |
| Texto | Título da página, título de objeto, dado principal, metadado e texto auxiliar com contraste e peso consistentes |
| Cor de estado | Sucesso, alerta, erro, informação e neutro significam estado. Não usar cor apenas para ornamentação |
| Espaçamento | Ritmo de 8px e grupos visuais com respiro menor dentro do grupo do que entre grupos |
| Raios e bordas | Bordas delimitam agrupamento ou interação. Não arredondar toda linha por padrão |
| Ações | Primária, secundária, sutil e destrutiva possuem aparência e posição previsíveis |

### 4.2 Componentes prioritários

1. Barra de página: breadcrumb opcional, título, contexto e uma ação principal.
2. Resumo operacional: até quatro métricas que respondem uma decisão concreta.
3. Barra de busca e filtros: busca, chips ativos, botão Filtros e limpar quando
   houver filtro ativo.
4. Tabela operacional: título clicável, cabeçalho fixável quando necessário,
   colunas configuráveis e detalhe contextual.
5. Card de entidade: só quando houver leitura comparativa ou uma ação local.
6. Estado vazio: explicação curta, causa e CTA produtivo.
7. Estado de ação: carregando, sucesso, falha acionável e desabilitado com
   motivo.
8. Painel de detalhe: informação de domínio primeiro, metadados técnicos
   escondidos por padrão.

## 5. Roadmap visual por prioridade

### P0. Bloqueios de legibilidade e alcance

| Frente | Problema comprovado | Decisão de UI | Aceite visual |
| --- | --- | --- | --- |
| Curso e aula | JSON bruto exposto ao aluno | Renderizar blocos de conteúdo em leitura humana. Texto, títulos, listas e mídia têm apresentação própria; tipo não suportado recebe fallback calmo | Nenhum objeto JSON serializado aparece no leitor; título da aula, conteúdo e próximo passo são identificáveis |
| Card de checklist | Ações cortadas abaixo do viewport | Corrigir o contêiner, altura, overflow e espaçamento inferior do card; manter ações dentro do card e visíveis | Em 1280x800, Executar e Editar ficam inteiramente visíveis sem conteúdo cortado |

### P1. Trabalho operacional principal

| Frente | Decisão de UI | Critério de aceite |
| --- | --- | --- |
| Toolbar de Checklists | Uma linha inicial com busca, estado selecionado e Filtros. Unidade, setor, momento e pasta entram no painel de filtros ou em chips ativos. Colunas e ações em massa ficam agrupadas à direita | Sem empilhar todos os filtros abertos por padrão; filtros ativos ficam claros; Limpar filtros só aparece quando aplicável |
| Tabela de Checklists | Título como entrada do detalhe; status e metadados compactos; cabeçalhos servem para ordenar/filtrar; ação primária visível ou título abre o item | Em 1280x800, não é necessário rolar horizontalmente para executar a ação principal de uma linha |
| Modo card de Checklists | Cards usam grade somente se cada item tiver leitura própria. Cada card contém título, status, metadados essenciais e CTA visível | Nenhum CTA fica abaixo do limite do card ou oculto por um contêiner |
| Rótulos de dados | Criar adaptador de apresentação para status, eventos, planos, categorias e campos ausentes | Não há completed, open, active, UUID ou nome interno exposto como conteúdo padrão |
| Notificações | Adotar padrão inbox: evento e contexto à esquerda, data e estado compactos, detalhe acionável e ações contextuais | Sem coluna vazia, sem mensagem escondida como dado principal e sem ação crítica apenas por ícone |
| Ideias, Novidades e Cursos | Escolher por tela entre tabela/lista densa e card-grid real. Não manter linhas largas disfarçadas de cards | Cada tela possui uma ação próxima do objeto e usa a densidade correspondente à frequência de operação |
| Unidades e Setores | Uma única entrada para criar: CTA abre composer inline ou diálogo. Editar/arquivar aparecem como ação nomeada ou menu contextual | Não há botão e formulário de criação competindo simultaneamente |

### P2. Coerência e acabamento

| Frente | Decisão de UI | Critério de aceite |
| --- | --- | --- |
| Dashboard | Reunir filtros próximos do conteúdo que afetam; widgets de suporte não cobrem tabelas, gráficos ou CTAs | Em desktop e mobile, a camada flutuante não intercepta clique nem esconde informação |
| Configurações | Quando houver muitas abas, usar navegação lateral ou agrupamento por assunto; salvar próximo do campo alterado | A pessoa entende em qual categoria está e não precisa voltar ao topo ou fim da página para salvar |
| Ajuda | Cada canal não configurado tem CTA que leva à configuração correspondente ou à criação do recurso | Estado vazio sempre oferece uma continuação produtiva |
| Equipe | Validar com conjunto de múltiplas pessoas antes de redesenhar | Decisão visual baseada em densidade real, não em uma única linha QA |
| Performance percebida | O bundle principal atual tem cerca de 1,16 MB minificado, 345 KB gzip, conforme build local de 2026-07-28 | Planejar code splitting por rota e medir carregamento da primeira interação antes de ampliar a interface |

## 6. Estados que toda tela tocada deve cobrir

| Estado | Regra visual |
| --- | --- |
| Carregando | Estrutura semelhante ao resultado final, sem salto grande de layout |
| Vazio | O que não existe, por que isso importa e uma única próxima ação |
| Sucesso | Confirmação perto da ação, sem depender apenas de cor |
| Erro recuperável | Causa em linguagem humana, ação de tentar novamente e identificação de suporte quando existir |
| Sem permissão | Explicar a limitação e, quando aplicável, indicar quem pode resolver |
| Ação em andamento | Botão bloqueado durante a operação, estado textual e prevenção contra duplicidade |
| Dados degradados | Mostrar o que foi carregado e o que falta, sem transformar ausência em sucesso |

## 7. Prova visual antes de considerar uma frente concluída

Para cada tela alterada:

1. Conferir DOM e interação da ação principal.
2. Inspecionar 1600px, 1280x800 e mobile.
3. Cobrir carregando, vazio, sucesso, erro e dado parcial quando aplicável.
4. Verificar teclado, foco, rótulos acessíveis e tooltips de ícone.
5. Confirmar que valores reais são apresentados por um adaptador de domínio.
6. Registrar screenshot ou contrato de interface do caso preenchido.

Build ou HTTP 200 não provam essa lista. A conclusão exige sinal visual e
interação da tela correspondente.

## 8. Sequência de entrega

1. P0: renderização legível de aula e correção da ação cortada no card.
2. P1-A: toolbar, tabela e responsividade de Checklists.
3. P1-B: adaptador de rótulos e Inbox de Notificações.
4. P1-C: escolha coerente de lista ou card para Ideias, Novidades e Cursos;
   criação em Unidades e Setores.
5. P2: dashboard, configurações, ajuda e auditoria de densidade da Equipe.
6. Repetir a prova visual do item 7 e medir falhas de interação depois de cada
   frente.

## 9. Limites deliberados

- Não alterar dados do Konclui nem usar dados do cliente como massa de teste.
- Não sacrificar funções existentes em troca de acabamento visual.
- Não criar uma biblioteca visual paralela se o componente existente puder ser
  corrigido com tokens e contratos consistentes.
- Não publicar uma tela como validada apenas porque ela compila.

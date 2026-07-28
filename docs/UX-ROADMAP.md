# Roadmap de UX do Ritmika

Status: referência de fluxo e validação
Atualizado em: 2026-07-28
Relação com UI: este documento define a experiência e os critérios de tarefa.
O documento UI define a expressão visual dessa experiência.

## 1. Objetivo de experiência

O Ritmika deve permitir que uma pessoa operacional encontre, entenda, execute,
acompanhe e configure trabalho sem precisar conhecer a estrutura técnica do
sistema. A experiência é considerada boa quando o caminho principal é evidente,
os estados explicam o que ocorreu e a próxima decisão é possível sem tentativa
e erro.

Princípio central:

> A interface mostra a decisão de domínio; detalhes técnicos aparecem apenas
> quando ajudam a resolver uma exceção.

## 2. Tarefas que a arquitetura precisa priorizar

| Tarefa humana | Pergunta que a tela precisa responder | Superfícies principais |
| --- | --- | --- |
| Monitorar a operação | O que exige atenção agora? | Dashboard, Notificações, resumos de Checklists |
| Encontrar um item | Onde está o checklist, curso, pessoa ou configuração? | Busca, filtro, visão salva quando necessária |
| Executar um checklist | O que preciso responder, salvar e concluir? | Lista/card, detalhe, execução, histórico |
| Corrigir uma exceção | O que falhou, por que e qual é a próxima ação? | Notificação, detalhe, erro recuperável, suporte |
| Configurar o workspace | Qual configuração muda este comportamento e como salvo? | Configurações, Unidades, Setores, integrações |
| Aprender | O que esta aula ensina e como avanço? | Cursos, módulo, aula e progresso |

Toda mudança de UI deve declarar qual dessas tarefas melhora. Se não melhorar
uma tarefa, ela não entra como prioridade de UX.

## 3. Referências e padrões de interação

| Referência | Padrão adotado | Aplicação prática |
| --- | --- | --- |
| Konclui, leitura visual manual em 2026-07-28 | Lista operacional densa, controles de tabela agrupados, ações secundárias fora da área primária | Checklists preserva a velocidade de quem procura, seleciona e executa |
| [Linear Filters](https://linear.app/docs/filters) | Busca primeiro, filtros como refinamento, estado selecionado visível e compartilhável quando a função existir | Checklists e listas futuras mostram filtros ativos como contexto, sem poluir a primeira leitura |
| [Linear Custom Views](https://linear.app/docs/custom-views) | Visões salvas são consequência de fluxo recorrente, não um controle obrigatório para todo usuário | Só introduzir visão salva após medir repetição de filtros |
| [Intercom Inbox](https://www.intercom.com/help/en/articles/6258745-the-inbox-explained) | Lista de eventos com prioridade, contexto, momento e detalhe sob demanda | Notificações deixa de ser uma tabela de metadados e vira uma fila de decisão |
| [Intercom Search and Filter](https://www.intercom.com/help/en/articles/6516006-inbox-search-and-filter) | Busca e filtro ajudam a encontrar sem esconder o conteúdo principal | Filtros avançados não permanecem expandidos sem necessidade |
| [Airtable Views](https://support.airtable.com/docs/en/getting-started-with-airtable-views) | Coluna é uma escolha da visão, não uma obrigação permanente do usuário | Tabelas começam com dados decisivos; campos secundários entram em Colunas ou detalhe |
| [Stripe Dashboard](https://docs.stripe.com/dashboard/basics) | Configuração é contextual, explícita e salva perto da mudança | Formulários evitam ambiguidade entre criar, editar e salvar |
| [GitBook Blocks](https://gitbook.com/docs/content-editor/blocks) | Conteúdo estruturado precisa ser renderizado como conteúdo, não como armazenamento | Curso interpreta blocos e apresenta leitura, não JSON |

## 4. Diagnóstico de UX por fluxo

### 4.1 Checklists: localizar, filtrar, executar, comprovar

Fluxo esperado:

1. A pessoa abre Checklists e entende quantidade, estado e recorte atual.
2. Digita uma busca ou escolhe um filtro de alto valor.
3. Enxerga quais filtros estão ativos e pode removê-los individualmente.
4. Abre o checklist pelo título ou aciona Executar diretamente.
5. Responde, salva e recebe confirmação inequívoca.
6. Retorna ao histórico ou à lista e enxerga o estado persistido.

Falhas atuais observadas:

- controles demais disputam a primeira linha;
- em 1280x800, a ação pode depender de rolagem horizontal;
- no modo card, a ação principal foi cortada;
- status e dados técnicos reduzem a leitura humana.

Decisões:

- Busca e status são o caminho rápido inicial.
- Unidade, setor, momento e pasta viram filtros avançados ou chips ativos.
- Colunas e ações em massa permanecem próximas porque são tarefas de operação,
  mas não competem com a busca.
- Título abre detalhe; a ação de executar não pode ficar inacessível.
- Estado da execução deve sobreviver a atualização de página e ser comprovado
  com a mesma execução ou uma fixture equivalente.

Aceite:

- Uma pessoa encontra e inicia um checklist sem instrução externa.
- Em 1280x800, a ação primária não depende de rolagem horizontal.
- Um filtro aplicado fica visível, removível e não confunde com estado de
  publicação.
- Após salvar, a recarga mostra o estado persistido correspondente.

### 4.2 Notificações: perceber, entender, resolver

Fluxo esperado:

1. A pessoa identifica prioridade, origem e momento do evento.
2. Entende o impacto em uma frase legível.
3. Abre o detalhe ou executa a ação pertinente.
4. Marca, arquiva ou resolve sem perder o contexto.

Decisões:

- Usar hierarquia de inbox em vez de uma tabela de campos técnicos.
- A mensagem ou resumo do evento é conteúdo principal.
- Estado de leitura, data e origem são metadados compactos.
- Filtro de tipo e estado fica em chip ou painel, não espalhado em uma faixa
  de inputs.
- Quando não há destino de ação, informar isso com clareza e não fingir que um
  ícone resolverá.

Aceite:

- Não há coluna vazia como estrutura permanente.
- O evento pode ser entendido sem abrir UUID ou payload.
- Ação importante tem rótulo acessível e contexto.

### 4.3 Cursos: escolher, ler, avançar

Fluxo esperado:

1. A pessoa entende o catálogo e o próprio progresso.
2. Escolhe um curso e identifica módulo e aula atual.
3. Lê o conteúdo sem exposição da estrutura de armazenamento.
4. Avança ou conclui com feedback de progresso.

Decisões:

- Um payload de blocos é dado de transporte, não texto de interface.
- A aula mostra título, contexto do módulo, conteúdo e próximo passo.
- Um bloco ainda não suportado mostra fallback útil, sem quebrar toda a aula.
- Uma ação de progresso nunca deve ser disparada apenas por visualizar a página.

Aceite:

- JSON serializado nunca aparece para o aluno.
- Texto, listas e títulos de blocos conhecidos são legíveis.
- A pessoa sabe qual aula está vendo e como continuar.

### 4.4 Configurações: decidir, alterar, salvar

Fluxo esperado:

1. A pessoa sabe qual categoria de configuração está editando.
2. Sabe se está criando ou alterando uma entidade.
3. Salva próximo do formulário e recebe resultado claro.
4. Pode voltar sem duplicar uma entidade por acidente.

Decisões:

- Um único ponto de entrada para criação por contexto.
- Campos agrupados por decisão de negócio, não por coluna de banco.
- Ações de editar, arquivar e excluir explicam consequência.
- Dados técnicos ficam em seção avançada, quando forem necessários.

Aceite:

- Não existe CTA de criar concorrendo com um formulário aberto sem explicação.
- Salvar, falhar e cancelar têm estados distintos.
- A pessoa identifica o efeito de arquivar antes de confirmá-lo.

### 4.5 Ajuda: detectar lacuna, orientar, retomar

Um canal não configurado não deve ser um beco sem saída. O estado precisa
indicar o que está indisponível, o que a pessoa pode fazer e para onde ir.

Aceite:

- Todo estado de suporte não configurado possui CTA para configuração,
  solicitação de acesso ou canal alternativo.

## 5. Arquitetura da informação

### Navegação

- A navegação primária representa áreas de trabalho, não tabelas internas.
- Uma área tem uma página de entrada clara e detalhes progressivos.
- Filtros pertencem à superfície que alteram. Não devem parecer navegação.
- Configuração é separada da operação diária, mas cada estado que depende de
  configuração precisa apontar para a categoria correta.

### Divulgação progressiva

Mostrar inicialmente:

1. título e contexto;
2. status que altera decisão;
3. ação primária;
4. campos mais usados.

Revelar sob demanda:

- filtros avançados;
- colunas opcionais;
- bulk actions;
- logs e metadados técnicos;
- ações raras ou potencialmente destrutivas.

## 6. Contrato de estados e feedback

| Situação | A pessoa precisa saber | Resposta obrigatória |
| --- | --- | --- |
| Carregando | O sistema está buscando ou processando | Placeholder coerente e ação indisponível apenas onde necessário |
| Sucesso de escrita | O que foi salvo e onde aparece | Confirmação próxima, dado atualizado e sem duplicar requisição |
| Erro de escrita | O que não aconteceu e como recuperar | Mensagem humana, tentativa novamente e contexto técnico correlacionável quando houver |
| Dado vazio | Por que não há resultado e como criar/ajustar | Estado vazio com CTA produtivo |
| Permissão | Qual limitação existe | Explicação e próximo responsável ou rota de solicitação |
| Dado parcialmente disponível | O que está visível e o que não carregou | Aviso não bloqueante e recuperação possível |

Nenhuma mensagem de erro é considerada suficiente se ela só repetir HTTP 404,
500 ou um objeto de exceção. O suporte técnico pode incluir identificador de
correlação, mas a interface primeiro descreve a consequência para o usuário.

## 7. Métricas e telemetria de UX

Toda instrumentação deve ser estruturada, com função, contexto de domínio,
resultado e identificador de correlação. Não registrar conteúdo sensível ou
segredos.

| Pergunta de UX | Sinal a medir | Decisão que permitirá |
| --- | --- | --- |
| A busca e os filtros resolvem a descoberta? | consulta iniciada, filtro aplicado/removido, resultado vazio e item aberto | Simplificar filtros ou criar visão salva se houver repetição comprovada |
| Ação do card ou tabela está alcançável? | clique em Executar, falha de ação, abandono após abertura | Identificar corte visual, erro de rota ou etapa confusa |
| Persistência é real? | salvar iniciado, salvar concluído, leitura posterior da mesma entidade | Separar falsa confirmação de dado persistido |
| Notificação leva a uma resolução? | evento aberto, CTA usado, resolução/arquivamento | Ajustar prioridade, texto ou destino |
| Curso está compreensível? | aula aberta, bloco sem renderizador, avanço/conclusão | Priorizar renderizadores de bloco e navegação |

Telemetria é um complemento de prova, não substituto de teste visual, banco de
dados ou fluxo autenticado.

## 8. Plano de pesquisa e validação

### Roteiros mínimos

1. Encontrar um checklist publicado por busca e executar uma resposta.
2. Aplicar unidade, setor e momento; remover somente um filtro e confirmar o
   resultado.
3. Abrir uma notificação, entender sua causa e chegar ao objeto relacionado.
4. Criar ou editar uma unidade em conta QA isolada, salvar e reencontrar.
5. Abrir uma aula em blocos, ler e avançar sem ver dados de transporte.

### Cobertura obrigatória por alteração

- desktop amplo;
- 1280x800;
- mobile;
- teclado e foco;
- carregando;
- vazio;
- erro recuperável;
- sucesso;
- dados parciais;
- conta QA isolada, quando for preciso comprovar escrita.

### Condição de saída

Uma frente só é concluída quando existe:

1. regra de UX implementada;
2. ação principal observada em interface;
3. sinal de dados ou persistência adequado ao fluxo;
4. estado de falha coberto;
5. telemetria estruturada para exceções e ações relevantes;
6. nenhum dado técnico bruto exposto como conteúdo normal.

## 9. Sequência de implementação

1. Corrigir bloqueios P0: conteúdo de aula e ação cortada em card.
2. Refatorar Checklists como fluxo completo de encontrar até executar.
3. Normalizar rótulos de domínio e Notificações como inbox operacional.
4. Tornar Cursos, Ideias e Novidades coerentes com o tipo de tarefa.
5. Ajustar configurações, ajuda, dashboard e responsividade.
6. Validar com dados QA e registrar evidência para cada condição de saída.

## 10. Limites e guardrails

- Konclui é referência canônica de funções e padrões operacionais, não fonte de
  dados de teste nem alvo de mutação.
- Não trocar uma falha de fluxo por uma animação ou aparência mais bonita.
- Não declarar teste autenticado se a conta QA, a escrita e a leitura posterior
  não forem observadas.
- Não ocultar um erro real com toast de sucesso ou com uma atualização otimista
  sem reconciliação.

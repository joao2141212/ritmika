# Brief visual canônico: App do Funcionário

Este documento define a experiência visual e estrutural do produto operacional
dos funcionários. Ele não descreve o Portal do Gestor em viewport pequeno.

## Decisão imutável

Existem dois produtos distintos:

| Produto | Finalidade | URL | Linguagem de interface |
|---|---|---|---|
| Portal do Gestor | administrar operação, pessoas, modelos, configurações e análises | `https://ritmikapp.netlify.app/` | dashboard administrativo responsivo |
| App do Funcionário | receber, executar e acompanhar o próprio trabalho | `https://ritmika-app.netlify.app/` planejada | aplicativo operacional mobile-first |

O Portal do Gestor pode funcionar em celular, mas sua versão responsiva continua
sendo o Portal do Gestor. Ela nunca pode ser chamada, reutilizada ou publicada
como App do Funcionário.

## Referência visual recebida

A referência enviada pelo Pedro em 2026-07-29 apresenta uma experiência de app
mobile com:

- saudação pessoal no topo;
- calendário semanal horizontal e compacto;
- indicador circular dominante para o estado principal do dia;
- resumo numérico curto dentro de um card;
- cards grandes para blocos de atividade;
- ação principal com grande área de toque;
- navegação inferior persistente com cinco destinos;
- fundo claro suave, superfícies brancas, cantos amplos e sombras discretas;
- hierarquia guiada por leitura rápida, sem tabelas administrativas;
- identidade visual acolhedora e operacional.

Esses elementos são referência de composição, hierarquia e ergonomia. O domínio
de calorias, refeições e nutrição não pertence ao Ritmika e não deve ser
copiado.

## Tradução para o domínio Ritmika

### Topo

- saudação com nome do funcionário;
- unidade, setor ou turno atual;
- sino de notificações;
- estado de sincronização quando offline ou degradado.

### Faixa de dias

- sete dias em navegação horizontal;
- hoje destacado;
- indicador visual de pendências, atrasos ou conclusão;
- toque em um dia altera a agenda operacional, não a configuração do sistema.

### Indicador principal

O círculo central da referência vira o progresso operacional do dia:

- percentual ou fração de tarefas concluídas;
- próximo prazo;
- cor de atenção para atraso ou bloqueio;
- texto curto, compreensível durante operação em campo.

Nunca usar métricas administrativas, faturamento global ou analytics de equipe
nesse destaque.

### Resumo do dia

Card compacto com no máximo quatro métricas:

- pendentes;
- em andamento;
- concluídas;
- atrasadas.

Todas devem vir do escopo do usuário autenticado.

### Cards de tarefa

Cada card deve informar:

- título;
- unidade/setor quando necessário;
- prazo ou janela de execução;
- progresso;
- estado;
- uma única ação principal: iniciar, continuar ou revisar.

Não transformar cards em linhas de tabela comprimidas.

### Ação principal

- botão grande ou ação flutuante somente quando houver ação operacional clara;
- área de toque mínima de 44 por 44 pixels;
- estado ocupado, sucesso, erro e indisponível visíveis;
- nenhuma ação administrativa escondida nesse botão.

### Navegação inferior

Destinos canônicos:

1. Hoje
2. Tarefas
3. Histórico
4. Notificações
5. Perfil

No desktop, esses mesmos destinos podem migrar para uma rail compacta ou barra
lateral própria do produto operacional. Não podem ser substituídos pela sidebar
do Portal do Gestor.

## Estados obrigatórios

- carregando;
- sem tarefas;
- tarefas disponíveis;
- execução em andamento;
- concluído;
- atrasado;
- bloqueado;
- offline;
- sincronizando;
- conflito de atualização;
- erro recuperável;
- sessão expirada.

## Separação técnica obrigatória

O App do Funcionário deve ter:

- entrada de frontend independente;
- site Netlify independente;
- manifest PWA independente;
- `start_url` independente;
- service worker e cache independentes;
- layout e navegação próprios;
- rotas próprias;
- bundle publicável sem alterar o Portal do Gestor;
- autorização baseada em capacidade e RLS.

Convenção recomendada:

```text
client/src/employee/
client/src/employee/EmployeeApp.jsx
client/src/employee/components/
client/src/employee/pages/
client/src/employee/styles/
```

Componentes novos devem usar nomes ou classes `employee-*`. Importar o
`Layout.jsx` do gestor, sua sidebar ou páginas administrativas dentro do app
operacional é violação deste contrato.

## Elementos proibidos no App do Funcionário

- sidebar do gestor reduzida para caber no celular;
- dashboard administrativo reempacotado;
- tabelas de modelos de checklist;
- criação ou edição de modelos;
- gestão de equipe;
- configuração de workspace;
- financeiro, API, faturamento ou créditos globais;
- central master;
- filtros administrativos extensos;
- escolha de produto baseada em largura de tela;
- redirecionamento para o gestor apenas porque o dispositivo é desktop.

## Adaptação para desktop

O app operacional também deve funcionar em computador, preservando sua
identidade:

- conteúdo central mais largo ou em duas colunas;
- agenda e próxima tarefa em destaque;
- painel lateral para progresso ou detalhes;
- mesma navegação e mesmos limites de autorização;
- nenhuma troca automática para o layout administrativo.

## Critério de aceite visual

O App do Funcionário só pode ser considerado implementado quando:

1. um screenshot sem contexto permite distingui-lo do Portal do Gestor;
2. a primeira tela responde o que fazer agora;
3. a navegação contém somente destinos operacionais;
4. não há controles administrativos;
5. a experiência funciona em celular e desktop;
6. a referência visual foi traduzida para tarefas reais do Ritmika;
7. uma conta operacional não acessa rotas de gestor nem por URL direta;
8. o site e a PWA publicam independentemente.

## Evidência e estado

O estado de publicação fica em `ROUTES-AND-SURFACES.md`.
O plano de implementação fica em `ROADMAP-APP-FUNCIONARIO.md`.
Este arquivo é a autoridade para decisões visuais e de experiência do produto
operacional.

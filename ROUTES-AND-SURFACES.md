# Rotas e superfícies canônicas do Ritmika

Este arquivo é a fonte de verdade para localizar os produtos, URLs e rotas do
Ritmika. Não inferir produto por tamanho de tela e não inventar uma URL a partir
de nomes históricos.

Última verificação estrutural: 2026-07-28.

## Resumo rápido

| Superfície | URL canônica | Estado | Público |
|---|---|---|---|
| Portal do Gestor | `https://ritmikapp.netlify.app/` | publicado | usuários autenticados com membership; produto pretendido para `owner`, `admin` e `manager` |
| Master da Plataforma | `https://ritmikapp.netlify.app/master` | publicado no mesmo frontend | somente administrador de plataforma |
| Curadoria de sugestões | `https://ritmikapp.netlify.app/platform/ideas` | publicado no mesmo frontend | somente administrador de plataforma |
| App de Operação | `https://ritmikapp.netlify.app/app` | publicado no frontend atual e certificado em produção | `operator`, `employee` ou papel operacional equivalente |
| Host dedicado do App de Operação | `https://ritmika-app.netlify.app/` | planejado, ainda não certificado como publicado | mesmo público operacional |

## Regra fundamental

- `desktop`, `tablet` e `celular` são viewports.
- Portal do Gestor, Master da Plataforma e App do Funcionário são produtos.
- CSS responsivo não decide autorização.
- Conta, membership, papel, capacidades e RLS decidem o que cada pessoa pode
  acessar.
- Enquanto o segundo frontend não for publicado, abrir o Portal do Gestor em
  celular continua sendo apenas a versão responsiva do gestor. Isso não o
  transforma no App do Funcionário.

### Distinção que não pode ser misturada

| Situação | Produto correto |
|---|---|
| Gestor abre `ritmikapp.netlify.app` no computador | Portal do Gestor |
| Gestor abre `ritmikapp.netlify.app` no celular | Portal do Gestor responsivo |
| Pessoa operacional abre `ritmikapp.netlify.app/app` no celular | App de Operação |
| Pessoa operacional abre `ritmikapp.netlify.app/app` no computador | App de Operação responsivo |

A largura da tela nunca troca o produto. O brief visual do produto operacional
está em `APP-FUNCIONARIO-VISUAL-BRIEF.md`.

## 1. Portal do Gestor

Base de produção:

```text
https://ritmikapp.netlify.app/
```

Registro das rotas: `client/src/App.jsx`.

| Caminho | Função |
|---|---|
| `/login` | autenticação |
| `/` | dashboard |
| `/checklists` | modelos de checklist |
| `/checklists/new` | novo checklist |
| `/checklist/add` | alias legado para novo checklist |
| `/checklists/:id/edit` | editar checklist |
| `/checklists/:id/execute` | executar checklist |
| `/checklists/:id/contagem` | contagem |
| `/checklists/:id/historico` | histórico |
| `/checklists/:id/details` | detalhes |
| `/team` | equipe |
| `/notifications` | notificações |
| `/ai-evidence-analyses` | análises de IA |
| `/configurations` | configurações atuais |
| `/settings` | rota de configurações mantida por compatibilidade |
| `/courses` | cursos |
| `/courses/:id/modules` | módulos do curso |
| `/help` | ajuda |
| `/ideas` | ideias e sugestões do workspace atual |
| `/news` | novidades visíveis ao usuário |

### Autorização atual

O frontend usa `ProtectedRoute` para exigir sessão e vínculo com workspace.
Capacidades por rota ainda devem ser tratadas como contrato em evolução.
RLS e funções protegidas do Supabase continuam sendo a autoridade; esconder um
item de menu nunca é prova suficiente de autorização.

## 2. Master da Plataforma

Base:

```text
https://ritmikapp.netlify.app/master
```

Função atual:

- administrar novidades globais ou destinadas a um workspace;
- listar workspaces disponíveis para segmentação;
- criar rascunho;
- editar conteúdo;
- publicar ou despublicar.

Arquivos principais:

- `client/src/pages/MasterAdmin.jsx`
- `client/src/styles/master-admin.css`
- `client/src/hooks/usePlatformAdmin.js`
- `supabase/scripts/master/master.md`

Autorização:

- o frontend consulta `usePlatformAdmin`;
- o backend valida privilégio master;
- a conta comum não deve obter dados master por chamada REST direta;
- a conta master é mantida pelos scripts canônicos em
  `supabase/scripts/master/`.

## 3. Curadoria central de sugestões

Base:

```text
https://ritmikapp.netlify.app/platform/ideas
```

Função atual:

- consolidar sugestões de todos os workspaces;
- filtrar por cliente, status, prioridade e texto;
- mostrar autor e votos;
- alterar status e prioridade;
- registrar nota interna de curadoria.

Arquivos principais:

- `client/src/pages/PlatformIdeasAdmin.jsx`
- `client/src/styles/platform-ideas-admin.css`
- `client/src/hooks/usePlatformAdmin.js`
- `supabase/migrations/20260728234500_platform_ideas_curation.sql`

Autorização:

- somente administrador de plataforma;
- consulta cross-workspace ocorre por RPC protegida;
- usuário QA/cliente sem privilégio master deve receber bloqueio do backend.

## 4. App de Operação

URL publicada e certificada:

```text
https://ritmikapp.netlify.app/app
```

Host dedicado reservado:

```text
https://ritmika-app.netlify.app/
```

Estado real:

- o produto operacional já está servido em `/app` no site atual;
- login operacional, atribuição, execução, evidência obrigatória, retomada,
  conclusão, aviso, histórico, bloqueio de rota de gestão, perfil e logout
  passaram no gate de produção em 29 de julho de 2026;
- o segundo site Netlify, manifest próprio e host dedicado continuam planejados
  e não devem ser apresentados como publicados.

Documento de implementação:

- `ROADMAP-APP-FUNCIONARIO.md`
- `APP-FUNCIONARIO-VISUAL-BRIEF.md`

Navegação planejada:

- Hoje
- Tarefas
- Histórico
- Notificações
- Perfil

Critério mínimo para publicar o host dedicado:

1. segundo site Netlify identificado por site ID;
2. bundle operacional servido;
3. login de uma conta operacional;
4. rota administrativa bloqueada no frontend e no backend;
5. execução real de tarefa;
6. teste em celular e desktop;
7. PWA própria com manifest e `start_url` independentes.

## 5. Como verificar sem depender de memória

### Rotas do frontend

Fonte:

```text
client/src/App.jsx
```

### Operação master

Mapa:

```text
supabase/scripts/master/master.md
```

### Identidade, contas e memberships

Mapa:

```text
supabase/scripts/auth/auth.md
```

### Estado do App do Funcionário

Mapa:

```text
ROADMAP-APP-FUNCIONARIO.md
```

### Regra de atualização

Qualquer alteração de:

- domínio;
- base path;
- rota;
- produto inicial por papel;
- autorização;
- site Netlify;
- PWA ou `start_url`;

deve atualizar este arquivo no mesmo commit. Uma URL só pode mudar de
`planejada` para `publicada` depois de prova no endereço servido.

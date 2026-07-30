# Roadmap de migração total para Tailwind

## Objetivo

Migrar toda a interface do Ritmika para React + Tailwind, removendo o CSS manual de produto e mantendo o comportamento existente, as URLs públicas, os contratos do Supabase e a separação entre:

- portal de gestão desktop e responsivo;
- portal de gestão em viewport móvel;
- aplicação operacional para quem executa atividades;
- área master de administração do produto.

“Sem CSS” neste roadmap significa sem folhas CSS manuais da aplicação. O Tailwind continuará gerando CSS compilado no build, como qualquer solução web.

## Situação inicial registrada

- Existem camadas CSS sobrepostas no fluxo de execução, incluindo `checklist-workspace.css`, `execution-delight.css` e `execution-focus.css`.
- O fluxo operacional móvel já apresentou conflito entre `sticky`, largura útil, dock de navegação, evidências e quebra de texto.
- A migração deve preservar o contrato funcional: responder itens, salvar progresso, anexar evidências, navegar entre itens e concluir somente quando as regras permitirem.
- A URL atual do portal de gestão não pode mudar durante a migração.

## Regras arquiteturais da migração

1. Depois do início da Fase 1, nenhum CSS manual novo entra no produto.
2. Nenhuma tela será convertida por busca e substituição cega de classes.
3. Cada fatia migrada precisa passar por DOM, acessibilidade, build e inspeção visual nos breakpoints definidos.
4. Componentes compartilhados usam APIs tipadas e variantes explícitas, preferencialmente com `cva` e `tailwind-merge` se o projeto já os suportar.
5. Tokens de cor, espaçamento, tipografia, raio, sombra e z-index ficam centralizados no tema Tailwind.
6. Valores arbitrários só podem ser usados quando representam uma medida real do produto e devem ser documentados no componente.
7. Não haverá dependência de ordem entre arquivos CSS para decidir qual regra vence.
8. O legado só é removido depois que a tela migrada tiver paridade funcional e visual registrada.
9. A aplicação deve continuar escalável para qualquer tipo de estabelecimento. Nenhum componente novo pode hardcodar restaurante, funcionário ou outro domínio específico.
10. Produção permanece protegida: mudanças entram por fatia, com rollback simples e sem alterar dados reais.

## Fases

### Fase 0. Congelamento e inventário

Objetivo: impedir que a dívida aumente enquanto a migração é preparada.

Entregas:

- inventário de todos os imports CSS, folhas, seletores globais e media queries;
- mapa de telas, componentes, rotas e estados;
- lista de componentes que serão preservados como contrato funcional;
- baseline de screenshots e medidas para desktop, tablet e celular;
- regra de lint ou check que falhe quando uma nova tela importar CSS manual;
- definição de um único ponto de entrada do Tailwind.

Critério de saída: não existir tela sem responsável, estado ou breakpoint de validação.

### Fase 1. Fundação Tailwind e design tokens

#### Implementado em 2026-07-29

- `client/package.json` agora inclui `tailwindcss@4.3.3`, `@tailwindcss/vite@4.3.3` e `tailwindcss-mcp-server@0.1.1` como dependências de desenvolvimento.
- `client/vite.config.js` usa o plugin oficial `@tailwindcss/vite`.
- `client/src/index.css` importa Tailwind v4 e expõe os tokens existentes, mais os tokens do shell de gestão, pelo tema Tailwind.
- `.cursor/mcp.json` aponta o editor para o bin local `tailwindcss-server` via pnpm.
- O shell compartilhado de gestão (`client/src/components/Layout.jsx`) foi migrado para utilities Tailwind e deixou de importar `client/src/styles/layout.css`.
- O skeleton compartilhado de carregamento (`client/src/components/RouteSkeleton.jsx`) foi migrado para utilities Tailwind e deixou de importar `client/src/components/route-skeleton.css`.
- O shell operacional (`client/src/components/employee/EmployeeLayout.jsx`) e o cabeçalho de atividades (`client/src/pages/employee/EmployeeHome.jsx`) foram migrados para utilities Tailwind e deixaram de importar `employee-navigation.css`.
- O shell operacional deixou de depender do import de `employee.css`; seus tokens agora vivem no tema Tailwind.
- O conteúdo do `EmployeeHome` foi migrado para utilities Tailwind: hero, métricas, progresso, prioridade, busca, filtros, loading, erro, vazio e cards de atividade.
- O `EmployeeHome` deixou de importar `employee.css` e `operation-polish.css`; os estilos específicos desta tela agora ficam no JSX, sem dependência de ordem entre folhas CSS.
- `EmployeeNotifications.jsx` foi migrado para utilities Tailwind, incluindo cabeçalho, refresh, loading, erro, vazio, lista responsiva e ação de marcar como lido.
- `EmployeeNotifications.jsx` deixou de importar `employee.css`; a invalidação do cache após marcar como lido e o logging de erro foram preservados.
- `EmployeeHistory.jsx` foi migrado para utilities Tailwind, incluindo cabeçalho, resumo, loading, erro, vazio, lista de execuções e KPIs responsivos.
- `EmployeeHistory.jsx` deixou de importar `employee.css`; isolamento por workspace/perfil, retry e rastreabilidade de erro foram preservados.
- `EmployeeProfile.jsx` foi migrado para utilities Tailwind, incluindo identidade, permissões, formulário de senha, feedback e logout.
- `EmployeeProfile.jsx` deixou de importar `employee.css` e `employee-password.css`; o fluxo de senha agora reseta o estado em exceções e o logout bloqueia acionamento duplicado.
- A primeira subfatia de `ChecklistExecutionWorkspace.jsx` foi migrada: retorno, título, subtítulo e metadados do cabeçalho agora usam utilities Tailwind, preservando `backPath`, `titleOf` e os estados exibidos.
- A folha antiga permanece no repositório como rollback durante a migração, mas não participa mais do bundle desse shell.

#### Provas

- Vite direto: passou com 2.506 módulos transformados nesta fatia.
- ESLint isolado de `client/src/pages/employee/EmployeeHome.jsx`: passou.
- ESLint isolado de `client/src/pages/employee/EmployeeNotifications.jsx`: passou.
- Vite direto após a fatia de notificações: passou com 2.506 módulos transformados.
- ESLint isolado de `client/src/pages/employee/EmployeeHistory.jsx`: passou.
- Vite direto após a fatia de histórico: passou com 2.506 módulos transformados.
- ESLint isolado de `client/src/pages/employee/EmployeeProfile.jsx`: passou.
- Vite direto após a fatia de perfil: passou com 2.504 módulos transformados.
- ESLint isolado de `client/src/components/ChecklistExecutionWorkspace.jsx`: passou.
- Vite direto após a subfatia do cabeçalho de execução: passou com 2.504 módulos transformados.
- ESLint isolado de `client/src/components/Layout.jsx`: passou.
- Bin MCP local: `client/node_modules/.bin/tailwindcss-server` presente.
- Protocolo MCP local: `initialize` e `tools/list` passaram, expondo as 8 tools do servidor; uma chamada real a `convert_css_to_tailwind` também respondeu e explicitou os estilos sem equivalente direto.

#### Lacunas conhecidas

- O `pnpm run build` ainda aciona a aprovação de scripts para `core-js` e `esbuild`; a mesma compilação passou chamando o binário do Vite diretamente.
- As demais telas ainda importam folhas CSS manuais e precisam ser migradas por fatia.

Objetivo: criar uma base única, tipada e previsível.

Entregas:

- configuração Tailwind com tokens do Ritmika;
- escalas de spacing, radius, shadow, typography e z-index;
- paleta white mode e estados semânticos: success, warning, danger, info, muted;
- tokens de foco, disabled, loading e reduced motion;
- utilitários `cn` e composição de variantes;
- primitives acessíveis: `Button`, `IconButton`, `Input`, `Select`, `Textarea`, `Badge`, `Card`, `Dialog`, `Tabs`, `Skeleton`, `Toast` e `EmptyState`;
- contrato de breakpoints orientado ao conteúdo, não ao dispositivo.

Critério de saída: primitives têm nomes acessíveis, foco visível, estados de teclado e testes básicos.

### Fase 2. Shell compartilhado

Objetivo: remover os maiores vazamentos globais antes de converter as telas.

Migrar:

- layout raiz;
- cabeçalho;
- navegação lateral;
- navegação inferior operacional;
- perfil e menus;
- overlays, dropdowns, toasts e dialogs;
- loading global e recuperação de erro;
- suporte à viewport móvel e safe areas.

Critério de saída: nenhuma navegação cria scroll horizontal, o perfil/logout fica no lugar esperado e overlays fecham por clique externo e Escape quando aplicável.

### Fase 3. Aplicação operacional, mobile-first

Esta é a primeira fatia de produto e a prioridade máxima.

Migrar:

- login operacional;
- início com resumo das atividades;
- tela separada de atividades;
- execução item a item;
- estados `pendente`, `feito`, `não feito` e `não se aplica`;
- progresso e trilha de itens;
- anexos e evidências;
- salvar, retry, erro e retomada;
- histórico;
- avisos;
- perfil e logout dentro do perfil;
- bottom bar fixa sem sobrepor conteúdo.

Critérios visuais obrigatórios:

- nenhum card pode ultrapassar a largura útil;
- título e respostas não podem quebrar por caractere;
- dock de ação não pode cobrir respostas ou anexos;
- header não pode cobrir o primeiro conteúdo;
- botão primário precisa permanecer tocável sem esconder o contexto;
- loading, erro, sucesso e estado vazio precisam ter tratamento próprio.

Critério de saída funcional: criar uma execução isolada, responder todos os tipos suportados, anexar evidência, salvar, recarregar, retomar e concluir com dados persistidos.

### Fase 4. Portal de gestão

Migrar sem alterar a URL atual:

- dashboard e seus filtros;
- cards e gráficos;
- lista de atividades/checklists;
- criação e edição de checklist;
- agenda, recorrência, atribuição, localização e horário;
- usuários, papéis e unidades;
- notificações;
- análises;
- configurações;
- novidades;
- exportações e ações em massa.

Regras de responsividade:

- desktop usa tabelas e painéis densos quando isso ajuda a gestão;
- mobile usa cards, filtros em drawer e ações por menu contextual;
- nenhuma tabela força scroll horizontal sem uma alternativa de leitura;
- edição ocorre em dialog ou fluxo dedicado conforme a complexidade, nunca em uma planilha improvisada.

Critério de saída: gestor consegue criar uma atividade, atribuí-la, visualizar a execução operacional, revisar evidências e interpretar o resultado em desktop e viewport móvel.

### Fase 5. Área master

Migrar a área master separadamente, sem misturar permissões de tenant com o portal do cliente.

Entregas:

- shell master próprio;
- clientes/workspaces;
- usuários e papéis administrativos;
- novidades com rascunho, publicação, agendamento e segmentação;
- auditoria de ações;
- suporte e telemetria;
- estados de erro e recuperação sem expor segredos.

Critério de saída: master consegue publicar uma novidade para o público autorizado sem alterar diretamente a experiência de gestão do cliente.

### Fase 6. Migração de dados visuais e estados

Objetivo: garantir que a troca de UI não esconda problemas de estado.

Validar em cada tela:

- loading inicial e refresh;
- cache local válido;
- atualização após mutation;
- broadcast/realtime e fallback de polling;
- retry com mensagem acionável;
- sessão expirada;
- permissão insuficiente;
- vazio real;
- dados parcialmente carregados;
- erro de rede e recuperação.

Critério de saída: toda tela tem sinal claro de estado, origem da falha quando possível e correlação nos logs sem mensagem genérica.

### Fase 7. Remoção controlada do CSS legado

Ordem de remoção:

1. estilos exclusivos da operação migrada;
2. estilos exclusivos do shell;
3. estilos de gestão por módulo;
4. estilos master;
5. folhas globais restantes;
6. imports, classes mortas e dependências sem uso.

Cada remoção precisa ter:

- diff pequeno;
- build limpo;
- busca de referências restantes;
- screenshot comparativo;
- rollback claro.

Critério de saída: nenhum CSS manual de produto restante, exceto uma eventual integração de terceiro explicitamente isolada e documentada.

### Fase 8. Certificação e governança

Adicionar ao CI:

- typecheck;
- build de produção;
- teste de rotas públicas;
- teste de acessibilidade dos primitives;
- teste de overflow horizontal em viewports críticas;
- verificação de imports CSS proibidos;
- smoke operacional autenticado com fixture QA;
- comparação visual das telas críticas;
- checagem de bundle e regressão de performance.

## Ordem de execução recomendada

```text
Fundação Tailwind
        |
        v
Shell compartilhado
        |
        +--> Operação mobile-first --> certificação fim a fim
        |
        +--> Gestão desktop/mobile --> certificação gestor-operador
        |
        +--> Master                 --> certificação publicação
        |
        v
Remoção do legado + CI + documentação
```

## Estratégia de branches e release

- `main` continua sendo a linha publicada.
- Migração ocorre em branch própria por fatia, não em uma grande troca indivisível.
- Cada fatia tem um commit revertível e uma evidência visual.
- A URL do gestor permanece inalterada.
- Mudanças de rota ou comportamento de autenticação só entram com teste autenticado específico.
- Dados reais do cliente não são usados como fixture de migração.

## Critério final de pronto

A migração só termina quando:

- todas as telas usam primitives e classes Tailwind;
- não existem imports de CSS manual do produto;
- os dois portais móveis não têm overflow horizontal;
- execução operacional foi validada do login à conclusão com evidência;
- gestão cria, atribui, acompanha e revisa a execução;
- master publica novidades com autorização;
- acessibilidade, loading, erro, retry e reduced motion estão cobertos;
- build, typecheck, testes e inspeção visual passam;
- documentação de cada pasta e agente foi atualizada.

## Estimativa de esforço

Para uma migração completa e certificada, a estimativa é de 50–90 horas, divididas em aproximadamente 7–12 dias úteis. A operação mobile deve ser concluída primeiro, em cerca de 2–3 dias, antes de converter o restante. O prazo aumenta se a migração for feita simultaneamente com novas features ou sem congelar o CSS legado.

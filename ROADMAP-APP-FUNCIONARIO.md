# Roadmap canônico: app do funcionário

## Decisão fixa

- Painel gestor em produção: `https://ritmikapp.netlify.app/`
- Essa URL, suas rotas e o fluxo atual do gestor não serão alterados.
- App do funcionário: segundo site Netlify, recomendado `https://ritmika-app.netlify.app/` se o nome estiver disponível.
- O app do funcionário não é definido por viewport. Ele poderá abrir em celular, tablet ou computador.
- A seleção do produto será determinada por conta, papel e permissões.
- Os dois produtos usarão o mesmo Supabase e o mesmo modelo multiempresa.

## Vocabulário canônico de produto

- `Portal do Gestor`: produto administrativo atual, responsivo, mantido em `https://ritmikapp.netlify.app/`.
- `App do Funcionário`: produto operacional separado, também responsivo; “app” identifica a função do produto, não o tamanho da tela.
- `Master da Plataforma`: produto interno da Ritmika para administrar clientes, acessos, publicação de novidades e operação global.
- `desktop`, `tablet` e `celular`: apenas viewports suportadas por cada produto. Nunca determinam papel, permissão ou destino do usuário.
- A conta autenticada e suas capacidades escolhem o produto permitido. CSS responsivo nunca substitui autorização.

## Estado comprovado em 2026-07-28

- Existem 17 perfis no banco.
- Existem apenas 2 contas no Supabase Auth: QA e gestor do cliente.
- Existem 15 perfis operacionais sem conta de autenticação.
- O frontend atual tem um único `ProtectedRoute`, um único `Layout` e não bloqueia rotas por papel.
- O login atual sempre direciona para `/`.
- A execução de checklist já existe, mas ainda está dentro do produto do gestor.

## Arquitetura-alvo

### Produto gestor

- URL: `https://ritmikapp.netlify.app/`
- Público: `owner`, `admin` e `manager` conforme capacidades.
- Responsabilidades: dashboard, cadastros, equipes, configurações, análises, criação e administração de checklists.
- Deve continuar responsivo em desktop e celular.

### Produto funcionário

- URL: `https://ritmika-app.netlify.app/`
- Público: `operator` e `employee`, ou papéis equivalentes mapeados para capacidades operacionais.
- Responsabilidades: tarefas atribuídas, execução, evidências, histórico próprio, notificações e perfil.
- Interface mobile-first, mas totalmente funcional em desktop.
- PWA própria, com nome, ícone, `start_url`, cache e atualização independentes.

### Direção de experiência do funcionário

- A página inicial deve responder imediatamente: o que preciso fazer agora, o que está atrasado e como iniciar.
- Usar cards de resumo para tarefas totais, concluídas, em andamento e pendentes, sempre derivados de dados reais do usuário autenticado.
- Exibir progresso semanal, próximos prazos, lembretes e sequência de tarefas com ações diretas; não copiar métricas de projetos que não pertencem ao domínio Ritmika.
- Priorizar uma ação principal por card, áreas de toque confortáveis e leitura rápida durante a operação em campo.
- No celular, usar navegação operacional compacta e conteúdo em uma coluna. No desktop, aproveitar a largura com grade, painel lateral e análises sem transformar o produto no Portal do Gestor.
- O funcionário vê apenas o próprio escopo e as unidades/setores autorizados. Controles administrativos permanecem fora deste produto.
- Estados obrigatórios: carregando, vazio, offline, sincronizando, concluído, atrasado, bloqueado, erro recuperável e conflito de atualização.
- A identidade visual pode reutilizar os cards limpos, verde institucional, gráficos orgânicos e hierarquia da referência, mantendo contraste, acessibilidade e whitemode.

## Fase 0: proteção do gestor

1. Registrar o hash publicado e executar smoke autenticado do gestor.
2. Certificar login, dashboard, checklists, configurações e logout.
3. Criar teste que falha se a URL principal redirecionar para o app operacional.
4. Proibir mudanças de domínio, base path ou roteamento do gestor durante a separação.

Critério de saída: o painel atual continua funcionando no mesmo endereço antes e depois da criação do segundo site.

## Fase 1: contrato de identidade e autorização

1. Definir capacidades, sem hardcode por segmento de negócio:
   - `workspace.manage`
   - `people.manage`
   - `checklists.design`
   - `executions.assign`
   - `executions.perform`
   - `executions.review_own`
   - `analytics.view`
   - `settings.manage`
2. Mapear papéis existentes para capacidades.
3. Definir o produto inicial de cada papel.
4. Criar guardas compartilhados de capacidade no frontend e no backend.
5. Nunca confiar somente no redirecionamento do frontend; RLS permanece como autoridade.

Critério de saída: uma matriz automatizada comprova quais ações cada papel pode executar.

## Fase 2: segundo frontend e segundo deploy

1. Manter o código em um monorepo com pacotes compartilhados de autenticação, domínio e componentes.
2. Criar entrada independente para o app operacional.
3. Criar segundo site Netlify apontando para a entrada operacional.
4. Configurar variáveis próprias sem copiar segredos para o Git.
5. Configurar redirects SPA, headers, CSP e fallback de assets do segundo site.
6. Criar manifest e service worker exclusivos do app operacional.

Critério de saída: os dois sites publicam independentemente e uma publicação operacional não invalida chunks do gestor.

## Fase 3: contas dos funcionários

1. Gerar relatório dos 15 perfis sem `auth_user_id`.
2. Confirmar e normalizar e-mail ou identificador de acesso de cada funcionário.
3. Criar contas por convite ou senha temporária, nunca copiando senhas do Koncluí.
4. Vincular cada conta a:
   - workspace correto;
   - perfil existente;
   - papel operacional;
   - unidades permitidas;
   - setores e atribuições aplicáveis.
5. Exigir troca de senha ou recuperação no primeiro acesso quando aplicável.
6. Tornar o processo idempotente e executável por script canônico.

Critério de saída: os 15 funcionários possuem estado explícito entre `sem acesso`, `convidado`, `ativo`, `bloqueado` ou `desativado`.

## Fase 4: RLS e backend

1. Funcionário visualiza somente o workspace ao qual pertence.
2. Funcionário visualiza somente execuções atribuídas a ele ou permitidas pela unidade/setor.
3. Funcionário não acessa configurações, gestão de usuários, faturamento, API ou edição de modelos.
4. Gestor mantém a visão administrativa autorizada.
5. Evidências e arquivos usam caminhos tenant-scoped e políticas equivalentes no Storage.
6. Toda mutação operacional registra usuário, workspace, execução, horário e correlação.
7. Criar testes positivos e negativos para cada política.

Critério de saída: chamadas REST diretas feitas por um funcionário não conseguem ultrapassar suas permissões.

## Fase 5: UX do app operacional

### Navegação principal

- Hoje
- Tarefas
- Histórico
- Notificações
- Perfil

### Tela Hoje

- Saudação e contexto da unidade/turno.
- Próxima tarefa em destaque.
- Resumo de pendentes, atrasadas e concluídas.
- Continuação de execução interrompida.
- Estado offline e última sincronização visíveis.

### Execução

- Um item por vez ou seções progressivas.
- Descrição sem HTML.
- Evidência por câmera, galeria ou arquivo conforme regra.
- Validação clara de obrigatório, não se aplica e pendência.
- Salvamento automático local e remoto.
- Retomada, erro, retry, envio e confirmação final.

### Histórico e perfil

- Histórico próprio, filtrável e compreensível.
- Evidências e respostas permitidas pela política.
- Perfil, unidade, papel, senha e sessão.

Critério de saída: um funcionário conclui uma tarefa real sem acessar qualquer superfície administrativa.

## Fase 6: roteamento e experiência entre produtos

1. Login no site do gestor:
   - gestor entra normalmente;
   - funcionário recebe link claro para abrir o app operacional.
2. Login no app operacional:
   - funcionário entra no app;
   - gestor pode ser direcionado ao painel gestor, sem perder a sessão.
3. Digitar uma URL administrativa com conta operacional resulta em bloqueio autorizado, nunca em tela branca.
4. Expiração de sessão, troca de workspace e logout funcionam independentemente em cada produto.

Critério de saída: nenhum papel cai no produto errado após login, refresh ou deep link.

## Fase 7: QA e publicação

1. Criar contas QA separadas para gestor e funcionário.
2. Testar desktop e mobile nos dois produtos.
3. Executar matriz de rotas, RLS, upload, offline, retomada e atualização de frontend.
4. Pilotar com um funcionário antes de ativar os demais.
5. Ativar por ondas e manter rollback do app operacional sem alterar o painel gestor.
6. Monitorar erros por produto, versão, rota e papel sem registrar credenciais.

Critério de saída: piloto aprovado, zero acesso cruzado e nenhuma regressão no endereço do gestor.

## Ordem executável

1. Certificação do gestor.
2. Matriz de capacidades.
3. Segundo frontend e site Netlify.
4. RLS e guards.
5. App operacional mínimo.
6. Conta piloto de funcionário.
7. QA diferencial.
8. Ativação dos demais funcionários.

## Fora de escopo desta separação

- Alterar a URL atual do gestor.
- Transformar viewport mobile em critério de autorização.
- Criar regras específicas para restaurante no núcleo do produto.
- Criar automaticamente contas sem identificador de acesso válido.
- Reutilizar ou extrair senhas pessoais do sistema de origem.

# Registro contínuo de achados

Status: obrigatório para manutenção
Atualizado em: 2026-07-28

## Regra

Nenhum achado de interface, experiência, backend, integração, banco de dados,
segurança, performance ou entrega pode terminar apenas em uma conversa, log ou
memória de agente.

Para cada achado:

1. Registrar evidência observável, rota ou fluxo, impacto e prioridade.
2. Corrigir imediatamente quando o risco for baixo e a causa estiver provada.
3. Quando não for corrigir agora, acrescentar o item ao roadmap apropriado:
   UI-ROADMAP.md, UX-ROADMAP.md ou um roadmap técnico criado para a frente.
4. Marcar a condição de aceite e a prova necessária para fechar o item.
5. Após qualquer mudança, atualizar o registro com o resultado real, não com
   uma expectativa.

Um build verde, HTTP 200 ou aparência plausível não encerra um achado de
produção. O item só é fechado com a prova correspondente ao risco.

## Evidência de produção

| Data | Evidência | Resultado |
| --- | --- | --- |
| 2026-07-28 | Commit 2dc75b5 enviado para main e bundle index-DCIJuwv3.js servido por https://ritmikapp.netlify.app | Deploy Git conectado confirmado no domínio publicado |
| 2026-07-28 | DOM da tela de login: formulário, campos Email e Senha com labels associados e botão Entrar habilitado | Login público renderizado sem erro de runtime observado |
| 2026-07-28 | Abertura de /checklists sem sessão | Redirecionamento para /login confirmado, sem acesso indevido |

Lacuna ativa: a sessão controlada não possui credencial QA autenticada. Fluxos
com dados, escrita e responsividade de Checklists, Notificações, Cursos,
Unidades e Setores não devem ser marcados como testados até usar uma conta QA.

## Achados abertos

| ID | Área | Evidência | Prioridade | Próxima ação e aceite |
| --- | --- | --- | --- | --- |
| PERF-001 | UI e performance | Build local de 2026-07-28 gerou bundle principal de aproximadamente 1,16 MB minificado e 345 KB gzip | P2 | Separar rotas pesadas e medir carregamento e primeira interação no domínio publicado |

## Achados corrigidos, aguardando prova visual autenticada

| ID | Área | Correção local | Prova pendente |
| --- | --- | --- | --- |
| UX-CHK-001 | Checklists | Ações de card protegidas contra overflow; filtros e execução foram reorganizados | Validar em 1280x800 com sessão QA |
| UX-CRS-001 | Cursos | Conteúdo em bloco deixa de mostrar JSON bruto | Abrir aula real em produção |
| UX-NOT-001 | Notificações | Inbox compacta, filtros progressivos e rótulos de domínio | Validar em lista preenchida em produção |
| UX-SET-001 | Unidades e Setores | Formulários de criar e editar agora são progressivos | Criar, cancelar e editar entidade QA |
| UX-HLP-001 | Ajuda | Estados sem canal oferecem orientação e tutorial | Validar com configuração ausente e presente |

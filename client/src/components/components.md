# components.md

Componentes de layout, construção, execução e detalhe de checklists.

## Arquivos

- Layout.jsx: shell autenticado, navegação, estrutura visual e atalho de teclado para o conteúdo principal.
- RouteSkeleton.jsx: skeleton acessível e reutilizável para carregamento de rotas, listas, formulários e áreas de gestão/operação.
- route-skeleton.css: geometria responsiva, pulsação por opacidade e suporte a movimento reduzido do skeleton compartilhado.
- ChecklistBuilder.jsx: fluxo local de criação/edição de checklist.
- ChecklistBuilderWorkspace.jsx: workspace visual do builder.
- ChecklistWorkspace.jsx: workspace de checklist e ações operacionais.
- ChecklistDetails.jsx: detalhe da execução no fluxo local legado.
- ChecklistDetailsRemote.jsx: detalhe de execução usando dados remotos.
- ChecklistExecution.jsx: fluxo local legado de execução.
- ChecklistExecutionWorkspace.jsx: execução remota, respostas e evidências.
- OfflineSync.jsx: sincronização e suporte ao modo offline.

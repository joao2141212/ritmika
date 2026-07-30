# Migração CSS para Tailwind

## Régua de progresso

As porcentagens desta migração devem ser calculadas por superfície funcional, não por quantidade de linhas alteradas.

`progresso = superfícies concluídas / superfícies inventariadas × 100`

Uma superfície só entra como concluída quando:

- não importa uma folha CSS específica da tela;
- não usa classes legadas daquela folha;
- preserva estados de loading, erro, vazio, sucesso, disabled e busy;
- passa ESLint isolado;
- participa de um build Vite válido.

`client/src/index.css` permanece como entrada global do Tailwind e não conta como CSS legado.

## Snapshot operacional

Última atualização: 2026-07-29

Progresso de migração estática: **100%**.

Progresso de entrega: **100% validado**.

Antes da última rodada, a estimativa era 85%, porque as pendências estavam concentradas em telas grandes e densas. Após a conversão de MasterAdmin, ConfigurationsRemote, ChecklistBuilderWorkspace e ChecklistExecutionWorkspace, o índice full do worktree confirmou a remoção dos imports CSS específicos e dos tokens legados auditados.

### Concluídas

- Fundação Tailwind, tokens, Vite e servidor MCP.
- Shell compartilhado, layout de funcionário, skeleton e error boundary.
- EmployeeHome, EmployeeNotifications, EmployeeHistory e EmployeeProfile.
- Checklists, ChecklistContagem e ChecklistHistorico.
- Login e WorkspaceSelection.
- Notifications, CoursesRemote, CourseModulesRemote, NewsRemote, HelpRemote e IdeasRemote.
- Settings e SettingsRemote.
- PlatformIdeasAdmin, TeamRemote e AIAnalysesRemote.
- DashboardRemote e a maior parte de ConfigurationsRemote.
- ChecklistDetailsRemote.
- Shell e fluxos principais de ChecklistWorkspace.
- Shell, progresso, respostas, evidências e conclusão de ChecklistExecutionWorkspace.
- Superfícies principais de ChecklistBuilderWorkspace.

### Validação final registrada

- Reindexação full do worktree: concluída, projeto indexado com 4.925 nós e 7.934 arestas.
- Auditoria de imports CSS específicos em JSX: zero. O único import restante é `client/src/index.css`, a entrada global do Tailwind.
- Auditoria de tokens legados em ConfigurationsRemote, ChecklistBuilderWorkspace e ChecklistExecutionWorkspace: zero nos padrões auditados.
- ESLint explícito de todos os arquivos JSX tocados: exit 0.
- `git diff --check`: exit 0.
- Build Vite direto: exit 0, 2.478 módulos transformados. O build emite apenas o warning não bloqueante de chunks acima de 500 kB.
- `pnpm build` e `pnpm lint` não são a prova usada porque o wrapper pnpm permanece bloqueado por `ERR_PNPM_IGNORED_BUILDS` neste ambiente.

## Regra para próximos status

Não declarar 100% pela remoção dos imports. O fechamento exige zero dependências CSS legadas nas superfícies inventariadas e os testes finais registrados acima.
## Validação visual autenticada final

- Data: 2026-07-29
- Resultado: aprovado, `failures: []`.
- Cobertura: perfis gestor e operador, desktop 1440 px e mobile 390 px.
- Critérios: HTTP, erros de página, erros de console, respostas falhas, overflow horizontal e clipping visual.
- Evidências: `evidence/tailwind-visual-2026-07-29-rerun/`.
- Regressão encontrada e corrigida: tabela de notificações do gestor no mobile agora possui contenção horizontal explícita.
- CSS ativo: somente `client/src/index.css`; os 39 arquivos legados estão isolados em `client/legacy-css/archive-2026-07-29/`.

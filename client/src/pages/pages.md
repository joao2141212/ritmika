# pages.md

Telas roteadas do aplicativo conectado ao Supabase.

## Arquivos

- Login.jsx: entrada e autenticação Supabase.
- DashboardRemote.jsx: dashboard remoto com filtros temporais.
- ChecklistContagem.jsx: fluxo remoto de contagem.
- ChecklistHistorico.jsx: histórico remoto de execuções.
- ChecklistDetailsRemote.jsx: detalhe remoto do checklist e evidências.
- Notifications.jsx: central remota de notificações.
- TeamRemote.jsx: hub remoto de pessoas, acesso e desempenho, com busca, filtros e entrada para manutenção de usuários.
- ConfigurationsRemote.jsx: configurações, usuários, empresas/unidades, setores e integrações; aceita `?tab=users&user=<id>` para abrir manutenção a partir da Equipe.
- SettingsRemote.jsx: configurações remotas.

Os workspaces roteados de checklist ficam em `components/`: listagem,
builder e execução usam `checklistProducaoService` e
`remoteChecklistRepository`.

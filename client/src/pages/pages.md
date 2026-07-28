# pages.md

Telas roteadas do aplicativo conectado ao Supabase.

## Arquivos

- Login.jsx: entrada e autenticação Supabase.
- DashboardRemote.jsx: dashboard remoto com filtros temporais.
- ChecklistContagem.jsx: fluxo remoto de contagem.
- ChecklistHistorico.jsx: histórico remoto de execuções.
- ChecklistDetailsRemote.jsx: detalhe remoto do checklist e evidências.
- Notifications.jsx: central remota de notificações.
- TeamRemote.jsx: equipe remota.
- SettingsRemote.jsx: configurações remotas.

Os workspaces roteados de checklist ficam em `components/`: listagem,
builder e execução usam `checklistProducaoService` e
`remoteChecklistRepository`.

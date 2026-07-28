# data.md

Boundary de dados de produção do Ritmika.

## Arquivos

- remoteChecklistRepository.js: boundary Supabase, mapeamentos, dashboard, execuções, evidências e notificações.
- ../services/checklistProducaoService.js: fachadas de domínio que delegam ao boundary remoto.
- ../../../supabase/migrations/: schema, RLS e contratos persistentes.

O runtime não usa fixtures, `localStorage` de demonstração ou login local.

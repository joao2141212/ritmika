# realtime

Scripts canônicos da sincronização de dados do Ritmika.

## `run.sh`

- `plan`: mostra a migration e a confirmação necessária, sem alterar o banco.
- `status`: consulta a quantidade de triggers e a existência da função de Broadcast.
- `apply`: aplica somente `20260729001820_workspace_realtime_broadcast.sql`; exige a confirmação literal `APPLY:workspace-realtime-broadcast`.

O script usa a Management API com `SUPABASE_ACCESS_TOKEN` e `SUPABASE_PROJECT_REF` carregados do `.env` ignorado. Não imprime credenciais nem o SQL completo.

## Contrato operacional

1. Alterações em tabelas `public.ritmika_*` com `workspace_id` geram Broadcast privado no tópico `workspace:<workspace_id>`.
2. A política de `realtime.messages` permite assinatura apenas a membros daquele workspace.
3. O frontend invalida o cache compartilhado e refaz somente queries ativas.
4. Erro ou timeout do canal ativa polling de 60 segundos somente enquanto a página está visível e online.
5. Ao recuperar `SUBSCRIBED`, o polling é cancelado.

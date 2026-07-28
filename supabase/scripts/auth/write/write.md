# write.md

Operações administrativas mutáveis. Nenhuma delas aplica mudanças sem `--apply`, confirmação exata e, para clientes, `--allow-customer`.

- `reset-password.mjs`: redefine senha pelo Auth Admin; a senha entra somente em `RITMIKA_NEW_PASSWORD` e nunca aparece na saída.
- `set-account-state.mjs`: bloqueia ou desbloqueia login via `ban_duration` oficial do Supabase Auth.
- `set-access.mjs`: sincroniza role, ownership e unidades entre membership e profile; se o profile falhar, tenta restaurar o membership e registra falha parcial crítica se o rollback falhar.
- `run.sh`: carrega o ambiente e impede execução de arquivo fora desta pasta.

Fluxo seguro:

```bash
# 1. dry-run
bash supabase/scripts/auth/run.sh set-access \
  --user-id <uuid> --workspace-id <uuid> \
  --role manager --owner false --managed-units <uuid,uuid>

# 2. repetir com a confirmação exibida
bash supabase/scripts/auth/run.sh set-access \
  --user-id <uuid> --workspace-id <uuid> \
  --role manager --owner false --managed-units <uuid,uuid> \
  --apply --allow-customer --confirm '<confirmacao-literal>'
```

Convites continuam no fluxo autenticado `invite-user` usado pelo frontend, pois ele valida o gestor chamador e cria Auth, membership e profile. Não há script paralelo de convite para evitar duas autoridades de criação concorrentes.

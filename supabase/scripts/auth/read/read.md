# read.md

Operações somente leitura.

- `inventory.mjs`: uma coleta consolidada de Auth, workspaces, memberships e profiles; mostra contagens, roles, ownership e divergências sem expor e-mail completo.
- `account.mjs`: diagnóstico de uma conta por UUID com classe `qa`, `customer` ou `orphan`, vínculo empresarial, role, unidades, confirmação e bloqueio.
- `environment.mjs`: mostra somente host, nome da variável, tipo e tamanho da chave selecionada; nunca imprime a credencial.
- `run.sh`: carrega o `.env`, valida as variáveis administrativas e aceita somente scripts desta pasta.

Exemplos:

```bash
bash supabase/scripts/auth/run.sh inventory
bash supabase/scripts/auth/run.sh account --user-id <uuid>
bash supabase/scripts/auth/run.sh environment
```

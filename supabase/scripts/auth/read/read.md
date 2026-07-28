# read.md

Operações somente leitura.

- `inventory.mjs`: uma coleta consolidada de Auth, workspaces, memberships e profiles; mostra contagens, roles, ownership e divergências sem expor e-mail completo.
- `account.mjs`: diagnóstico de uma conta por UUID com classe `qa`, `customer` ou `orphan`, vínculo empresarial, role, unidades, confirmação e bloqueio.
- `workspace.mjs`: mostra empresa, funcionários, vínculos Auth, roles, ownership, unidades e setores. Contato completo só aparece com `--include-contact`.
- `environment.mjs`: mostra somente host, nome da variável, tipo e tamanho da chave selecionada; nunca imprime a credencial.
- `run.sh`: carrega o `.env`, valida as variáveis administrativas e aceita somente scripts desta pasta.

Exemplos:

```bash
bash supabase/scripts/auth/run.sh inventory
bash supabase/scripts/auth/run.sh account --user-id <uuid>
bash supabase/scripts/auth/run.sh workspace --workspace-id <uuid>
bash supabase/scripts/auth/run.sh environment
```
# `inspect-auth-user.mjs`

- Efeito: somente leitura no Supabase Auth; uma validação opcional cria uma sessão efêmera e encerra a sessão ao final.
- Substitui: consultas avulsas com `psql`, `curl` no Admin Auth, listagem manual de usuários e chamadas diretas ao endpoint de senha.
- Entrada obrigatória: `--user-id <uuid>` ou `--email <email>`.
- Validação opcional: `--verify-login`, lendo credenciais somente pelos nomes de variáveis indicados em `--email-env` e `--password-env`.
- Saída: JSON limitado com identificação do usuário, confirmação, último acesso, resultado da API administrativa e resultado do login. Nunca imprime senha, token ou chave.
- Comando canônico QA:
  `bash supabase/scripts/auth/read/run.sh supabase/scripts/auth/read/inspect-auth-user.mjs --user-id 26e5912f-d442-4d1e-bfa4-dbc5655aa190 --verify-login`
- O runner carrega o `.env` canônico, limita a execução à pasta `read/` e evita comandos Node avulsos bloqueados pelo guard.
- Critério de sucesso: `status=ok`, `adminApi.secretKeyAccepted=true` e, quando solicitado, `login.status=ok`.

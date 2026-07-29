# auth.md

Mapa canônico das operações administrativas de identidade do Ritmika.

## Subpastas

- `lib/lib.md`: cliente administrativo, parsing de CLI e telemetria compartilhada.
- `read/read.md`: inventários e inspeções sem mutação.
- `write/write.md`: reset de senha, bloqueio/desbloqueio e sincronização de acesso.

## Entrada única

```bash
bash supabase/scripts/auth/run.sh inventory
bash supabase/scripts/auth/run.sh account --user-id <uuid>
bash supabase/scripts/auth/run.sh workspace --workspace-id <uuid>
bash supabase/scripts/auth/run.sh reset-password --user-id <uuid>
bash supabase/scripts/auth/run.sh set-access --user-id <uuid> --workspace-id <uuid> --role operator --owner false
bash supabase/scripts/auth/run.sh account-state --user-id <uuid> --action ban
```

Toda escrita começa em dry-run. O dry-run devolve a confirmação literal exigida para `--apply`. Alvos classificados como `customer` também exigem `--allow-customer`. Nenhum comando imprime senha, secret key ou token.

O Koncluí não é alvo destes scripts. Eles operam somente no Supabase do Ritmika.
## Diagnóstico Auth consolidado

- Leitura e validação de credenciais: `read/inspect-auth-user.mjs`.
- Alteração de senha: `run.sh reset-password`, com dry-run, `--apply`, confirmação explícita e senha recebida por `RITMIKA_NEW_PASSWORD`.
- Não usar sequências avulsas de `psql`, `curl` ou comandos Node para manutenção Auth quando esses dois fluxos cobrirem a operação.
# Provisionamento em lote de acessos de um workspace

`write/provision-workspace-logins.mjs` cria, sem enviar e-mail, uma conta Auth para cada perfil ainda não vinculado do workspace informado. O comando:

- é `dry-run` por padrão;
- exige confirmação literal ligada ao workspace e à quantidade pendente;
- usa `app_metadata` para `workspace_id`, `profile_id` e `role`;
- cria membership `operator`, preserva `managed_units` e vincula `ritmika_profiles.auth_user_id`;
- retoma uma execução parcial pelo login determinístico;
- grava senhas temporárias somente num relatório local com permissão `0600`;
- nunca imprime senhas no terminal.

Planejamento:

```bash
bash supabase/scripts/auth/run.sh provision-workspace-logins \
  --workspace-id <uuid>
```

Aplicação em workspace de cliente:

```bash
bash supabase/scripts/auth/run.sh provision-workspace-logins \
  --workspace-id <uuid> \
  --output .env.customer-logins.local \
  --allow-customer \
  --apply \
  --confirm 'PROVISION:<uuid>:<quantidade-pendente>'
```

O arquivo de saída precisa permanecer ignorado pelo Git. As senhas são temporárias e devem ser rotacionadas após a entrega do acesso.

Verificação autenticada, sem expor a credencial:

```bash
bash supabase/scripts/auth/run.sh verify-workspace-login \
  --workspace-id <uuid> \
  --report .env.customer-logins.local
```

O verificador escolhe uma conta provisionada que já possua atribuição, autentica com a chave pública, prova `app_metadata`, membership, profile, tarefas atribuídas e ausência de acesso a outro workspace. A sessão de verificação é encerrada ao final.

Auditoria de todas as credenciais provisionadas:

```bash
bash supabase/scripts/auth/run.sh verify-all-workspace-logins \
  --workspace-id <uuid> \
  --report .env.customer-logins.local
```

Esse comando autentica cada conta individualmente, valida `app_metadata`, membership, profile, isolamento por workspace e encerra todas as sessões abertas durante a auditoria. Nenhum login ou senha é impresso.

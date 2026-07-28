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
bash supabase/scripts/auth/run.sh reset-password --user-id <uuid>
bash supabase/scripts/auth/run.sh set-access --user-id <uuid> --workspace-id <uuid> --role operator --owner false
bash supabase/scripts/auth/run.sh account-state --user-id <uuid> --action ban
```

Toda escrita começa em dry-run. O dry-run devolve a confirmação literal exigida para `--apply`. Alvos classificados como `customer` também exigem `--allow-customer`. Nenhum comando imprime senha, secret key ou token.

O Koncluí não é alvo destes scripts. Eles operam somente no Supabase do Ritmika.

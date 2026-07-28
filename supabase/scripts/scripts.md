# scripts.md

Mapa canonico da pasta `supabase/scripts`.

## Subpastas

- `auth/`: operacoes administrativas de identidade e tenancy no Supabase do
  Ritmika. Cobre inventario de usuarios, empresas, funcionarios, roles,
  reset de senha, bloqueio/desbloqueio e acesso por workspace.

## Entrada recomendada

Use sempre o roteador da subpasta em vez de chamar arquivos internos
diretamente:

```bash
bash supabase/scripts/auth/run.sh inventory
bash supabase/scripts/auth/run.sh account --user-id <uuid>
bash supabase/scripts/auth/run.sh workspace --workspace-id <uuid>
bash supabase/scripts/auth/run.sh reset-password --user-id <uuid>
bash supabase/scripts/auth/run.sh set-access --user-id <uuid> --workspace-id <uuid> --role operator --owner false
bash supabase/scripts/auth/run.sh account-state --user-id <uuid> --action ban
```

## Contrato de seguranca

- `read/` e inventarios sao somente leitura.
- `write/` sempre inicia em dry-run.
- Escrita real exige `--apply` mais `--confirm '<confirmacao-literal>'`.
- Conta de cliente real exige tambem `--allow-customer`.
- Nenhum script deve imprimir segredo, token, senha ou e-mail completo.
- Nenhum script deve enviar mensagem externa.

## Fonte de verdade

O Supabase do Ritmika e o unico alvo mutavel. O Konclui e referencia autorizada
somente leitura para paridade funcional e de dados.

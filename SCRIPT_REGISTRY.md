# SCRIPT_REGISTRY.md

Registro canônico das operações repetíveis do Ritmika. O root operacional é
`supabase/scripts/`. O CBM pode excluir essa pasta do grafo técnico, portanto
agentes devem começar por este arquivo e seguir os mapas `.md` indicados.

## Regras invariantes

- Os scripts operam somente no Supabase do Ritmika. Koncluí é fonte autorizada somente leitura.
- `.env` permanece ignorado pelo Git; nenhum script imprime senha, token ou secret key.
- Leituras são seguras por padrão. Escritas começam em dry-run e exigem confirmação literal.
- Mudanças em conta ou dados de cliente exigem também `--allow-customer` e autorização atual do operador.
- Nenhum script desta árvore envia mensagem externa. Convite por e-mail pertence à Edge Function autenticada `invite-user`.

## Identidade e empresas

Mapa detalhado: `supabase/scripts/auth/auth.md`.

| Classe | Comando | Efeito |
|---|---|---|
| leitura | `bash supabase/scripts/auth/run.sh environment` | valida ambiente sem revelar credenciais |
| leitura | `bash supabase/scripts/auth/run.sh inventory` | consolida Auth, empresas, memberships e profiles |
| leitura | `bash supabase/scripts/auth/run.sh account --user-id <uuid>` | inspeciona uma conta e seus vínculos |
| leitura | `bash supabase/scripts/auth/run.sh workspace --workspace-id <uuid>` | lista empresa, funcionários, roles, unidades e setores |
| mutação protegida | `bash supabase/scripts/auth/run.sh reset-password --user-id <uuid>` | redefine senha usando `RITMIKA_NEW_PASSWORD` |
| mutação protegida | `bash supabase/scripts/auth/run.sh set-access ...` | sincroniza role, ownership e unidades |
| mutação protegida | `bash supabase/scripts/auth/run.sh account-state ...` | bloqueia ou desbloqueia login |

`workspace` mascara contato por padrão. Use `--include-contact` apenas quando a
manutenção exigir PII e a conta estiver no escopo autorizado.

## Banco e schema

Mapa detalhado: `supabase/scripts/db/db.md`.

| Classe | Entrada | Efeito |
|---|---|---|
| leitura | `bash supabase/scripts/db/read/run.sh <arquivo.sql>` | executa apenas SQL de `db/read/` |
| leitura | `verify_operational_state.sql` | contagens e estado operacional consolidado |
| leitura | `verify_security_state.sql` | RLS, policies e bucket privado |
| leitura | `audit_auth_security.sql` | Auth metadata, `SECURITY DEFINER`, `auth.role()` e views |
| leitura | `identity/inspect_identity_tenancy.sql` | empresas, usuários, profiles e vínculos |
| leitura | `identity/verify_identity_integrity.sql` | integridade e isolamento da identidade |
| mutação protegida | `bash supabase/scripts/db/write/run.sh <migration-ou-script>` | aplica somente allowlist de escrita com `RITMIKA_DB_WRITE_CONFIRM=yes` |
| mutação protegida | `apply_historical_evidence_refs.sh` | aplica referências históricas versionadas |
| mutação protegida | `mirror_historical_evidence_media.sh` | espelha mídia idempotente no bucket privado |

## Critério de conclusão

Uma operação só está concluída quando o comando termina com código zero, a
consulta de verificação confirma o estado esperado e nenhuma saída contém
segredo. HTTP aceito, build isolado ou presença de arquivo não certificam o
estado final por si só.

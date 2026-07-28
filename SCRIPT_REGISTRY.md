# SCRIPT_REGISTRY.md

Mapa operacional raiz do Ritmika. Este arquivo existe porque o CBM nao indexa a
arvore `supabase/scripts/` com profundidade suficiente para agentes pequenos
inferirem manutencao de Auth, workspaces, roles e dados sem custo alto.

## Canonico

- Repositorio principal: `/Users/pedroduarte/Documents/ritmika`
- Banco alvo: Supabase do Ritmika
- App publicado: `https://ritmikapp.netlify.app/`
- Referencia externa: Konclui autorizado somente leitura

## Modelo de produto

- Ritmika nao e um app de restaurante. E um app de gestao operacional para
  estabelecimentos, empresas, unidades, setores e equipes.
- Gastronomia, pizzaria, trattoria, cozinha e nomes semelhantes podem aparecer
  como dados reais de um cliente importado, mas nao como identidade global,
  schema global, copy de produto ou regra hardcoded.
- Roles devem ser tratadas como politica configuravel. A Edge Function
  `manage-member` usa defaults seguros, mas aceita `RITMIKA_ASSIGNABLE_ROLES`
  e `RITMIKA_MANAGER_ROLES` para adaptar novos clientes sem criar codigo por
  segmento.

## Scripts de QA visual

- `supabase/scripts/auth/read/production-ui-sweep.mjs`
  - Efeito: leitura Auth/REST e captura local de screenshots em `evidence/`.
  - Uso: `npx --yes dotenv-cli -e .env -- node supabase/scripts/auth/read/production-ui-sweep.mjs`
  - Escopo: usa somente workspace QA `ritmika_qa`; nao muta Konclui.
  - Prova: valida rotas autenticadas em producao desktop/mobile, HTTP, erro JS,
    overflow horizontal e screenshots das telas principais.

## Regras

- Scripts do Ritmika nunca mutam Konclui.
- Scripts de leitura nao imprimem senha, secret key, token ou e-mail completo.
- Scripts de escrita devem iniciar em dry-run e exigir confirmacao literal para
  `--apply`.
- Alvos de cliente real exigem tambem `--allow-customer`.
- Convites por e-mail ficam na Edge Function autenticada, nao em script local
  paralelo.

## Mapas canonicos

- `supabase/scripts/scripts.md`: mapa raiz dos scripts operacionais.
- `supabase/scripts/auth/auth.md`: identidade, Auth, empresas, funcionarios,
  roles, reset de senha, bloqueio/desbloqueio e acesso por workspace.
- `supabase/scripts/auth/read/read.md`: comandos somente leitura.
- `supabase/scripts/auth/write/write.md`: comandos de mutacao com dry-run.
- `supabase/scripts/auth/lib/lib.md`: cliente administrativo e telemetria.
- `supabase/functions/functions.md`: Edge Functions publicaveis.
- `supabase/migrations/migrations.md`: historico e intencao das migracoes.

## Comandos principais

```bash
bash supabase/scripts/auth/run.sh inventory
bash supabase/scripts/auth/run.sh account --user-id <uuid>
bash supabase/scripts/auth/run.sh workspace --workspace-id <uuid>
bash supabase/scripts/auth/run.sh reset-password --user-id <uuid>
bash supabase/scripts/auth/run.sh set-access --user-id <uuid> --workspace-id <uuid> --role operator --owner false
bash supabase/scripts/auth/run.sh account-state --user-id <uuid> --action ban
```

## Gaps que ainda exigem prova runtime

- Deploy Netlify servindo o commit atual.
- Edge Functions publicadas na versao atual.
- Variaveis remotas usando publishable key e secret key modernas.
- QA autenticado completo no browser controlado.
- Reconcilicao de dados reais Konclui -> Ritmika por modulo.
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
## Supabase Auth: inspeção e credenciais

- `supabase/scripts/auth/read/inspect-auth-user.mjs`
  - Classe: leitura; login opcional com sessão efêmera.
  - Consolida descoberta do usuário, e-mail Auth, compatibilidade da secret key e verificação de credencial.
  - Evita repetir consultas SQL, chamadas REST/Admin e testes manuais de senha.
  - Executar somente pelo runner: `bash supabase/scripts/auth/read/run.sh supabase/scripts/auth/read/inspect-auth-user.mjs ...`.
- `supabase/scripts/auth/run.sh reset-password`
  - Classe: mutação protegida por dry-run, `--apply` e confirmação do alvo.
  - A senha nova entra por `RITMIKA_NEW_PASSWORD`; não deve aparecer em argumentos, logs ou documentação.

# read.md

Leituras Supabase agrupadas em uma chamada curta.

## Arquivos

- run.ts: executor TypeScript restrito a SQL permitido; `run.sh` permanece como compatibilidade.
- verify_operational_state.sql: check único de dashboard de 30 dias, schema de evidências, histórico e contagens principais.
- audit_auth_security.sql: detecta triggers de `auth.users`, autorização baseada em metadata editável, `auth.role()`, funções `SECURITY DEFINER` públicas e views sem `security_invoker`; não retorna dados de clientes.
- verify_private_evidence_access.sh: valida que uma evidência privada pode gerar URL assinada sem imprimir a URL.
- verify_private_evidence_access.ts: implementação da prova de acesso ao Storage privado.
## Verificações de segurança

`verify_security_state.sql` faz uma leitura compacta das tabelas Ritmika com RLS, quantidade de policies, escopo por `workspace_id`, tabelas protegidas sem policy e privacidade do bucket `ritmika-evidences`. Não altera o banco.
# `inspect_dashboard_dimensions.sql` descreve as colunas das dimensões de perfis, unidades, setores, momentos e referências dimensionais dos checklists. É somente leitura e não retorna nomes de clientes.

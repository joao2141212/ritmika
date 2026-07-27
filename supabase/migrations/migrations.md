# migrations.md

Migrations SQL versionadas e idempotentes quando o fluxo permitir.

## Arquivos

- 20260727_ritmika_import_schema.sql: schema das entidades importadas.
- 20260727_ritmika_operational_schema.sql: schema operacional, RLS, storage e tabelas de domínio.
- 20260727_ritmika_profile_auth_link.sql: vínculo entre perfis e Auth.
- 20260727_ritmika_historical_evidence_refs.sql: backfill idempotente das 627 referências históricas de evidências.

Aplicar migrations pelo wrapper correspondente em supabase/scripts/db/write, nunca por uma sequência manual de comandos.

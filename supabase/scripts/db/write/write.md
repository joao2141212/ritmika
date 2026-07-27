# write.md

Escritas Supabase versionadas e protegidas por confirmação explícita.

## Arquivos

- run.sh: executor genérico restrito a migrations e scripts de escrita; exige RITMIKA_DB_WRITE_CONFIRM=yes.
- apply_historical_evidence_refs.sh: wrapper nomeado da migration de evidências históricas.

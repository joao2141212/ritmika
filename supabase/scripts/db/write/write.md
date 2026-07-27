# write.md

Escritas Supabase versionadas e protegidas por confirmação explícita.

## Arquivos

- run.sh: executor genérico restrito a migrations e scripts de escrita; exige RITMIKA_DB_WRITE_CONFIRM=yes.
- apply_historical_evidence_refs.sh: wrapper nomeado da migration de evidências históricas.
- mirror_historical_evidence_media.sh: baixa as referências históricas públicas, grava cópias no bucket privado e atualiza a proveniência no Ritmika.
- mirror_historical_evidence_media.mjs: implementação idempotente do mirror, com checksum, limite de 25 MB e saída resumida.

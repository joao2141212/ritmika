# read.md

Leituras Supabase agrupadas em uma chamada curta.

## Arquivos

- run.sh: carrega .env, valida o diretório permitido e executa uma consulta com psql sem cabeçalhos nem ruído.
- verify_operational_state.sql: check único de dashboard de 30 dias, schema de evidências, histórico e contagens principais.
- verify_private_evidence_access.sh: valida que uma evidência privada pode gerar URL assinada sem imprimir a URL.
- verify_private_evidence_access.mjs: implementação da prova de acesso ao Storage privado.

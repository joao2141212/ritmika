# read

Probes somente leitura da área master.

- `news-schema.sql`: usa `SUPABASE_DB_URL` e retorna tabela, colunas, políticas, função de autorização e contagens.
- `news-schema-rest.sh`: usa `SUPABASE_URL` e `SUPABASE_SECRET_KEY` para consultar o OpenAPI do PostgREST e contagens sem alterar dados.

Nenhum desses scripts cria, edita, publica ou remove registros.

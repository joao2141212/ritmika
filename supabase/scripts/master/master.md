# master

Scripts canônicos para administração da plataforma Ritmika.

## Segurança

- Scripts de mutação operam em dry-run por padrão.
- `--apply` sozinho não executa publicação; também é necessário o token de confirmação calculado pelo dry-run.
- A chave secreta deve existir somente no `.env` ignorado pelo Git.
- O script nunca imprime a chave nem tokens de sessão.
- Publicar uma novidade é uma comunicação externa aos clientes e exige autorização do texto e do público.

## Arquivos

- `news.sh`: lista, inspeciona, cria rascunho, publica e despublica novidades.
- `apply-migration.sh`: aplica uma migração específica pela Management API, com dry-run e confirmação vinculada ao projeto e arquivo.
- `platform-admin.sh`: habilita ou remove o privilégio master no `app_metadata` de uma conta Auth, preservando os demais metadados.
- `read/news-schema.sql`: prova schema, políticas, função master e contagens via Postgres.
- `read/news-schema-rest.sh`: fallback REST somente leitura para schema e contagens.

## Fluxo recomendado

1. `bash supabase/scripts/master/news.sh list`
2. Preparar um JSON local com `title`, `summary`, `body`, `category` e `workspace_id` opcional.
3. Rodar `draft --file arquivo.json` sem `--apply`.
4. Conferir o payload e usar a confirmação indicada para criar o rascunho.
5. Revisar o rascunho na `/master`.
6. Rodar `publish --id UUID` sem `--apply`.
7. Após autorização explícita do texto e do público, repetir com `--apply` e a confirmação indicada.

## Público

- `workspace_id: null`: todos os clientes.
- `workspace_id: UUID`: somente o cliente selecionado.

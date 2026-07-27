# ritmika.md

Índice canônico da raiz do repositório Ritmika.

## Regra de navegação

Cada pasta mantida pelo projeto possui um documento com o nome literal da pasta e a extensão .md. Esse documento lista a finalidade da pasta, cada arquivo direto e as subpastas canônicas. Depois de compactação ou mudança de agente, leia o documento canônico da raiz e desça pela pasta do trabalho antes de inferir responsabilidades.

## Pastas canônicas

- client/client.md: frontend React/Vite.
- server/server.md: API local auxiliar e rotas HTTP.
- supabase/supabase.md: migrations e operações do banco remoto.
- scripts/scripts.md: automações históricas de setup/deploy.
- tools/tools.md: ferramentas de extração e reconstrução de UI.
- design-plans/design-plans.md: contratos e roadmap de paridade.
- docs/docs.md: documentação temática.
- fixtures/fixtures.md: fixtures de desenvolvimento.

## Arquivos da raiz

- .env: credenciais locais; é ignorado e nunca deve ser impresso, commitado ou copiado para documentação.
- .gitignore: limites de versionamento e segredos.
- README.md: entrada rápida do projeto.
- APP_FORK_MANIFEST.md: manifesto da reconstrução do aplicativo.
- CANONICAL_AGENT_ALIGNMENT.md: alinhamento de agentes e superfície observada.
- CHECKLIST_PRODUCAO.md: contrato operacional de checklists.
- FORK_NOTES.md: notas do processo de destilação.
- SUPABASE_SETUP.md: configuração inicial do Supabase.
- guia-dados-clone-konclui: guia de dados e mapeamento do clone.
- netlify.toml: configuração de build/publicação do Netlify.
- package.json e package-lock.json: dependências e scripts da raiz.

## Limites

.git, client/node_modules, client/dist, server/node_modules e os diretórios equivalentes do UI Distiller são gerados ou de terceiros. A pasta evidence contém artefatos de captura já existentes e não é alterada por esta convenção sem autorização específica.

## Banco de dados

Não executar SQL Supabase colado no terminal como rotina. Use os scripts em supabase/scripts/db/read para leitura e supabase/scripts/db/write para escrita. O Koncluí permanece somente leitura.

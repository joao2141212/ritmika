# Fork Notes

## Alvo

- URL original: `https://app.konclui.com/`
- Projeto local: `/Users/pedroduarte/Documents/ritmika`
- Data da observação: 2026-07-27, America/Sao_Paulo
- Viewport observado: 1440x932 no Chrome; a recon segura também cobre 1440x900, 1024x900 e 390x844

## Autorização e limites

- Pedro informou que o acesso ao painel foi autorizado pelos gestores.
- A sessão observada era autenticada e foi tratada como ambiente operacional, não como conta de teste confirmada.
- Não persistir cookies, tokens, senhas, valores de storage, dados de clientes, screenshots de dados reais ou exportação do banco original.
- Fora do escopo desta fase: mutações no Koncluí, envio de mensagens, alteração de permissões e inferência de backend privado.

## Evidência atual

- `SOURCE`: shell, navegação, DOM e caminhos REST/RPC observados no painel autenticado.
- `PARTIAL`: contratos completos de request/response, paginação, RLS e efeitos server-side ainda não foram fechados.
- `GUESS`: nenhum comportamento privado deve ser considerado confirmado.
- `REBUILT`: primeiro fluxo local de checklists, contagem, histórico e criação, usando somente fixtures sintéticas.

## Estado

- Nível atual: L2 do original, com primeiro slice local reconstruído e persistente; não é paridade de backend.
- Validação local: build Vite passou; smoke no navegador confirmou busca, contagem, histórico após reload e criação após reload.
- Lint: falha em problemas preexistentes do cliente e uma regra de Fast Refresh no contexto; não foi usado como prova de comportamento.
- Próxima etapa: fechar estados de detalhe/setup, contratos do backend local e cobertura responsiva antes de qualquer afirmação de paridade.

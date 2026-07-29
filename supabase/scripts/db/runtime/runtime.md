# runtime.md

## Finalidade

`connection.ts` é a fronteira única dos runners SQL. Ele carrega o ambiente
local, resolve a URL de banco sem expô-la, valida a raiz do arquivo SQL e
executa `psql` com `ON_ERROR_STOP=1`.

## Regras

- Não aceitar caminhos arbitrários.
- Não executar escrita sem confirmação explícita do runner de escrita.
- Não duplicar resolução de conexão em cada script.
- Alterações de schema permanecem em SQL/migrations e não são reescritas em
  JavaScript.

# qa

Scripts canônicos para cenários isolados de validação do Ritmika.

## `employee-flow.sh`

- `inspect`: lê somente o esquema das tabelas envolvidas em autenticação, atribuição e execução.
- `inventory`: compara quantidades por workspace sem retornar nomes, e-mails ou conteúdo operacional.
- `policies`: audita as políticas RLS das tabelas de atribuição e execução.
- `setup-worker`: cria ou reconcilia de forma idempotente uma conta Auth, membership e perfil `operator` somente no workspace QA. É dry-run por padrão e exige `--apply --confirm CREATE:QA_WORKER`.
- `setup-scenario`: cria ou atualiza uma atividade operacional isolada, com dois itens reais, atribuída ao funcionário QA. É dry-run por padrão e exige `--apply --confirm CREATE:QA_EMPLOYEE_SCENARIO`.
- `verify-scenario`: comprova por leitura o checklist, responsável, role, vínculo Auth e totais de execuções/conclusões do cenário QA.
- `apply-boundaries`: aplica a migration que separa leitura e escrita do gestor das tarefas e execuções do funcionário. Exige `APPLY:EMPLOYEE_BOUNDARIES`.

Toda escrita é idempotente, limitada ao workspace `source_system = ritmika_qa`, começa em dry-run e exige confirmação literal. O script não possui reset destrutivo; uma eventual remoção do fixture exige autorização separada.

Dados do cliente real não são usados como fixture. No workspace real, o cenário permite somente inspeção de autorização e contagens agregadas.

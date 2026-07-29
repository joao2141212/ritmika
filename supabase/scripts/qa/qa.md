# qa

Scripts canônicos para cenários isolados de validação do Ritmika.

## `employee-flow.sh`

O nome do arquivo é legado e permanece temporariamente para compatibilidade com automações existentes. O domínio canônico é **App de Operação** e não pressupõe que a pessoa usuária seja funcionária da empresa.

- `inspect`: lê somente o esquema das tabelas envolvidas em autenticação, atribuição e execução.
- `inventory`: compara quantidades por workspace sem retornar nomes, e-mails ou conteúdo operacional.
- `policies`: audita as políticas RLS das tabelas de atribuição e execução.
- `setup-worker`: cria ou reconcilia de forma idempotente uma conta Auth, membership e perfil `operator` somente no workspace QA. Aceita `RITMIKA_QA_WORKER_NAME` para o nome operacional, usa `Operador QA Ritmika` por padrão, é dry-run por padrão e exige `--apply --confirm CREATE:QA_WORKER`.
- `setup-scenario`: cria ou atualiza uma atividade operacional isolada, com dois itens reais, atribuída à conta operacional QA. É dry-run por padrão e exige `--apply --confirm CREATE:QA_EMPLOYEE_SCENARIO`.
- `verify-scenario`: comprova por leitura o checklist, responsável, role, vínculo Auth e totais de execuções/conclusões do cenário QA.
- `normalize-operation-copy`: localiza e substitui terminologia antiga nas descrições dos checklists QA, sem tocar em dados reais. É dry-run por padrão e exige `--apply --confirm NORMALIZE:QA_OPERATION_COPY`.
- `apply-boundaries`: aplica a migration legada que separa leitura e escrita da gestão das atividades e execuções operacionais. Exige `APPLY:EMPLOYEE_BOUNDARIES`.
- `apply-notification-boundaries`: restringe notificações para que contas operacionais vejam broadcasts e mensagens próprias, mas somente a gestão crie notificações. Exige `APPLY:EMPLOYEE_NOTIFICATION_BOUNDARIES`.

Toda escrita é idempotente, limitada ao workspace `source_system = ritmika_qa`, começa em dry-run e exige confirmação literal. O script não possui reset destrutivo; uma eventual remoção do fixture exige autorização separada.

Dados do cliente real não são usados como fixture. No workspace real, o cenário permite somente inspeção de autorização e contagens agregadas.

# QA E2E: conta operacional e tarefa

Data da prova: 29 de julho de 2026
Ambiente: produção, `https://ritmikapp.netlify.app`

## Escopo

Provar o ciclo real, sem mock, entre o Portal de Gestão e o App de Operação:

1. preparar uma conta QA isolada;
2. criar Auth, perfil e vínculo ao workspace;
3. publicar um checklist atribuído à conta;
4. entrar como operador;
5. salvar uma resposta;
6. recarregar a URL da execução;
7. concluir;
8. confirmar o resultado no histórico do operador e no painel do gestor.

Nenhum dado foi escrito no Konclui do cliente.

## Superfícies

- Portal de Gestão: `/`
- Modelos e atribuição: `/checklists`
- Configuração de usuários: `/configurations`
- App de Operação: `/app`
- Histórico operacional: `/app/history`

O Portal de Gestão responsivo e o App de Operação são superfícies diferentes.
O termo “funcionário” é apenas uma explicação de uso, não um nome hardcoded do produto.

## Resultado observado

- A conta `Operador QA E2E` autenticou e foi direcionada para `/app`.
- A navegação da conta ficou restrita a Início, Histórico, Avisos e Perfil.
- O gestor publicou `QA E2E · Novo operador 29-07-2026 73748`.
- O App de Operação mostrou 1 atividade atribuída e 1 atividade a iniciar.
- A execução foi iniciada com um `executionId` persistente na URL.
- A resposta obrigatória foi salva com o retorno visual `Progresso salvo`.
- Após recarregar a URL completa, a execução continuou em `1/1` e `100%`.
- A conclusão retornou `Execução concluída`, pontuação `100%` e status `Concluída`.
- O histórico do operador mostrou 1 execução e 1 concluída.
- O gestor mostrou `Operador QA E2E`, `1 concluídos de 1`, e a linha da execução como
  `Finalizado`, com Unidade QA Central, Operação QA e Abertura QA.

## Defeitos encontrados e corrigidos

### Perfil duplicável ou impossível de atualizar

O `upsert` por `workspace_id,auth_user_id` falhava com PostgreSQL `42P10` porque
não existia restrição única correspondente.

Correção: `ritmika_profiles` passou a ter unicidade em
`(workspace_id, auth_user_id)`.

### Perfil sem ID

Depois da primeira correção, a criação falhava com PostgreSQL `23502` porque
`ritmika_profiles.id` era obrigatório e não tinha valor padrão.

Correção: `ritmika_profiles.id` passou a usar `gen_random_uuid()`.

### Erro opaco na função de convite

Erros retornados como objetos perdiam `message`, `details`, `hint` e `code`.

Correção: a função `invite-user` agora serializa esses campos e mantém o
correlation ID na resposta de erro.

### Mensagem incorreta para usuário existente

A interface sempre dizia “Convite enviado”, mesmo quando o Auth já existia.

Correção: a UI usa `invitationCreated`; mostra “Convite enviado” para convite
novo e “Acesso do usuário atualizado” para vínculo ou atualização.

## Contrato de banco

Migration:
`supabase/migrations/20260729023000_profiles_workspace_auth_unique.sql`

O schema de produção já contém o default e a restrição. O histórico remoto de
migrations estava vazio na inspeção de 29 de julho de 2026. Não executar
`db push` em lote até reconciliar as migrations antigas com o schema vivo.

## Automação QA

Script:
`supabase/scripts/auth/write/prepare-qa-operator-candidate.mjs`

- usa exclusivamente identidade QA;
- é dry-run por padrão;
- exige `--apply --confirm PREPARE:QA_OPERATOR_CANDIDATE` para mutar;
- recusa transformar silenciosamente um usuário não QA;
- salva apenas as chaves QA no `.env` ignorado;
- não imprime senha.

## Lacunas não encerradas por esta prova

- Isto prova o ciclo conta, atribuição, execução, persistência, conclusão e
  observabilidade do gestor. Não prova paridade total de todas as features do
  Konclui.
- O Konclui possui escopo de usuário por unidade e setor. O vínculo direto por
  setor ainda precisa de auditoria vertical e prova no Ritmika.
- Assinatura, GPS, QR/código de barras, recorrência, push externo e operação
  offline precisam de cenários E2E próprios.
- O lint global ainda falha em 16 ocorrências preexistentes das regras React
  `set-state-in-effect` e `immutability`. O lint dos arquivos tocados passou.

## Certificação de produção do fluxo completo

Execução mais recente: `2026-07-29T03:58:51.688Z` até
`2026-07-29T03:59:11.406Z`.

Comando canônico:

```bash
bash supabase/scripts/auth/run.sh production-operation-e2e --apply
```

Sinais observados:

- gestor QA leu 4 perfis autorizados, abriu o construtor, atribuiu e publicou;
- o checklist `daf774cd-d573-4e8c-a7d3-8494e4745ce9` apareceu no `/app` do
  operador atribuído;
- a execução `bc789c81-73a6-4a80-bab6-dcf3e4510a9f` ficou interativa em
  1.072 ms;
- a conclusão foi bloqueada sem evidência, o arquivo foi anexado, o progresso
  foi salvo, recarregado e concluído em 100%;
- aviso de conclusão, histórico e registro final no Supabase foram confirmados;
- a fixture de capacidades concluiu 3/3 itens, cobrindo check, comentário,
  data/hora e evidência;
- busca sem acento, bloqueio de rota de gestão, perfil e logout passaram;
- `runtime_errors` e `failed_responses` ficaram vazios.

A prova serializada está em `evidence/production-operation-e2e.json` e pode ser
recriada pelo comando acima usando apenas o workspace QA.

## Revalidação após estabilização de navegação

Deploy validado em `2026-07-29T04:14:21.078Z`:

- 36/36 rotas autenticadas passaram no portal de gestão e no app operacional,
  em viewports de 1440 px e 390 px;
- nenhum overflow documental, erro de página, erro de console ou resposta HTTP
  com falha foi observado;
- consultas deixam de ser removidas durante mutações e agora são somente
  invalidadas, eliminando o `CancelledError` que aparecia ao alternar telas;
- a margem nativa do navegador foi zerada e a largura documental ficou
  exatamente igual ao viewport;
- a prova está em `evidence/production-ui-sweep.json`.

O ciclo mutável foi repetido depois desse deploy, de
`2026-07-29T04:19:18.621Z` a `2026-07-29T04:19:40.419Z`. O checklist
`8dd82428-7791-4249-8646-0986773f5954` gerou a execução
`2c03fb5d-b832-4736-a131-2f1a12ef84ca`, concluída em 100% com evidência,
salvamento, restauração após reload, aviso, histórico e persistência no banco.
A fixture operacional `v2` confirmou 4/4 itens, incluindo número com três
casas decimais. `runtime_errors` e `failed_responses` permaneceram vazios.

## Correção da home de gestão no mobile

Deploy validado em `2026-07-29T04:31:03.768Z`:

- dashboard, cabeçalho, filtros, painéis e cards passaram a calcular largura
  com `border-box`, impedindo que padding ultrapasse o viewport;
- captura autenticada em 390 px confirmou cards completos em coluna única;
- 36/36 rotas passaram sem overflow documental nem `visualClipping`;
- a auditoria agora distingue rolagem horizontal intencional de conteúdo
  realmente cortado, eliminando o falso positivo anterior;
- o E2E mutável foi repetido de `2026-07-29T04:31:19.253Z` a
  `2026-07-29T04:31:41.499Z`, com execução em 100%, fixture 4/4 e nenhum erro
  de runtime ou resposta HTTP.

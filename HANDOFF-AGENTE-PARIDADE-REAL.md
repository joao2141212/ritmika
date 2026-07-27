# Handoff para agente: paridade real Ritmika x Koncluí

**Data:** 2026-07-27  
**Estado:** trabalho avançado, mas ainda não certificado como clone 1:1  
**Próximo objetivo:** finalizar a parte bruta de QA autenticado, paridade diferencial e fechamento operacional sem introduzir mock em produção.

## 1. Alvo e limites

O alvo de implementação é o Ritmika, neste repositório:

/Users/pedroduarte/Documents/ritmika

O remoto Git é:

https://github.com/joao2141212/ritmika.git

O deploy público é:

https://ritmikapp.netlify.app/

O Koncluí é um sistema de cliente real em operação. Ele deve ser tratado como **somente leitura**: pode-se observar DOM, telas, requests expostos e dados autorizados para comparação, mas não criar, editar, apagar, exportar destrutivamente ou alterar qualquer coisa nele.

O Ritmika, o Supabase do Ritmika, o Git e o deploy do Ritmika estão dentro do escopo de implementação. Ainda assim, não contaminar o workspace real do cliente com execuções artificiais sem fixture isolada ou autorização explícita.

## 2. Estado Git atual

- Branch: main
- HEAD atual: 61dddbd
- O código funcional principal foi publicado em 66e7e75; 61dddbd adicionou somente documentação do script de leitura.
- O único item fora do controle de versão é evidence/. É conteúdo do usuário: não adicionar, remover, limpar, mover ou incluir no commit.
- Não usar git reset --hard, git checkout --, git clean, git restore ou remoção de arquivos.

Últimos commits relevantes:

| Commit | Resultado |
|---|---|
| 61dddbd | indexa o script de inspeção do dashboard na documentação de leitura |
| 66e7e75 | rankings, evolução do dashboard, verificação RLS e dimensões do dashboard |
| 6ba4e32 | exportação CSV da fila remota do dashboard |
| 7f64642 | alvo mobile de 44px no login |
| dd36e6c | estados acessíveis do login |
| e15f99f | mirror privado das evidências históricas |
| 0a0b631 | notificações do ciclo de execução remoto |
| 43c34e7 | produção força o caminho remoto, sem fallback local |

## 3. O que já está implementado

### Frontend e runtime

- Rotas de produção usam os componentes remotos em client/src/App.jsx.
- client/src/context/AuthContext.jsx e client/src/services/checklistProducaoService.js não usam fallback local quando import.meta.env.PROD é verdadeiro.
- O modo local permanece apenas para desenvolvimento não-prod e não deve ser usado para declarar paridade de produção.
- O login foi convertido para white mode, com labels associados, foco visível, overflow corrigido, contraste corrigido e botão mobile de 44px.
- client/src/pages/DashboardRemote.jsx tem período de 7, 30, 90 dias e histórico.
- O dashboard agora exporta CSV da fila carregada, respeitando aba e período.
- O dashboard agora renderiza rankings de usuários, unidades e setores e evolução diária a partir dos dados remotos.
- A tela de execução possui salvar progresso, concluir e executar novamente.
- O retry remoto reabre a execução, zera respostas/progresso, incrementa retry_count, registra evento e cria notificação idempotente.
- Início, conclusão e retry registram eventos e notificações remotas.
- Evidências históricas são exibidas como históricas e usam URL assinada quando o mirror privado está completo.

### Banco e dados

- Dados importados para o workspace remoto, incluindo checklists, itens, respostas, perfis, unidades, setores e momentos.
- Mirror privado criado no bucket ritmika-evidences.
- O mirror é idempotente e preserva a URL de origem como proveniência no metadata.
- O bucket de evidências é privado.
- A produção não depende de mock para carregar dados.

## 4. Provas já executadas

### Build e qualidade

Executar a partir de /Users/pedroduarte/Documents/ritmika/client:

~~~bash
npm run lint
npm run build
~~~

Resultado mais recente: ambos terminaram com código 0. O build mantém somente o aviso não bloqueante de bundle acima de 500 kB e o aviso de atualização de baseline-browser-mapping.

Também foi executado:

~~~bash
cd /Users/pedroduarte/Documents/ritmika
git diff --check
~~~

### Bundle público

O HTML sem query pode ficar em cache. Para conferir o bundle atual, usar cache busting:

~~~bash
curl -fsSL "https://ritmikapp.netlify.app/?deploy=66e7e75"
~~~

A resposta observada apontou para:

- assets/index-CBrVr8H8.js
- assets/index-C0px9v2t.css

A raiz pública retornou HTTP 200.

### UI pública

Foi usado o Tato nos viewports 1440x900, 1024x768 e 390x844 na rota /login.

Resultado final: nenhum achado alto. Restaram apenas:

- validação HTML nativa do formulário vazio, classificada como baixa;
- auth wall esperado, porque a rota testada era a própria tela de login;
- informação de proporção, que não é falha funcional.

Isso não prova as telas protegidas, porque ainda não houve smoke autenticado no bundle público.

### Banco e storage

Todos os comandos abaixo são canônicos e somente leitura. Não substituir por comandos SQL soltos no terminal.

~~~bash
cd /Users/pedroduarte/Documents/ritmika

supabase/scripts/db/read/run.sh supabase/scripts/db/read/verify_operational_state.sql
supabase/scripts/db/read/run.sh supabase/scripts/db/read/verify_security_state.sql
supabase/scripts/db/read/run.sh supabase/scripts/db/read/inspect_dashboard_dimensions.sql
supabase/scripts/db/read/verify_private_evidence_access.sh
~~~

Sinais observados:

~~~text
dashboard_30d|717|69|648
historical_evidences|627|627|627|0|627
evidence_schema|storage_bucket:NO,storage_path:NO,mime_type:YES
table_counts|58|351|5302|16|0
rls_tables|16|enabled|16|forced|0
policy_rows|21|tables|16|workspace_scoped|16
rls_missing_policy_tables|none
private_evidence_bucket|private
private_evidence_access|checked=1|signed=1
~~~

Interpretação:

- 717 respostas no período de 30 dias, 69 concluídas e 648 pendentes/atrasadas conforme o cálculo remoto atual.
- 627 evidências históricas importadas, 627 com mirror privado e nenhuma apontando para konclui-source como bucket.
- 16 tabelas Ritmika com RLS habilitado, 21 policies em 16 tabelas e nenhuma tabela RLS sem policy.
- O teste de acesso privado conseguiu gerar uma URL assinada.

## 5. Scripts Supabase canônicos

A documentação principal está em:

- /Users/pedroduarte/Documents/ritmika/supabase/scripts/db/db.md
- /Users/pedroduarte/Documents/ritmika/supabase/scripts/db/read/read.md
- /Users/pedroduarte/Documents/ritmika/supabase/scripts/db/write/write.md

Regras:

- Leitura: usar supabase/scripts/db/read/run.sh <arquivo.sql>.
- Escrita: usar supabase/scripts/db/write/run.sh ou o wrapper específico do script.
- Escrita exige RITMIKA_DB_WRITE_CONFIRM=yes.
- O .env está ignorado pelo Git. Não imprimir, repetir, registrar, colocar em documentação ou commitar valores de credenciais.
- Não colocar senha do cliente, tokens Supabase ou URL de banco neste handoff.
- Não executar uma série de psql ad hoc quando a operação puder ser um script versionado.

Scripts de escrita existentes que devem ser reutilizados, não duplicados:

- supabase/scripts/db/write/apply_historical_evidence_refs.sh
- supabase/scripts/db/write/mirror_historical_evidence_media.sh

## 6. Pendências que o próximo agente deve executar

### P0. Smoke autenticado no deploy publicado

Usar uma sessão ou conta de teste autorizada sem colocar a credencial no handoff, no código ou no log.

Validar na ordem:

1. login no bundle público;
2. dashboard remoto populado;
3. filtro de 7, 30, 90 dias e histórico;
4. rankings de usuários, unidades e setores;
5. evolução diária;
6. botão Atualizar;
7. exportação CSV e conteúdo do arquivo;
8. lista de checklists;
9. detalhe de checklist;
10. iniciar execução;
11. salvar progresso;
12. recarregar e retomar a mesma execução;
13. concluir execução;
14. visualizar o estado concluído;
15. executar novamente/reabrir;
16. upload de evidência;
17. geração de URL assinada e download privado;
18. notificações de início, conclusão e retry;
19. marcar uma notificação como lida;
20. logout e retorno ao login.

Não declarar que esse item passou com base somente em HTTP 200, bundle baixado ou presença de código.

### P0. QA diferencial 1:1

No Koncluí, somente leitura. Para cada viewport relevante, registrar:

- DOM e textos visíveis;
- dimensões/ordem dos painéis;
- estados vazio, loading, sucesso, erro e desabilitado;
- filtros e timezone;
- rankings, score, pontualidade, esforço e qualidade;
- exportação;
- notificações;
- fluxo de execução e evidências.

Comparar com o Ritmika usando a mesma conta/escopo autorizado. Produzir um relatório objetivo com diferença observada, arquivo afetado, correção e nova prova.

### P1. Confirmar fórmula do dashboard

A implementação atual calcula score médio por grupo usando, nesta ordem:

1. metadata.score;
2. metadata.progress;
3. 100 para registro finalizado;
4. 0 para registro não finalizado.

Essa é uma aproximação operacional e ainda precisa ser comparada ao cálculo exato do Koncluí. Confirmar também:

- timezone do execution_date;
- limites inclusivo/exclusivo do período;
- tratamento de atrasados;
- deduplicação de respostas;
- significado de pontualidade, esforço, qualidade e score;
- se ranking usa todos os registros ou somente finalizados.

Não chamar essa parte de paridade matemática certificada antes da comparação.

### P1. Notificações históricas

As notificações novas do ciclo de execução estão persistidas. Ainda falta confirmar, em leitura no Koncluí, se existem notificações históricas que também precisam ser portadas. Se houver importação autorizada:

- criar script idempotente em supabase/scripts/db/write/;
- preservar source_id e proveniência;
- não duplicar registros;
- validar workspace e recipient;
- registrar a contagem antes/depois em script de leitura.

### P1. Matriz de permissões

As policies estão presentes e filtram por workspace_id, mas a matriz de comportamento ainda não foi exercitada na UI. Validar com contas/fixtures isoladas:

| Papel | Deve conseguir | Deve não conseguir |
|---|---|---|
| Gestor | dashboard, configurações, equipe, CRUD autorizado, exportação | acessar outro workspace |
| Operador | checklists e execuções atribuídas | administrar equipe, configurações sensíveis, outro workspace |
| Outro workspace | somente seus próprios dados | qualquer linha do workspace do cliente |

Não usar service_role no frontend. Não relaxar RLS para fazer o smoke passar.

### P1. White mode completo

O login foi corrigido, mas ainda falta varrer todas as telas protegidas e remover restos visuais de dark mode. Procurar especialmente:

- fundos escuros;
- gradientes antigos;
- texto branco em fundo claro;
- placeholders com baixo contraste;
- foco invisível;
- overflow em mobile;
- estados de erro e loading sem contraste;
- botões menores que 44px no mobile.

### P2. Documentação contínua

Qualquer novo script ou pasta precisa ser listado no .md canônico da pasta. Atualizar também:

- /Users/pedroduarte/Documents/ritmika/design-plans/REAL-PARITY-ROADMAP.md
- o diário de execução;
- os comandos de prova;
- o gap que deixou de ser hipótese e passou a ter evidência.

## 7. Rota de investigação e CBM

Projeto CBM:

Users-pedroduarte-Documents-ritmika

Root indexado:

/Users/pedroduarte/Documents/ritmika

No início de uma nova sessão ou após compactação:

~~~bash
/Users/pedroduarte/.local/bin/cbm-anchor "Ritmika: continuar paridade real funcional e visual com Koncluí, smoke autenticado, QA diferencial e fechamento"
~~~

Depois usar o CBM nativo para localizar arquitetura, rotas, símbolos, callers e fonte. O índice foi refeito no HEAD 61dddbd e está pronto.

Não começar descoberta de código com rg, grep, find, sed, cat ou dumps de arquivo inteiro quando o CBM puder selecionar o alvo. Depois que o CBM selecionar um alvo exato, usar somente leitura delimitada e patch localizado.

## 8. Critério de encerramento

O trabalho só pode ser declarado concluído quando houver evidência registrada para todos estes pontos:

- build/lint;
- login autenticado publicado;
- dashboard populado e filtros;
- rankings/evolução/exportação;
- checklist detail;
- salvar, retomar, concluir, reabrir/retry e histórico;
- upload e download privado de evidência;
- notificações novas e históricas confirmadas;
- matriz de permissões e isolamento entre workspaces;
- QA diferencial das telas contra o Koncluí;
- white mode sem achados altos nos viewports definidos;
- scripts Supabase canônicos executados e documentados;
- Git limpo exceto o evidence/ do usuário;
- deploy público apontando para o commit final.

Até esse conjunto passar, o estado correto é **paridade parcial avançada**, não paridade 1:1 certificada.


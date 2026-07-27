# Roadmap de destilação e reconstrução do Koncluí no Ritmika

**Data:** 2026-07-27
**Produto alvo:** cópia local do Ritmika
**Objetivo:** reconstruir no Ritmika a experiência observável do Koncluí em
paridade funcional e visual, com banco, API, permissões, estados e funções
locais equivalentes. Depois da paridade, adicionar capacidades novas sem
quebrar o comportamento compatível.

## Regra principal

O alvo é **1:1 no comportamento observável**, não uma cópia cega da
implementação privada:

- portar rotas, entidades, relações, regras, estados, mensagens, permissões,
  requests, respostas, loading, erro, retry, cancelamento e confirmações quando
  forem comprovados;
- reconstruir o contrato no Supabase do Ritmika, com migrations, RLS,
  funções, índices, auditoria e serviços locais;
- não copiar cookies, tokens, código proprietário ou endpoints privados como
  dependência de produção;
- marcar como `semanticMappingRequired` tudo que ainda for hipótese;
- manter uma fixture sintética, idempotente, resetável e sem dados de clientes.

## Estado atual

- [x] Kit canônico de destilação validado.
- [x] Quatro donors principais incorporados como técnicas: OpenAdapt Flow,
  Ditto, AI Website Cloner Template e SkillUI/npxskillui.
- [x] Compilador local com Playwright/CDP, redaction, IRs, workflow, causal
  trace e diferencial.
- [x] Credenciais do Supabase do Ritmika salvas em arquivos ignorados pelo Git.
- [x] Clone local funcionando em modo local-first.
- [ ] `SOURCE TRACE` autorizado do Koncluí.
- [ ] Inventário comprovado de rotas, funções e estados do Koncluí.
- [ ] Schema/migrations/RLS/functions locais derivados das evidências.
- [ ] Paridade source/clone executada com sistemas distintos.
- [ ] White mode implementado e validado em todas as superfícies.

## Critério por feature

Uma feature só muda para `complete` quando tiver:

1. rota original e finalidade;
2. fixture sintética autorizada;
3. captura antes, ação semântica, settle e depois;
4. DOM, acessibilidade, layout, foco, overlay, storage e rede redigida;
5. contrato local de dados/API;
6. migration/schema, RLS e funções necessárias;
7. UI local executando a ação contra o serviço local;
8. estados vazio, loading, sucesso, erro, offline/degraded, retry,
   cancelamento e ação desabilitada;
9. confirmação final observável na UI;
10. differential source/clone e relatório de limitações.

## Fase 0: preparar a extração autorizada

- [ ] Confirmar com os gestores um tenant/workspace de teste sem dados de
  clientes.
- [ ] Definir conta de teste, permissões e janela de captura.
- [ ] Registrar quais ações são read-only, reversíveis e mutáveis.
- [ ] Criar procedimento de reset/recriação da fixture.
- [ ] Fixar viewport desktop, tablet e mobile.
- [ ] Não usar a sessão operacional como fixture persistente.

**Saída:** `authorization.md`, fixture resetável e manifesto de captura.

## Fase 1: inventário máximo do produto

Mapear todas as superfícies visíveis e suas dependências, sem concluir que uma
função existe apenas pelo nome da rota:

- [ ] login, sessão, recuperação e permissões;
- [ ] dashboard e filtros por período, unidade, setor, usuário e momento;
- [ ] checklists: listagem, busca, filtros, criação, edição, duplicação,
  publicação, arquivamento e exclusão autorizada;
- [ ] builder de checklist: grupos, itens, tipos de resposta, obrigatoriedade,
  evidência, ordem, validação e versionamento;
- [ ] agendamento, atribuição, recorrência, prazo, situação e execução;
- [ ] execução pelo operador: abertura, avanço, resposta, anexo, pausa,
  conclusão, erro, retry e cancelamento;
- [ ] histórico, auditoria, pontualidade, esforço, qualidade e score;
- [ ] notificações e preferências;
- [ ] análises IA e evidências;
- [ ] configurações, usuários, unidades, setores, cargos e permissões;
- [ ] cursos, ajuda, ideias, novidades e suporte;
- [ ] exportações, tabelas, paginação, colunas e responsividade.

**Saída:** matriz de rotas, ações, entidades, estados e prioridade.

## Fase 2: extrair o frontend e o comportamento

Para cada feature prioritária:

- [ ] capturar a árvore DOM e AX completa;
- [ ] capturar geometria, estilos, ordem de pintura, overlays, foco, seleção,
  caret, scroll e virtualização;
- [ ] registrar eventos sem valores sensíveis;
- [ ] registrar rede como intenção redigida, sem transformar endpoint privado em
  dependência do clone;
- [ ] capturar estado intermediário, optimistic state, settle e estado final;
- [ ] provocar e registrar erro, retry, cancelamento, timeout e rollback;
- [ ] importar Recorder/rrweb somente com redaction estrita;
- [ ] compilar `RenderIR`, `DesignSystemIR`, `WorkflowIR`, `CausalTrace`,
  `VisualGrounding` e `UnifiedCloneSpec`;
- [ ] registrar a origem e a confiança de cada regra.

**Saída por feature:**

```text
feature/
  evidence/source/
  evidence/clone/
  fixture/
  api-contract.md
  workflow.json
  unified-clone-spec.json
  implementation-notes.md
  validation-report.md
```

## Fase 3: reconstruir banco, API e funções

O domínio abaixo é uma lista de candidatos para investigação, não um schema
afirmado do Koncluí. Cada tabela e campo precisa de evidência antes de virar
contrato:

- tenant/workspace e configurações;
- usuários, perfis, memberships, papéis e permissões;
- unidades, setores e momentos;
- templates, versões, grupos, itens e tipos de resposta;
- agendamentos, atribuições, recorrências e prazos;
- execuções, respostas, anexos/evidências e estados;
- notificações, preferências e entregas;
- análises, métricas, score e agregações;
- auditoria, correlação, tentativas e falhas.

Implementar por feature:

- [ ] migrations versionadas e revisadas;
- [ ] tenant scoping obrigatório;
- [ ] RLS em toda tabela exposta;
- [ ] policies com autorização por linha, não apenas `authenticated`;
- [ ] `USING` e `WITH CHECK` em updates;
- [ ] views com `security_invoker` quando aplicável;
- [ ] funções invoker por padrão e schema não exposto para funções realmente
  privilegiadas;
- [ ] índices baseados em consultas observadas e `EXPLAIN`;
- [ ] create, list, inspect, update, retry, archive/delete conforme autorização;
- [ ] idempotência em import, upload, webhook e worker;
- [ ] correlação, auditoria e estado de falha;
- [ ] exposição deliberada ao Data API, com grants e RLS verificados;
- [ ] advisors e query checks antes de declarar a feature pronta.

Não aplicar migration definitiva diretamente durante a exploração. Iterar em
SQL/local, revisar segurança e gerar a migration limpa quando a feature tiver
contrato comprovado.

## Fase 4: paridade 1:1 do frontend

- [ ] criar uma rota local por feature;
- [ ] preservar a semântica das ações, não apenas a aparência;
- [ ] ligar UI ao serviço local e à persistência local;
- [ ] reproduzir labels, estados, feedback, foco, atalhos, paginação,
  validações e mensagens observadas;
- [ ] validar desktop, tablet e mobile;
- [ ] comparar DOM/AX/layout/rede/storage/settle e visual;
- [ ] rejeitar uma feature se só houver screenshot semelhante;
- [ ] documentar toda diferença não comprovada.

## Fase 5: white mode e sistema visual

Decisão de produto: **white mode será o tema padrão do Ritmika**. O dark mode
fica preservado como alternativa para teste e preferência do usuário.

- [ ] extrair tokens observados e atuais para um sistema semântico;
- [ ] separar `background`, `surface`, `surface-muted`, `text`, `text-muted`,
  `border`, `primary`, `success`, `warning`, `danger`, `info`, `focus` e
  estados de controle;
- [ ] definir light tokens sem inverter mecanicamente os tokens dark;
- [ ] revisar tabela, formulário, builder, dashboard, gráficos, cards, badges,
  menus, dialogs, toasts, empty states e skeletons;
- [ ] garantir hover, focus, active, disabled, loading, success e error;
- [ ] medir contraste de texto e controles em light e dark;
- [ ] preservar hierarquia, densidade e identidade do produto;
- [ ] validar scroll, clipping, overlays e responsividade;
- [ ] usar o formato de cor já adotado pelo projeto; migrar para OKLCH apenas
  se isso for decidido para o sistema inteiro;
- [ ] criar seletor de tema e persistência local sem alterar o contrato de
  dados;
- [ ] deixar white mode pronto antes da rodada final de polimento.

## Fase 6: funções além do original

Essas funções entram somente depois que a paridade da superfície correspondente
estiver comprovada:

- [ ] busca global com filtros salvos e operadores avançados;
- [ ] ações em lote com confirmação e rollback;
- [ ] modo offline/degraded com fila e retry visual;
- [ ] histórico/auditoria navegável por entidade;
- [ ] permissões granulares e delegação temporária;
- [ ] templates/versionamento/diff de checklist;
- [ ] dashboards configuráveis e exportações mais completas;
- [ ] notificações agrupadas, preferências e snooze;
- [ ] acessibilidade e atalhos de teclado ampliados;
- [ ] observabilidade de jobs, tentativas, correlation ID e falhas;
- [ ] feature flags para liberar cada extensão sem alterar a paridade.

## Uso dos quatro donors

| Donor | Técnica aproveitada | Saída no Ritmika |
| --- | --- | --- |
| OpenAdapt Flow | guards, workflow, confirmação, retry e rollback | `WorkflowIR` e replay seguro |
| Ditto | render, geometria, motion, timing e settle | `RenderIR` |
| AI Website Cloner Template | isolamento por feature e checkpoints | diretórios de evidência e contratos |
| SkillUI/npxskillui | tokens, variantes e perfil visual | `DesignSystemIR` e white mode |

Os donors são fontes de técnica. Não são copiados como produtos inteiros nem
substituem a evidência do Koncluí.

## Ordem de execução recomendada

1. autorização e fixture;
2. checklist: criar/editar/publicar;
3. checklist: atribuir/agendar;
4. checklist: executar/concluir com evidência;
5. dashboard e métricas derivadas;
6. usuários, unidades, setores e permissões;
7. notificações e histórico;
8. análises IA, cursos e áreas auxiliares;
9. white mode em toda a superfície paritária;
10. funções novas atrás de flags.

## Critério de encerramento do roadmap

O roadmap só pode ser marcado como concluído quando:

- todas as features prioritárias tiverem `SOURCE TRACE` e `CLONE TRACE`;
- schema, RLS, funções e API locais estiverem versionados e testados;
- cada feature tiver sucesso, erro, retry, cancelamento e reset;
- o differential runner mostrar equivalência em transições distintas, não
  apenas self-diff;
- white mode e dark mode passarem a mesma matriz de estados;
- as funções extras estiverem separadas da paridade e cobertas por testes;
- todas as limitações restantes estiverem registradas sem chamar o produto de
  “fork completo” por inferência.

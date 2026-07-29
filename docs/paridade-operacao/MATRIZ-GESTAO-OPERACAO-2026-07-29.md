# Matriz canônica: gestão → operação

Data da auditoria: 2026-07-29.

Fonte canônica: Konclui autenticado em modo somente leitura e capacidades
publicadas oficialmente. O Ritmika só recebe `PASS` quando o comportamento é
executado nos dois papéis em produção. Presença de campo, tabela, rota, build ou
HTTP 200 não conta como prova funcional.

## Correção de escopo

A certificação anterior provou um caminho técnico gestor → operador, mas não
comparou integralmente o contrato do produto original. A exposição de
`Feito/Não Feito` no portal de gestão foi a evidência de que o escopo estava
errado. Essa rota foi corrigida e agora existe gate específico, mas a paridade
total continua aberta.

## Capacidades observadas no Konclui

| Capacidade | Contrato gestor → operador | Estado Ritmika em 2026-07-29 |
|---|---|---|
| Separação de papéis | Gestor modela, atribui e acompanha; operador responde | `PASS` em produção |
| Atribuição | Unidade, setor, momento e responsável definem quem recebe | `PASS` no caminho QA principal |
| Agenda recorrente | Diária, semanal ou mensal, intervalo, dias e término controlam quando aparece | `PARCIAL`: formulário existia, consumo operacional não |
| Execução única | Aparece somente na ocorrência configurada | `PARCIAL`: metadado existia, consumo operacional não |
| Execução pontual | Gestor decide painel, app, ambos ou desabilitado | `FAIL`: `adhoc_mode` era descartado ao persistir |
| Início pelo app | Operador só inicia quando agenda ou permissão permite | `FAIL`: URL sem `executionId` iniciava sempre |
| Ocorrência recorrente | Nova ocorrência não reutiliza conclusão anterior | `FAIL`: home usava apenas a resposta mais recente do checklist |
| Execução guiada | Um item por vez, anterior/próximo e progresso | `FAIL`: execução atual mostra todos os itens |
| Bloqueio sequencial | Item posterior respeita regra de avanço | `NÃO CERTIFICADO` |
| Evidência | Foto obrigatória bloqueia conclusão | `PASS` em produção |
| Vídeo, assinatura e GPS | Tipos avançados de evidência e contexto | `NÃO CERTIFICADO` |
| Número com até 3 casas | Entrada e persistência numérica móvel | `PARCIAL`, implementação local ainda requer publicação e prova |
| PIN/biometria e sessão | Troca rápida e sessão nativa | `NÃO CERTIFICADO` |
| Push, tempo real e WhatsApp | Alertas e acompanhamento operacional | `NÃO CERTIFICADO` |

## Gate obrigatório

Cada linha deve ter:

1. configuração criada pelo gestor em fixture QA isolada;
2. persistência conferida no Supabase;
3. efeito observado na home do operador;
4. ação executada pelo operador;
5. resultado e histórico vistos pelo gestor;
6. zero erro de runtime e resposta HTTP com falha;
7. prova repetida no bundle publicado.

## Primeiro defeito estrutural corrigido localmente

O contrato de disponibilidade foi centralizado em
`client/src/domain/checklistAvailability.js`. A home operacional passa a:

- respeitar recorrência, execução única e permissão pontual;
- manter uma execução em andamento visível;
- separar ocorrências recorrentes pela chave do dia;
- não reutilizar uma conclusão antiga como se fosse a ocorrência atual.

O construtor agora persiste `adhoc_mode`, e a tela operacional bloqueia início
fora da agenda/canal. A publicação e a prova autenticada em produção ainda são
obrigatórias antes de mudar essas linhas para `PASS`.

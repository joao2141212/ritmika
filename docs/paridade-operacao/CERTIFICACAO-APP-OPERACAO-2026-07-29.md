# Certificação do App de Operação em produção

Data: 2026-07-29  
Produção: `https://ritmikapp.netlify.app`  
Escopo mutável: somente workspace `ritmika_qa`  
Konclui: somente leitura

## Contrato público observado no Konclui

As páginas oficiais do aplicativo descrevem estas capacidades para o colaborador:

- visualizar apenas tarefas atribuídas;
- executar checklists de forma guiada;
- concluir atividades;
- anexar fotos e comentários;
- receber alertas e lembretes;
- trabalhar com agendamento, frequência e responsabilidade;
- usar busca e navegação móvel dedicada.

Referências:

- Google Play: `https://play.google.com/store/apps/details?id=com.konclui.app`
- App Store: `https://apps.apple.com/br/app/konclu%C3%AD/id6747088270`

## Prova executada no Ritmika

Comando canônico:

```bash
npx --yes dotenv-cli -e .env -- node supabase/scripts/auth/write/production-operation-e2e.mjs --apply
```

Sinal final em produção:

- status `ok`;
- gestor autenticado enxergou quatro perfis do workspace QA;
- construtor abriu e permitiu selecionar o operador;
- checklist foi publicado e atribuído pela interface de gestão;
- operador recebeu a atividade no App de Operação;
- rota de gestão foi bloqueada para o operador;
- execução abriu em viewport móvel;
- conclusão sem evidência obrigatória foi bloqueada;
- evidência de imagem foi enviada;
- comentário e `datetime` foram preenchidos;
- progresso foi salvo e restaurado depois de recarregar a URL com `executionId`;
- execução foi concluída;
- aviso de conclusão apareceu no App de Operação;
- histórico refletiu a execução;
- banco confirmou `3/3`, `100%` e `is_finished=true`;
- busca sem acento encontrou título acentuado;
- perfil operacional carregou;
- logout concluiu;
- nenhuma resposta HTTP falhou;
- nenhum erro de runtime foi registrado.

Artefatos locais gerados:

- `evidence/production-operation-e2e.json`
- `evidence/prod-operation-e2e-completed.png`
- `evidence/manager-reference-visibility.png`

## Correções exigidas pela prova

- RLS de notificações passou a aceitar INSERT somente para o próprio perfil operacional no mesmo workspace.
- Notificação de conclusão passou a incluir o número da tentativa na chave idempotente.
- `datetime` importado do Konclui passou a usar controle `datetime-local`, assim como `date_time`.
- encerramento intencional do realtime no logout deixou de gerar falso erro `CLOSED`.
- gate de atribuição passou a esperar `<option>` no estado `attached`, não `visible`.

Commits publicados:

- `2d61111` — notificação operacional e RLS;
- `d21b897` — cobertura completa do fluxo e cleanup realtime;
- `1fa3bee` — atribuição pela gestão, evidência, comentário e compatibilidade de data.

## Ainda não certificado como paridade

Estes itens continuam abertos e não podem ser apresentados como prontos:

- entrega nativa de push notification e entrega real de e-mail;
- operação offline e sincronização posterior;
- captura GPS nativa com permissão e precisão;
- leitura real de QR code/código de barras pela câmera;
- assinatura gráfica; hoje existe somente entrada textual;
- atribuição herdada por unidade, setor ou papel; a prova atual usa responsável direto;
- inventário autenticado exaustivo de todas as telas do aplicativo original.

O App de Operação está certificado para o ciclo direto de gestão, atribuição,
execução guiada, foto obrigatória, comentário, data/hora, persistência,
conclusão, aviso, histórico, isolamento de acesso, perfil e logout. Isso não é
uma declaração de paridade total enquanto os itens acima permanecerem abertos.

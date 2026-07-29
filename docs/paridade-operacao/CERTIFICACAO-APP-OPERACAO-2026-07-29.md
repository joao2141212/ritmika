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
- Site oficial: `https://konclui.com/`
- Artigo oficial sobre evidências: `https://blog.konclui.com/checklists-inteligentes-konclui/`

### Capacidades adicionais confirmadas nas fontes oficiais

O histórico público de versões e o material oficial do Konclui também confirmam:

- evidência em vídeo;
- assinatura digital;
- localização precisa/GPS vinculada à execução;
- bloqueio sequencial dos itens;
- campo numérico com teclado próprio e até três casas decimais;
- troca rápida de usuário por PIN ou reconhecimento facial;
- verificação facial;
- manutenção da sessão autenticada;
- notificações push;
- respostas em tempo real no aplicativo para perfis de gestão;
- navegação inferior, busca rápida e filtros de unidade/usuário;
- avanço automático depois de marcar itens do tipo `check`;
- avaliação de evidência fotográfica por IA;
- alerta de desvio pelo WhatsApp.

Esses recursos agora fazem parte do inventário obrigatório de paridade. A
existência na fonte oficial não significa que estejam certificados no Ritmika.

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
- assinatura digital gráfica; hoje existe somente entrada textual;
- evidência em vídeo;
- bloqueio sequencial configurável dos itens;
- avanço automático para o próximo item do tipo `check`;
- campo numérico móvel com contrato de até três casas decimais;
- troca rápida de usuário por PIN ou biometria;
- verificação facial;
- persistência de sessão autenticada em reinício real do aplicativo;
- respostas em tempo real no App de Operação para perfis de gestão;
- avaliação/rejeição de evidência fotográfica por IA;
- entrega real de alertas de desvio pelo WhatsApp;
- atribuição herdada por unidade, setor ou papel; a prova atual usa responsável direto;
- inventário autenticado exaustivo de todas as telas do aplicativo original.

## Matriz executável de paridade operacional

| Capacidade do Konclui | Estado Ritmika | Prova atual |
| --- | --- | --- |
| Login do operador | Certificado | E2E de produção |
| Ver somente tarefas atribuídas | Certificado no fluxo direto | E2E de produção e bloqueio das rotas de gestão |
| Execução guiada | Certificado no fluxo direto | Abertura, resposta, persistência e conclusão |
| Foto obrigatória | Certificado | Conclusão bloqueada sem imagem e upload real |
| Comentário | Certificado | Fixture de capacidade `3/3` |
| Data e hora | Certificado | Fixture de capacidade `3/3` |
| Busca sem depender de acento | Certificado | Busca por título acentuado sem acento |
| Histórico | Certificado | Conclusão refletida no histórico |
| Aviso interno de conclusão | Certificado | Notificação visível no App de Operação |
| Responsável direto | Certificado | Gestor seleciona e publica para o operador |
| Push/e-mail reais | Aberto | Nenhuma entrega nativa certificada |
| GPS/localização precisa | Aberto | Nenhuma captura nativa certificada |
| Vídeo | Aberto | Nenhuma captura/upload de vídeo certificado |
| Assinatura digital | Aberto | Entrada textual não equivale a assinatura gráfica |
| Sequenciamento obrigatório | Aberto | Nenhum gate de ordem certificado |
| Número com três casas decimais | Aberto | Contrato e teclado móvel não certificados |
| PIN/biometria/troca rápida | Aberto | Fluxo inexistente ou não certificado |
| Persistência após reiniciar app | Aberto | Reload web foi provado; reinício nativo não |
| Respostas em tempo real para gestor no app | Aberto | Não certificado no App de Operação |
| IA de evidência fotográfica | Aberto | Nenhuma aceitação/rejeição automática certificada |
| WhatsApp de desvio | Aberto | Nenhuma entrega real certificada |
| Offline e sincronização | Aberto | Nenhum cenário offline certificado |

Última reexecução do E2E de produção: `2026-07-29T04:11:19.691Z`, status
`ok`, execução interativa em `1392 ms`, sem falhas HTTP e sem erros de runtime.

O App de Operação está certificado para o ciclo direto de gestão, atribuição,
execução guiada, foto obrigatória, comentário, data/hora, persistência,
conclusão, aviso, histórico, isolamento de acesso, perfil e logout. Isso não é
uma declaração de paridade total enquanto os itens acima permanecerem abertos.

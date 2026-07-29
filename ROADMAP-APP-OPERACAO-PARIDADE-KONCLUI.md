# Roadmap canônico: App de Operação Ritmika e paridade com Koncluí

**Projeto canônico:** `/Users/pedroduarte/Documents/ritmika`

**Portal de gestão existente:** `https://ritmikapp.netlify.app/`

**App de Operação existente:** `https://ritmikapp.netlify.app/app`

**Workspace real de referência:** Nonna Célia, importado do Koncluí, somente leitura como fonte

**Workspace de implementação e testes:** Ritmika QA
**Regra:** nunca usar o cliente real como fixture mutável; validar leitura e autenticação real, mas criar e concluir cenários somente no workspace QA.

## 1. Objetivo e limite de conclusão

Entregar um App de Operação responsivo e preparado para Capacitor no qual qualquer pessoa autorizada de um estabelecimento consiga receber, executar e acompanhar suas rotinas. O produto não deve usar o termo `funcionário` como conceito técnico fixo; o papel canônico é `operator`, exibido com texto contextual configurável.

Paridade só pode ser declarada quando existir uma matriz comparativa preenchida com evidência do Koncluí e prova equivalente no Ritmika. Presença de código, build verde, HTTP 200 ou uma execução isolada não certificam paridade.

## 2. Estado comprovado em 29/07/2026

- `/app` possui shell próprio e não redireciona para a gestão.
- Barra inferior operacional usa posicionamento fixo e foi medida em viewport `390x844`, permanecendo na mesma posição após rolagem.
- O App de Operação lista atividades atribuídas, busca e filtra por situação.
- Fluxo QA concluído pela interface: criação e publicação na gestão, atribuição ao operador, aparição no `/app`, início, resposta e conclusão com 100%.
- Workspace Nonna Célia possui 15 operadores com logins Auth individuais usando os e-mails reais importados.
- Prova pós-reconciliação: 15/15 autenticações, 13 contas com 58 checklists atribuídos e zero leitura de outro workspace.
- Credenciais temporárias ficam somente em `.env.customer-logins.local`, ignorado pelo Git.
- Ainda não existe certificação comparativa completa do App de Operação do Koncluí.

## 3. Fontes de verdade

1. **Koncluí autenticado:** inspeção visual e DOM das telas do operador; tráfego de rede somente leitura; respostas REST usadas pela própria sessão; nenhum POST, PUT, PATCH ou DELETE no cliente.
2. **Ritmika QA:** fonte mutável para criar, atribuir, executar, falhar, retomar e concluir cenários.
3. **Supabase Ritmika:** esquema, RLS, Auth, Realtime, Storage e telemetria estruturada.
4. **Código canônico:** checkout `/Users/pedroduarte/Documents/ritmika` e índice CBM atualizado.
5. **Evidências:** artefatos sanitizados em `evidence/`, sem tokens, senhas, dados pessoais desnecessários ou conteúdo privado do cliente.

## 4. Fase 0: inventário comparativo do Koncluí

### 4.1 Acesso e personas

- Confirmar a URL e o fluxo de login do app operacional original.
- Identificar os papéis que podem entrar no app operacional.
- Registrar redirecionamento inicial, recuperação de sessão, troca de workspace/unidade e logout.
- Mapear permissões por papel sem inferir pela aparência.

### 4.2 Navegação e superfícies

Para cada tela do Koncluí, registrar rota, propósito, dados de entrada, ações, estados e resultado:

- Início/rotina do dia.
- Lista de atividades.
- Calendário ou agenda, caso exista.
- Detalhe e execução do checklist.
- Histórico de execuções.
- Notificações/avisos.
- Perfil e preferências.
- Ajuda/suporte, caso faça parte do app operacional.
- Estados globais: offline, sessão expirada, atualização disponível e erro inesperado.

### 4.3 Rede e contratos

- Capturar endpoints GET usados por cada tela.
- Registrar parâmetros, paginação, filtros, status e campos realmente consumidos.
- Relacionar chamadas de escrita observadas sem executá-las no cliente.
- Mapear upload e recuperação de evidências.
- Mapear polling, broadcast, retry, cache e invalidação.
- Salvar exemplos sanitizados e esquema inferido, nunca credenciais ou tokens.

### Entregável da Fase 0

Criar `docs/paridade-operacao/MATRIZ-KONCLUI-RITMIKA.md` com uma linha por capacidade e colunas:

| Capacidade | Koncluí: evidência | Contrato observado | Ritmika atual | Lacuna | Implementação | Teste | Status |
|---|---|---|---|---|---|---|---|

Nenhuma linha pode receber `paridade` sem evidência dos dois lados.

## 5. Fase 1: modelo de domínio e autorização

### 5.1 Identidade e tenancy

- Garantir Auth individual por pessoa.
- Manter `workspace_id`, `profile_id` e `role` em `app_metadata`, nunca em `user_metadata` para autorização.
- Validar membership, perfil, role, unidade e setor em todas as consultas.
- Permitir uma pessoa em múltiplos workspaces sem misturar dados.
- Definir troca de workspace quando houver mais de um vínculo.
- Manter scripts canônicos para provisionar, reconciliar e verificar acessos.

### 5.2 Atribuição

- Suportar responsável individual, grupo/papel, setor e unidade quando observados no original.
- Definir precedência entre atribuições diretas e herdadas.
- Impedir que o operador veja atividades fora do próprio escopo.
- Manter histórico de reatribuição e autoria.

### 5.3 Ciclo da execução

Estados mínimos a validar contra o Koncluí:

- agendada;
- disponível;
- não iniciada;
- em andamento;
- pausada, se aplicável;
- atrasada;
- concluída;
- não aplicável;
- cancelada ou arquivada, se aplicável;
- falha de sincronização.

Toda transição deve ser idempotente, auditável e protegida por RLS.

### Entregáveis da Fase 1

- Migration limpa e idempotente para lacunas reais.
- Políticas RLS com testes positivos e negativos.
- Scripts em `supabase/scripts/` para inventário, fixture QA, verificação e manutenção.
- Markdown canônico atualizado em cada pasta tocada.

## 6. Fase 2: experiência principal do App de Operação

### 6.1 Shell mobile e Capacitor-ready

- Barra inferior realmente fixa com safe area.
- Cabeçalho compacto e contexto atual.
- Touch targets mínimos de 44px.
- Sem overflow horizontal entre 320px e tablet.
- Suporte a retrato e paisagem.
- `viewport-fit=cover` e safe areas.
- Navegação por rotas estáveis e deep links.
- Nenhuma função essencial dependente de hover.
- Preparar contratos para câmera, galeria, localização, QR e notificações nativas.

### 6.2 Início

- Saudação e contexto do workspace/unidade.
- Resumo: atribuídas, a iniciar, em andamento, atrasadas e concluídas.
- Próxima ação prioritária explicável.
- Progresso diário/semanal quando sustentado pelos dados.
- Atualização por broadcast com fallback de polling e retry exponencial.
- Skeleton, vazio, erro, degradado e offline.

### 6.3 Lista e agenda

- Busca textual.
- Filtros por status, período, unidade, setor e momento quando autorizados.
- Agrupamento por hoje, próximas e atrasadas.
- Ordenação determinística por urgência e prazo.
- Indicadores claros de recorrência, obrigatoriedade e evidência.
- Paginação ou carregamento incremental sem perder estado ao trocar de rota.

### 6.4 Detalhe e execução

- Check/binário.
- Texto curto e longo.
- Número com faixa e unidade.
- Seleção única e múltipla.
- Data e hora.
- Foto, vídeo e arquivo quando suportados.
- GPS com consentimento e estado de permissão.
- Código de barras e QR.
- Assinatura.
- Separadores e instruções ricas sem exibir HTML cru.
- Condições de visibilidade.
- Obrigatoriedade e “não se aplica” com justificativa quando necessário.
- Evidência obrigatória e múltiplas evidências.
- Salvamento incremental idempotente.
- Retomada exata após fechar, perder rede ou expirar sessão.
- Confirmação antes de concluir quando houver impacto irreversível.

### 6.5 Resultado e feedback

- Confirmação inequívoca da conclusão.
- Pontuação e indicadores somente quando calculados pelo backend.
- Pendências ou reprovação com motivo e ação seguinte.
- Link para histórico e nova execução quando permitido.

## 7. Fase 3: histórico, avisos e perfil

### Histórico

- Lista paginada das próprias execuções.
- Filtros por período, status e checklist.
- Detalhe somente leitura com respostas e evidências autorizadas.
- Estado de sincronização e correção/reabertura quando permitido.

### Avisos

- Broadcast do workspace e mensagens destinadas ao usuário.
- Lido/não lido, deep link e paginação.
- Realtime com reconexão e fallback.
- Preparação para push via Capacitor sem duplicar notificações.

### Perfil

- Nome, papel, workspace, unidade e setor conforme autorização.
- Preferências de idioma, fuso e notificação quando implementadas.
- Troca de senha/recuperação pelo fluxo seguro do Supabase.
- Logout e revogação local da sessão.

## 8. Fase 4: offline, sincronização e resiliência

- Definir explicitamente o que funciona offline.
- Cache local criptografado para dados operacionais sensíveis.
- Fila idempotente de respostas e evidências.
- IDs de operação estáveis para evitar duplicação.
- Resolução de conflito definida por tipo de dado.
- Indicador visível: salvo localmente, sincronizando, sincronizado ou falhou.
- Retry manual e automático com backoff.
- Recuperação de sessão sem tela branca ou limbo.
- Tratamento de chunk desatualizado distinguindo deploy de falha real.
- Telemetria com função, estado, causa, entidade e correlation ID.

## 9. Fase 5: integração com a gestão

Provar que toda informação exibida no App de Operação possui caminho de criação na gestão:

- criar modelo;
- publicar;
- atribuir;
- agendar;
- editar sem corromper execuções anteriores;
- acompanhar em andamento;
- receber conclusão e evidências;
- reabrir/corrigir quando autorizado;
- notificar;
- arquivar sem apagar histórico.

Executar o ciclo inverso: cada ação operacional precisa refletir no dashboard, detalhe, ranking ou histórico correspondente sem refresh manual desnecessário.

## 10. Fase 6: QA diferencial e certificação

### Fixtures

- Usar somente workspace e contas QA.
- Fixture idempotente para cada tipo de item e estado.
- Comando de recriação documentado.
- Dados genéricos de estabelecimento, nunca hardcoded para restaurante.

### Matriz de testes

- Gestão cria, publica e atribui.
- Operador recebe por escopo correto.
- Operador inicia, salva, sai e retoma.
- Operador conclui com cada tipo de item.
- Gestão recebe resultado e evidência.
- Operador não acessa outro usuário ou workspace.
- Gestor mobile continua funcional.
- App de Operação funciona em 320, 390, 768 e paisagem.
- Safari iOS, Chrome Android e desktop.
- Rede lenta, offline, reconexão e sessão expirada.
- Broadcast falha e polling assume sem duplicar dados.

### Evidência mínima por capacidade

- Screenshot ou DOM do Koncluí.
- Contrato de rede sanitizado quando relevante.
- Screenshot ou DOM do Ritmika.
- Teste automatizado ou script canônico.
- Registro do dado no Supabase e isolamento RLS.

## 11. Critérios para declarar paridade real

Só declarar paridade quando:

1. 100% das linhas da matriz estiverem classificadas como `equivalente`, `melhorado` ou `não aplicável com justificativa`.
2. Nenhuma capacidade essencial estiver mockada.
3. Todos os tipos de item observados no Koncluí tiverem criação, execução, persistência e leitura histórica.
4. Auth, tenancy e RLS passarem em testes de isolamento.
5. O ciclo gestão → operação → gestão passar fim a fim.
6. Estados loading, vazio, sucesso, erro, degradado, offline e retry estiverem cobertos.
7. Mobile não tiver overflow, controles inacessíveis ou navegação que acompanha o conteúdo.
8. Build, testes e deploy estiverem verdes.
9. O deploy publicado for testado, não apenas o build local.
10. Lacunas restantes estiverem explicitamente aceitas por Pedro, nunca omitidas.

## 12. Ordem executável imediata

1. Abrir o app operacional autenticado do Koncluí e preencher a matriz tela por tela.
2. Capturar contratos REST e tipos de item em modo somente leitura.
3. Comparar com rotas, componentes, serviços e tabelas atuais do Ritmika via CBM.
4. Classificar lacunas P0, P1 e P2.
5. Implementar P0: acesso, atribuição, execução, evidência, retomada, conclusão e isolamento.
6. Implementar P1: histórico completo, avisos, realtime, offline básico e feedback.
7. Implementar P2: refinamentos analíticos e recursos adicionais não essenciais.
8. Rodar fixtures QA e testes diferenciais.
9. Validar o deploy publicado em mobile e desktop.
10. Atualizar a matriz, este roadmap e o handoff canônico.

## 13. Pendências que não podem ser esquecidas

- Descobrir e provar a superfície completa do app operacional original do Koncluí.
- Não confundir portal de gestão responsivo com App de Operação.
- Não usar `funcionário` como entidade rígida ou nome de produto.
- Não usar dados do cliente como fixture mutável.
- Não declarar que credenciais foram entregues: elas existem localmente, mas envio ao cliente exige canal e autorização explícitos.
- Não expor `.env.customer-logins.local`, senhas, tokens ou secret key no Git, logs ou documentação.
- Reindexar CBM após mudanças relevantes.

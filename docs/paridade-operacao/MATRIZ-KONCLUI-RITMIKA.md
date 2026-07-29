# Matriz de paridade: App de Operação Koncluí x Ritmika

**Atualização:** 2026-07-29

**Koncluí:** somente leitura

**Ritmika:** mutações somente no workspace `ritmika_qa`
**Regra:** código presente, HTTP 200 e build verde não equivalem a teste fim a fim.

## Fontes observadas

- Aplicativo oficial Android: `https://play.google.com/store/apps/details?id=com.konclui.app`
- Aplicativo oficial iOS: `https://apps.apple.com/br/app/konclu%C3%AD/id6747088270`
- Bundle público do Portal do Gestor: `https://app.konclui.com/assets/index-MxpUMiZj.js`
- Prova Ritmika: `docs/QA-E2E-CONTA-E-TAREFA-2026-07-29.md`
- Sweep autenticado: `supabase/scripts/auth/read/production-ui-sweep.mjs`
- Rotas Ritmika: `client/src/App.jsx`

O inventário oficial do Koncluí 1.8.0 informa navegação inferior, busca rápida,
telas de checklists, setores e respostas, filtro por unidade e usuário no
cabeçalho do dia, execução guiada, foto, comentário, push/e-mail, atribuição,
horários, frequência e múltiplas unidades/equipes. A sessão autenticada do
cliente ainda precisa ser recapturada para detalhar DOM e contratos GET sem
executar escrita.

## Matriz executável

| Capacidade | Koncluí: evidência | Ritmika atual | Prova Ritmika | Lacuna/ação | Status |
|---|---|---|---|---|---|
| Login exclusivo por pessoa | App oficial exclusivo para colaboradores das empresas clientes | Supabase Auth individual e redirecionamento por papel | Conta QA operacional autenticou e foi enviada para `/app` | Revalidar sessão expirada e recuperação de senha | parcial |
| Isolamento por workspace | App oficial declara múltiplas lojas/equipes separadas | Membership, perfil e RLS por workspace | Inventário: 20 contas, 2 workspaces, zero órfãs; prova 15/15 do cliente sem leitura cruzada | Exercitar teste negativo direto em todas as rotas operacionais | parcial |
| Operador vê somente tarefas atribuídas | Declarado no app oficial | `EmployeeHome` consulta atribuições por usuário, unidade e papel | Checklist QA apareceu para o operador correto | Provar setor, unidade, atribuição herdada e ausência para outro operador | parcial |
| Início/rotina do dia | App oficial e versão 1.8.0 citam cabeçalho do dia | `/app` mostra métricas, prioridade, busca e filtros | Estado populado já observado em QA | Reexecutar sweep operador desktop/mobile | parcial |
| Navegação inferior | Novidade oficial 1.8.0 | Início, Histórico, Avisos e Perfil | Estrutura em `EmployeeLayout` | Falta destino próprio de Tarefas; confirmar composição exata no original | lacuna |
| Busca rápida | Novidade oficial 1.8.0 | Busca textual dentro da home | Código presente | Testar com acento, sem acento e espaços em produção | não testado |
| Tela de checklists/tarefas | Tela citada no changelog oficial | Lista embutida na Home, sem rota própria | Uma tarefa QA listada | Criar rota/destino Tarefas se confirmado no original | lacuna |
| Setores no app operacional | Tela citada no changelog oficial | Setor não possui superfície operacional própria | Nenhuma prova E2E | Capturar comportamento original e implementar somente se for ação do operador | lacuna |
| Respostas/histórico | Tela e filtros citados no changelog oficial | `/app/history` lista execuções próprias | Conclusão QA apareceu no histórico | Falta detalhe somente leitura, evidências e filtros equivalentes | parcial |
| Filtro por unidade e usuário | Changelog oficial cita filtros no cabeçalho do dia da aba Respostas | Operador não possui filtro equivalente | Nenhuma prova | Confirmar autorização e implementar sem permitir leitura fora do escopo | lacuna |
| Iniciar execução | Execução guiada oficial | Inicia resposta e fixa `executionId` na URL | Passou no cenário QA | Automatizar novamente no gate recorrente | passou isolado |
| Salvar e retomar | Execução guiada oficial | Salva respostas incrementalmente | Recarregou a URL mantendo 1/1 e 100% | Provar perda de rede, duplicação e sessão expirada | parcial |
| Concluir | Operador avança até finalizar | Valida obrigatórios/evidências e conclui | Status concluído e 100% confirmados no operador e gestor | Provar idempotência por repetição de request | parcial |
| Executar novamente/reabrir | Ainda não confirmado no original | Retry limpa respostas, registra evento e notifica | Código e banco presentes | Executar E2E próprio e confirmar permissão | não testado |
| Resposta binária | Execução guiada | Feito/Não feito/Não se aplica | Cenário simples passou | Cobrir N/A com justificativa | parcial |
| Texto/comentário | App oficial declara comentários | Textarea genérica por item | Código presente | Provar persistência e exibição no histórico | não testado |
| Seleção única | Contrato autenticado ainda não recapturado | `selection` via select | Código presente | Criar fixture e executar E2E | não testado |
| Seleção múltipla | Contrato autenticado ainda não recapturado | Não existe controle múltiplo | Nenhuma | Implementar após confirmar schema original | lacuna |
| Número/faixa/unidade | Contrato autenticado ainda não recapturado | Número simples | Código presente | Faixa/unidade e validação não comprovadas | lacuna |
| Data e hora | Contrato autenticado ainda não recapturado | `datetime-local` | Código presente | Criar fixture e executar E2E | não testado |
| Foto/vídeo/arquivo | App oficial declara foto; políticas listam foto/vídeo | Upload aceita imagem, PDF e vídeo | Serviço de evidência presente | Upload, URL assinada e download ainda sem E2E operacional | não testado |
| Evidência obrigatória | App oficial sustenta comprovação da execução | Bloqueia conclusão sem evidência requerida | Código presente | Criar fixture e provar bloqueio, upload e conclusão | não testado |
| GPS | Loja oficial declara coleta de localização precisa | Campo textual “latitude, longitude” | Nenhuma prova | Não é captura GPS real; implementar consentimento/permissão nativa | lacuna crítica |
| Código de barras/QR | Contrato autenticado ainda não recapturado | Campo textual | Nenhuma prova | Não é scanner; implementar câmera/plugin e fallback seguro | lacuna crítica |
| Assinatura | Contrato autenticado ainda não recapturado | Campo textual com nome | Nenhuma prova | Não é assinatura gráfica; implementar captura real se confirmada | lacuna |
| Alertas e lembretes | App oficial declara push e e-mail para pendência, atraso e item crítico | Avisos internos e notificações de ciclo | Persistência de eventos existe | Push/e-mail, atraso e criticidade sem E2E | lacuna crítica |
| Marcar aviso como lido | Notificações fazem parte do app oficial | `/app/notifications` oferece leitura | Código presente | Testar lido/não lido e persistência | não testado |
| Horário e frequência | App oficial declara horários e frequência | Atribuições carregam contexto de execução | Sem prova completa | Criar recorrência QA e verificar próxima ocorrência | lacuna |
| Multiunidade/multiequipe | Declarado no app oficial | Membership e unidades existem | Isolamento de workspace provado | Escopo por setor/unidade ainda sem E2E | parcial |
| Perfil e logout | Login é exclusivo a colaboradores | `/app/profile` e logout | Logout já implementado | Revalidar perfil, logout e bloqueio de back navigation | não testado |
| Bloqueio das rotas de gestão | Implícito pela separação do app do colaborador | `ProtectedRoute audience="manager"` | Estrutura presente | Sweep operador deve provar `/`, `/team`, `/configurations` e `/master` bloqueadas | em execução |
| Offline e sincronização | Não confirmado no material oficial público | Não existe fila offline certificada | Nenhuma | Definir contrato Capacitor e fila idempotente antes de chamar de app resiliente | lacuna crítica |

## Critério de certificação

Uma linha muda para `paridade` somente após:

1. evidência do Koncluí autenticado em leitura;
2. fixture QA reproduzível;
3. ação real no Ritmika;
4. confirmação do efeito no Supabase/Storage/telemetria;
5. repetição segura ou teste de idempotência;
6. prova mobile e desktop quando a capacidade tiver interface.

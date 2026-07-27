# Fork Notes

## Alvo

- URL original: `https://app.konclui.com/`
- Projeto local: `/Users/pedroduarte/Documents/ritmika`
- Data da observação: 2026-07-27, America/Sao_Paulo
- Viewport observado: 1440x932 no Chrome; a recon segura também cobre 1440x900, 1024x900 e 390x844

## Autorização e limites

- Pedro informou que o acesso ao painel foi autorizado pelos gestores.
- A sessão observada era autenticada e foi tratada como ambiente operacional, não como conta de teste confirmada.
- Não persistir cookies, tokens, senhas ou valores de storage. Quando o
  proprietário autorizar a cópia de dados reais, o export bruto fica somente
  em staging local controlado, fora do Git, da memória e dos logs do agent.
- Fora do escopo desta fase: mutações no Koncluí, envio de mensagens, alteração de permissões e inferência de backend privado.

## Evidência atual

- `SOURCE`: shell, navegação, DOM, Network/CDP e caminhos REST/RPC observados no painel autenticado.
- `PARTIAL`: contratos completos de módulos não exercitados, mídia/evidências, jobs e efeitos server-side ainda não foram fechados.
- `GUESS`: nenhum comportamento privado deve ser considerado confirmado.
- `REBUILT`: primeiro fluxo local de checklists, contagem, histórico e criação, usando somente fixtures sintéticas.

## Estado

- Nível atual: L3 do original, com vertical remoto operacional e persistente; não é paridade completa de backend.
- Validação local: build Vite passou; smoke no navegador confirmou busca, contagem, histórico após reload e criação após reload.
- Lint: passou sem erros ou avisos; o aviso restante é apenas de atualização do pacote Baseline.
- Próxima etapa: fechar somente mídia/evidências históricas, notificações históricas
  da fonte e cobertura responsiva antes de qualquer afirmação de paridade total.

## Fechamento do vertical remoto

- A migração operacional aplicada no Supabase é
  `supabase/migrations/20260727_ritmika_operational_schema.sql`.
- O backfill verificado tem 351 itens e 351 produtos, todas as novas tabelas
  com RLS e bucket privado de evidências.
- O dashboard, equipe, configurações, contagem, histórico, detalhes,
  notificações e execução autenticada estão ligados ao workspace remoto.
- White mode foi aplicado à casca, dashboard e telas funcionais. O screenshot
  autenticado do dashboard confirmou sidebar, cards e fila em superfície clara.
- `npm run build` e `npm run lint` passaram no cliente.
- A cópia de origem permanece somente leitura. A importação histórica de
  evidências/mídia ainda é um limite explícito; uploads novos no Ritmika estão
  implementados no Storage privado.

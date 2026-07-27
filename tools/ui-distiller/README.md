# UI Distillation Compiler

Pacote reutilizável para transformar uma interação observada em estado,
transição, contrato, state machine, trace e plano de teste diferencial.

## Instalação e validação

```bash
cd /Users/pedroduarte/Documents/ritmika/tools/ui-distiller
node scripts/install.mjs
npx playwright install chromium
npm run validate
```

## Captura segura

O caminho padrão abre uma sessão Playwright nova e grava apenas snapshots
sanitizados, rede sem corpos, eventos sem valores e digest de storage sem
valores:

```bash
npm run capture -- \
  --url http://127.0.0.1:8080/checklists \
  --app ritmika \
  --feature checklists \
  --side clone \
  --out ./evidence/clone/ritmika-checklists
```

Screenshots, corpos de resposta e `storage-state` exigem a flag explícita
`--authorized-test-account`. Nunca use a sessão operacional do Koncluí para
capturar fixtures ou evidências persistentes.

## Núcleos

- `capture/`: CDP DOMSnapshot, AX tree, CSS, event listeners, foco/seleção,
  layout, overlays, storage, rede, WebSocket/EventSource, rrweb opcional e
  detector de settle.
- `compiler/`: fingerprint canônico, transição, contrato, state machine e
  plano de teste.
- `diff/`: DOM, AX, layout, visual, rede, storage e deltas de transição.
- `replay/`: Semantic Flow DSL, import de Recorder/Puppeteer Replay e runner
  diferencial source/clone.
- `explorer/`: frontier de ações e classificação read-only/reversível/mutável/
  destrutiva.
- `redaction/`: headers, payloads, strings pessoais, corpos e storage.

O pacote não afirma paridade Notion/Trello sem `SOURCE TRACE` e `CLONE TRACE`.
Os dois fluxos iniciais estão apenas como Semantic Flow specs em
`examples/flows/`, aguardando sessões sintéticas autorizadas.

## Alinhamento com a referência canônica

O kit operacional compartilhado fica em:

```text
/Users/pedroduarte/Documents/fork-builds/tools/app-fork-recovery/ui-distiller
```

Este pacote local mantém a implementação isolada do fork e agora expõe os
IRs `RenderIR`, `DesignSystemIR`, `WorkflowIR`, `CausalTrace`,
`VisualGrounding` e `UnifiedCloneSpec`, além de `doctor`, `capture-action`,
`recording-to-flow`, `compile`, `graph`, `diff` e `unified-spec`.

Para uma extração autorizada do app-alvo, use primeiro o kit compartilhado e
persista no clone apenas evidência redigida e fixtures sintéticas.

`UnifiedCloneSpec.status` permanece `incomplete` por padrão. Só pode virar
`complete` quando o contrato receber prova de fixture, API/DB local, UI local,
recuperação de erro/retry/cancelamento e diferencial source/clone.

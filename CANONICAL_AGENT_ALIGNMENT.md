# Alinhamento com o agent canônico de extração

## Fonte operacional

A referência recebida em 2026-07-27 define como fonte do agent:

```text
/Users/pedroduarte/Documents/fork-builds/tools/app-fork-recovery/
```

O executor compartilhado é:

```text
/Users/pedroduarte/Documents/fork-builds/tools/app-fork-recovery/ui-distiller/
```

O pacote em `tools/ui-distiller` do Ritmika é a integração isolada do fork.
Ele não substitui o kit compartilhado nem transforma o app autenticado do
Koncluí em fixture.

## Verificação realizada

- `node scripts/verify-oss-lab.mjs`: `ok: true`; 14 donors com SHA esperado.
- Kit compartilhado `npm run doctor`: `ok: true`; Playwright, CDP MCP,
  Puppeteer Replay, rrweb, axe-core e XState instalados.
- Captura canônica do clone local `/checklists`: 3 viewports, `safeMode: true`,
  118 eventos de rede por viewport, zero erros de console e sem valores de
  credencial ou screenshots persistidos.
- Captura de uma ação local: evento, settle `quiescent`, estado antes/depois e
  transição foram gerados sem body de rede.
- O pacote do fork passou `npm run validate`: build TypeScript e 5 testes.

## IRs e comandos no fork

O pacote local agora expõe:

```text
RenderIR
DesignSystemIR
WorkflowIR
CausalTrace
VisualGrounding
UnifiedCloneSpec
```

Comandos disponíveis:

```bash
npm run doctor
npm run capture-action -- <url> --out <dir> --action click --selector <selector>
npm run recording-to-flow -- <recording.json> --out <flow.json>
npm run compile -- <before.json> <after.json> --action <name> --out <transition.json>
npm run graph -- <transition.json> --out <dir>
npm run diff -- <source.json> <clone.json> --out <report.json>
npm run unified-spec -- --app <name> --feature <name> --states <a.json,b.json> --out <spec.json>
```

## Limite de evidência

Os artefatos gerados em `evidence/canonical-checklists` são somente um smoke
test do clone local. O diferencial de 100% feito contra o próprio artefato é
um teste do compilador, não prova de paridade source/clone.

Ainda não há `SOURCE TRACE` autorizado do Koncluí nem fixture sintética
equivalente para Notion/Trello. Essas features permanecem `incomplete` até
existirem captura antes/depois, confirmação de sucesso, erro/retry/cancelamento
e diferencial entre sistemas distintos.

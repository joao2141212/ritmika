# UI Distillation Architecture

## Modelo

```text
source/clone browser
        |
        v
capture state + one semantic action + settle
        |
        v
UIState -> UITransition -> FeatureContract -> StateMachine
        |                         |
        v                         v
state graph/frontier       differential test plan
```

O estado é composto por visual opcional, AX, DOM/layout, foco/seleção, overlays,
scroll, virtualização, loading, rede e digest de storage. A captura padrão não
persiste cookies, tokens, valores de storage, corpos de resposta ou texto
pessoal integral.

## Sensores

| Sensor | Implementação | Saída |
|---|---|---|
| Playwright | `browser/connect.ts`, `playwright-adapter.ts` | página, locator semântico, screenshot opt-in |
| CDP DOM/AX | `capture-dom.ts`, `capture-accessibility.ts` | DOMSnapshot, AX tree |
| CDP CSS/events | `capture-cdp-deep.ts` | matched/computed styles, listeners, Target auto-attach |
| Runtime/layout | `capture-layout.ts`, `capture-focus-selection.ts`, `capture-overlays.ts` | geometria, caret, focus, overlays |
| Network/storage | `capture-network.ts`, `capture-storage.ts` | requests, status, WebSocket/EventSource, chaves e digest |
| Temporal | `settle-detector.ts`, `capture-events.ts`, `capture-rrweb.ts` | quiescence e eventos ordenados |

## Compilação

`compileTransition` calcula os deltas de uma única ação. A sequência de
transições vira `FeatureContract`, `StateMachineDefinition` e
`DifferentialTestPlan`. O runner executa o mesmo Semantic Flow em adapters
source e clone, sem exigir que os DOMs sejam iguais.

## Limites intencionais

- Adapter semântico de cada produto ainda precisa ser implementado por sessão e
  fixture, pois classes/DOM do original não são contrato.
- rrweb é um bridge opt-in que recebe o bundle `record` explicitamente.
- Nenhum endpoint privado de Notion/Trello é copiado; a rede serve como
  evidência de intenção.

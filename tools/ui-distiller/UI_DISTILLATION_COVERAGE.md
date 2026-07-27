# UI Distillation Coverage

Atualizado em 2026-07-27.

| Área | Estado | Evidência |
|---|---|---|
| UIState e UITransition | implementado | `src/types.ts`, schemas |
| Redaction de headers/payload/strings/storage | implementado e testado | `src/redaction`, `npm test` |
| DOMSnapshot + paint order + rects | implementado | `capture-dom.ts` |
| AX tree | implementado | `capture-accessibility.ts` |
| CSS matched/computed styles | implementado | `capture-cdp-deep.ts` |
| Event listeners e Target auto-attach | implementado | `capture-cdp-deep.ts` |
| foco, seleção, caret e layout | implementado | `capture-focus-selection.ts`, `capture-layout.ts` |
| overlays, loading e settle | implementado | `capture-overlays.ts`, `settle-detector.ts` |
| rede, WebSocket e EventSource | implementado sem corpos por padrão | `capture-network.ts` |
| local/session storage e nomes IndexedDB | digest sem valores implementado | `capture-storage.ts` |
| rrweb | bridge opt-in implementado | `capture-rrweb.ts` |
| Recorder/Puppeteer Replay import | implementado | `recorder-import.ts` |
| DSL semântica e adapters | núcleo implementado | `replay/` |
| state graph/frontier | núcleo implementado | `explorer/` |
| diffs e compiladores | implementado | `diff/`, `compiler/` |
| Notion source trace | bloqueado | sessão sintética autorizada não fornecida |
| Trello source trace | bloqueado | sessão sintética autorizada não fornecida |
| differential pass Notion/Trello | bloqueado | sem source/clone traces |

Não há cobertura declarada para estados privados, permissões, dados pessoais,
rollback real ou backend privado sem um trace autorizado e uma fixture isolada.

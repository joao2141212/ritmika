# src.md

Implementação TypeScript do UI Distiller.

## Arquivos

- canonical-cli.ts: superfície CLI canônica.
- cli.ts: entrada auxiliar de CLI.
- index.ts: exports públicos do pacote.
- types.ts: tipos compartilhados.

## Subpastas

- browser/browser.md: adapters de navegador/CDP.
- capture/capture.md: captura de DOM, eventos, estilos, rede e estado.
- compiler/compiler.md: compiladores de contratos, máquinas e transições.
- diff/diff.md: comparadores de DOM, layout, rede, storage e visual.
- explorer/explorer.md: exploração de estados e ações seguras.
- ir/ir.md: intermediate representations da reconstrução.
- redaction/redaction.md: redaction de dados sensíveis.
- replay/replay.md: adapters e execução diferencial de replay.

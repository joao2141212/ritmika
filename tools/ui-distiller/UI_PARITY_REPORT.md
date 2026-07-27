# UI Parity Report

## Status

`NOT RUN` para Notion e Trello.

Não existe ainda `SOURCE TRACE -> COMPILED CONTRACT -> IMPLEMENTATION -> CLONE
TRACE -> DIFFERENTIAL PASS` desses produtos. O pacote fornece o compilador e os
adapters, mas não deve inventar o comportamento nem capturar sessões pessoais.

## Motivo do bloqueio

- nenhuma sessão sintética Notion foi fornecida;
- nenhuma sessão sintética Trello foi fornecida;
- não há fixture/reset autorizado para os dois vertical slices;
- portanto parity score é `N/A`, não zero.

## Próxima execução autorizada

1. fornecer workspace/board sintético e autorização explícita;
2. gravar uma ação por trace;
3. importar Recorder quando o gesto exigir demonstração humana;
4. capturar source e clone com a mesma Semantic Flow;
5. compilar contratos e executar o runner diferencial;
6. publicar score somente com evidência completa.

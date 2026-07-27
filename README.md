# Ritmika

Reconstrução local incremental do fluxo de checklists, sem exportar banco,
sessão autenticada ou dados de clientes do Koncluí.

## Rodar o modo local

```bash
cd /Users/pedroduarte/Documents/ritmika/client
npm install
npm run dev -- --host 127.0.0.1
```

O modo local é o padrão. Ele usa fixtures sintéticas e persiste checklists e
contagens no `localStorage` do navegador com chaves `ritmika.production.*`.

## Primeiro fluxo validado

- `/checklists`: lista e busca;
- `/checklists/new`: criação local;
- `/checklists/:id/contagem`: contagem sintética;
- `/checklists/:id/historico`: histórico persistente após reload.

Para preservar a integração existente, o modo remoto continua disponível com
`VITE_DATA_MODE=remote` e as variáveis Supabase correspondentes. Esse caminho
não foi usado pelo smoke local.

O inventário do fork e os limites de evidência estão em
`APP_FORK_MANIFEST.md` e `FORK_NOTES.md`.

## UI Distillation Compiler

O pacote reutilizável de captura comportamental fica em
`tools/ui-distiller`. Ele compila estados, transições, contratos e testes
diferenciais com Playwright/CDP. Consulte
`tools/ui-distiller/IMPLEMENTATION_REPORT.md` antes de usar uma sessão
autenticada.

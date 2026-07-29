# Ritmika

Reconstrução local incremental do fluxo de checklists, sem exportar banco,
sessão autenticada ou dados de clientes do Koncluí.

## Rodar o app conectado ao Supabase

```bash
cd /Users/pedroduarte/Documents/ritmika/client
npm install
npm run dev -- --host 127.0.0.1
```

O app usa Supabase e autenticação real por padrão. Configure `VITE_SUPABASE_URL`
e `VITE_SUPABASE_PUBLISHABLE_KEY` no arquivo local ignorado pelo Git antes de abrir a
aplicação. Não existe login demo nem fallback de dados sintéticos no runtime.

## Fluxos remotos implementados

- `/`: dashboard com dados reais do Supabase;
- `/checklists`: lista e busca remotas;
- `/checklists/new` e `/checklists/:id/edit`: criação e edição remotas;
- `/checklists/:id/execute`: salvar, retomar, concluir e repetir execução;
- `/checklists/:id/contagem` e `/checklists/:id/historico`: contagem e histórico remotos;
- `/notifications`, `/team` e `/settings`: serviços remotos com escopo de workspace.

O runtime não possui login demo, fixtures sintéticas ou fallback local. As
variáveis Supabase precisam estar configuradas no arquivo local ignorado pelo
Git antes de abrir a aplicação.

O inventário do fork e os limites de evidência estão em
`APP_FORK_MANIFEST.md` e `FORK_NOTES.md`.

O catálogo de manutenção de banco, empresas, usuários, roles e senhas está em
`SCRIPT_REGISTRY.md`. Ele é a entrada canônica mesmo quando o indexador exclui
`supabase/scripts/` do grafo técnico.

O inventário canônico de produtos, URLs, rotas, públicos e estado de publicação
está em `ROUTES-AND-SURFACES.md`. Consulte esse arquivo antes de alterar domínio,
roteamento, login, área master, PWA ou App do Funcionário.

## UI Distillation Compiler

O pacote reutilizável de captura comportamental fica em
`tools/ui-distiller`. Ele compila estados, transições, contratos e testes
diferenciais com Playwright/CDP. Consulte
`tools/ui-distiller/IMPLEMENTATION_REPORT.md` antes de usar uma sessão
autenticada.

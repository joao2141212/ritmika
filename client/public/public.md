# public.md

Ativos públicos copiados diretamente para o build do frontend.

## Arquivos

- _redirects: fallback de rotas SPA no Netlify.
  - A regra de `/assets/*` vem antes do fallback para impedir que chunks removidos recebam `index.html` com MIME incorreto.
- favicon.svg: ícone do aplicativo.
- pwa-192x192.png e pwa-512x512.png: ícones PWA.
- vite.svg: ativo padrão mantido para compatibilidade do template.

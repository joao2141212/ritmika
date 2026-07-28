# src.md

Código fonte do frontend Ritmika.

## Arquivos

- App.jsx: composição de rotas e providers; carrega cada tela sob demanda e usa um estado inicial acessível em white mode enquanto Auth ou a rota resolvem.
- App.css: estilos globais associados à composição principal.
- main.jsx: ponto de entrada React.
- index.css: tokens, base global, estado inicial de Auth e `skip-link` acessível.

## Subpastas

- assets/assets.md: ativos importados pelo código React; atualmente reservado.
- components/components.md: componentes e workspaces reutilizáveis.
- context/context.md: contexto de autenticação.
- data/data.md: boundary de dados remoto do Supabase.
- lib/lib.md: logger e cliente Supabase.
- pages/pages.md: telas roteadas.
- services/services.md: fachadas de domínio para as telas.
- styles/styles.md: estilos por módulo.

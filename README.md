# Ritmika

Demo 100% frontend da plataforma de operações gastronômicas rebatizada para Ritmika. Toda a experiência roda em React + Vite consumindo apenas dados mockados persistidos em `localStorage`, permitindo deploy rápido em hosts estáticos (Netlify, GitHub Pages etc.) sem backend.

## 🚀 Scripts úteis

```bash
# Instalar dependências
npm install

# Rodar o front em modo dev (porta 8080)
npm run dev --prefix client

# Build de produção (gera client/dist)
npm run build --prefix client
```

## 🔐 Logins de demonstração
- `pedro@ritmika.com` / `123456`
- `cliente@demo` / `123456`

## 🧩 Principais features
- Autenticação simulada com mock users e token salvo em `localStorage`
- Dashboard, Checklists, Execução, Equipe e Configurações usando dados persistidos
- Sistema de pontos, ranking e histórico atualizados após cada submissão
- Mock APIs centralizadas em `client/src/data/mockData.js` com delays para realismo
- Tema completo Ritmika (logo, ícones, cores e tipografia)

## 📦 Estrutura
```
.
├── client/        # SPA em React + Vite
├── server/        # Backend original (mantido, mas não utilizado no demo)
├── docs/          # Materiais de branding
└── TESTE_FUNCIONAMENTO.md  # Log das correções aplicadas
```

## 🌐 Deploy estático
1. `cd client && npm run build`
2. Publicar a pasta `client/dist` no provedor desejado (Netlify/GitHub Pages)
3. Opcional: ajustar `vite.config.js` caso precise de base path customizado

Pronto! O projeto já está pronto para ser versionado e publicado no GitHub.

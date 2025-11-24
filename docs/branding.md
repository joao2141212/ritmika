# Ritmika – Guia Rápido de Marca

## Essência
- **Nome**: Ritmika
- **Tagline**: "Operações gastronômicas no ritmo certo."
- **Personalidade**: confiante, pragmática e calorosa – fala com líderes de operação que valorizam precisão sem perder o lado humano.

## Proposta de Valor
Ritmika sincroniza rotinas críticas de restaurantes e dark kitchens, combinando checklists inteligentes, alertas em tempo real e insights de equipe. A marca comunica fluidez (ritmo) e técnica (tática), reforçando a ideia de cadência impecável no salão e na cozinha.

## Identidade Visual
- **Logo**: monograma "R" minimalista formado por um traço contínuo com um check embutido no terminal inferior. Sempre usar em fundo escuro ou em bloco sólido da cor `--accent-primary`.
- **Ícone**: mesma construção do monograma dentro de um container arredondado com gradiente diagonal.
- **Uso incorreto**: não girar, distorcer ou aplicar sombras pesadas.

## Paleta Principal
| Token CSS            | Hex      | Uso sugerido                    |
|----------------------|----------|---------------------------------|
| `--accent-primary`   | #F97316  | botões, ícone principal         |
| `--accent-secondary` | #FDBA74  | highlights, micro interações    |
| `--bg-app`           | #05060B  | fundo geral                     |
| `--bg-card`          | #14141A  | cartões, barras laterais        |
| `--text-primary`     | #FDF2E9  | títulos e labels críticos       |
| `--text-secondary`   | #C7C1B8  | descrições                      |
| `--success`          | #10B981  | estados positivos               |
| `--warning`          | #FACC15  | avisos e contadores regressivos |
| `--danger`           | #F87171  | erros e alertas                 |

## Tipografia
- **Primária**: Inter (já presente no projeto). Usar pesos 500/600 para títulos e 400 para textos base.
- **Apoio**: Space Grotesk para futuros destaques numéricos (opcional).

## Voz & Tom
1. **Direta** – frases curtas, foco em ação.
2. **Calor humano** – trata o usuário pelo nome, celebra conquistas.
3. **Confiança operacional** – evita jargões difíceis, dá contexto prático.

## Aplicações Sugeridas
- **Dashboard**: destaques em `--accent-primary` para KPIs urgentes.
- **Login**: reforçar tagline logo abaixo do título.
- **Email/Contato**: `contato@ritmika.com` como endereço padrão.

## Implementação Realizada
✅ **Nomes e Identidade**
- Package root: "konclui-clone" → "ritmika"
- PWA Manifest: "Koncluí PRO" → "Ritmika"
- Login: "Koncluí PRO" → "Ritmika" + tagline atualizada
- Sidebar: "Koncluí" → "Ritmika"
- API: "Konclui API" → "Ritmika API"
- Database: "konclui.db" → "ritmika.db"
- Email padrão: "pedro@konclui.com" → "pedro@ritmika.com"

✅ **Paleta Visual**
- Accent primary: #3b82f6 → #F97316 (laranja)
- Background app: #09090b → #05060B (mais escuro)
- Background card: #18181b → #14141A
- Text primary: #fafafa → #FDF2E9 (off-white quente)
- Text secondary: #a1a1aa → #C7C1B8 (cinza quente)
- Glass panels atualizados para nova paleta

✅ **Assets Pendentes**
- Ícones PWA (pwa-192x192.png, pwa-512x512.png) - manter atuais até nova logo
- Favicon e ícones do browser - manter atuais

> Para novas peças, manter equilíbrio entre o fundo escuro profundo e acentos quentes, garantindo contraste AA no mínimo.

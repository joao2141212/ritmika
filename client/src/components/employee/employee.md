# employee

Componentes e estilos compartilhados da área operacional.

## Arquivos

- `EmployeeLayout.jsx`: shell autenticado, cabeçalho e navegação operacional `Hoje`, `Histórico`, `Avisos` e `Perfil`.
- `employee.css`: tokens e layouts responsivos da área operacional, incluindo estados vazios, erro, carregamento, cartões, listas e navegação fixa.

## Regras

- Não incluir links ou ações do portal de gestão.
- Manter alvos interativos com pelo menos 42 px e ausência de overflow horizontal em 390 px.
- Exibir somente dados reais alcançáveis pelas políticas RLS da role autenticada.
- Respeitar `prefers-reduced-motion`.

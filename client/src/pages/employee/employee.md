# employee

Área operacional do funcionário. Esta superfície é definida pela role do usuário, não pelo tamanho da tela. O portal de gestão continua sendo a aplicação principal em `/`, responsiva em desktop e celular; a operação do funcionário fica em `/app`.

## Arquivos

- `EmployeeHome.jsx`: atividades ativas atribuídas ao perfil autenticado, contadores reais e retomada da execução existente.
- `EmployeeHistory.jsx`: histórico isolado por `workspace_id` e `profile_id`, com conclusão e KPIs existentes na resposta.
- `EmployeeNotifications.jsx`: broadcasts do workspace e notificações destinadas ao perfil, com confirmação de leitura.
- `EmployeeProfile.jsx`: identidade operacional, escopo informado pelo perfil e saída da conta.

## Contrato observado no Koncluí

O bundle público do painel e os textos operacionais confirmam: agenda recorrente, execução pontual delegada ou iniciada pelo operador, lembretes e atrasos por push, janela de execução, ordem sequencial, localização, evidências de imagem/vídeo/texto e plano de ação por item fora da meta.

## Cobertura atual

- Implementado: atribuição, execução, salvamento, retomada, conclusão, evidências já suportadas pelo executor, histórico pessoal, notificações pessoais/broadcast e perfil.
- Parcial: agenda é lida do checklist, mas ainda não possui ocorrência materializada por dia no banco Ritmika.
- Pendente de schema: vínculo operador-setor/unidade para self-service pontual, push/device token, plano de ação e validação geográfica.

Nenhuma dessas lacunas deve ser preenchida com dados mockados ou permissão ampla de workspace.

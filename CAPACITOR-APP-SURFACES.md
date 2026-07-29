# Superfícies móveis com Capacitor

## Decisão

O Ritmika terá duas entregas móveis distribuídas como aplicativos reais:

1. **Portal Gestor Mobile**
   - É a mesma aplicação React do Portal Gestor, adaptada responsivamente para
     tela de celular e distribuída também com Capacitor.
   - Mantém recursos administrativos autorizados para gestores.
   - Adapta densidade, filtros, tabelas, navegação e ações para toque.
   - Não constitui um terceiro produto nem deve duplicar regras e telas do
     Portal Gestor.

2. **App Operacional Ritmika**
   - Aplicação separada dedicada à execução diária.
   - Prioriza atividades, checklists, evidências, progresso, histórico e
     notificações operacionais.
   - Não expõe navegação ou controles administrativos por adaptação visual.

As duas entregas usarão Capacitor. O Portal Gestor continua sendo a aplicação
normal de gestão em layout responsivo; o App Operacional possui experiência,
navegação e fronteiras próprias.

## Requisitos arquiteturais desde o início

- Portal Gestor web e mobile compartilham entrypoint, rotas e regras de negócio,
  com responsividade real e tratamento das capacidades nativas.
- O App Operacional possui entrypoint e navegação próprios.
- Fronteiras de autorização comprovadas no backend e na interface.
- Configuração Capacitor independente quando o contrato de distribuição exigir.
- Identidade de pacote, nome de loja, ícones e splash definidos sem hardcode
  prematuro.
- Deep links e retorno de autenticação separados e testáveis.
- Armazenamento seguro para sessão e dados sensíveis.
- Estratégia explícita de cache, modo offline, fila de sincronização, conflitos,
  retry e estado degradado.
- Notificações push roteadas para o usuário, workspace e superfície corretos.
- Permissões nativas mínimas e justificadas, como câmera apenas quando houver
  captura de evidência.
- Safe areas, teclado, botão voltar, orientação, acessibilidade e alvos de toque
  validados em dispositivos reais.
- Telemetria com superfície, versão nativa, plataforma, workspace, usuário,
  operação e correlation ID.
- Pipeline, versionamento, assinatura, ambientes e publicação controlados para
  Android e iOS.

## Compartilhamento permitido

Podem ser compartilhados:

- cliente Supabase e contratos de dados;
- autenticação e renovação de sessão;
- biblioteca visual e tokens de design;
- componentes semânticos quando comportamento e permissões forem equivalentes;
- telemetria, sincronização e utilitários;
- regras de validação e testes de contrato.

Não devem ser compartilhados por conveniência entre gestão e operação:

- menus e mapas de navegação;
- dashboards e controles de administração;
- permissões assumidas apenas pelo frontend;
- caches que misturem identidades, workspaces ou superfícies;
- configurações nativas e identificadores de pacote sem isolamento.

## Definições ainda pendentes

Não inventar antes de decisão explícita:

- nomes finais nas lojas;
- bundle ID do iOS e application ID do Android;
- contas, certificados e perfis de assinatura;
- organização final dos projetos Capacitor dentro do repositório;
- política de atualização binária e web;
- matriz mínima de versões Android/iOS;
- data de publicação em cada loja.

## Critério de pronto

Cada aplicativo só pode ser considerado pronto quando houver:

- build web e nativo reproduzível;
- autenticação e autorização reais;
- dados isolados por workspace e usuário;
- fluxos principais testados em Android e iOS;
- offline, retomada, sincronização e falhas comprovados;
- deep links e notificações comprovados;
- telemetria acionável;
- pacote assinado e versão instalada em dispositivo;
- checklist de publicação e rollback.

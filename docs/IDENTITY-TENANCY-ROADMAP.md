# Contrato e roadmap de identidade e tenancy

Este documento é a referência operacional para usuários, empresas, papéis,
escopo de dados e recuperação de acesso no Ritmika. Nenhuma tela, API, script ou
política pode inferir empresa pelo primeiro registro encontrado.

## Hierarquia canônica

```text
auth.users.id
  identidade global de autenticação
    |
    +-- ritmika_workspace_members.user_id
          vínculo e autorização por empresa
          PK: id
          tenant FK: workspace_id
          identidade FK: user_id
          UNIQUE: (workspace_id, user_id)
          escopo: role, is_owner, managed_units, preferences
    |
    +-- ritmika_profiles.auth_user_id (nullable)
          pessoa de domínio dentro da empresa
          PK: id
          tenant FK: workspace_id
          vínculo de login opcional: auth_user_id
          UNIQUE: (workspace_id, source_user_id)
          UNIQUE parcial: (workspace_id, auth_user_id)

ritmika_workspaces.id
  chave primária da empresa/tenant
  UNIQUE: (source_system, source_id)
```

Regras:

1. `workspace_id` é a chave de empresa. Não existe `company_id`.
2. `auth.users.id` identifica a pessoa autenticada globalmente.
3. `ritmika_workspace_members` é a autoridade para acesso e permissões dentro
   de uma empresa.
4. `ritmika_profiles` representa pessoas de domínio. Pode existir sem login
   para preservar operadores importados do Konclui.
5. Uma pessoa autenticada pode pertencer a várias empresas, mas deve haver uma
   empresa ativa explícita e validada.
6. Nunca selecionar `.limit(1)`, primeiro owner ou primeiro profile como
   substituto de seleção de empresa.
7. Todo dado operacional deve carregar e filtrar `workspace_id`.

## Estado real verificado em 2026-07-28

| População | Auth | Workspaces | Memberships | Profiles | Profiles sem login |
|---|---:|---:|---:|---:|---:|
| Cliente importado do Konclui | 1 | 1 | 1 | 16 | 15 |
| QA isolado | 1 | 1 | 1 | 1 | 0 |
| Total | 2 | 2 | 2 | 17 | 15 |

Os 15 profiles sem `auth_user_id` são pessoas importadas do domínio do cliente,
não contas órfãs. As verificações reais retornaram zero para:

- auth sem membership;
- profile vinculado sem membership;
- membership sem profile;
- divergência de `role`, `is_owner` ou `managed_units`;
- vínculo cruzado entre QA e cliente.

## Estado de implementação

### Concluído

- [x] Inventário read-only de todos os usuários, memberships, profiles e
  workspaces.
- [x] Verificação de integridade entre Auth, membership e profile.
- [x] Seleção determinística: um vínculo é automático; múltiplos exigem
  workspace ativo explícito; vínculo inválido é rejeitado.
- [x] `AuthContext` carrega profile por `(workspace_id, auth_user_id)`.
- [x] Repositório remoto não escolhe mais o primeiro membership.
- [x] Convite recebe `workspace_id`, valida o vínculo do ator e cria ou repara
  `workspace_members` e `profiles`.
- [x] Convite é repetível para auth existente sem criar identidade duplicada.
- [x] Telemetria estruturada diferencia falha de membership e de profile.
- [x] Reset de senha separado de inventário e protegido por dry-run,
  confirmação por UUID e trava adicional para cliente.

### P0 antes de declarar paridade de administração

- [ ] Publicar a Edge Function `invite-user` e provar convite em fixture QA.
- [ ] Criar seletor visual de empresa para um usuário com múltiplos
  memberships e provar troca sem vazamento de tenant.
- [ ] Remover qualquer escrita de role/profile que não passe pela autoridade
  `workspace_members`.
- [ ] Criar operação backend única para atualizar membership + espelho do
  profile, com autorização e resultado idempotente.
- [ ] Provar que owner/admin/manager/operator/viewer têm exatamente as mesmas
  capacidades observadas no Konclui. Não inventar matriz por nome do papel.
- [ ] Cobrir RLS por operação, não apenas existência de membership.

### P1 de previsibilidade operacional

- [ ] Histórico auditável de convite, alteração de papel, troca de empresa
  ativa e reset de acesso.
- [ ] Tela administrativa com status: convidado, confirmado, ativo, bloqueado,
  sem profile e sem membership.
- [ ] Retry seguro para convite parcialmente concluído.
- [ ] Runbook de recuperação por UUID com prova antes/depois.
- [ ] Teste E2E com usuário de duas empresas para leitura, escrita e negação
  cruzada.

## Scripts canônicos

```text
supabase/scripts/
  auth/
    lib/       cliente administrativo compartilhado
    read/      inventário e diagnóstico, sem mutação
    write/     recuperação de acesso, dry-run por padrão
  db/
    lib/       resolução segura da conexão
    read/
      identity/ inventário e integridade de tenancy
    write/     mutações SQL explícitas
```

Critério de aceite para qualquer script:

- alvo resolvido por UUID e `workspace_id`;
- classificação QA/cliente antes de mutar;
- segredo somente por variável de ambiente;
- saída sem email, senha ou token;
- read e write em diretórios separados;
- mutação exige flag e confirmação literal;
- resultado contém estado anterior, estado posterior e correlação.

## Lacunas conhecidas que não podem desaparecer do roadmap

1. `ritmika_profiles` e `ritmika_workspace_members` ainda duplicam campos de
   permissão. Membership é a autoridade; profile é espelho de compatibilidade.
2. A tabela aceita qualquer texto em `role`; falta contrato de valores
   sustentado pela paridade observada.
3. RLS atual protege tenancy, mas várias escritas não distinguem papel.
4. Atualização de membro pela interface escreve profile diretamente e pode
   falhar pela própria RLS ou divergir do membership.
5. Convite envolve Auth e banco, portanto não existe transação única entre os
   dois sistemas. A implementação deve permanecer idempotente e reparável.
6. O checker de telemetria encontrou cinco scripts legados de setup/deploy com
   I/O e sem evento estruturado: `scripts/deploy_producao.js`,
   `scripts/deploy_db.js`, `scripts/setup_supabase_direct.js`,
   `scripts/deploy_supabase.js` e `scripts/setup_supabase.js`. Eles não são o
   caminho canônico novo e não devem ser executados até serem classificados,
   isolados e instrumentados.

# Operações de identidade e autenticação

Esta árvore separa operações por efeito:

- `read/`: inventário mascarado de todas as identidades autenticáveis e seus vínculos.
- `write/`: mutações explícitas no Supabase Auth, sempre com alvo, dry-run e confirmação.
- `lib/`: cliente administrativo compartilhado e telemetria estruturada.

## Inventário completo

```bash
bash supabase/scripts/auth/read/run.sh \
  supabase/scripts/auth/read/inventory.mjs
```

A saída não imprime e-mail completo, senha, service role ou access token. Cada conta é classificada como `qa`, `customer` ou `orphan` e inclui memberships, papéis, ownership e divergências entre perfil e membership.

## Recuperação de senha

O dry-run é obrigatório para descobrir a classificação e a confirmação esperada:

```bash
bash supabase/scripts/auth/write/run.sh \
  supabase/scripts/auth/write/reset-password.mjs \
  --user-id <uuid>
```

Para aplicar, forneça a nova senha somente por `RITMIKA_NEW_PASSWORD`, acrescente `--apply` e passe a confirmação literal exibida no dry-run. Contas de cliente também exigem `--allow-customer`. O script nunca imprime a senha.

Perfis de domínio sem `auth_user_id` representam pessoas importadas que ainda não possuem login. Eles não devem ser tratados como contas autenticáveis.

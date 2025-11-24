# Setup Manual do Supabase - Ritmika

## 1. Acesse o Supabase Dashboard
https://supabase.com/dashboard/project/bcckaltuxorkybtzskql

## 2. Execute o Schema (SQL Editor)

Vá em **SQL Editor** e execute o conteúdo de `scripts/supabase_schema.sql`:

```sql
-- Copie e cole todo o conteúdo do arquivo supabase_schema.sql
```

## 3. Execute as Functions (SQL Editor)

Execute o conteúdo de `scripts/supabase_functions.sql`:

```sql
-- Copie e cole todo o conteúdo do arquivo supabase_functions.sql
```

## 4. Crie os Usuários (Authentication > Users)

Clique em **Add user** > **Create new user** para cada um:

### Usuário 1 - Admin
- Email: `pedro@ritmika.com`
- Password: `123456`
- ✅ Auto Confirm User

### Usuário 2 - Cliente Demo
- Email: `cliente@demo`
- Password: `123456`
- ✅ Auto Confirm User

### Usuário 3 - Funcionário
- Email: `joao@ritmika.com`
- Password: `123456`
- ✅ Auto Confirm User

### Usuário 4 - Funcionária
- Email: `maria@ritmika.com`
- Password: `123456`
- ✅ Auto Confirm User

## 5. Atualize os Profiles (SQL Editor)

Depois de criar os usuários, execute:

```sql
-- Atualizar Pedro (Admin)
UPDATE public.profiles 
SET role = 'admin', points = 1250, name = 'Pedro Duarte'
WHERE email = 'pedro@ritmika.com';

-- Atualizar Cliente Demo
UPDATE public.profiles 
SET role = 'cliente', points = 500, name = 'Cliente Demo'
WHERE email = 'cliente@demo';

-- Atualizar João
UPDATE public.profiles 
SET role = 'employee', points = 980, name = 'João Silva'
WHERE email = 'joao@ritmika.com';

-- Atualizar Maria
UPDATE public.profiles 
SET role = 'employee', points = 850, name = 'Maria Santos'
WHERE email = 'maria@ritmika.com';
```

## 6. Insira os Checklists (SQL Editor)

Execute o conteúdo de `scripts/supabase_seed.sql`:

```sql
-- Copie e cole todo o conteúdo do arquivo supabase_seed.sql
```

## 7. Teste a Aplicação

```bash
cd client
npm run dev
```

Faça login com:
- `pedro@ritmika.com` / `123456` (Admin)
- `cliente@demo` / `123456` (Cliente)

## ✅ Pronto!

A aplicação agora está usando Supabase para:
- Autenticação de usuários
- Armazenamento de checklists
- Submissões e pontuação
- Ranking da equipe

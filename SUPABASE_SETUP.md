# Setup Supabase para Ritmika

## 1. Configurar Database

### Executar Schema
No Supabase Dashboard > SQL Editor, execute o arquivo `supabase_schema.sql` para criar todas as tabelas e policies.

### Executar Functions
Execute o arquivo `supabase_functions.sql` para criar as funções auxiliares.

### Seed Data
Execute o arquivo `supabase_seed.sql` para popular os checklists iniciais.

## 2. Criar Usuários Demo

No Supabase Dashboard > Authentication > Users, crie os seguintes usuários:

1. **Admin**
   - Email: `pedro@ritmika.com`
   - Password: `123456`
   - Após criar, execute no SQL Editor:
   ```sql
   UPDATE public.profiles 
   SET role = 'admin', points = 1250, name = 'Pedro Duarte'
   WHERE email = 'pedro@ritmika.com';
   ```

2. **Cliente Demo**
   - Email: `cliente@demo`
   - Password: `123456`
   - Após criar, execute:
   ```sql
   UPDATE public.profiles 
   SET role = 'cliente', points = 500, name = 'Cliente Demo'
   WHERE email = 'cliente@demo';
   ```

3. **Funcionários** (opcional)
   - `joao@ritmika.com` / `123456`
   - `maria@ritmika.com` / `123456`
   - Após criar cada um:
   ```sql
   UPDATE public.profiles 
   SET points = 980, name = 'João Silva'
   WHERE email = 'joao@ritmika.com';
   
   UPDATE public.profiles 
   SET points = 850, name = 'Maria Santos'
   WHERE email = 'maria@ritmika.com';
   ```

## 3. Configurar Variáveis de Ambiente

O arquivo `client/.env` já está configurado com:
```
VITE_SUPABASE_URL=https://bcckaltuxorkybtzskql.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

## 4. Testar Aplicação

```bash
cd client
npm run dev
```

Faça login com `pedro@ritmika.com` / `123456` ou `cliente@demo` / `123456`.

## 5. Deploy

### Netlify
O `netlify.toml` já está configurado. Apenas adicione as variáveis de ambiente no Netlify Dashboard:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

## Estrutura de Dados

### Tabelas Principais
- `profiles` - Perfis de usuários (extends auth.users)
- `checklists` - Templates de checklists
- `submissions` - Respostas dos checklists
- `tasks` - Tarefas do dashboard

### Row Level Security (RLS)
Todas as tabelas têm RLS habilitado com policies apropriadas:
- Usuários podem ver seus próprios dados
- Admins têm acesso completo
- Funcionários podem criar submissions

## Credenciais Supabase

- **Project URL**: https://bcckaltuxorkybtzskql.supabase.co
- **Anon Key**: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
- **Database Password**: Jp9744030249863

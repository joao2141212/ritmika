-- Auditoria somente leitura para riscos de Auth, RLS e funcoes privilegiadas.
-- A saida e compacta e nao inclui emails, nomes, tokens ou dados de clientes.

SELECT 'auth_user_triggers|' || count(*)
    || '|security_definer|' || count(*) FILTER (WHERE p.prosecdef)
FROM pg_trigger t
JOIN pg_class c ON c.oid = t.tgrelid
JOIN pg_namespace n ON n.oid = c.relnamespace
JOIN pg_proc p ON p.oid = t.tgfoid
WHERE NOT t.tgisinternal
  AND n.nspname = 'auth'
  AND c.relname = 'users';

SELECT 'unsafe_auth_metadata_functions|'
    || COALESCE(string_agg(format('%I.%I', n.nspname, p.proname), ',' ORDER BY n.nspname, p.proname), 'none')
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname IN ('public', 'auth')
  AND p.prokind = 'f'
  AND pg_get_functiondef(p.oid) ILIKE '%raw_user_meta_data%'
  AND pg_get_functiondef(p.oid) ~* '(role|owner|permission|workspace)';

SELECT 'public_security_definer_functions|'
    || COALESCE(string_agg(format('%I.%I', n.nspname, p.proname), ',' ORDER BY p.proname), 'none')
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.prosecdef;

SELECT 'deprecated_auth_role_policies|'
    || count(*)
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename LIKE 'ritmika_%'
  AND concat_ws(' ', qual, with_check) ILIKE '%auth.role()%';

SELECT 'user_metadata_authorization_policies|'
    || count(*)
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename LIKE 'ritmika_%'
  AND concat_ws(' ', qual, with_check) ~* '(user_metadata|raw_user_meta_data)';

SELECT 'non_invoker_public_views|'
    || COALESCE(string_agg(c.relname, ',' ORDER BY c.relname), 'none')
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relkind = 'v'
  AND NOT COALESCE((
      SELECT option_value = 'true'
      FROM pg_options_to_table(c.reloptions)
      WHERE option_name = 'security_invoker'
  ), false);

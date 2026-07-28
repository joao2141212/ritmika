SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name LIKE 'ritmika_%'
ORDER BY table_name;

SELECT schemaname, tablename, policyname, qual, with_check
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('ritmika_checklists', 'ritmika_profiles', 'ritmika_notifications')
ORDER BY tablename, policyname;

SELECT p.proname, pg_get_function_identity_arguments(p.oid) AS args
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND (p.proname ILIKE '%workspace%' OR p.proname ILIKE '%auth%')
ORDER BY p.proname;

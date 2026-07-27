-- Verificação somente leitura da superfície de segurança do Ritmika.
-- Não cria, altera ou remove dados, policies, buckets ou usuários.

SELECT 'rls_tables|' || count(*)
    || '|enabled|' || count(*) FILTER (WHERE c.relrowsecurity)
    || '|forced|' || count(*) FILTER (WHERE c.relforcerowsecurity)
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relkind = 'r'
  AND c.relname LIKE 'ritmika_%';

SELECT 'policy_rows|' || count(*)
    || '|tables|' || count(DISTINCT tablename)
    || '|workspace_scoped|' || count(*) FILTER (WHERE qual ILIKE '%workspace_id%')
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename LIKE 'ritmika_%';

SELECT 'rls_missing_policy_tables|'
    || COALESCE(string_agg(t.relname, ',' ORDER BY t.relname), 'none')
FROM (
    SELECT c.relname
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relkind = 'r'
      AND c.relname LIKE 'ritmika_%'
      AND c.relrowsecurity
) t
LEFT JOIN (
    SELECT DISTINCT tablename
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename LIKE 'ritmika_%'
) p ON p.tablename = t.relname
WHERE p.tablename IS NULL;

SELECT 'private_evidence_bucket|'
    || COALESCE((SELECT CASE WHEN public THEN 'public' ELSE 'private' END
                 FROM storage.buckets
                 WHERE id = 'ritmika-evidences'), 'missing');

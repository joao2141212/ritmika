SELECT expected_table,
       to_regclass('public.' || expected_table) AS relation_name
FROM (VALUES
    ('ritmika_evidence_ai_analyses'),
    ('ritmika_lms_courses'),
    ('ritmika_lms_modules'),
    ('ritmika_lms_lessons'),
    ('ritmika_lms_lesson_progress'),
    ('ritmika_product_ideas'),
    ('ritmika_product_idea_votes'),
    ('ritmika_product_news_entries'),
    ('ritmika_support_settings'),
    ('ritmika_ai_credit_wallets'),
    ('ritmika_workspace_billing'),
    ('ritmika_workspace_api_settings')
) AS expected(expected_table)
ORDER BY expected_table;

SELECT tablename,
       rowsecurity,
       count(pg_policies.policyname) AS policy_count
FROM pg_tables
LEFT JOIN pg_policies ON pg_policies.schemaname = pg_tables.schemaname
    AND pg_policies.tablename = pg_tables.tablename
WHERE pg_tables.schemaname = 'public'
  AND pg_tables.tablename IN (
      'ritmika_evidence_ai_analyses',
      'ritmika_lms_courses',
      'ritmika_lms_modules',
      'ritmika_lms_lessons',
      'ritmika_lms_lesson_progress',
      'ritmika_product_ideas',
      'ritmika_product_idea_votes',
      'ritmika_product_news_entries',
      'ritmika_support_settings',
      'ritmika_ai_credit_wallets',
      'ritmika_workspace_billing',
      'ritmika_workspace_api_settings'
  )
GROUP BY tablename, rowsecurity
ORDER BY tablename;

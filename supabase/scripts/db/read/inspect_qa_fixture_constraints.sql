select
  n.nspname as schema_name,
  c.relname as table_name,
  con.conname as constraint_name,
  pg_get_constraintdef(con.oid) as definition
from pg_constraint con
join pg_class c on c.oid = con.conrelid
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relname in (
    'ritmika_notifications',
    'ritmika_responses',
    'ritmika_ai_credit_wallets',
    'ritmika_evidence_ai_analyses',
    'ritmika_lms_courses',
    'ritmika_lms_modules',
    'ritmika_lms_lessons',
    'ritmika_lms_lesson_progress',
    'ritmika_product_ideas',
    'ritmika_product_idea_votes',
    'ritmika_product_news_entries',
    'ritmika_support_settings',
    'ritmika_workspace_api_settings',
    'ritmika_workspace_billing'
  )
order by c.relname, con.contype, con.conname;

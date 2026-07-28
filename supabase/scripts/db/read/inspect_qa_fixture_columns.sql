select
  table_name,
  ordinal_position,
  column_name,
  data_type,
  is_nullable,
  coalesce(column_default, '') as column_default
from information_schema.columns
where table_schema = 'public'
  and table_name in (
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
order by table_name, ordinal_position;

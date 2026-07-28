SELECT table_name, ordinal_position, column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name IN (
    'ritmika_checklists',
    'ritmika_responses',
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
    'ritmika_workspace_billing',
    'ritmika_workspaces',
    'ritmika_workspace_members',
    'ritmika_profiles',
    'ritmika_units',
    'ritmika_sectors',
    'ritmika_moments',
    'ritmika_notifications'
  )
ORDER BY table_name, ordinal_position;

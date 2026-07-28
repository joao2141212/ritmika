SELECT 'ritmika_ai_credit_wallets' AS table_name, count(*)::bigint AS row_count FROM public.ritmika_ai_credit_wallets
UNION ALL SELECT 'ritmika_evidence_ai_analyses', count(*)::bigint FROM public.ritmika_evidence_ai_analyses
UNION ALL SELECT 'ritmika_lms_courses', count(*)::bigint FROM public.ritmika_lms_courses
UNION ALL SELECT 'ritmika_lms_lesson_progress', count(*)::bigint FROM public.ritmika_lms_lesson_progress
UNION ALL SELECT 'ritmika_lms_lessons', count(*)::bigint FROM public.ritmika_lms_lessons
UNION ALL SELECT 'ritmika_lms_modules', count(*)::bigint FROM public.ritmika_lms_modules
UNION ALL SELECT 'ritmika_product_idea_votes', count(*)::bigint FROM public.ritmika_product_idea_votes
UNION ALL SELECT 'ritmika_product_ideas', count(*)::bigint FROM public.ritmika_product_ideas
UNION ALL SELECT 'ritmika_product_news_entries', count(*)::bigint FROM public.ritmika_product_news_entries
UNION ALL SELECT 'ritmika_support_settings', count(*)::bigint FROM public.ritmika_support_settings
UNION ALL SELECT 'ritmika_workspace_api_settings', count(*)::bigint FROM public.ritmika_workspace_api_settings
UNION ALL SELECT 'ritmika_workspace_billing', count(*)::bigint FROM public.ritmika_workspace_billing
UNION ALL SELECT 'ritmika_workspaces', count(*)::bigint FROM public.ritmika_workspaces
UNION ALL SELECT 'ritmika_workspace_members', count(*)::bigint FROM public.ritmika_workspace_members
UNION ALL SELECT 'auth.users', count(*)::bigint FROM auth.users
UNION ALL SELECT 'ritmika_profiles_with_auth_user_id', count(*)::bigint FROM public.ritmika_profiles WHERE auth_user_id IS NOT NULL
UNION ALL SELECT 'ritmika_profiles_matching_auth_users', count(*)::bigint FROM public.ritmika_profiles p JOIN auth.users a ON a.id = p.auth_user_id
UNION ALL SELECT 'ritmika_profiles', count(*)::bigint FROM public.ritmika_profiles
UNION ALL SELECT 'ritmika_checklists', count(*)::bigint FROM public.ritmika_checklists
UNION ALL SELECT 'ritmika_responses', count(*)::bigint FROM public.ritmika_responses
UNION ALL SELECT 'ritmika_units', count(*)::bigint FROM public.ritmika_units
UNION ALL SELECT 'ritmika_sectors', count(*)::bigint FROM public.ritmika_sectors
UNION ALL SELECT 'ritmika_moments', count(*)::bigint FROM public.ritmika_moments
ORDER BY table_name;

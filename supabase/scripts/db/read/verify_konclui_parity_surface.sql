WITH expected_relations(name) AS (
    VALUES
        ('checklists'),
        ('vw_inventory_checklists'),
        ('flows'),
        ('units'),
        ('sectors'),
        ('moments'),
        ('workspace_users'),
        ('user_sectors_units'),
        ('responses'),
        ('vw_kpis_mv'),
        ('notifications_names'),
        ('evidence_ai_analyses'),
        ('lms_courses'),
        ('lms_modules'),
        ('lms_lessons'),
        ('lms_lesson_progress'),
        ('product_ideas'),
        ('product_idea_votes'),
        ('product_news_entries'),
        ('users'),
        ('user_quick_switch_pins'),
        ('workspaces'),
        ('vw_workspace_billing'),
        ('support_settings')
), expected_routines(name) AS (
    VALUES
        ('fn_has_user_workspace_access'),
        ('fn_feature_flags'),
        ('fn_ai_credit_wallet_summary'),
        ('fn_notifications_grid_data'),
        ('fn_notifications_grid_count'),
        ('fn_notifications_grid_stats'),
        ('get_checklist_responses_by_period'),
        ('fn_checklist_responses'),
        ('fn_checklist_response_filters'),
        ('fn_manager_adhoc_checklists')
)
SELECT 'relation|' || name || '|' || CASE
    WHEN to_regclass('public.' || name) IS NULL THEN 'missing'
    ELSE 'present'
END
FROM expected_relations
UNION ALL
SELECT 'routine|' || name || '|' || CASE
    WHEN EXISTS (
        SELECT 1
        FROM pg_proc
        JOIN pg_namespace ON pg_namespace.oid = pg_proc.pronamespace
        WHERE pg_namespace.nspname = 'public'
          AND pg_proc.proname = name
    ) THEN 'present'
    ELSE 'missing'
END
FROM expected_routines
ORDER BY 1;

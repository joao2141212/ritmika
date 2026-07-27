WITH bounds AS (
    SELECT
        (date_trunc('day', now() AT TIME ZONE 'America/Sao_Paulo') + interval '1 day' - interval '30 days')
            AT TIME ZONE 'America/Sao_Paulo' AS start_at,
        (date_trunc('day', now() AT TIME ZONE 'America/Sao_Paulo') + interval '1 day')
            AT TIME ZONE 'America/Sao_Paulo' AS end_at
)
SELECT concat_ws(
    '|',
    'dashboard_30d',
    count(*)::text,
    count(*) FILTER (WHERE r.is_finished)::text,
    count(*) FILTER (WHERE NOT r.is_finished AND r.execution_date < now())::text
)
FROM public.ritmika_responses AS r, bounds
WHERE r.execution_date >= bounds.start_at
  AND r.execution_date < bounds.end_at

UNION ALL

SELECT concat_ws(
    '|',
    'historical_evidences',
    count(*)::text,
    count(*) FILTER (WHERE coalesce(metadata->>'historical_import', 'false') = 'true')::text,
    count(*) FILTER (WHERE metadata->>'source_url' ~* '^https?://')::text,
    count(*) FILTER (WHERE storage_bucket = 'konclui-source')::text
)
FROM public.ritmika_evidences

UNION ALL

SELECT concat_ws(
    '|',
    'evidence_schema',
    string_agg(column_name || ':' || is_nullable, ',' ORDER BY ordinal_position)
)
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'ritmika_evidences'
  AND column_name IN ('storage_bucket', 'storage_path', 'mime_type')

UNION ALL

SELECT concat_ws(
    '|',
    'table_counts',
    (SELECT count(*)::text FROM public.ritmika_checklists),
    (SELECT count(*)::text FROM public.ritmika_checklist_items),
    (SELECT count(*)::text FROM public.ritmika_responses),
    (SELECT count(*)::text FROM public.ritmika_profiles),
    (SELECT count(*)::text FROM public.ritmika_notifications)
);

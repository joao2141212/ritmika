SELECT
    table_name,
    string_agg(column_name, ',' ORDER BY ordinal_position) AS columns
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name IN (
      'ritmika_units',
      'ritmika_sectors',
      'ritmika_moments',
      'ritmika_profiles',
      'ritmika_notifications',
      'ritmika_workspace_settings'
  )
GROUP BY table_name
ORDER BY table_name;

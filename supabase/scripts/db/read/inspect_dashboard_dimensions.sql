-- Descobre apenas a forma das dimensões usadas pelo dashboard.
-- Não retorna nomes de clientes e não altera o banco.

SELECT table_name || '|' || string_agg(column_name, ',' ORDER BY ordinal_position)
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name IN ('ritmika_profiles', 'ritmika_units', 'ritmika_sectors', 'ritmika_moments')
GROUP BY table_name
ORDER BY table_name;

SELECT 'checklists_dimension_refs|'
    || string_agg(column_name, ',' ORDER BY ordinal_position)
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'ritmika_checklists'
  AND column_name IN ('unit_id', 'sector_id', 'moment_id', 'metadata');

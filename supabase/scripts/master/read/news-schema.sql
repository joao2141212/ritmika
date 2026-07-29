\pset pager off
\pset format unaligned
\pset fieldsep '|'

select 'table', to_regclass('public.ritmika_product_news_entries');

select
    'column',
    column_name,
    data_type,
    is_nullable,
    coalesce(column_default, '')
from information_schema.columns
where table_schema = 'public'
  and table_name = 'ritmika_product_news_entries'
order by ordinal_position;

select
    'policy',
    policyname,
    cmd,
    roles::text,
    coalesce(qual, ''),
    coalesce(with_check, '')
from pg_policies
where schemaname = 'public'
  and tablename = 'ritmika_product_news_entries'
order by policyname;

select 'function', to_regprocedure('public.ritmika_is_platform_admin()');

select
    'counts',
    count(*) as total,
    count(*) filter (where is_published) as published,
    count(*) filter (where not is_published) as drafts,
    count(*) filter (where workspace_id is null) as global_entries
from public.ritmika_product_news_entries;

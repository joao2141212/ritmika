\pset format unaligned
\pset tuples_only on

with expected(name) as (
    values
      ('ritmika_ai_credit_wallets'),
      ('ritmika_evidence_ai_analyses'),
      ('ritmika_lms_courses'),
      ('ritmika_lms_lesson_progress'),
      ('ritmika_lms_lessons'),
      ('ritmika_lms_modules'),
      ('ritmika_product_idea_votes'),
      ('ritmika_product_ideas'),
      ('ritmika_product_news_entries'),
      ('ritmika_support_settings'),
      ('ritmika_workspace_api_settings'),
      ('ritmika_workspace_billing')
)
select e.name,
       case when c.relname is null then 'missing' else 'present' end as relation_status,
       coalesce(c.relrowsecurity::text, 'n/a') as rls_enabled
from expected e
left join pg_class c on c.relname = e.name and c.relkind in ('r', 'p')
left join pg_namespace n on n.oid = c.relnamespace and n.nspname = 'public'
where n.nspname = 'public' or c.relname is null
order by e.name;

with expected(name) as (
    values
      ('ritmika_ai_credit_wallets'),
      ('ritmika_evidence_ai_analyses'),
      ('ritmika_lms_courses'),
      ('ritmika_lms_lesson_progress'),
      ('ritmika_lms_lessons'),
      ('ritmika_lms_modules'),
      ('ritmika_product_idea_votes'),
      ('ritmika_product_ideas'),
      ('ritmika_product_news_entries'),
      ('ritmika_support_settings'),
      ('ritmika_workspace_api_settings'),
      ('ritmika_workspace_billing')
)
select e.name,
       coalesce(c.relrowsecurity::text, 'n/a') as rls_enabled,
       count(p.policyname) as policy_count
from expected e
left join pg_class c on c.relname = e.name and c.relkind in ('r', 'p')
left join pg_namespace n on n.oid = c.relnamespace and n.nspname = 'public'
left join pg_policies p on p.schemaname = n.nspname and p.tablename = c.relname
where n.nspname = 'public' or c.relname is null
group by e.name, c.relrowsecurity
order by e.name;

/*
  The original relation-only query is kept below as a compact SQL reference.
  It is intentionally not executed by this verification script.
*/
/*
select c.relname
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relkind in ('r', 'p')
  and c.relname in (
    'ritmika_ai_credit_wallets',
    'ritmika_evidence_ai_analyses',
    'ritmika_lms_courses',
    'ritmika_lms_lesson_progress',
    'ritmika_lms_lessons',
    'ritmika_lms_modules',
    'ritmika_product_idea_votes',
    'ritmika_product_ideas',
    'ritmika_product_news_entries',
    'ritmika_support_settings',
    'ritmika_workspace_api_settings',
    'ritmika_workspace_billing'
  )
order by c.relname;

select c.relname,
       c.relrowsecurity,
       count(p.policyname) as policy_count
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
left join pg_policies p
  on p.schemaname = n.nspname
 and p.tablename = c.relname
where n.nspname = 'public'
  and c.relkind in ('r', 'p')
  and c.relname in (
    'ritmika_ai_credit_wallets',
    'ritmika_evidence_ai_analyses',
    'ritmika_lms_courses',
    'ritmika_lms_lesson_progress',
    'ritmika_lms_lessons',
    'ritmika_lms_modules',
    'ritmika_product_idea_votes',
    'ritmika_product_ideas',
    'ritmika_product_news_entries',
    'ritmika_support_settings',
    'ritmika_workspace_api_settings',
    'ritmika_workspace_billing'
  )
group by c.relname, c.relrowsecurity
order by c.relname;
*/

with qa_workspace as (
  select id
  from public.ritmika_workspaces
  where source_system = 'ritmika_qa'
    and source_id = 'parity-e2e-20260728'
)
select 'ritmika_units' as relation, count(*)::text as row_count
from public.ritmika_units u join qa_workspace w on w.id = u.workspace_id
where u.metadata->>'ritmika_qa' = 'true'
union all
select 'ritmika_sectors', count(*)::text
from public.ritmika_sectors s join qa_workspace w on w.id = s.workspace_id
where s.metadata->>'ritmika_qa' = 'true'
union all
select 'ritmika_moments', count(*)::text
from public.ritmika_moments m join qa_workspace w on w.id = m.workspace_id
where m.metadata->>'ritmika_qa' = 'true'
union all
select 'ritmika_checklists', count(*)::text
from public.ritmika_checklists c join qa_workspace w on w.id = c.workspace_id
where c.metadata->>'ritmika_qa' = 'true'
union all
select 'ritmika_responses', count(*)::text
from public.ritmika_responses r join qa_workspace w on w.id = r.workspace_id
where r.metadata->>'ritmika_qa' = 'true'
union all
select 'ritmika_notifications', count(*)::text
from public.ritmika_notifications n join qa_workspace w on w.id = n.workspace_id
where n.metadata->>'ritmika_qa' = 'true'
union all
select 'ritmika_ai_credit_wallets', count(*)::text
from public.ritmika_ai_credit_wallets a join qa_workspace w on w.id = a.workspace_id
where a.metadata->>'ritmika_qa' = 'true'
union all
select 'ritmika_evidence_ai_analyses', count(*)::text
from public.ritmika_evidence_ai_analyses a join qa_workspace w on w.id = a.workspace_id
where a.metadata->>'ritmika_qa' = 'true'
union all
select 'ritmika_lms_courses', count(*)::text
from public.ritmika_lms_courses c join qa_workspace w on w.id = c.workspace_id
where c.metadata->>'ritmika_qa' = 'true'
union all
select 'ritmika_lms_modules', count(*)::text
from public.ritmika_lms_modules m join qa_workspace w on w.id = m.workspace_id
where m.metadata->>'ritmika_qa' = 'true'
union all
select 'ritmika_lms_lessons', count(*)::text
from public.ritmika_lms_lessons l join qa_workspace w on w.id = l.workspace_id
where l.metadata->>'ritmika_qa' = 'true'
union all
select 'ritmika_lms_lesson_progress', count(*)::text
from public.ritmika_lms_lesson_progress p join qa_workspace w on w.id = p.workspace_id
where p.metadata->>'ritmika_qa' = 'true'
union all
select 'ritmika_product_ideas', count(*)::text
from public.ritmika_product_ideas i join qa_workspace w on w.id = i.workspace_id
where i.metadata->>'ritmika_qa' = 'true'
union all
select 'ritmika_product_idea_votes', count(*)::text
from public.ritmika_product_idea_votes v join qa_workspace w on w.id = v.workspace_id
join public.ritmika_product_ideas i on i.id = v.idea_id
where i.metadata->>'ritmika_qa' = 'true'
union all
select 'ritmika_product_news_entries', count(*)::text
from public.ritmika_product_news_entries n join qa_workspace w on w.id = n.workspace_id
where n.metadata->>'ritmika_qa' = 'true'
union all
select 'ritmika_support_settings', count(*)::text
from public.ritmika_support_settings s join qa_workspace w on w.id = s.workspace_id
where s.metadata->>'ritmika_qa' = 'true'
union all
select 'ritmika_workspace_api_settings', count(*)::text
from public.ritmika_workspace_api_settings a join qa_workspace w on w.id = a.workspace_id
where a.metadata->>'ritmika_qa' = 'true'
union all
select 'ritmika_workspace_billing', count(*)::text
from public.ritmika_workspace_billing b join qa_workspace w on w.id = b.workspace_id
where b.metadata->>'ritmika_qa' = 'true'
order by relation;

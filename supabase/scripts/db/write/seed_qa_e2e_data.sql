do $$
declare
  v_workspace_id uuid;
  v_profile_id uuid;
  v_unit_id uuid;
  v_sector_id uuid;
  v_moment_id uuid;
  v_checklist_id uuid;
  v_response_id uuid;
  v_course_id uuid;
  v_module_id uuid;
  v_lesson_id uuid;
  v_idea_id uuid;
begin
  select id
    into v_workspace_id
  from public.ritmika_workspaces
  where source_system = 'ritmika_qa'
    and source_id = 'parity-e2e-20260728';

  if v_workspace_id is null then
    raise exception 'qa_workspace_missing';
  end if;

  select id
    into v_profile_id
  from public.ritmika_profiles
  where workspace_id = v_workspace_id
    and metadata->>'ritmika_qa' = 'true'
  order by created_at
  limit 1;

  if v_profile_id is null then
    raise exception 'qa_profile_missing';
  end if;

  insert into public.ritmika_units (
    workspace_id, source_id, name, address, timezone, metadata
  ) values (
    v_workspace_id,
    'qa-unit-main',
    'Unidade QA Central',
    jsonb_build_object('city', 'QA'),
    'America/Sao_Paulo',
    jsonb_build_object('ritmika_qa', true, 'fixture_key', 'qa-unit-main')
  ) on conflict (workspace_id, source_id) do nothing;

  select id into v_unit_id
  from public.ritmika_units
  where workspace_id = v_workspace_id and source_id = 'qa-unit-main';

  insert into public.ritmika_sectors (
    workspace_id, source_id, name, system_key, metadata
  ) values (
    v_workspace_id,
    'qa-sector-operations',
    'Operação QA',
    'qa_operations',
    jsonb_build_object('ritmika_qa', true, 'fixture_key', 'qa-sector-operations')
  ) on conflict (workspace_id, source_id) do nothing;

  select id into v_sector_id
  from public.ritmika_sectors
  where workspace_id = v_workspace_id and source_id = 'qa-sector-operations';

  insert into public.ritmika_moments (
    workspace_id, source_id, name, system_key, metadata
  ) values (
    v_workspace_id,
    'qa-moment-opening',
    'Abertura QA',
    'qa_opening',
    jsonb_build_object('ritmika_qa', true, 'fixture_key', 'qa-moment-opening')
  ) on conflict (workspace_id, source_id) do nothing;

  select id into v_moment_id
  from public.ritmika_moments
  where workspace_id = v_workspace_id and source_id = 'qa-moment-opening';

  insert into public.ritmika_checklists (
    workspace_id,
    source_id,
    title,
    description,
    status,
    checklist_kind,
    unit_id,
    sector_id,
    moment_id,
    responsible_profile_id,
    schedule,
    usage_policy,
    variables,
    items,
    metadata,
    source_payload
  ) values (
    v_workspace_id,
    'qa-checklist-core',
    'Checklist QA de Paridade',
    'Checklist real isolado para validar listagem, detalhes, execução e histórico.',
    'published',
    'operational',
    v_unit_id,
    v_sector_id,
    v_moment_id,
    v_profile_id,
    jsonb_build_object('mode', 'manual'),
    'workspace',
    '{}'::jsonb,
    $items$[
      {"id":"qa-item-boolean","text":"Verificar condição operacional","type":"boolean","is_required":true},
      {"id":"qa-item-text","text":"Registrar observação da execução","type":"text","is_required":false}
    ]$items$::jsonb,
    jsonb_build_object('ritmika_qa', true, 'fixture_key', 'qa-checklist-core'),
    jsonb_build_object('source', 'qa-fixture', 'version', 1)
  ) on conflict (workspace_id, source_id) do nothing;

  select id into v_checklist_id
  from public.ritmika_checklists
  where workspace_id = v_workspace_id and source_id = 'qa-checklist-core';

  insert into public.ritmika_responses (
    workspace_id,
    source_id,
    source_checklist_id,
    checklist_id,
    source_user_id,
    profile_id,
    unit_id,
    is_finished,
    response_data,
    response_meta,
    variables,
    checklist_snapshot,
    execution_type,
    execution_date,
    started_at,
    completed_at,
    effort_kpi,
    quality_kpi,
    ttc,
    qtd_items,
    qtd_items_answered,
    metadata
  ) values (
    v_workspace_id,
    'qa-response-core',
    'qa-checklist-core',
    v_checklist_id,
    'auth:26e5912f-d442-4d1e-bfa4-dbc5655aa190',
    v_profile_id,
    v_unit_id,
    true,
    $response${"qa-item-boolean":true,"qa-item-text":"Execução QA concluída"}$response$::jsonb,
    jsonb_build_object('status', 'finished'),
    '{}'::jsonb,
    $snapshot$[
      {"id":"qa-item-boolean","text":"Verificar condição operacional","type":"boolean","is_required":true},
      {"id":"qa-item-text","text":"Registrar observação da execução","type":"text","is_required":false}
    ]$snapshot$::jsonb,
    'manual',
    now(),
    now() - interval '5 minutes',
    now(),
    5,
    95,
    300,
    2,
    2,
    jsonb_build_object('ritmika_qa', true, 'fixture_key', 'qa-response-core')
  ) on conflict (workspace_id, source_id) do nothing;

  select id into v_response_id
  from public.ritmika_responses
  where workspace_id = v_workspace_id and source_id = 'qa-response-core';

  insert into public.ritmika_notifications (
    workspace_id,
    recipient_profile_id,
    source_id,
    kind,
    title,
    body,
    route,
    entity_type,
    entity_id,
    metadata
  ) values (
    v_workspace_id,
    v_profile_id,
    'qa-notification-core',
    'system',
    'Notificação QA de paridade',
    'Registro isolado para validar leitura e marcação de notificações.',
    '/notifications',
    'response',
    v_response_id::text,
    jsonb_build_object('ritmika_qa', true, 'fixture_key', 'qa-notification-core')
  ) on conflict (workspace_id, source_id) do nothing;

  insert into public.ritmika_ai_credit_wallets (
    workspace_id, included_credits, purchased_credits, consumed_credits, metadata
  ) values (
    v_workspace_id, 100, 0, 0,
    jsonb_build_object('ritmika_qa', true, 'fixture_key', 'qa-wallet-core')
  ) on conflict (workspace_id) do nothing;

  insert into public.ritmika_evidence_ai_analyses (
    workspace_id,
    response_id,
    status,
    score,
    summary,
    analysis,
    metadata
  )
  select
    v_workspace_id,
    v_response_id,
    'completed',
    95,
    'Análise QA concluída.',
    jsonb_build_object('quality', 'ok', 'ritmika_qa', true),
    jsonb_build_object('ritmika_qa', true, 'fixture_key', 'qa-ai-analysis-core')
  where not exists (
    select 1 from public.ritmika_evidence_ai_analyses
    where workspace_id = v_workspace_id
      and metadata->>'fixture_key' = 'qa-ai-analysis-core'
  );

  insert into public.ritmika_lms_courses (
    workspace_id, source_id, slug, title, description, is_published, metadata
  )
  select
    v_workspace_id,
    'qa-course-core',
    'qa-paridade-operacional',
    'Curso QA de Paridade Operacional',
    'Curso real isolado para validar LMS, módulos, lições e progresso.',
    true,
    jsonb_build_object('ritmika_qa', true, 'fixture_key', 'qa-course-core')
  where not exists (
    select 1 from public.ritmika_lms_courses
    where workspace_id = v_workspace_id
      and metadata->>'fixture_key' = 'qa-course-core'
  );

  select id into v_course_id
  from public.ritmika_lms_courses
  where workspace_id = v_workspace_id
    and metadata->>'fixture_key' = 'qa-course-core';

  insert into public.ritmika_lms_modules (
    workspace_id, course_id, source_id, title, description, position, is_published, metadata
  )
  select
    v_workspace_id,
    v_course_id,
    'qa-module-core',
    'Módulo QA Inicial',
    'Módulo para validação de navegação e progresso.',
    1,
    true,
    jsonb_build_object('ritmika_qa', true, 'fixture_key', 'qa-module-core')
  where not exists (
    select 1 from public.ritmika_lms_modules
    where workspace_id = v_workspace_id
      and metadata->>'fixture_key' = 'qa-module-core'
  );

  select id into v_module_id
  from public.ritmika_lms_modules
  where workspace_id = v_workspace_id
    and metadata->>'fixture_key' = 'qa-module-core';

  insert into public.ritmika_lms_lessons (
    workspace_id,
    course_id,
    module_id,
    source_id,
    title,
    description,
    content,
    duration_seconds,
    position,
    is_published,
    metadata
  )
  select
    v_workspace_id,
    v_course_id,
    v_module_id,
    'qa-lesson-core',
    'Lição QA de Validação',
    'Lição real isolada para validar o estado concluído.',
    jsonb_build_object('blocks', jsonb_build_array(jsonb_build_object('type', 'text', 'content', 'Conteúdo QA'))),
    120,
    1,
    true,
    jsonb_build_object('ritmika_qa', true, 'fixture_key', 'qa-lesson-core')
  where not exists (
    select 1 from public.ritmika_lms_lessons
    where workspace_id = v_workspace_id
      and metadata->>'fixture_key' = 'qa-lesson-core'
  );

  select id into v_lesson_id
  from public.ritmika_lms_lessons
  where workspace_id = v_workspace_id
    and metadata->>'fixture_key' = 'qa-lesson-core';

  insert into public.ritmika_lms_lesson_progress (
    workspace_id, profile_id, lesson_id, progress_percent, last_position_seconds, completed_at, metadata
  ) values (
    v_workspace_id, v_profile_id, v_lesson_id, 100, 120, now(),
    jsonb_build_object('ritmika_qa', true, 'fixture_key', 'qa-lesson-progress-core')
  ) on conflict (workspace_id, profile_id, lesson_id) do nothing;

  insert into public.ritmika_product_ideas (
    workspace_id, author_profile_id, title, description, status, category, metadata
  )
  select
    v_workspace_id,
    v_profile_id,
    'Ideia QA de melhoria operacional',
    'Ideia real isolada para validar criação, listagem e votos.',
    'open',
    'operations',
    jsonb_build_object('ritmika_qa', true, 'fixture_key', 'qa-idea-core')
  where not exists (
    select 1 from public.ritmika_product_ideas
    where workspace_id = v_workspace_id
      and metadata->>'fixture_key' = 'qa-idea-core'
  );

  select id into v_idea_id
  from public.ritmika_product_ideas
  where workspace_id = v_workspace_id
    and metadata->>'fixture_key' = 'qa-idea-core';

  insert into public.ritmika_product_idea_votes (
    workspace_id, idea_id, profile_id
  ) values (
    v_workspace_id, v_idea_id, v_profile_id
  ) on conflict (workspace_id, idea_id, profile_id) do nothing;

  insert into public.ritmika_product_news_entries (
    workspace_id, source_id, title, summary, body, category, published_at, is_published, metadata
  )
  select
    v_workspace_id,
    'qa-news-core',
    'Novidade QA de paridade',
    'Atualização isolada para validar a central de novidades.',
    'Registro real de QA para leitura da novidade publicada.',
    'new',
    now(),
    true,
    jsonb_build_object('ritmika_qa', true, 'fixture_key', 'qa-news-core')
  where not exists (
    select 1 from public.ritmika_product_news_entries
    where workspace_id = v_workspace_id
      and metadata->>'fixture_key' = 'qa-news-core'
  );

  insert into public.ritmika_support_settings (
    workspace_id, whatsapp_url, email, tutorials, faq, metadata
  ) values (
    v_workspace_id,
    'https://qa.invalid/suporte',
    'qa-support@example.com',
    jsonb_build_array(jsonb_build_object('title', 'Guia QA', 'url', 'https://qa.invalid/guia')),
    jsonb_build_array(jsonb_build_object('question', 'Como testar?', 'answer', 'Use a matriz QA.')),
    jsonb_build_object('ritmika_qa', true, 'fixture_key', 'qa-support-core')
  ) on conflict (workspace_id) do nothing;

  insert into public.ritmika_workspace_api_settings (
    workspace_id, endpoint_url, webhook_url, public_key, metadata
  ) values (
    v_workspace_id,
    'https://qa.invalid/api',
    'https://qa.invalid/webhook',
    'qa-public-key',
    jsonb_build_object('ritmika_qa', true, 'fixture_key', 'qa-api-core')
  ) on conflict (workspace_id) do nothing;

  insert into public.ritmika_workspace_billing (
    workspace_id, plan_name, status, currency, amount_cents, period_end, metadata
  ) values (
    v_workspace_id,
    'qa-parity',
    'active',
    'BRL',
    0,
    now() + interval '30 days',
    jsonb_build_object('ritmika_qa', true, 'fixture_key', 'qa-billing-core')
  ) on conflict (workspace_id) do nothing;
end $$;

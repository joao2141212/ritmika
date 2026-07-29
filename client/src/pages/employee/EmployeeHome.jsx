import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight, CheckCircle2, CircleDashed, ClipboardCheck, Clock3, RefreshCw } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { logger } from '../../lib/logger';
import '../../components/employee/employee.css';
import '../../components/employee/operation-polish.css';

const ACTIVE_STATUSES = new Set(['active', 'ativo', 'published']);
const FINISHED_STATUSES = new Set(['completed', 'complete', 'finished', 'finalizado']);

async function loadEmployeeAssignments(user) {
  const correlationId = logger.createCorrelationId();
  try {
    const { data: checklists, error: checklistError } = await supabase
      .from('ritmika_checklists')
      .select('id,title,description,status,items,schedule,moment_id,unit_id,sector_id,updated_at')
      .eq('workspace_id', user.workspace_id)
      .eq('responsible_profile_id', user.id)
      .order('updated_at', { ascending: false });

    if (checklistError) throw checklistError;

    const activeChecklists = (checklists || []).filter((item) =>
      ACTIVE_STATUSES.has(String(item.status || '').toLowerCase()),
    );
    const checklistIds = activeChecklists.map((item) => item.id);

    let responses = [];
    if (checklistIds.length > 0) {
      const { data, error } = await supabase
        .from('ritmika_responses')
        .select('id,checklist_id,is_finished,response_meta,qtd_items,qtd_items_answered,started_at,completed_at,updated_at')
        .eq('workspace_id', user.workspace_id)
        .eq('profile_id', user.id)
        .in('checklist_id', checklistIds)
        .order('updated_at', { ascending: false });
      if (error) throw error;
      responses = data || [];
    }

    const latestResponseByChecklist = new Map();
    responses.forEach((response) => {
      if (!latestResponseByChecklist.has(response.checklist_id)) {
        latestResponseByChecklist.set(response.checklist_id, response);
      }
    });

    return activeChecklists.map((checklist) => ({
      ...checklist,
      latestResponse: latestResponseByChecklist.get(checklist.id) || null,
    }));
  } catch (error) {
    logger.error({
      fn: 'EmployeeHome.loadEmployeeAssignments',
      status: 'error',
      errorCode: error?.code || 'EMPLOYEE_ASSIGNMENTS_LOAD_FAILED',
      workspaceId: user?.workspace_id,
      profileId: user?.id,
      correlationId,
      error: error instanceof Error ? error.message : String(error),
    });
    throw Object.assign(new Error('Não foi possível carregar suas atividades.'), { correlationId });
  }
}

function assignmentState(response) {
  const status = String(response?.response_meta?.status || '').toLowerCase();
  if (response?.is_finished || FINISHED_STATUSES.has(status) || response?.completed_at) return 'finished';
  if (response) return 'in_progress';
  return 'pending';
}

export default function EmployeeHome() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const query = useQuery({
    queryKey: ['employee-assignments', user?.workspace_id, user?.id],
    queryFn: () => loadEmployeeAssignments(user),
    enabled: Boolean(user?.workspace_id && user?.id),
    staleTime: 60_000,
    gcTime: 15 * 60_000,
    refetchOnWindowFocus: false,
  });

  const metrics = useMemo(() => {
    const assignments = query.data || [];
    return assignments.reduce(
      (summary, assignment) => {
        const state = assignmentState(assignment.latestResponse);
        summary.total += 1;
        summary[state] += 1;
        return summary;
      },
      { total: 0, pending: 0, in_progress: 0, finished: 0 },
    );
  }, [query.data]);

  const completionRate = metrics.total > 0 ? Math.round((metrics.finished / metrics.total) * 100) : 0;
  const priorityAssignment = useMemo(() => {
    const assignments = query.data || [];
    return assignments.find((assignment) => assignmentState(assignment.latestResponse) === 'in_progress')
      || assignments.find((assignment) => assignmentState(assignment.latestResponse) === 'pending')
      || assignments[0]
      || null;
  }, [query.data]);

  return (
    <section className="employee-dashboard" aria-labelledby="employee-title">
      <div className="employee-hero">
        <div>
          <p className="employee-eyebrow">Sua rotina de hoje</p>
          <h1 id="employee-title">Olá, {String(user?.name || 'pessoa').split(' ')[0]}</h1>
          <p>Veja o que precisa de atenção e continue exatamente de onde parou.</p>
        </div>
        <button className="employee-refresh" type="button" onClick={() => query.refetch()} disabled={query.isFetching}>
          <RefreshCw size={17} className={query.isFetching ? 'is-spinning' : ''} aria-hidden="true" />
          Atualizar
        </button>
      </div>

      <div className="employee-metrics" aria-label="Resumo das atividades">
        <article><ClipboardCheck /><span><strong>{metrics.total}</strong><small>Atribuídas</small></span></article>
        <article><CircleDashed /><span><strong>{metrics.pending}</strong><small>A iniciar</small></span></article>
        <article><Clock3 /><span><strong>{metrics.in_progress}</strong><small>Em andamento</small></span></article>
        <article><CheckCircle2 /><span><strong>{metrics.finished}</strong><small>Concluídas</small></span></article>
      </div>

      <div className="employee-insight-grid">
        <article className="employee-progress-card">
          <div>
            <p className="employee-eyebrow">Progresso da rotina</p>
            <h2>{completionRate}% concluído</h2>
            <p>{metrics.finished} de {metrics.total} atividades finalizadas.</p>
          </div>
          <div className="employee-progress-ring" style={{ '--employee-progress-value': `${completionRate * 3.6}deg` }} aria-label={`${completionRate}% concluído`}>
            <strong>{completionRate}%</strong>
            <span>concluído</span>
          </div>
        </article>

        <article className="employee-priority-card">
          <div>
            <p className="employee-eyebrow">Próximo passo</p>
            <h2>{priorityAssignment?.title || 'Rotina em dia'}</h2>
            <p>{priorityAssignment ? 'Continue pela atividade mais importante agora.' : 'Não há nenhuma atividade pendente.'}</p>
          </div>
          {priorityAssignment && (
            <button type="button" onClick={() => navigate(`/app/checklists/${priorityAssignment.id}/execute${priorityAssignment.latestResponse?.id ? `?executionId=${encodeURIComponent(priorityAssignment.latestResponse.id)}` : ''}`)}>
              {assignmentState(priorityAssignment.latestResponse) === 'finished' ? 'Revisar execução' : 'Abrir atividade'}
              <ArrowRight size={18} aria-hidden="true" />
            </button>
          )}
        </article>
      </div>

      <div className="employee-list-header">
        <div>
          <h2>Minhas atividades</h2>
          <p>Prioridade visual para o que ainda depende de você.</p>
        </div>
      </div>

      {query.isLoading && (
        <div className="employee-task-grid" aria-label="Carregando atividades">
          {[1, 2, 3].map((item) => <div className="employee-task-skeleton" key={item} />)}
        </div>
      )}

      {query.isError && (
        <div className="employee-state employee-state-error" role="alert">
          <strong>Não conseguimos carregar suas atividades.</strong>
          <p>Você pode tentar novamente sem sair da sua conta.</p>
          <button type="button" onClick={() => query.refetch()}>Tentar novamente</button>
          <small>Código: {query.error?.correlationId || 'EMPLOYEE_ASSIGNMENTS_LOAD_FAILED'}</small>
        </div>
      )}

      {!query.isLoading && !query.isError && metrics.total === 0 && (
        <div className="employee-state">
          <CheckCircle2 size={30} aria-hidden="true" />
          <strong>Nenhuma atividade atribuída agora</strong>
          <p>Quando o gestor atribuir uma atividade a você, ela aparecerá aqui.</p>
        </div>
      )}

      {!query.isLoading && !query.isError && metrics.total > 0 && (
        <div className="employee-task-grid">
          {(query.data || []).map((assignment) => {
            const state = assignmentState(assignment.latestResponse);
            const itemCount = Array.isArray(assignment.items) ? assignment.items.length : 0;
            const answered = Number(assignment.latestResponse?.qtd_items_answered || 0);
            const responseTotal = Number(assignment.latestResponse?.qtd_items || itemCount || 0);
            const progress = responseTotal > 0 ? Math.round((answered / responseTotal) * 100) : 0;
            const actionLabel = state === 'finished' ? 'Ver execução' : state === 'in_progress' ? 'Continuar' : 'Começar';
            const executionQuery = assignment.latestResponse?.id
              ? `?executionId=${encodeURIComponent(assignment.latestResponse.id)}`
              : '';
            return (
              <article className={`employee-task employee-task-${state}`} key={assignment.id}>
                <div className="employee-task-topline">
                  <span className={`employee-status employee-status-${state}`}>
                    {state === 'finished' ? 'Concluída' : state === 'in_progress' ? 'Em andamento' : 'A iniciar'}
                  </span>
                  <span>{itemCount} {itemCount === 1 ? 'item' : 'itens'}</span>
                </div>
                <h3>{assignment.title}</h3>
                {assignment.description && <p>{assignment.description.replace(/<[^>]*>/g, '').trim()}</p>}
                <div className="employee-progress" aria-label={`Progresso: ${progress}%`}>
                  <span style={{ width: `${Math.max(0, Math.min(progress, 100))}%` }} />
                </div>
                <button type="button" onClick={() => navigate(`/app/checklists/${assignment.id}/execute${executionQuery}`)}>
                  {actionLabel}<ArrowRight size={18} aria-hidden="true" />
                </button>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}

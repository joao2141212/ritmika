import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight, CheckCircle2, CircleDashed, ClipboardCheck, Clock3, RefreshCw, Search } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { logger } from '../../lib/logger';
import { matchesSearchText } from '../../lib/plainText';

const ACTIVE_STATUSES = new Set(['active', 'ativo', 'published']);
const FINISHED_STATUSES = new Set(['completed', 'complete', 'finished', 'finalizado']);

import { resolveOperatorAssignment } from '../../domain/checklistAvailability';

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
        .select('id,checklist_id,is_finished,response_meta,metadata,qtd_items,qtd_items_answered,started_at,completed_at,updated_at')
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

    return activeChecklists
      .map((checklist) => resolveOperatorAssignment(
        checklist,
        latestResponseByChecklist.get(checklist.id) || null,
      ))
      .filter(Boolean);
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

export default function EmployeeHome({ view = 'home' }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const isActivitiesPage = view === 'activities';
  const [activityFilter, setActivityFilter] = useState('all');
  const [activityQuery, setActivityQuery] = useState('');
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
  const visibleAssignments = useMemo(() => {
    const assignments = query.data || [];
    if (!isActivitiesPage) {
      return assignments
        .filter((assignment) => assignmentState(assignment.latestResponse) !== 'finished')
        .sort((left, right) => {
          const leftState = assignmentState(left.latestResponse);
          const rightState = assignmentState(right.latestResponse);
          return Number(rightState === 'in_progress') - Number(leftState === 'in_progress');
        })
        .slice(0, 3);
    }
    return assignments.filter((assignment) => {
      const state = assignmentState(assignment.latestResponse);
      const matchesState = activityFilter === 'all' || activityFilter === state;
      return matchesState && matchesSearchText(
        `${assignment.title || ''} ${assignment.description || ''}`,
        activityQuery,
      );
    });
  }, [activityFilter, activityQuery, isActivitiesPage, query.data]);

  return (
    <section className="grid w-full min-w-0 gap-6 text-operation-ink" aria-labelledby="employee-title">
      {!isActivitiesPage && (
        <>
          <div className="relative flex items-end justify-between gap-6 overflow-hidden rounded-[30px] border border-[rgba(12,119,104,0.14)] bg-[radial-gradient(circle_at_92%_10%,rgba(243,201,104,0.42),transparent_34%),linear-gradient(135deg,#e9f8f4_0%,#fffdf5_100%)] p-[clamp(22px,5vw,36px)] shadow-[0_24px_60px_rgba(23,49,58,0.09)] max-[720px]:items-start max-[520px]:rounded-3xl max-[520px]:px-5 max-[520px]:py-6">
            <div className="relative z-[1]">
              <p className="mb-1.5 text-xs font-extrabold uppercase tracking-[0.13em] text-operation-mint-dark">Sua rotina de hoje</p>
              <h1 id="employee-title" className="m-0 max-w-[720px] text-[clamp(36px,7vw,64px)] font-extrabold leading-[0.98] tracking-[-0.045em]">Olá, {String(user?.name || 'pessoa').split(' ')[0]}</h1>
              <p className="mt-2.5 max-w-[590px] text-base text-operation-muted">Veja o que precisa de atenção e continue exatamente de onde parou.</p>
            </div>
            <button className="relative z-[1] inline-flex min-h-11 shrink-0 items-center gap-2 rounded-[14px] border border-operation-line bg-white px-4 font-extrabold text-operation-ink transition-colors hover:bg-operation-soft focus-visible:outline-3 focus-visible:outline-operation-accent/25 focus-visible:outline-offset-3 disabled:cursor-wait disabled:opacity-60 max-[720px]:w-11 max-[720px]:flex-[0_0_44px] max-[720px]:justify-center max-[720px]:gap-0 max-[720px]:p-0 max-[720px]:text-[0px]" type="button" onClick={() => query.refetch()} disabled={query.isFetching}>
              <RefreshCw size={17} className={query.isFetching ? 'animate-spin [animation-duration:800ms]' : ''} aria-hidden="true" />
              Atualizar
            </button>
          </div>

          <div className="grid grid-cols-4 gap-3.5 max-[520px]:grid-cols-2" aria-label="Resumo das atividades">
            <article className="flex min-h-[116px] min-w-0 items-center gap-3.5 rounded-3xl bg-[linear-gradient(145deg,var(--color-operation-accent-dark),var(--color-operation-accent))] p-[18px] text-white shadow-[0_16px_42px_rgba(23,49,58,0.07)] max-[520px]:min-h-[104px] max-[520px]:p-4"><ClipboardCheck className="shrink-0" /><span className="grid"><strong className="text-[25px] leading-none">{metrics.total}</strong><small className="mt-1.5 text-white/80">Atribuídas</small></span></article>
            <article className="flex min-h-[116px] min-w-0 items-center gap-3.5 rounded-3xl bg-[#fff9e9] p-[18px] shadow-[0_16px_42px_rgba(23,49,58,0.07)] max-[520px]:min-h-[104px] max-[520px]:p-4"><CircleDashed className="shrink-0 text-[#b37a00]" /><span className="grid"><strong className="text-[25px] leading-none">{metrics.pending}</strong><small className="mt-1.5 text-operation-muted">A iniciar</small></span></article>
            <article className="flex min-h-[116px] min-w-0 items-center gap-3.5 rounded-3xl bg-[#eef6ff] p-[18px] shadow-[0_16px_42px_rgba(23,49,58,0.07)] max-[520px]:min-h-[104px] max-[520px]:p-4"><Clock3 className="shrink-0 text-[#2e79aa]" /><span className="grid"><strong className="text-[25px] leading-none">{metrics.in_progress}</strong><small className="mt-1.5 text-operation-muted">Em andamento</small></span></article>
            <article className="flex min-h-[116px] min-w-0 items-center gap-3.5 rounded-3xl bg-[#eef9f5] p-[18px] shadow-[0_16px_42px_rgba(23,49,58,0.07)] max-[520px]:min-h-[104px] max-[520px]:p-4"><CheckCircle2 className="shrink-0 text-operation-mint-dark" /><span className="grid"><strong className="text-[25px] leading-none">{metrics.finished}</strong><small className="mt-1.5 text-operation-muted">Concluídas</small></span></article>
          </div>

          <div className="grid grid-cols-[minmax(0,1.25fr)_minmax(280px,0.75fr)] gap-4 max-[760px]:grid-cols-1">
            <article className="flex min-h-[220px] items-center justify-between gap-7 rounded-[28px] border border-[#dcebea] bg-white p-[clamp(22px,4vw,32px)] shadow-[0_18px_48px_rgba(23,49,58,0.07)] max-[520px]:items-start">
              <div>
                <p className="mb-1.5 text-xs font-extrabold uppercase tracking-[0.13em] text-operation-mint-dark">Progresso da rotina</p>
                <h2 className="m-0 mt-1 text-[clamp(24px,4vw,36px)] font-extrabold tracking-[-0.035em]">{completionRate}% concluído</h2>
                <p className="m-0 mt-2.5 text-operation-muted">{metrics.finished} de {metrics.total} atividades finalizadas.</p>
              </div>
              <div className="grid h-[142px] w-[142px] flex-[0_0_142px] place-content-center rounded-full text-center max-[520px]:h-28 max-[520px]:w-28 max-[520px]:flex-[0_0_112px]" style={{ background: `radial-gradient(circle at center, #fff 61%, transparent 62%), conic-gradient(var(--color-operation-mint) ${completionRate * 3.6}deg, #e5efed 0)` }} aria-label={`${completionRate}% concluído`}>
                <strong className="text-[30px] font-extrabold tracking-[-0.04em]">{completionRate}%</strong>
                <span className="text-xs text-operation-muted">concluído</span>
              </div>
            </article>

            <article className="flex min-h-[220px] flex-col items-start justify-between gap-7 rounded-[28px] bg-[#20383e] p-[clamp(22px,4vw,32px)] text-white shadow-[0_20px_48px_rgba(23,49,58,0.18)] max-[760px]:min-h-[190px]" style={{ backgroundImage: 'radial-gradient(circle at 100% 0, rgba(243, 201, 104, 0.34), transparent 42%)' }}>
              <div>
                <p className="mb-1.5 text-xs font-extrabold uppercase tracking-[0.13em] text-[#bcd3d0]">Próximo passo</p>
                <h2 className="m-0 mt-1 text-[clamp(24px,4vw,36px)] font-extrabold tracking-[-0.035em]">{priorityAssignment?.title || 'Rotina em dia'}</h2>
                <p className="m-0 mt-2.5 text-[#bcd3d0]">{priorityAssignment ? 'Continue pela atividade mais importante agora.' : 'Não há nenhuma atividade pendente.'}</p>
              </div>
              {priorityAssignment && (
                <button className="inline-flex min-h-[46px] items-center gap-2 rounded-[15px] border-0 bg-[#f3c968] px-[18px] font-extrabold text-operation-ink transition-colors hover:bg-[#f7d889] focus-visible:outline-3 focus-visible:outline-[#f3c968]/40 focus-visible:outline-offset-3" type="button" onClick={() => navigate(`/app/checklists/${priorityAssignment.id}/execute${priorityAssignment.latestResponse?.id ? `?executionId=${encodeURIComponent(priorityAssignment.latestResponse.id)}` : ''}`)}>
                  {assignmentState(priorityAssignment.latestResponse) === 'finished' ? 'Revisar execução' : 'Abrir atividade'}
                  <ArrowRight size={18} aria-hidden="true" />
                </button>
              )}
            </article>
          </div>
        </>
      )}

      <div className="mb-[14px] flex items-end justify-between gap-5 max-[720px]:items-start">
        <div className="min-w-0">
          <p className="mb-1.5 text-xs font-extrabold uppercase tracking-[0.13em] text-operation-mint-dark">{isActivitiesPage ? 'Sua fila' : 'Agora'}</p>
          {isActivitiesPage ? <h1 id="employee-title" className="m-0 text-[clamp(32px,5vw,48px)] font-extrabold tracking-[-0.04em]">Atividades</h1> : <h2 className="m-0 text-[22px] font-extrabold tracking-[-0.025em]">Próximas atividades</h2>}
          <p className="mt-1.5 text-sm text-operation-muted">{isActivitiesPage ? 'Encontre tudo o que foi atribuído a você.' : 'Continue o que está em andamento ou comece a próxima prioridade.'}</p>
        </div>
        {!isActivitiesPage && metrics.total > 0 && (
          <button className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-[14px] border border-[rgba(15,143,126,0.22)] bg-[#effaf7] px-4 font-extrabold text-[#0a7568] transition-colors hover:bg-[#e4f6f1] focus-visible:outline-3 focus-visible:outline-[rgba(15,143,126,0.24)] focus-visible:outline-offset-3 max-[720px]:px-[13px]" type="button" onClick={() => navigate('/app/activities')}>
            Ver todas
            <ArrowRight size={18} aria-hidden="true" />
          </button>
        )}
      </div>

      {isActivitiesPage && metrics.total > 0 && (
        <div className="flex w-full min-w-0 flex-col gap-3" aria-label="Localizar e filtrar atividades">
          <label className="flex min-h-[46px] w-full min-w-0 items-center gap-2.5 rounded-2xl border border-[#dce7e5] bg-white px-4 text-operation-muted shadow-sm transition-all focus-within:border-operation-mint focus-within:ring-2 focus-within:ring-operation-mint/20">
            <Search size={17} aria-hidden="true" className="shrink-0 text-operation-muted" />
            <input className="w-full min-w-0 border-0 bg-transparent text-sm text-operation-ink outline-none placeholder:text-operation-muted" type="search" aria-label="Buscar atividade" value={activityQuery} onChange={(event) => setActivityQuery(event.target.value)} placeholder="Buscar atividade por nome..." />
          </label>
          <div className="flex w-full min-w-0 items-center gap-2 overflow-x-auto pb-1 pt-0.5 [scrollbar-width:none] [-webkit-overflow-scrolling:touch]" role="group" aria-label="Filtrar atividades por situação">
            {[
              ['all', 'Todas', metrics.total],
              ['pending', 'A iniciar', metrics.pending],
              ['in_progress', 'Em andamento', metrics.in_progress],
              ['finished', 'Concluídas', metrics.finished],
            ].map(([value, label, count]) => (
              <button
                type="button"
                className={`inline-flex min-h-[38px] shrink-0 items-center gap-2 rounded-full border px-3.5 text-xs font-bold transition-all active:scale-95 ${activityFilter === value ? 'border-[#20383e] bg-[#20383e] text-white shadow-sm' : 'border-[#dce7e5] bg-white text-operation-muted hover:border-operation-line hover:text-operation-ink'}`}
                onClick={() => setActivityFilter(value)}
                aria-pressed={activityFilter === value}
                key={value}
              >
                <span>{label}</span>
                <span className={`inline-flex min-h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[11px] font-extrabold ${activityFilter === value ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'}`}>{count}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {query.isLoading && (
        <div className="grid grid-cols-2 gap-3.5 max-[720px]:grid-cols-1" aria-label="Carregando atividades">
          {[1, 2, 3].map((item) => <div className="min-h-[245px] animate-pulse rounded-3xl bg-[#edf3f3]" key={item} />)}
        </div>
      )}

      {query.isError && (
        <div className="grid min-h-[280px] place-items-center content-center gap-2 rounded-3xl border border-dashed border-[#ecc8c8] bg-[#fffafa] p-[30px] text-center text-operation-muted" role="alert">
          <strong className="text-lg text-operation-ink">Não conseguimos carregar suas atividades.</strong>
          <p className="m-0 mb-2">Você pode tentar novamente sem sair da sua conta.</p>
          <button className="inline-flex min-h-[46px] items-center justify-center rounded-[15px] bg-operation-mint-dark px-[17px] font-extrabold text-white transition-colors hover:bg-operation-mint focus-visible:outline-3 focus-visible:outline-operation-accent/25 focus-visible:outline-offset-3" type="button" onClick={() => query.refetch()}>Tentar novamente</button>
          <small className="mt-1.5">Código: {query.error?.correlationId || 'EMPLOYEE_ASSIGNMENTS_LOAD_FAILED'}</small>
        </div>
      )}

      {!query.isLoading && !query.isError && metrics.total === 0 && (
        <div className="grid min-h-[280px] place-items-center content-center gap-2 rounded-3xl border border-dashed border-[#bdd4d5] bg-white/70 p-[30px] text-center text-operation-muted">
          <CheckCircle2 size={30} aria-hidden="true" />
          <strong className="text-lg text-operation-ink">Nenhuma atividade atribuída agora</strong>
          <p className="m-0 mb-2">Quando uma atividade for atribuída a você, ela aparecerá aqui.</p>
        </div>
      )}

      {!query.isLoading && !query.isError && metrics.total > 0 && visibleAssignments.length === 0 && (
        <div className="grid min-h-[280px] place-items-center content-center gap-2 rounded-3xl border border-dashed border-[#bdd4d5] bg-white/70 p-[30px] text-center text-operation-muted">
          {isActivitiesPage ? <Search size={30} aria-hidden="true" /> : <CheckCircle2 size={30} aria-hidden="true" />}
          <strong className="text-lg text-operation-ink">{isActivitiesPage ? 'Nenhuma atividade encontrada' : 'Tudo em dia por aqui'}</strong>
          <p className="m-0 mb-2">{isActivitiesPage ? 'Ajuste a busca ou escolha outra situação.' : 'As próximas atividades aparecerão aqui quando forem atribuídas.'}</p>
          {isActivitiesPage && <button className="inline-flex min-h-[46px] items-center justify-center rounded-[15px] bg-operation-mint-dark px-[17px] font-extrabold text-white transition-colors hover:bg-operation-mint" type="button" onClick={() => { setActivityFilter('all'); setActivityQuery(''); }}>Limpar filtros</button>}
        </div>
      )}

      {!query.isLoading && !query.isError && visibleAssignments.length > 0 && (
        <div className="grid grid-cols-2 gap-3.5 max-[720px]:grid-cols-1">
          {visibleAssignments.map((assignment) => {
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
              <article className={`group flex flex-col justify-between rounded-2xl p-4 shadow-sm transition-all duration-200 hover:shadow-md ${state === 'in_progress' ? 'border-l-4 border-operation-accent bg-[linear-gradient(145deg,#fff,#f4faf8)]' : 'border border-slate-100 bg-white'}`} key={assignment.id}>
                <div>
                  <div className="flex items-center justify-between gap-2 text-xs text-operation-muted">
                    <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-bold ${state === 'finished' ? 'bg-[#e4f7f1] text-operation-mint-dark' : state === 'in_progress' ? 'bg-[#e7f5fc] text-[#155d83]' : 'bg-[#fff5d9] text-[#865a00]'}`}>
                      {state === 'finished' ? 'Concluída' : state === 'in_progress' ? 'Em andamento' : 'A iniciar'}
                    </span>
                    <span className="text-[11px] font-medium">{itemCount} {itemCount === 1 ? 'item' : 'itens'}</span>
                  </div>

                  <h3 className="mt-2.5 mb-1 text-base font-bold leading-snug tracking-tight text-slate-900 line-clamp-2">{assignment.title}</h3>
                  {assignment.description && <p className="m-0 text-xs leading-normal text-operation-muted line-clamp-2">{assignment.description.replace(/<[^>]*>/g, '').trim()}</p>}
                </div>

                <div className="mt-3 pt-2">
                  <div className="mb-2.5 flex items-center gap-2">
                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[#e9efef]" aria-label={`Progresso: ${progress}%`}>
                      <span className="block h-full rounded-full bg-[linear-gradient(90deg,#15aa94,#68cdb8)] transition-all duration-300" style={{ width: `${Math.max(0, Math.min(progress, 100))}%` }} />
                    </div>
                    <span className="text-[11px] font-bold text-operation-muted">{progress}%</span>
                  </div>

                  <button className="inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-xl bg-operation-mint-dark px-4 text-xs font-bold text-white transition-all hover:bg-operation-mint active:scale-[0.98]" type="button" onClick={() => navigate(`/app/checklists/${assignment.id}/execute${executionQuery}`)}>
                    {actionLabel} <ArrowRight size={15} aria-hidden="true" />
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}

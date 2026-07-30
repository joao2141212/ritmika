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
          <div className="relative flex items-end justify-between gap-6 overflow-hidden rounded-3xl border border-teal-500/20 bg-[radial-gradient(circle_at_92%_10%,rgba(243,201,104,0.35),transparent_38%),linear-gradient(135deg,#e6f7f3_0%,#fffdf5_100%)] p-6 shadow-[0_20px_50px_-10px_rgba(15,118,104,0.18)] sm:p-8 max-[720px]:items-start max-[520px]:p-5">
            <div className="relative z-[1]">
              <p className="mb-1 text-xs font-bold uppercase tracking-wider text-operation-mint-dark">Sua rotina de hoje</p>
              <h1 id="employee-title" className="m-0 max-w-[720px] text-2xl font-extrabold leading-tight tracking-tight text-slate-900 sm:text-4xl">Olá, {String(user?.name || 'pessoa').split(' ')[0]}</h1>
              <p className="mt-1.5 max-w-[590px] text-xs text-operation-muted sm:text-sm">Veja o que precisa de atenção e continue exatamente de onde parou.</p>
            </div>
            <button className="relative z-[1] inline-flex min-h-10 shrink-0 items-center gap-2 rounded-xl border border-slate-200/80 bg-white/90 px-3.5 text-xs font-bold text-slate-800 shadow-sm backdrop-blur transition-all hover:bg-white active:scale-95 disabled:cursor-wait disabled:opacity-60 max-[720px]:w-10 max-[720px]:flex-[0_0_40px] max-[720px]:justify-center max-[720px]:gap-0 max-[720px]:p-0 max-[720px]:text-[0px]" type="button" onClick={() => query.refetch()} disabled={query.isFetching}>
              <RefreshCw size={16} className={query.isFetching ? 'animate-spin [animation-duration:800ms]' : ''} aria-hidden="true" />
              Atualizar
            </button>
          </div>

          <div className="grid grid-cols-4 gap-3.5 max-[520px]:grid-cols-2" aria-label="Resumo das atividades">
            <article className="flex min-h-[104px] min-w-0 items-center gap-3.5 rounded-2xl border border-teal-500/20 bg-gradient-to-br from-teal-600 via-teal-700 to-teal-800 p-4 text-white shadow-[0_14px_30px_-6px_rgba(13,148,136,0.38)] transition-all hover:-translate-y-0.5 active:scale-[0.98]">
              <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-white/15 text-white backdrop-blur-sm">
                <ClipboardCheck size={20} />
              </div>
              <span className="grid min-w-0">
                <strong className="text-2xl font-extrabold leading-none tracking-tight">{metrics.total}</strong>
                <small className="mt-1.5 truncate text-xs font-semibold text-teal-100/90">Atribuídas</small>
              </span>
            </article>

            <article className="flex min-h-[104px] min-w-0 items-center gap-3.5 rounded-2xl border border-amber-200/80 bg-gradient-to-br from-amber-50/90 via-orange-50/60 to-amber-100/40 p-4 text-amber-950 shadow-[0_12px_28px_-6px_rgba(245,158,11,0.18)] transition-all hover:-translate-y-0.5 active:scale-[0.98]">
              <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-amber-500/15 text-amber-700">
                <CircleDashed size={20} />
              </div>
              <span className="grid min-w-0">
                <strong className="text-2xl font-extrabold leading-none tracking-tight text-amber-950">{metrics.pending}</strong>
                <small className="mt-1.5 truncate text-xs font-bold text-amber-800/80">A iniciar</small>
              </span>
            </article>

            <article className="flex min-h-[104px] min-w-0 items-center gap-3.5 rounded-2xl border border-sky-200/80 bg-gradient-to-br from-sky-50/90 via-blue-50/60 to-sky-100/40 p-4 text-sky-950 shadow-[0_12px_28px_-6px_rgba(14,165,233,0.18)] transition-all hover:-translate-y-0.5 active:scale-[0.98]">
              <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-sky-500/15 text-sky-700">
                <Clock3 size={20} />
              </div>
              <span className="grid min-w-0">
                <strong className="text-2xl font-extrabold leading-none tracking-tight text-sky-950">{metrics.in_progress}</strong>
                <small className="mt-1.5 truncate text-xs font-bold text-sky-800/80">Em andamento</small>
              </span>
            </article>

            <article className="flex min-h-[104px] min-w-0 items-center gap-3.5 rounded-2xl border border-emerald-200/80 bg-gradient-to-br from-emerald-50/90 via-teal-50/60 to-emerald-100/40 p-4 text-emerald-950 shadow-[0_12px_28px_-6px_rgba(16,185,129,0.18)] transition-all hover:-translate-y-0.5 active:scale-[0.98]">
              <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-emerald-500/15 text-emerald-700">
                <CheckCircle2 size={20} />
              </div>
              <span className="grid min-w-0">
                <strong className="text-2xl font-extrabold leading-none tracking-tight text-emerald-950">{metrics.finished}</strong>
                <small className="mt-1.5 truncate text-xs font-bold text-emerald-800/80">Concluídas</small>
              </span>
            </article>
          </div>

          <div className="grid grid-cols-[minmax(0,1.25fr)_minmax(280px,0.75fr)] gap-4 max-[760px]:grid-cols-1">
            <article className="flex min-h-[190px] items-center justify-between gap-6 rounded-3xl border border-slate-200/80 bg-white/95 p-6 shadow-[0_18px_45px_-10px_rgba(15,118,104,0.12)] backdrop-blur-md max-[520px]:items-start max-[520px]:p-5">
              <div>
                <p className="mb-1 text-xs font-extrabold uppercase tracking-wider text-operation-mint-dark">Progresso da rotina</p>
                <h2 className="m-0 text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">{completionRate}% concluído</h2>
                <p className="m-0 mt-2 text-xs text-operation-muted sm:text-sm">{metrics.finished} de {metrics.total} atividades finalizadas.</p>
              </div>
              <div className="grid size-32 flex-[0_0_128px] place-content-center rounded-full text-center shadow-inner max-[520px]:size-24 max-[520px]:flex-[0_0_96px]" style={{ background: `radial-gradient(circle at center, #fff 60%, transparent 61%), conic-gradient(var(--color-operation-mint) ${completionRate * 3.6}deg, #e2efec 0)` }} aria-label={`${completionRate}% concluído`}>
                <strong className="text-2xl font-extrabold tracking-tight text-slate-900 max-[520px]:text-xl">{completionRate}%</strong>
                <span className="text-[11px] font-medium text-operation-muted">concluído</span>
              </div>
            </article>

            <article className="relative flex min-h-[190px] flex-col items-start justify-between gap-6 overflow-hidden rounded-3xl border border-[#2a4d57] bg-gradient-to-br from-[#17313a] via-[#1c3a44] to-[#0f2830] p-6 text-white shadow-[0_20px_50px_-10px_rgba(23,49,58,0.32)] max-[760px]:min-h-[170px] max-[520px]:p-5">
              <div className="absolute right-0 top-0 size-48 rounded-full bg-gradient-to-br from-amber-400/20 to-transparent blur-2xl pointer-events-none" />
              <div className="relative z-[1]">
                <p className="mb-1 text-xs font-bold uppercase tracking-wider text-[#bcd3d0]">Próximo passo</p>
                <h2 className="m-0 text-xl font-extrabold tracking-tight sm:text-2xl">{priorityAssignment?.title || 'Rotina em dia'}</h2>
                <p className="m-0 mt-1.5 text-xs text-[#bcd3d0]/90">{priorityAssignment ? 'Continue pela atividade mais importante agora.' : 'Não há nenhuma atividade pendente.'}</p>
              </div>
              {priorityAssignment && (
                <button className="relative z-[1] inline-flex min-h-11 items-center gap-2 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 px-4 text-xs font-extrabold text-slate-950 shadow-[0_10px_25px_-5px_rgba(243,201,104,0.4)] transition-all hover:brightness-105 active:scale-[0.98]" type="button" onClick={() => navigate(`/app/checklists/${priorityAssignment.id}/execute${priorityAssignment.latestResponse?.id ? `?executionId=${encodeURIComponent(priorityAssignment.latestResponse.id)}` : ''}`)}>
                  {assignmentState(priorityAssignment.latestResponse) === 'finished' ? 'Revisar execução' : 'Abrir atividade'}
                  <ArrowRight size={16} aria-hidden="true" />
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

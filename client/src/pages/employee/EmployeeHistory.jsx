import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { CheckCircle2, Clock3, History, RefreshCw } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { logger } from '../../lib/logger';
import RouteSkeleton from '../../components/RouteSkeleton';

const dateTime = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' });

const titleFromResponse = (response) =>
  response.checklist_snapshot?.title
  || response.response_meta?.checklist_title
  || 'Checklist executado';

async function loadHistory(user) {
  const correlationId = logger.createCorrelationId();
  try {
    const { data, error } = await supabase
      .from('ritmika_responses')
      .select('id,checklist_id,is_finished,response_meta,checklist_snapshot,execution_type,started_at,completed_at,effort_kpi,quality_kpi,ttc,qtd_items,qtd_items_answered,updated_at')
      .eq('workspace_id', user.workspace_id)
      .eq('profile_id', user.id)
      .order('updated_at', { ascending: false })
      .limit(100);
    if (error) throw error;
    return data || [];
  } catch (error) {
    logger.error({
      fn: 'EmployeeHistory.loadHistory',
      status: 'error',
      errorCode: error?.code || 'EMPLOYEE_HISTORY_LOAD_FAILED',
      correlationId,
      workspaceId: user?.workspace_id,
      profileId: user?.id,
      error: error instanceof Error ? error.message : String(error),
    });
    throw Object.assign(new Error('Não foi possível carregar seu histórico.'), { correlationId });
  }
}

export default function EmployeeHistory() {
  const { user } = useAuth();
  const query = useQuery({
    queryKey: ['employee-history', user?.workspace_id, user?.id],
    queryFn: () => loadHistory(user),
    enabled: Boolean(user?.workspace_id && user?.id),
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });

  const summary = useMemo(() => {
    const rows = query.data || [];
    return {
      total: rows.length,
      finished: rows.filter((row) => row.is_finished).length,
      open: rows.filter((row) => !row.is_finished).length,
    };
  }, [query.data]);

  return (
    <section className="grid w-full min-w-0 gap-6 text-operation-ink" aria-labelledby="employee-history-title">
      <header className="flex items-end justify-between gap-4 max-[720px]:items-start">
        <div className="min-w-0">
          <p className="mb-1 text-xs font-bold uppercase tracking-wider text-operation-mint-dark">Meu desempenho</p>
          <h1 id="employee-history-title" className="m-0 text-2xl font-bold tracking-tight sm:text-3xl">Histórico</h1>
          <p className="mt-1 max-w-full text-xs text-operation-muted sm:text-sm">Acompanhe somente as execuções realizadas por você.</p>
        </div>
        <button className="inline-flex min-h-10 shrink-0 items-center gap-2 rounded-xl border border-operation-line bg-white px-3 text-xs font-bold text-operation-ink transition-colors hover:bg-operation-soft focus-visible:outline-2 disabled:cursor-wait disabled:opacity-60 max-[720px]:w-10 max-[720px]:flex-[0_0_40px] max-[720px]:justify-center max-[720px]:gap-0 max-[720px]:p-0" type="button" onClick={() => query.refetch()} disabled={query.isFetching} aria-label="Atualizar histórico">
          <RefreshCw size={16} className={query.isFetching ? 'animate-spin [animation-duration:800ms]' : ''} aria-hidden="true" />
          <span className="max-[720px]:hidden">Atualizar</span>
        </button>
      </header>

      <div className="grid grid-cols-3 gap-3" role="list" aria-label="Resumo do histórico">
        <article className="grid min-w-0 rounded-2xl border border-operation-line bg-white p-4" role="listitem">
          <strong className="text-2xl font-extrabold leading-none text-slate-900">{summary.total}</strong>
          <span className="mt-1 text-xs text-operation-muted">Execuções</span>
        </article>
        <article className="grid min-w-0 rounded-2xl border border-operation-line bg-white p-4" role="listitem">
          <strong className="text-2xl font-extrabold leading-none text-teal-700">{summary.finished}</strong>
          <span className="mt-1 text-xs text-operation-muted">Concluídas</span>
        </article>
        <article className="grid min-w-0 rounded-2xl border border-operation-line bg-white p-4" role="listitem">
          <strong className="text-2xl font-extrabold leading-none text-amber-600">{summary.open}</strong>
          <span className="mt-1 text-xs text-operation-muted">Em andamento</span>
        </article>
      </div>

      {query.isLoading && <RouteSkeleton variant="list" label="Carregando seu histórico" />}

      {query.isError && (
        <div className="grid min-h-[240px] place-items-center content-center gap-2 rounded-2xl border border-dashed border-red-200 bg-red-50/50 p-6 text-center text-operation-muted" role="alert">
          <strong className="text-base text-operation-ink">Histórico indisponível</strong>
          <p className="m-0 text-xs">Tente novamente sem sair da sua conta.</p>
          <button className="inline-flex min-h-10 items-center justify-center rounded-xl bg-operation-mint-dark px-4 text-xs font-bold text-white transition-colors hover:bg-operation-mint" type="button" onClick={() => query.refetch()}>Tentar novamente</button>
        </div>
      )}

      {!query.isLoading && !query.isError && summary.total === 0 && (
        <div className="grid min-h-[240px] place-items-center content-center gap-2 rounded-2xl border border-dashed border-slate-200 bg-white/70 p-6 text-center text-operation-muted">
          <History size={28} aria-hidden="true" className="text-slate-400" />
          <strong className="text-base text-operation-ink">Seu histórico começa na primeira execução</strong>
          <p className="m-0 text-xs">Checklists iniciados e concluídos por você aparecerão aqui.</p>
        </div>
      )}

      {!query.isLoading && !query.isError && summary.total > 0 && (
        <div className="grid gap-3" role="list" aria-label="Histórico de execuções">
          {(query.data || []).map((response) => (
            <article className="grid min-w-0 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3.5 rounded-2xl border border-operation-line bg-white p-4 max-[720px]:grid-cols-[40px_minmax(0,1fr)] max-[720px]:gap-3" key={response.id} role="listitem">
              <span className={`grid size-10 place-items-center rounded-xl ${response.is_finished ? 'bg-teal-50 text-teal-700' : 'bg-slate-100 text-slate-500'}`}>
                {response.is_finished ? <CheckCircle2 size={18} aria-hidden="true" /> : <Clock3 size={18} aria-hidden="true" />}
              </span>
              <div className="min-w-0">
                <div className="flex min-w-0 items-center gap-2 max-[720px]:flex-wrap max-[720px]:items-start">
                  <span className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-bold ${response.is_finished ? 'bg-teal-50 text-teal-700' : 'bg-amber-50 text-amber-700'}`}>
                    {response.is_finished ? 'Concluída' : 'Em andamento'}
                  </span>
                  <small className="text-[11px] text-operation-muted">{dateTime.format(new Date(response.completed_at || response.started_at || response.updated_at))}</small>
                </div>
                <h2 className="mt-1 mb-0.5 max-w-full [overflow-wrap:anywhere] text-sm font-bold leading-snug">{titleFromResponse(response)}</h2>
                <p className="m-0 max-w-full [overflow-wrap:anywhere] text-xs text-operation-muted">{Number(response.qtd_items_answered || 0)}/{Number(response.qtd_items || 0)} itens respondidos</p>
              </div>
              <div className="flex min-w-0 gap-2 max-[720px]:col-start-2 max-[720px]:grid max-[720px]:grid-cols-2">
                {response.effort_kpi != null && <span className="grid rounded-xl bg-slate-50 px-3 py-1.5 text-center"><small className="text-[10px] text-operation-muted">Esforço</small><strong className="text-xs">{Math.round(Number(response.effort_kpi))}%</strong></span>}
                {response.quality_kpi != null && <span className="grid rounded-xl bg-slate-50 px-3 py-1.5 text-center"><small className="text-[10px] text-operation-muted">Qualidade</small><strong className="text-xs">{Math.round(Number(response.quality_kpi))}%</strong></span>}
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

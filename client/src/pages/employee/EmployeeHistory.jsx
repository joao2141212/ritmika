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
    <section className="grid w-full min-w-0 gap-[22px] text-operation-ink" aria-labelledby="employee-history-title">
      <header className="flex items-end justify-between gap-5 max-[720px]:items-start">
        <div className="min-w-0">
          <p className="mb-1.5 text-xs font-extrabold uppercase tracking-[0.13em] text-operation-mint-dark">Meu desempenho</p>
          <h1 id="employee-history-title" className="m-0 text-[clamp(32px,5vw,48px)] font-extrabold tracking-[-0.04em]">Histórico</h1>
          <p className="mt-2 max-w-full text-operation-muted">Acompanhe somente as execuções realizadas por você.</p>
        </div>
        <button className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-[14px] border border-operation-line bg-white px-4 font-extrabold text-operation-ink transition-colors hover:bg-operation-soft focus-visible:outline-3 focus-visible:outline-operation-accent/25 focus-visible:outline-offset-3 disabled:cursor-wait disabled:opacity-60 max-[720px]:w-11 max-[720px]:flex-[0_0_44px] max-[720px]:justify-center max-[720px]:gap-0 max-[720px]:p-0" type="button" onClick={() => query.refetch()} disabled={query.isFetching} aria-label="Atualizar histórico">
          <RefreshCw size={17} className={query.isFetching ? 'animate-spin [animation-duration:800ms]' : ''} aria-hidden="true" />
          <span className="max-[720px]:hidden">Atualizar</span>
        </button>
      </header>

      <div className="grid grid-cols-3 gap-3 max-[520px]:gap-2" role="list" aria-label="Resumo do histórico">
        <article className="grid min-w-0 rounded-[20px] border border-operation-line bg-white p-[18px] max-[520px]:p-[14px_11px]" role="listitem">
          <strong className="text-[28px] leading-none max-[720px]:text-[23px]">{summary.total}</strong>
          <span className="mt-1 text-[13px] text-operation-muted">Execuções</span>
        </article>
        <article className="grid min-w-0 rounded-[20px] border border-operation-line bg-white p-[18px] max-[520px]:p-[14px_11px]" role="listitem">
          <strong className="text-[28px] leading-none max-[720px]:text-[23px]">{summary.finished}</strong>
          <span className="mt-1 text-[13px] text-operation-muted">Concluídas</span>
        </article>
        <article className="grid min-w-0 rounded-[20px] border border-operation-line bg-white p-[18px] max-[520px]:p-[14px_11px]" role="listitem">
          <strong className="text-[28px] leading-none max-[720px]:text-[23px]">{summary.open}</strong>
          <span className="mt-1 text-[13px] text-operation-muted">Em andamento</span>
        </article>
      </div>

      {query.isLoading && <RouteSkeleton variant="list" label="Carregando seu histórico" />}

      {query.isError && (
        <div className="grid min-h-[280px] place-items-center content-center gap-2 rounded-3xl border border-dashed border-[#ecc8c8] bg-[#fffafa] p-[30px] text-center text-operation-muted" role="alert">
          <strong className="text-lg text-operation-ink">Histórico indisponível</strong>
          <p className="m-0 mb-2">Tente novamente sem sair da sua conta.</p>
          <button className="inline-flex min-h-[46px] items-center justify-center rounded-[15px] bg-operation-mint-dark px-[17px] font-extrabold text-white transition-colors hover:bg-operation-mint focus-visible:outline-3 focus-visible:outline-operation-accent/25 focus-visible:outline-offset-3" type="button" onClick={() => query.refetch()}>Tentar novamente</button>
          <small className="mt-1.5">Código: {query.error?.correlationId}</small>
        </div>
      )}

      {!query.isLoading && !query.isError && summary.total === 0 && (
        <div className="grid min-h-[280px] place-items-center content-center gap-2 rounded-3xl border border-dashed border-[#bdd4d5] bg-white/70 p-[30px] text-center text-operation-muted">
          <History size={30} aria-hidden="true" />
          <strong className="text-lg text-operation-ink">Seu histórico começa na primeira execução</strong>
          <p className="m-0 mb-2">Checklists iniciados e concluídos por você aparecerão aqui.</p>
        </div>
      )}

      {!query.isLoading && !query.isError && summary.total > 0 && (
        <div className="grid gap-3" role="list" aria-label="Histórico de execuções">
          {(query.data || []).map((response) => (
            <article className="grid min-w-0 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-4 rounded-[20px] border border-operation-line bg-white p-[18px] max-[720px]:grid-cols-[44px_minmax(0,1fr)] max-[720px]:gap-3 max-[720px]:p-[15px]" key={response.id} role="listitem">
              <span className={`grid h-11 w-11 place-items-center rounded-[15px] ${response.is_finished ? 'bg-operation-soft text-operation-mint-dark' : 'bg-[#edf2f2] text-[#6c7f86]'}`}>
                {response.is_finished ? <CheckCircle2 size={20} aria-hidden="true" /> : <Clock3 size={20} aria-hidden="true" />}
              </span>
              <div className="min-w-0">
                <div className="flex min-w-0 items-center gap-2.5 max-[720px]:flex-wrap max-[720px]:items-start max-[720px]:gap-x-2 max-[720px]:gap-y-1">
                  <span className={`inline-flex rounded-full px-2.5 py-1.5 text-xs font-extrabold ${response.is_finished ? 'bg-[#e4f7f1] text-operation-mint-dark' : 'bg-[#e7f5fc] text-[#155d83]'}`}>
                    {response.is_finished ? 'Concluída' : 'Em andamento'}
                  </span>
                  <small className="text-operation-muted">{dateTime.format(new Date(response.completed_at || response.started_at || response.updated_at))}</small>
                </div>
                <h2 className="mt-2 mb-1 max-w-full [overflow-wrap:anywhere] text-[17px] font-bold leading-tight">{titleFromResponse(response)}</h2>
                <p className="m-0 max-w-full [overflow-wrap:anywhere] text-operation-muted leading-[1.5]">{Number(response.qtd_items_answered || 0)}/{Number(response.qtd_items || 0)} itens respondidos</p>
              </div>
              <div className="flex min-w-0 gap-2 max-[720px]:col-start-2 max-[720px]:grid max-[720px]:grid-cols-2 max-[720px]:pl-0">
                {response.effort_kpi != null && <span className="grid min-w-[76px] rounded-[14px] bg-operation-soft p-2.5 text-center max-[720px]:min-w-0"><small className="text-operation-muted">Esforço</small><strong>{Math.round(Number(response.effort_kpi))}%</strong></span>}
                {response.quality_kpi != null && <span className="grid min-w-[76px] rounded-[14px] bg-operation-soft p-2.5 text-center max-[720px]:min-w-0"><small className="text-operation-muted">Qualidade</small><strong>{Math.round(Number(response.quality_kpi))}%</strong></span>}
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

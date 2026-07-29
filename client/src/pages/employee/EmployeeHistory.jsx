import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { CheckCircle2, Clock3, History, RefreshCw } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { logger } from '../../lib/logger';
import '../../components/employee/employee.css';

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
    <section className="employee-page" aria-labelledby="employee-history-title">
      <header className="employee-page-header">
        <div><p className="employee-eyebrow">Meu desempenho</p><h1 id="employee-history-title">Histórico</h1><p>Acompanhe somente as execuções realizadas por você.</p></div>
        <button className="employee-refresh" type="button" onClick={() => query.refetch()} disabled={query.isFetching}><RefreshCw size={17} className={query.isFetching ? 'is-spinning' : ''} /><span>Atualizar</span></button>
      </header>

      <div className="employee-compact-metrics">
        <article><strong>{summary.total}</strong><span>Execuções</span></article>
        <article><strong>{summary.finished}</strong><span>Concluídas</span></article>
        <article><strong>{summary.open}</strong><span>Em andamento</span></article>
      </div>

      {query.isLoading && <div className="employee-state">Carregando seu histórico…</div>}
      {query.isError && <div className="employee-state employee-state-error" role="alert"><strong>Histórico indisponível</strong><p>Tente novamente sem sair da sua conta.</p><button type="button" onClick={() => query.refetch()}>Tentar novamente</button><small>Código: {query.error?.correlationId}</small></div>}
      {!query.isLoading && !query.isError && summary.total === 0 && <div className="employee-state"><History size={30} /><strong>Seu histórico começa na primeira execução</strong><p>Checklists iniciados e concluídos por você aparecerão aqui.</p></div>}

      {!query.isLoading && !query.isError && summary.total > 0 && (
        <div className="employee-history-list">
          {(query.data || []).map((response) => (
            <article key={response.id}>
              <span className={`employee-history-icon ${response.is_finished ? 'is-finished' : ''}`}>{response.is_finished ? <CheckCircle2 /> : <Clock3 />}</span>
              <div className="employee-history-copy"><div><span className={`employee-status employee-status-${response.is_finished ? 'finished' : 'in_progress'}`}>{response.is_finished ? 'Concluída' : 'Em andamento'}</span><small>{dateTime.format(new Date(response.completed_at || response.started_at || response.updated_at))}</small></div><h2>{titleFromResponse(response)}</h2><p>{Number(response.qtd_items_answered || 0)}/{Number(response.qtd_items || 0)} itens respondidos</p></div>
              <div className="employee-history-kpis">
                {response.effort_kpi != null && <span><small>Esforço</small><strong>{Math.round(Number(response.effort_kpi))}%</strong></span>}
                {response.quality_kpi != null && <span><small>Qualidade</small><strong>{Math.round(Number(response.quality_kpi))}%</strong></span>}
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

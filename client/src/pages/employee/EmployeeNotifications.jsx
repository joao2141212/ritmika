import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Bell, CheckCheck, RefreshCw } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { notificationService } from '../../services/checklistProducaoService';
import { logger } from '../../lib/logger';
import RouteSkeleton from '../../components/RouteSkeleton';

const relativeDate = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' });

const NOTIFICATION_KIND_LABELS = {
  CHECKLIST_ASSIGNED: 'Nova atividade',
  CHECKLIST_UPDATED: 'Atividade atualizada',
  EXECUTION_STARTED: 'Atividade iniciada',
  EXECUTION_COMPLETED: 'Atividade concluída',
  EXECUTION_REOPENED: 'Atividade reaberta',
  SCHEDULE_REMINDER: 'Lembrete',
};

function notificationKindLabel(kind) {
  return NOTIFICATION_KIND_LABELS[String(kind || '').toUpperCase()] || 'Atualização';
}

export default function EmployeeNotifications() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const queryKey = ['employee-notifications', user?.workspace_id, user?.id];
  const query = useQuery({
    queryKey,
    queryFn: () => notificationService.getAll(100),
    enabled: Boolean(user?.workspace_id && user?.id),
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });
  const markRead = useMutation({
    mutationFn: (id) => notificationService.markRead(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
    onError: (error, id) => logger.error({ fn: 'EmployeeNotifications.markRead', status: 'error', notificationId: id, errorCode: error?.code || 'EMPLOYEE_NOTIFICATION_READ_FAILED', error: error instanceof Error ? error.message : String(error) }),
  });
  const notifications = query.data || [];
  const unread = notifications.filter((item) => !item.read).length;

  return (
    <section className="grid w-full min-w-0 gap-6 text-operation-ink" aria-labelledby="employee-notifications-title">
      <header className="flex items-end justify-between gap-4 max-[720px]:items-start">
        <div className="min-w-0">
          <p className="mb-1 text-xs font-bold uppercase tracking-wider text-operation-mint-dark">Lembretes e mudanças</p>
          <h1 id="employee-notifications-title" className="m-0 text-2xl font-bold tracking-tight sm:text-3xl">Avisos</h1>
          <p className="mt-1 max-w-full text-xs text-operation-muted sm:text-sm">{unread ? `${unread} aviso${unread === 1 ? '' : 's'} ainda não lido${unread === 1 ? '' : 's'}.` : 'Você está em dia com os avisos.'}</p>
        </div>
        <button className="inline-flex min-h-10 shrink-0 items-center gap-2 rounded-xl border border-operation-line bg-white px-3 text-xs font-bold text-operation-ink transition-colors hover:bg-operation-soft focus-visible:outline-2 disabled:cursor-wait disabled:opacity-60 max-[720px]:w-10 max-[720px]:flex-[0_0_40px] max-[720px]:justify-center max-[720px]:gap-0 max-[720px]:p-0" type="button" onClick={() => query.refetch()} disabled={query.isFetching}>
          <RefreshCw size={16} className={query.isFetching ? 'animate-spin [animation-duration:800ms]' : ''} aria-hidden="true" />
          <span className="max-[720px]:hidden">Atualizar</span>
        </button>
      </header>

      {query.isLoading && <RouteSkeleton variant="list" label="Carregando avisos" />}

      {query.isError && (
        <div className="grid min-h-[240px] place-items-center content-center gap-2 rounded-2xl border border-dashed border-red-200 bg-red-50/50 p-6 text-center text-operation-muted" role="alert">
          <strong className="text-base text-operation-ink">Avisos indisponíveis</strong>
          <p className="m-0 text-xs">O restante do aplicativo continua funcionando.</p>
          <button className="inline-flex min-h-10 items-center justify-center rounded-xl bg-operation-mint-dark px-4 text-xs font-bold text-white transition-colors hover:bg-operation-mint" type="button" onClick={() => query.refetch()}>Tentar novamente</button>
        </div>
      )}

      {!query.isLoading && !query.isError && notifications.length === 0 && (
        <div className="grid min-h-[240px] place-items-center content-center gap-2 rounded-2xl border border-dashed border-slate-200 bg-white/70 p-6 text-center text-operation-muted">
          <Bell size={28} aria-hidden="true" className="text-slate-400" />
          <strong className="text-base text-operation-ink">Nenhum aviso agora</strong>
          <p className="m-0 text-xs">Lembretes, atribuições e mudanças da sua rotina aparecerão aqui.</p>
        </div>
      )}

      {!query.isLoading && !query.isError && notifications.length > 0 && (
        <div className="grid gap-3" role="list" aria-label="Lista de avisos">
          {notifications.map((notification) => (
            <article className={`grid min-w-0 grid-cols-[40px_minmax(0,1fr)_auto] items-center gap-3.5 rounded-2xl border bg-white p-4 max-[720px]:grid-cols-[40px_minmax(0,1fr)] max-[720px]:gap-3 ${notification.read ? 'border-operation-line' : 'border-teal-200 shadow-sm'}`} key={notification.id} role="listitem">
              <span className="grid size-10 place-items-center rounded-xl bg-slate-100 text-slate-500">
                <Bell size={18} aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <div className="flex min-w-0 items-center gap-2 max-[720px]:flex-wrap max-[720px]:items-start">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-operation-mint-dark">{notificationKindLabel(notification.kind)}</span>
                  <small className="text-[11px] text-operation-muted">{relativeDate.format(new Date(notification.createdAt || notification.created_at))}</small>
                </div>
                <h2 className="mt-1 mb-0.5 max-w-full [overflow-wrap:anywhere] text-sm font-bold leading-snug">{notification.title}</h2>
                {notification.body && <p className="m-0 max-w-full [overflow-wrap:anywhere] text-xs text-operation-muted leading-normal">{notification.body}</p>}
              </div>
              {!notification.read && (
                <button className="grid size-10 place-items-center rounded-xl border border-operation-line bg-white text-operation-mint-dark transition-colors hover:bg-operation-soft max-[720px]:col-start-2 max-[720px]:justify-self-start" type="button" onClick={() => markRead.mutate(notification.id)} disabled={markRead.isPending} aria-label={`Marcar como lido: ${notification.title}`}>
                  <CheckCheck size={18} aria-hidden="true" />
                </button>
              )}
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

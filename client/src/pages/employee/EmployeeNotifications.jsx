import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Bell, CheckCheck, RefreshCw } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { notificationService } from '../../services/checklistProducaoService';
import { logger } from '../../lib/logger';
import '../../components/employee/employee.css';

const relativeDate = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' });

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
    <section className="employee-page" aria-labelledby="employee-notifications-title">
      <header className="employee-page-header"><div><p className="employee-eyebrow">Lembretes e mudanças</p><h1 id="employee-notifications-title">Avisos</h1><p>{unread ? `${unread} aviso${unread === 1 ? '' : 's'} ainda não lido${unread === 1 ? '' : 's'}.` : 'Você está em dia com os avisos.'}</p></div><button className="employee-refresh" type="button" onClick={() => query.refetch()} disabled={query.isFetching}><RefreshCw size={17} className={query.isFetching ? 'is-spinning' : ''} /><span>Atualizar</span></button></header>
      {query.isLoading && <div className="employee-state">Carregando avisos…</div>}
      {query.isError && <div className="employee-state employee-state-error" role="alert"><strong>Avisos indisponíveis</strong><p>O restante do aplicativo continua funcionando.</p><button type="button" onClick={() => query.refetch()}>Tentar novamente</button></div>}
      {!query.isLoading && !query.isError && notifications.length === 0 && <div className="employee-state"><Bell size={30} /><strong>Nenhum aviso agora</strong><p>Lembretes, atribuições e mudanças da sua rotina aparecerão aqui.</p></div>}
      {!query.isLoading && !query.isError && notifications.length > 0 && <div className="employee-notification-list">{notifications.map((notification) => <article className={notification.read ? '' : 'is-unread'} key={notification.id}><span className="employee-notification-icon"><Bell /></span><div><div><span>{notification.kind || 'Aviso'}</span><small>{relativeDate.format(new Date(notification.createdAt || notification.created_at))}</small></div><h2>{notification.title}</h2>{notification.body && <p>{notification.body}</p>}</div>{!notification.read && <button type="button" onClick={() => markRead.mutate(notification.id)} disabled={markRead.isPending} aria-label={`Marcar como lido: ${notification.title}`}><CheckCheck /></button>}</article>)}</div>}
    </section>
  );
}

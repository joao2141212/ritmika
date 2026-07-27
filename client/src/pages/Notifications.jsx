import { useEffect, useState } from 'react';
import { ArrowLeft, Bell, Check, CheckCheck, LoaderCircle, RefreshCw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { notificationService } from '../services/checklistProducaoService';
import '../styles/notifications.css';

const Notifications = () => {
    const navigate = useNavigate();
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(true);
    const [working, setWorking] = useState(false);
    const [error, setError] = useState('');

    const loadNotifications = async () => {
        try {
            setLoading(true);
            setError('');
            setNotifications(await notificationService.getAll(100));
        } catch (loadError) {
            setError(loadError instanceof Error ? loadError.message : 'Não foi possível carregar as notificações.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadNotifications();
    }, []);

    const markRead = async (notification) => {
        if (notification.read) return;
        try {
            const updated = await notificationService.markRead(notification.id);
            setNotifications((current) => current.map((item) => item.id === notification.id ? updated : item));
        } catch {
            toast.error('Não foi possível marcar a notificação.');
        }
    };

    const markAllRead = async () => {
        try {
            setWorking(true);
            await notificationService.markAllRead();
            setNotifications((current) => current.map((item) => ({ ...item, read: true, is_read: true, read_at: new Date().toISOString() })));
        } catch {
            toast.error('Não foi possível atualizar as notificações.');
        } finally {
            setWorking(false);
        }
    };

    const openNotification = async (notification) => {
        await markRead(notification);
        if (notification.route) navigate(notification.route);
    };

    const unreadCount = notifications.filter((notification) => !notification.read).length;

    return (
        <div className="notifications-page ritmika-light-mode">
            <header className="notifications-header">
                <div className="notifications-title">
                    <button type="button" className="notifications-back" aria-label="Voltar" onClick={() => navigate('/')}>
                        <ArrowLeft size={18} />
                    </button>
                    <div>
                        <p className="remote-eyebrow">Central do workspace</p>
                        <h1>Notificações</h1>
                        <p>{unreadCount ? unreadCount + ' não lidas' : 'Tudo atualizado'}</p>
                    </div>
                </div>
                <div className="notifications-actions">
                    <button type="button" className="notifications-action" onClick={loadNotifications} disabled={loading}>
                        <RefreshCw size={16} />
                        Atualizar
                    </button>
                    <button type="button" className="notifications-action primary" onClick={markAllRead} disabled={working || unreadCount === 0}>
                        <CheckCheck size={16} />
                        Marcar todas como lidas
                    </button>
                </div>
            </header>

            <main className="notifications-panel">
                {loading ? (
                    <div className="notifications-state">
                        <LoaderCircle size={22} className="is-spinning" />
                        Carregando notificações remotas…
                    </div>
                ) : error ? (
                    <div className="notifications-state notifications-error">
                        <span>{error}</span>
                        <button type="button" className="notifications-action" onClick={loadNotifications}>Tentar novamente</button>
                    </div>
                ) : notifications.length === 0 ? (
                    <div className="notifications-state notifications-empty">
                        <Bell size={28} />
                        <strong>Nenhuma notificação ainda</strong>
                        <span>Eventos importantes do workspace aparecerão aqui.</span>
                    </div>
                ) : (
                    <div className="notifications-list">
                        {notifications.map((notification) => (
                            <button
                                type="button"
                                className={'notification-row ' + (notification.read ? 'is-read' : 'is-unread')}
                                key={notification.id}
                                onClick={() => openNotification(notification)}
                            >
                                <span className="notification-icon"><Bell size={18} /></span>
                                <span className="notification-content">
                                    <strong>{notification.title}</strong>
                                    {notification.body && <span>{notification.body}</span>}
                                    <small>{new Date(notification.created_at).toLocaleString('pt-BR')}</small>
                                </span>
                                {!notification.read && <span className="notification-unread" aria-label="Não lida"><Check size={14} /></span>}
                            </button>
                        ))}
                    </div>
                )}
            </main>
        </div>
    );
};

export default Notifications;

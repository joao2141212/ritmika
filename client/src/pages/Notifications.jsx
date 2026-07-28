import { useEffect, useState } from 'react';
import { ArrowLeft, Bell, Check, CheckCheck, ChevronLeft, ChevronRight, ExternalLink, Filter, LoaderCircle, RefreshCw, Search } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { notificationService } from '../services/checklistProducaoService';
import '../styles/notifications.css';

const EMPTY_GRID = {
    rows: [],
    total: 0,
    pageIndex: 0,
    pageSize: 10,
    stats: { total: 0, unread: 0, mine: 0, team: 0, whatsapp: 0, push: 0 },
    units: [],
    channels: [],
    types: [],
};

const formatDate = (value) => value ? new Date(value).toLocaleString('pt-BR') : '-';

const Notifications = () => {
    const navigate = useNavigate();
    const [grid, setGrid] = useState(EMPTY_GRID);
    const [filters, setFilters] = useState({ search: '', unitId: '', channel: '', type: '', readState: '' });
    const [draftSearch, setDraftSearch] = useState('');
    const [pageIndex, setPageIndex] = useState(0);
    const [loading, setLoading] = useState(true);
    const [working, setWorking] = useState(false);
    const [error, setError] = useState('');

    const loadGrid = async (nextFilters = filters, nextPage = pageIndex) => {
        try {
            setLoading(true);
            setError('');
            const data = await notificationService.getGrid({ ...nextFilters, pageIndex: nextPage, pageSize: 10 });
            setGrid(data);
        } catch (loadError) {
            setError(loadError instanceof Error ? loadError.message : 'Não foi possível carregar as notificações.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadGrid(filters, pageIndex);
        // Filters and pagination are the remote query contract for this screen.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [filters, pageIndex]);

    const updateFilter = (field, value) => {
        setPageIndex(0);
        setFilters((current) => ({ ...current, [field]: value }));
    };

    const submitSearch = (event) => {
        event.preventDefault();
        updateFilter('search', draftSearch);
    };

    const markRead = async (notification) => {
        if (notification.read) return;
        try {
            const updated = await notificationService.markRead(notification.id);
            setGrid((current) => ({
                ...current,
                rows: current.rows.map((item) => item.id === notification.id ? { ...item, ...updated, read: true, is_read: true } : item),
                stats: { ...current.stats, unread: Math.max(0, current.stats.unread - 1) },
            }));
        } catch (markError) {
            toast.error(markError instanceof Error ? markError.message : 'Não foi possível marcar a notificação.');
        }
    };

    const markAllRead = async () => {
        try {
            setWorking(true);
            await notificationService.markAllRead();
            setGrid((current) => ({
                ...current,
                rows: current.rows.map((item) => ({ ...item, read: true, is_read: true, read_at: new Date().toISOString() })),
                stats: { ...current.stats, unread: 0 },
            }));
        } catch (markError) {
            toast.error(markError instanceof Error ? markError.message : 'Não foi possível atualizar as notificações.');
        } finally {
            setWorking(false);
        }
    };

    const openNotification = async (notification) => {
        await markRead(notification);
        if (notification.route) navigate(notification.route);
    };

    const pageCount = Math.max(Math.ceil(grid.total / grid.pageSize), 1);
    const from = grid.total === 0 ? 0 : pageIndex * grid.pageSize + 1;
    const to = Math.min((pageIndex + 1) * grid.pageSize, grid.total);

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
                        <p>{grid.stats.unread ? grid.stats.unread + ' não lidas' : 'Tudo atualizado'}</p>
                    </div>
                </div>
                <div className="notifications-actions">
                    <button type="button" className="notifications-action" onClick={() => loadGrid(filters, pageIndex)} disabled={loading}>
                        <RefreshCw size={16} /> Atualizar
                    </button>
                    <button type="button" className="notifications-action primary" onClick={markAllRead} disabled={working || grid.stats.unread === 0}>
                        <CheckCheck size={16} /> Marcar todas como lidas
                    </button>
                </div>
            </header>

            <main className="notifications-panel">
                <div className="notifications-stat-grid">
                    <div><span>Minhas notificações</span><strong>{grid.stats.mine}</strong><small>WhatsApp {grid.stats.whatsapp}</small></div>
                    <div><span>Notificações da equipe</span><strong>{grid.stats.team}</strong><small>Push {grid.stats.push}</small></div>
                    <div><span>Não lidas</span><strong>{grid.stats.unread}</strong><small>Na consulta atual</small></div>
                    <div><span>Total filtrado</span><strong>{grid.stats.total}</strong><small>Registros remotos</small></div>
                </div>

                <form className="notifications-filters" onSubmit={submitSearch}>
                    <div className="notifications-search">
                        <Search size={17} />
                        <input value={draftSearch} onChange={(event) => setDraftSearch(event.target.value)} placeholder="Buscar por nome ou telefone..." />
                    </div>
                    <select value={filters.unitId} onChange={(event) => updateFilter('unitId', event.target.value)} aria-label="Filtrar por unidade">
                        <option value="">Todas as unidades</option>
                        {grid.units.map((unit) => <option key={unit.id} value={unit.id}>{unit.name}</option>)}
                    </select>
                    <select value={filters.channel} onChange={(event) => updateFilter('channel', event.target.value)} aria-label="Filtrar por canal">
                        <option value="">Todos os canais</option>
                        {grid.channels.map((channel) => <option key={channel} value={channel.toLocaleLowerCase('pt-BR')}>{channel}</option>)}
                    </select>
                    <select value={filters.type} onChange={(event) => updateFilter('type', event.target.value)} aria-label="Filtrar por tipo">
                        <option value="">Todos os tipos</option>
                        {grid.types.map((type) => <option key={type} value={type.toLocaleLowerCase('pt-BR')}>{type}</option>)}
                    </select>
                    <select value={filters.readState} onChange={(event) => updateFilter('readState', event.target.value)} aria-label="Filtrar por leitura">
                        <option value="">Todas</option>
                        <option value="unread">Não lidas</option>
                        <option value="read">Lidas</option>
                    </select>
                    <button type="submit" className="notifications-action primary"><Filter size={16} /> Filtrar</button>
                </form>

                {loading ? (
                    <div className="notifications-state"><LoaderCircle size={22} className="is-spinning" /> Carregando notificações remotas…</div>
                ) : error ? (
                    <div className="notifications-state notifications-error"><span>{error}</span><button type="button" className="notifications-action" onClick={() => loadGrid(filters, pageIndex)}>Tentar novamente</button></div>
                ) : grid.rows.length === 0 ? (
                    <div className="notifications-state notifications-empty"><Bell size={28} /><strong>Nenhuma notificação encontrada</strong><span>Altere os filtros ou aguarde novos eventos do workspace.</span></div>
                ) : (
                    <div className="notifications-grid-wrap">
                        <div className="notifications-grid-table">
                            <div className="notifications-grid-head"><span>Nome</span><span>Telefone</span><span>Unidade</span><span>Data</span><span>Canal</span><span>Tipo</span><span>Leitura</span><span>Mensagem</span><span>Ações</span></div>
                            {grid.rows.map((notification) => (
                                <div className={'notifications-grid-row ' + (notification.read ? 'is-read' : 'is-unread')} key={notification.id}>
                                    <strong>{notification.name}</strong>
                                    <span>{notification.phone || '-'}</span>
                                    <span>{notification.unit_name || '-'}</span>
                                    <span>{formatDate(notification.created_at)}</span>
                                    <span>{notification.channel}</span>
                                    <span>{notification.type}</span>
                                    <span>{notification.read ? 'Lida' : 'Não lida'}</span>
                                    <span className="notifications-message" title={notification.message}>{notification.message}</span>
                                    <span className="notifications-row-actions">
                                        {!notification.read && <button type="button" className="notifications-icon-action" onClick={() => markRead(notification)} aria-label="Marcar como lida"><Check size={15} /></button>}
                                        {notification.route && <button type="button" className="notifications-icon-action" onClick={() => openNotification(notification)} aria-label="Abrir notificação"><ExternalLink size={15} /></button>}
                                    </span>
                                </div>
                            ))}
                        </div>
                        <footer className="notifications-pagination">
                            <span>{from}–{to} de {grid.total}</span>
                            <span>Página {pageIndex + 1} de {pageCount}</span>
                            <div>
                                <button type="button" className="notifications-icon-action" onClick={() => setPageIndex((current) => Math.max(current - 1, 0))} disabled={pageIndex === 0}><ChevronLeft size={16} /></button>
                                <button type="button" className="notifications-icon-action" onClick={() => setPageIndex((current) => Math.min(current + 1, pageCount - 1))} disabled={pageIndex >= pageCount - 1}><ChevronRight size={16} /></button>
                            </div>
                        </footer>
                    </div>
                )}
            </main>
        </div>
    );
};

export default Notifications;

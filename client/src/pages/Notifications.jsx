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

import '../styles/notifications-inbox.css';

const formatDate = (value) => value ? new Date(value).toLocaleString('pt-BR') : '-';

const notificationLabel = (value, fallback = 'Não informado') => {
    const raw = String(value || '').trim();
    if (!raw) return fallback;

    const key = raw.toLocaleLowerCase('pt-BR').replace(/[\s_-]+/g, '_');
    const labels = {
        execution: 'Execução',
        completed: 'Concluída',
        open: 'Em aberto',
        new: 'Nova',
        active: 'Ativa',
        inactive: 'Inativa',
        whatsapp: 'WhatsApp',
        push: 'Push',
        email: 'E-mail',
        system: 'Sistema',
    };

    if (labels[key]) return labels[key];

    const readable = raw.replace(/[_-]+/g, ' ');
    return readable.charAt(0).toLocaleUpperCase('pt-BR') + readable.slice(1);
};

const Notifications = () => {
    const navigate = useNavigate();
    const [grid, setGrid] = useState(EMPTY_GRID);
    const [filters, setFilters] = useState({ search: '', unitId: '', channel: '', type: '', readState: '' });
    const [draftSearch, setDraftSearch] = useState('');
    const [pageIndex, setPageIndex] = useState(0);
    const [loading, setLoading] = useState(true);
    const [working, setWorking] = useState(false);
    const [error, setError] = useState('');
    const [filtersOpen, setFiltersOpen] = useState(false);

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

    const activeFilterCount = Object.values(filters).filter(Boolean).length;

    const clearFilters = () => {
        setDraftSearch('');
        setPageIndex(0);
        setFilters({ search: '', unitId: '', channel: '', type: '', readState: '' });
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
                    <div className="notifications-filter-actions">
                        <button type="submit" className="notifications-action primary"><Search size={16} /> Buscar</button>
                        <button
                            type="button"
                            className="notifications-action"
                            onClick={() => setFiltersOpen((current) => !current)}
                            aria-expanded={filtersOpen}
                        >
                            <Filter size={16} />
                            {filtersOpen ? 'Ocultar filtros' : 'Filtros'}
                            {activeFilterCount > 0 ? ' (' + activeFilterCount + ')' : ''}
                        </button>
                        {activeFilterCount > 0 && (
                            <button type="button" className="notifications-action" onClick={clearFilters}>
                                Limpar filtros
                            </button>
                        )}
                    </div>
                    {filtersOpen && (
                        <div className="notifications-filter-controls" aria-label="Filtros avançados">
                            <select value={filters.unitId} onChange={(event) => updateFilter('unitId', event.target.value)} aria-label="Filtrar por unidade">
                                <option value="">Todas as unidades</option>
                                {grid.units.map((unit) => <option key={unit.id} value={unit.id}>{unit.name}</option>)}
                            </select>
                            <select value={filters.channel} onChange={(event) => updateFilter('channel', event.target.value)} aria-label="Filtrar por canal">
                                <option value="">Todos os canais</option>
                                {grid.channels.map((channel) => <option key={channel} value={channel.toLocaleLowerCase('pt-BR')}>{notificationLabel(channel)}</option>)}
                            </select>
                            <select value={filters.type} onChange={(event) => updateFilter('type', event.target.value)} aria-label="Filtrar por tipo">
                                <option value="">Todos os tipos</option>
                                {grid.types.map((type) => <option key={type} value={type.toLocaleLowerCase('pt-BR')}>{notificationLabel(type)}</option>)}
                            </select>
                            <select value={filters.readState} onChange={(event) => updateFilter('readState', event.target.value)} aria-label="Filtrar por leitura">
                                <option value="">Todas</option>
                                <option value="unread">Não lidas</option>
                                <option value="read">Lidas</option>
                            </select>
                        </div>
                    )}
                </form>

                {loading ? (
                    <div className="notifications-state"><LoaderCircle size={22} className="is-spinning" /> Carregando notificações remotas…</div>
                ) : error ? (
                    <div className="notifications-state notifications-error"><span>{error}</span><button type="button" className="notifications-action" onClick={() => loadGrid(filters, pageIndex)}>Tentar novamente</button></div>
                ) : grid.rows.length === 0 ? (
                    <div className="notifications-state notifications-empty">
                        <Bell size={28} />
                        <strong>Nenhuma notificação encontrada</strong>
                        <span>{activeFilterCount > 0 ? 'Nenhum evento corresponde aos filtros aplicados.' : 'Aguarde novos eventos do workspace.'}</span>
                        {activeFilterCount > 0 && <button type="button" className="notifications-action" onClick={clearFilters}>Limpar filtros</button>}
                    </div>
                ) : (
                    <div className="notifications-grid-wrap">
                        <div className="notifications-grid-table">
                            <div className="notifications-grid-head"><span>Notificação</span><span>Contexto</span><span>Quando</span><span>Estado</span><span>Ações</span></div>
                            {grid.rows.map((notification) => (
                                <div className={'notifications-grid-row ' + (notification.read ? 'is-read' : 'is-unread')} key={notification.id}>
                                    <div className="notifications-event-cell">
                                        <strong>{notification.name || notification.phone || 'Notificação'}</strong>
                                        <span className="notifications-event-message" title={notification.message}>{notification.message || 'Sem mensagem disponível.'}</span>
                                    </div>
                                    <div className="notifications-context-cell">
                                        <span>{notification.unit_name || 'Sem unidade'}</span>
                                        <small>{notificationLabel(notification.channel, 'Canal não informado')} · {notificationLabel(notification.type, 'Tipo não informado')}</small>
                                    </div>
                                    <time className="notifications-when-cell" dateTime={notification.created_at || undefined}>{formatDate(notification.created_at)}</time>
                                    <span className={'notifications-read-state ' + (notification.read ? 'is-read' : 'is-unread')}>{notification.read ? 'Lida' : 'Não lida'}</span>
                                    <span className="notifications-row-actions">
                                        {!notification.read && <button type="button" className="notifications-action notifications-row-action" onClick={() => markRead(notification)}><Check size={15} /> Marcar como lida</button>}
                                        {notification.route && <button type="button" className="notifications-action primary notifications-row-action" onClick={() => openNotification(notification)}><ExternalLink size={15} /> Abrir</button>}
                                        {notification.read && !notification.route && <span className="notifications-no-action">Sem ação pendente</span>}
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

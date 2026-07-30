import { useEffect, useState } from 'react';
import { ArrowLeft, Bell, Check, CheckCheck, ChevronLeft, ChevronRight, ExternalLink, Filter, LoaderCircle, RefreshCw, Search } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { notificationService } from '../services/checklistProducaoService';

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
        void Promise.resolve().then(() => loadGrid(filters, pageIndex));
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
        <div className="min-h-screen bg-[#f6fafb] px-4 py-8 text-operation-ink sm:px-6 lg:px-8">
            <header className="mx-auto mb-8 flex max-w-7xl flex-col gap-5 md:flex-row md:items-end md:justify-between">
                <div className="flex items-center gap-4">
                    <button type="button" className="rounded-xl border border-operation-line bg-white p-3 text-operation-ink transition-all hover:-translate-x-1 hover:border-operation-mint hover:bg-operation-soft" aria-label="Voltar" onClick={() => navigate('/')}>
                        <ArrowLeft size={18} />
                    </button>
                    <div>
                        <p className="mb-2 text-xs font-bold uppercase tracking-[0.16em] text-operation-mint-dark">Central do workspace</p>
                        <h1 className="text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">Notificações</h1>
                        <p className="mt-2 text-sm text-operation-muted">{grid.stats.unread ? grid.stats.unread + ' não lidas' : 'Tudo atualizado'}</p>
                    </div>
                </div>
                <div className="flex flex-wrap gap-2">
                    <button type="button" className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-operation-line bg-white px-3.5 py-2 text-sm font-semibold transition-colors hover:border-operation-mint hover:bg-operation-soft disabled:cursor-wait disabled:opacity-60" onClick={() => loadGrid(filters, pageIndex)} disabled={loading}>
                        <RefreshCw size={16} /> Atualizar
                    </button>
                    <button type="button" className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-operation-ink px-3.5 py-2 text-sm font-semibold text-white transition-colors hover:bg-operation-mint-dark disabled:cursor-not-allowed disabled:opacity-50" onClick={markAllRead} disabled={working || grid.stats.unread === 0}>
                        <CheckCheck size={16} /> Marcar todas como lidas
                    </button>
                </div>
            </header>

            <main className="mx-auto max-w-7xl">
                <div className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4" role="list" aria-label="Resumo das notificações">
                    <div className="rounded-2xl border border-operation-line bg-white p-5 shadow-[0_10px_26px_rgba(23,49,58,0.05)]" role="listitem"><span className="text-sm text-operation-muted">Minhas notificações</span><strong className="mt-3 block text-3xl font-semibold">{grid.stats.mine}</strong><small className="mt-1 block text-xs text-operation-muted">WhatsApp {grid.stats.whatsapp}</small></div>
                    <div className="rounded-2xl border border-operation-line bg-white p-5 shadow-[0_10px_26px_rgba(23,49,58,0.05)]" role="listitem"><span className="text-sm text-operation-muted">Notificações da equipe</span><strong className="mt-3 block text-3xl font-semibold">{grid.stats.team}</strong><small className="mt-1 block text-xs text-operation-muted">Push {grid.stats.push}</small></div>
                    <div className="rounded-2xl border border-operation-line bg-white p-5 shadow-[0_10px_26px_rgba(23,49,58,0.05)]" role="listitem"><span className="text-sm text-operation-muted">Não lidas</span><strong className="mt-3 block text-3xl font-semibold">{grid.stats.unread}</strong><small className="mt-1 block text-xs text-operation-muted">Na consulta atual</small></div>
                    <div className="rounded-2xl border border-operation-line bg-white p-5 shadow-[0_10px_26px_rgba(23,49,58,0.05)]" role="listitem"><span className="text-sm text-operation-muted">Total filtrado</span><strong className="mt-3 block text-3xl font-semibold">{grid.stats.total}</strong><small className="mt-1 block text-xs text-operation-muted">Registros remotos</small></div>
                </div>

                <form className="mb-6 rounded-2xl border border-operation-line bg-white p-5 shadow-[0_10px_26px_rgba(23,49,58,0.05)]" onSubmit={submitSearch}>
                    <div className="flex items-center gap-3 rounded-xl border border-operation-line px-4 py-3 focus-within:border-operation-mint focus-within:ring-4 focus-within:ring-operation-mint/15">
                        <Search size={17} />
                        <input className="min-w-0 flex-1 border-0 bg-transparent text-sm outline-none placeholder:text-operation-muted/70" value={draftSearch} onChange={(event) => setDraftSearch(event.target.value)} placeholder="Buscar por nome ou telefone..." />
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2">
                        <button type="submit" className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-operation-ink px-3.5 py-2 text-sm font-semibold text-white transition-colors hover:bg-operation-mint-dark"><Search size={16} /> Buscar</button>
                        <button
                            type="button"
                            className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-operation-line px-3.5 py-2 text-sm font-semibold transition-colors hover:border-operation-mint hover:bg-operation-soft"
                            onClick={() => setFiltersOpen((current) => !current)}
                            aria-expanded={filtersOpen}
                        >
                            <Filter size={16} />
                            {filtersOpen ? 'Ocultar filtros' : 'Filtros'}
                            {activeFilterCount > 0 ? ' (' + activeFilterCount + ')' : ''}
                        </button>
                        {activeFilterCount > 0 && (
                            <button type="button" className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-operation-line px-3.5 py-2 text-sm font-semibold transition-colors hover:border-operation-mint hover:bg-operation-soft" onClick={clearFilters}>
                                Limpar filtros
                            </button>
                        )}
                    </div>
                    {filtersOpen && (
                        <div className="mt-4 grid gap-3 border-t border-operation-line pt-4 sm:grid-cols-2 lg:grid-cols-4" aria-label="Filtros avançados">
                            <select className="rounded-xl border border-operation-line bg-white px-3 py-2.5 text-sm outline-none focus:border-operation-mint" value={filters.unitId} onChange={(event) => updateFilter('unitId', event.target.value)} aria-label="Filtrar por unidade">
                                <option value="">Todas as unidades</option>
                                {grid.units.map((unit) => <option key={unit.id} value={unit.id}>{unit.name}</option>)}
                            </select>
                            <select className="rounded-xl border border-operation-line bg-white px-3 py-2.5 text-sm outline-none focus:border-operation-mint" value={filters.channel} onChange={(event) => updateFilter('channel', event.target.value)} aria-label="Filtrar por canal">
                                <option value="">Todos os canais</option>
                                {grid.channels.map((channel) => <option key={channel} value={channel.toLocaleLowerCase('pt-BR')}>{notificationLabel(channel)}</option>)}
                            </select>
                            <select className="rounded-xl border border-operation-line bg-white px-3 py-2.5 text-sm outline-none focus:border-operation-mint" value={filters.type} onChange={(event) => updateFilter('type', event.target.value)} aria-label="Filtrar por tipo">
                                <option value="">Todos os tipos</option>
                                {grid.types.map((type) => <option key={type} value={type.toLocaleLowerCase('pt-BR')}>{notificationLabel(type)}</option>)}
                            </select>
                            <select className="rounded-xl border border-operation-line bg-white px-3 py-2.5 text-sm outline-none focus:border-operation-mint" value={filters.readState} onChange={(event) => updateFilter('readState', event.target.value)} aria-label="Filtrar por leitura">
                                <option value="">Todas</option>
                                <option value="unread">Não lidas</option>
                                <option value="read">Lidas</option>
                            </select>
                        </div>
                    )}
                </form>

                {loading ? (
                    <div className="flex items-center justify-center gap-3 rounded-2xl border border-operation-line bg-white px-6 py-16 text-sm text-operation-muted"><LoaderCircle size={22} className="animate-spin" /> Carregando notificações remotas…</div>
                ) : error ? (
                    <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-red-200 bg-red-50 px-6 py-16 text-center text-sm text-red-700" role="alert"><span>{error}</span><button type="button" className="inline-flex min-h-10 items-center rounded-xl border border-red-200 bg-white px-3.5 py-2 font-semibold text-red-700 transition-colors hover:bg-red-100" onClick={() => loadGrid(filters, pageIndex)}>Tentar novamente</button></div>
                ) : grid.rows.length === 0 ? (
                    <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-operation-line bg-white px-6 py-16 text-center text-sm text-operation-muted">
                        <Bell size={28} />
                        <strong>Nenhuma notificação encontrada</strong>
                        <span>{activeFilterCount > 0 ? 'Nenhum evento corresponde aos filtros aplicados.' : 'Aguarde novos eventos do workspace.'}</span>
                        {activeFilterCount > 0 && <button type="button" className="inline-flex min-h-10 items-center rounded-xl border border-operation-line px-3.5 py-2 font-semibold text-operation-ink transition-colors hover:border-operation-mint hover:bg-operation-soft" onClick={clearFilters}>Limpar filtros</button>}
                    </div>
                ) : (
                    <div className="overflow-hidden rounded-2xl border border-operation-line bg-white shadow-[0_12px_30px_rgba(23,49,58,0.06)]">
                    <div className="w-full overflow-x-auto">
                            <div className="grid grid-cols-[minmax(230px,1.5fr)_minmax(160px,1fr)_minmax(150px,0.8fr)_minmax(100px,0.6fr)_minmax(190px,1fr)] gap-4 border-b border-operation-line bg-[#f6fafb] px-5 py-3 text-xs font-semibold uppercase tracking-[0.08em] text-operation-muted"><span>Notificação</span><span>Contexto</span><span>Quando</span><span>Estado</span><span>Ações</span></div>
                            {grid.rows.map((notification) => (
                                <div className={'grid grid-cols-[minmax(230px,1.5fr)_minmax(160px,1fr)_minmax(150px,0.8fr)_minmax(100px,0.6fr)_minmax(190px,1fr)] items-center gap-4 border-b border-operation-line px-5 py-4 text-sm last:border-b-0 ' + (notification.read ? 'bg-white' : 'bg-operation-soft/40')} key={notification.id}>
                                    <div className="min-w-0">
                                        <strong className="block truncate">{notification.name || notification.phone || 'Notificação'}</strong>
                                        <span className="mt-1 block truncate text-xs text-operation-muted" title={notification.message}>{notification.message || 'Sem mensagem disponível.'}</span>
                                    </div>
                                    <div className="min-w-0">
                                        <span className="block truncate">{notification.unit_name || 'Sem unidade'}</span>
                                        <small className="mt-1 block truncate text-xs text-operation-muted">{notificationLabel(notification.channel, 'Canal não informado')} · {notificationLabel(notification.type, 'Tipo não informado')}</small>
                                    </div>
                                    <time className="text-xs text-operation-muted" dateTime={notification.created_at || undefined}>{formatDate(notification.created_at)}</time>
                                    <span className={'w-fit rounded-full px-2.5 py-1 text-xs font-semibold ' + (notification.read ? 'bg-slate-100 text-slate-600' : 'bg-operation-soft text-operation-mint-dark')}>{notification.read ? 'Lida' : 'Não lida'}</span>
                                    <span className="flex flex-wrap gap-2">
                                        {!notification.read && <button type="button" className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-operation-line px-2.5 py-1.5 text-xs font-semibold transition-colors hover:border-operation-mint hover:bg-operation-soft" onClick={() => markRead(notification)}><Check size={15} /> Marcar como lida</button>}
                                        {notification.route && <button type="button" className="inline-flex min-h-9 items-center gap-1.5 rounded-lg bg-operation-ink px-2.5 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-operation-mint-dark" onClick={() => openNotification(notification)}><ExternalLink size={15} /> Abrir</button>}
                                        {notification.read && !notification.route && <span className="text-xs text-operation-muted">Sem ação pendente</span>}
                                    </span>
                                </div>
                            ))}
                        </div>
                        <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-operation-line px-5 py-4 text-xs text-operation-muted">
                            <span>{from}–{to} de {grid.total}</span>
                            <span>Página {pageIndex + 1} de {pageCount}</span>
                            <div className="flex gap-2">
                                <button type="button" className="rounded-lg border border-operation-line p-2 transition-colors hover:border-operation-mint hover:bg-operation-soft disabled:cursor-not-allowed disabled:opacity-40" onClick={() => setPageIndex((current) => Math.max(current - 1, 0))} disabled={pageIndex === 0} aria-label="Página anterior"><ChevronLeft size={16} /></button>
                                <button type="button" className="rounded-lg border border-operation-line p-2 transition-colors hover:border-operation-mint hover:bg-operation-soft disabled:cursor-not-allowed disabled:opacity-40" onClick={() => setPageIndex((current) => Math.min(current + 1, pageCount - 1))} disabled={pageIndex >= pageCount - 1} aria-label="Próxima página"><ChevronRight size={16} /></button>
                            </div>
                        </footer>
                    </div>
                )}
            </main>
        </div>
    );
};

export default Notifications;

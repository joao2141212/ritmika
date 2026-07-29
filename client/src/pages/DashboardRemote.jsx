import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    AlertTriangle,
    Bell,
    CalendarDays,
    CheckCircle2,
    ChevronRight,
    Clock3,
    Download,
    LayoutDashboard,
    LifeBuoy,
    LoaderCircle,
    MessageCircle,
    RefreshCw,
    Search,
    Send,
    SlidersHorizontal,
    X,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { dashboardService, settingsService } from '../services/checklistProducaoService';
import { logger } from '../lib/logger';
import { matchesSearchText } from '../lib/plainText';
import '../styles/dashboard-remote.css';
import '../styles/dashboard-filters.css';
import '../styles/dashboard-parity.css';

import '../styles/dashboard-analytics.css';
import '../styles/dashboard-reference-polish.css';

const EMPTY_DATA = {
    stats: {
        totalScheduled: 0,
        completed: 0,
        pending: 0,
        inProgress: 0,
        overdue: 0,
        completionRate: 0,
        unreadNotifications: 0,
    },
    tasks: { late: [], now: [], upcoming: [] },
    rankings: { users: [], units: [], sectors: [] },
    trend: [],
    filters: { users: [], units: [], sectors: [], moments: [] },
    details: [],
};

const DEFAULT_WIDGETS = {
    summary: true,
    alerts: true,
    completion: true,
    rankings: true,
    trend: true,
    details: true,
    coverage: true,
};

const WIDGET_CATALOG = [
    ['summary', 'Situação geral', 'Agendados, pendentes, andamento, atrasos e finalizados.'],
    ['completion', 'Taxa de conclusão', 'Percentual e volume de execuções finalizadas.'],
    ['alerts', 'Alertas de pendência', 'Fila remota de atividades atrasadas e próximas.'],
    ['rankings', 'Rankings', 'Desempenho por usuários, unidades e setores.'],
    ['trend', 'Evolução de desempenho', 'Indicadores diários do período selecionado.'],
    ['details', 'Detalhamento', 'Tabela paginada com seleção, colunas e exportação.'],
    ['coverage', 'Cobertura de dados', 'Quantidade de checklists disponíveis para execução.'],
];

const DETAIL_COLUMNS = [
    ['date', 'Data'],
    ['checklist', 'Checklist'],
    ['unit', 'Unidade'],
    ['sector', 'Setor'],
    ['moment', 'Momento'],
    ['user', 'Usuário'],
    ['status', 'Situação'],
    ['punctuality', 'Pontualidade'],
    ['effort', 'Esforço'],
    ['quality', 'Qualidade'],
];

const DEFAULT_DETAIL_COLUMNS = Object.fromEntries(DETAIL_COLUMNS.map(([key]) => [key, true]));

const formatDetailCell = (item, key) => {
    if (key === 'date') return item.date ? new Date(item.date).toLocaleString('pt-BR') : '—';
    if (['punctuality', 'effort', 'quality'].includes(key)) return item[key] === null ? '—' : `${item[key]}%`;
    return item[key] || '—';
};

const TaskCard = ({ task, status }) => {
    const navigate = useNavigate();
    const isLate = status === 'late';
    const isUpcoming = status === 'upcoming';
    const statusLabel = isLate ? 'Atrasado' : isUpcoming ? 'Próximo' : 'A fazer agora';

    return (
        <button
            type="button"
            className="remote-task-card"
            onClick={() => navigate('/checklists/' + task.id + '/execute', {
                state: { executionId: task.execution_id },
            })}
        >
            <span className={'remote-task-status ' + (isLate ? 'is-late' : isUpcoming ? 'is-upcoming' : 'is-now')}>
                <Clock3 size={14} />
                {isLate ? statusLabel + ' · ' + task.delay : statusLabel + ' · ' + (task.dueIn || task.startTime)}
            </span>
            <span className="remote-task-title">{task.title}</span>
            <span className="remote-task-footer">
                <span>{task.due_at ? new Date(task.due_at).toLocaleString('pt-BR') : 'Sem horário definido'}</span>
                <ChevronRight size={18} />
            </span>
        </button>
    );
};

const StatCard = ({ label, value, helper, tone = 'neutral' }) => (
    <article className={'remote-stat-card tone-' + tone}>
        <span>{label}</span>
        <strong>{value.toLocaleString('pt-BR')}</strong>
        <small>{helper}</small>
    </article>
);

const CompletionGauge = ({ value }) => {
    const normalized = Math.max(0, Math.min(100, Number(value) || 0));
    const circumference = 2 * Math.PI * 52;
    const offset = circumference * (1 - normalized / 100);

    return (
        <div className="analytics-gauge" aria-label={`${normalized}% de conclusão`}>
            <svg viewBox="0 0 132 132" role="img" aria-hidden="true">
                <circle className="analytics-gauge-track" cx="66" cy="66" r="52" />
                <circle
                    className="analytics-gauge-value"
                    cx="66"
                    cy="66"
                    r="52"
                    strokeDasharray={circumference}
                    strokeDashoffset={offset}
                />
            </svg>
            <div><strong>{normalized}%</strong><span>concluído</span></div>
        </div>
    );
};

const StatusDistribution = ({ stats }) => {
    const items = [
        ['Finalizados', stats.completed, 'success'],
        ['Em andamento', stats.inProgress, 'info'],
        ['Pendentes', stats.pending, 'warning'],
        ['Atrasados', stats.overdue, 'danger'],
    ];
    const total = items.reduce((sum, [, value]) => sum + (Number(value) || 0), 0);

    return (
        <div className="analytics-distribution">
            <div className="analytics-distribution-track" aria-label="Distribuição das execuções por status">
                {total > 0 && items.map(([label, value, tone]) => (
                    <span
                        key={label}
                        className={`tone-${tone}`}
                        style={{ width: `${((Number(value) || 0) / total) * 100}%` }}
                        title={`${label}: ${value}`}
                    />
                ))}
            </div>
            <div className="analytics-legend">
                {items.map(([label, value, tone]) => (
                    <div key={label}>
                        <span className={`analytics-dot tone-${tone}`} />
                        <span>{label}</span>
                        <strong>{Number(value || 0).toLocaleString('pt-BR')}</strong>
                    </div>
                ))}
            </div>
        </div>
    );
};

const TrendChart = ({ data }) => {
    const visible = data.slice(-14);
    if (visible.length === 0) return <div className="remote-state remote-state-empty">Sem evolução registrada no período.</div>;

    const width = 720;
    const height = 220;
    const paddingX = 30;
    const paddingY = 24;
    const xFor = (index) => paddingX + (index * (width - paddingX * 2)) / Math.max(1, visible.length - 1);
    const yFor = (score) => height - paddingY - (Math.max(0, Math.min(100, Number(score) || 0)) / 100) * (height - paddingY * 2);
    const points = visible.map((item, index) => `${xFor(index)},${yFor(item.score)}`).join(' ');
    const areaPoints = `${paddingX},${height - paddingY} ${points} ${xFor(visible.length - 1)},${height - paddingY}`;

    return (
        <div className="analytics-trend-chart">
            <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Evolução do score médio no período">
                {[0, 25, 50, 75, 100].map((score) => (
                    <g key={score}>
                        <line x1={paddingX} x2={width - paddingX} y1={yFor(score)} y2={yFor(score)} />
                        <text x="0" y={yFor(score) + 4}>{score}%</text>
                    </g>
                ))}
                <polygon className="analytics-trend-area" points={areaPoints} />
                <polyline className="analytics-trend-line" points={points} />
                {visible.map((item, index) => (
                    <circle key={item.date} cx={xFor(index)} cy={yFor(item.score)} r="4">
                        <title>{new Date(`${item.date}T12:00:00`).toLocaleDateString('pt-BR')}: {item.score}%</title>
                    </circle>
                ))}
            </svg>
            <div className="analytics-trend-axis" aria-hidden="true">
                {visible.map((item, index) => (
                    <span key={item.date} className={index % Math.ceil(visible.length / 5) === 0 ? '' : 'is-hidden'}>
                        {new Date(`${item.date}T12:00:00`).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                    </span>
                ))}
            </div>
        </div>
    );
};

const DashboardRemote = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [data, setData] = useState(EMPTY_DATA);
    const [activeTab, setActiveTab] = useState('todo');
    const [taskQuery, setTaskQuery] = useState('');
    const [periodDays, setPeriodDays] = useState(30);
    const [dashboardFilters, setDashboardFilters] = useState({ unitId: '', sectorId: '', profileId: '', momentId: '', from: '', to: '' });
    const [filtersOpen, setFiltersOpen] = useState(false);
    const [widgetPrefs, setWidgetPrefs] = useState(DEFAULT_WIDGETS);
    const [customizationOpen, setCustomizationOpen] = useState(false);
    const [savingWidgets, setSavingWidgets] = useState(false);
    const [detailPage, setDetailPage] = useState(0);
    const [detailPageSize, setDetailPageSize] = useState(10);
    const [detailColumnsOpen, setDetailColumnsOpen] = useState(false);
    const [detailColumns, setDetailColumns] = useState(DEFAULT_DETAIL_COLUMNS);
    const [selectedDetailIds, setSelectedDetailIds] = useState([]);
    const [koruOpen, setKoruOpen] = useState(false);
    const [koruDraft, setKoruDraft] = useState('');
    const [koruBusy, setKoruBusy] = useState(false);
    const [koruMessages, setKoruMessages] = useState([
        { id: 'koru-welcome', role: 'assistant', text: 'Olá. Sou a Koru, sua assistente operacional. Posso consultar os dados reais deste workspace.' },
    ]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const loadDashboard = useCallback(async () => {
        try {
            setLoading(true);
            setError('');
            setData(await dashboardService.getData({ periodDays, ...dashboardFilters }));
        } catch (loadError) {
            setError(loadError instanceof Error ? loadError.message : 'Não foi possível carregar o dashboard.');
            toast.error('Não foi possível carregar o dashboard.');
        } finally {
            setLoading(false);
        }
    }, [dashboardFilters, periodDays]);

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect -- carga remota inicial controla loading, erro e dados do dashboard.
        loadDashboard();
    }, [loadDashboard]);

    useEffect(() => {
        let active = true;
        settingsService.get()
            .then((settings) => {
                if (!active) return;
                const storedWidgets = settings?.workspace?.settings?.dashboard?.widgets;
                if (storedWidgets && typeof storedWidgets === 'object') {
                    setWidgetPrefs({ ...DEFAULT_WIDGETS, ...storedWidgets });
                }
            })
            .catch((settingsError) => {
                logger.error({
                    fn: 'DashboardRemote.loadWidgetPreferences',
                    status: 'error',
                    error: settingsError instanceof Error ? settingsError.message : String(settingsError),
                });
            });
        return () => {
            active = false;
        };
    }, []);

    const stats = data.stats || EMPTY_DATA.stats;
    const tasks = data.tasks || EMPTY_DATA.tasks;
    const rankings = data.rankings || EMPTY_DATA.rankings;
    const trend = data.trend || EMPTY_DATA.trend;
    const availableFilters = data.filters || EMPTY_DATA.filters;
    const taskList = activeTab === 'upcoming' ? tasks.upcoming : tasks.late.concat(tasks.now);
    const visibleTaskList = taskList.filter((task) => matchesSearchText(
        `${task.title || ''} ${task.checklist_name || ''} ${task.user_name || ''}`,
        taskQuery,
    ));
    const details = data.details || EMPTY_DATA.details;
    const detailPageCount = Math.max(1, Math.ceil(details.length / detailPageSize));
    const visibleDetails = details.slice(detailPage * detailPageSize, (detailPage + 1) * detailPageSize);
    const visibleDetailIds = visibleDetails.map((item) => item.id);
    const allVisibleDetailsSelected = visibleDetailIds.length > 0 && visibleDetailIds.every((id) => selectedDetailIds.includes(id));
    const activeFilterCount = Object.values(dashboardFilters).filter(Boolean).length;
    const activeFilterChips = [
        dashboardFilters.unitId && {
            key: 'unitId',
            label: 'Unidade',
            value: availableFilters.units.find((item) => String(item.id) === String(dashboardFilters.unitId))?.name || 'Selecionada',
        },
        dashboardFilters.sectorId && {
            key: 'sectorId',
            label: 'Setor',
            value: availableFilters.sectors.find((item) => String(item.id) === String(dashboardFilters.sectorId))?.name || 'Selecionado',
        },
        dashboardFilters.profileId && {
            key: 'profileId',
            label: 'Usuário',
            value: availableFilters.users.find((item) => String(item.id) === String(dashboardFilters.profileId))?.name || 'Selecionado',
        },
        dashboardFilters.momentId && {
            key: 'momentId',
            label: 'Momento',
            value: availableFilters.moments.find((item) => String(item.id) === String(dashboardFilters.momentId))?.name || 'Selecionado',
        },
        dashboardFilters.from && { key: 'from', label: 'De', value: new Date(`${dashboardFilters.from}T00:00:00`).toLocaleDateString('pt-BR') },
        dashboardFilters.to && { key: 'to', label: 'Até', value: new Date(`${dashboardFilters.to}T00:00:00`).toLocaleDateString('pt-BR') },
    ].filter(Boolean);

    const updateDashboardFilter = (name, value) => {
        setDashboardFilters((current) => ({ ...current, [name]: value }));
    };

    const clearDashboardFilters = () => {
        setDashboardFilters({ unitId: '', sectorId: '', profileId: '', momentId: '', from: '', to: '' });
    };

    const toggleWidget = (widgetId) => {
        setWidgetPrefs((current) => ({ ...current, [widgetId]: !current[widgetId] }));
    };

    const saveWidgetPreferences = async () => {
        try {
            setSavingWidgets(true);
            await settingsService.updateWorkspaceSettings({ settings: { dashboard: { widgets: widgetPrefs } } });
            setCustomizationOpen(false);
            toast.success('Dashboard personalizado.');
        } catch (saveError) {
            logger.error({
                fn: 'DashboardRemote.saveWidgetPreferences',
                status: 'error',
                error: saveError instanceof Error ? saveError.message : String(saveError),
            });
            toast.error('Não foi possível salvar a personalização.');
        } finally {
            setSavingWidgets(false);
        }
    };

    const toggleDetailSelection = (id) => {
        setSelectedDetailIds((current) => current.includes(id)
            ? current.filter((item) => item !== id)
            : [...current, id]);
    };

    const toggleAllDetailSelection = () => {
        setSelectedDetailIds((current) => {
            if (allVisibleDetailsSelected) return current.filter((id) => !visibleDetailIds.includes(id));
            return Array.from(new Set([...current, ...visibleDetailIds]));
        });
    };

    const exportDetails = () => {
        const escapeCsv = (value) => `"${String(value ?? '').replaceAll('"', '""')}"`;
        const rows = details.map((item) => DETAIL_COLUMNS.map(([key]) => {
            if (key === 'date') return item.date ? new Date(item.date).toLocaleString('pt-BR') : '';
            if (['punctuality', 'effort', 'quality'].includes(key)) return item[key] === null ? '—' : `${item[key]}%`;
            return item[key];
        }));
        const csv = '\uFEFF' + [
            DETAIL_COLUMNS.map(([, label]) => label),
            ...rows,
        ].map((row) => row.map(escapeCsv).join(';')).join('\n');
        const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
        const link = document.createElement('a');
        link.href = url;
        link.download = 'ritmika-dashboard-detalhamento.csv';
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.setTimeout(() => URL.revokeObjectURL(url), 0);
        toast.success('Detalhamento exportado.');
    };

    const exportDashboard = () => {
        const escapeCsv = (value) => `"${String(value ?? '').replaceAll('"', '""')}"`;
        const rows = taskList.map((task) => ({
            titulo: task.title,
            situacao: activeTab === 'upcoming'
                ? 'Próximo'
                : (tasks.late.some((lateTask) => lateTask.response_id === task.response_id) ? 'Atrasado' : 'Agora'),
            prazo: task.due_at ? new Date(task.due_at).toLocaleString('pt-BR') : '',
            checklist_id: task.id,
            execucao_id: task.execution_id || task.response_id || '',
        }));
        const headers = ['Título', 'Situação', 'Prazo', 'Checklist ID', 'Execução ID'];
        const csv = '\uFEFF' + [
            headers,
            ...rows.map((row) => [row.titulo, row.situacao, row.prazo, row.checklist_id, row.execucao_id]),
        ].map((row) => row.map(escapeCsv).join(';')).join('\n');
        const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
        const link = document.createElement('a');
        link.href = url;
        link.download = `ritmika-atividades-${periodDays === 'all' ? 'historico' : periodDays + 'd'}.csv`;
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.setTimeout(() => URL.revokeObjectURL(url), 0);
        toast.success('Atividades exportadas.');
    };

    const sendKoruMessage = async (messageOverride = '') => {
        const message = String(messageOverride || koruDraft).trim();
        if (!message || koruBusy) return;
        setKoruDraft('');
        setKoruMessages((current) => [...current, { id: `koru-user-${Date.now()}`, role: 'user', text: message }]);
        try {
            setKoruBusy(true);
            const result = await dashboardService.askKoru(message, { periodDays, filters: dashboardFilters });
            setKoruMessages((current) => [...current, {
                id: `koru-assistant-${Date.now()}`,
                role: 'assistant',
                text: result?.reply || 'Não encontrei uma resposta nos dados operacionais.',
            }]);
        } catch (koruError) {
            logger.error({
                fn: 'DashboardRemote.sendKoruMessage',
                status: 'error',
                messageLength: message.length,
                error: koruError instanceof Error ? koruError.message : String(koruError),
            });
            setKoruMessages((current) => [...current, {
                id: `koru-error-${Date.now()}`,
                role: 'assistant',
                text: 'Não consegui consultar a fonte operacional agora. Tente novamente.',
            }]);
        } finally {
            setKoruBusy(false);
        }
    };

    return (
        <div className={`dashboard-remote ritmika-light-mode${filtersOpen ? ' filters-open' : ''}`}>
            <header className="remote-dashboard-header">
                <div className="remote-dashboard-heading">
                    <p className="remote-eyebrow">Painel do workspace</p>
                    <h1>Olá, {user?.name || 'gestor'}</h1>
                    <p className="remote-dashboard-subtitle">
                        A operação real do Ritmika, sincronizada com os dados do workspace.
                    </p>
                </div>
                <div className="remote-header-actions">
                    <button type="button" className="remote-refresh-button remote-customize-button" aria-label="Personalizar dashboard" onClick={() => setCustomizationOpen(true)}>
                        <SlidersHorizontal size={16} /> <span>Personalizar</span>
                    </button>
                    <button
                        type="button"
                        className="remote-icon-button"
                        aria-label="Abrir notificações"
                        onClick={() => navigate('/notifications')}
                    >
                        <Bell size={20} />
                        {stats.unreadNotifications > 0 && <span>{stats.unreadNotifications}</span>}
                    </button>
                    <button type="button" className="remote-refresh-button" onClick={loadDashboard} disabled={loading}>
                        <RefreshCw size={16} className={loading ? 'is-spinning' : ''} />
                        <span>Atualizar</span>
                    </button>
                    <button type="button" className="remote-refresh-button" aria-label="Exportar dashboard" onClick={exportDashboard} disabled={loading}>
                        <Download size={16} />
                        <span>Exportar</span>
                    </button>
                </div>
            </header>

            <section className="remote-filter-shell" aria-label="Filtros do dashboard">
                <div className="remote-filter-toolbar">
                    <label className="remote-period-control">
                        <span>Período</span>
                        <select
                            value={periodDays}
                            onChange={(event) => setPeriodDays(event.target.value === 'all' ? 'all' : Number(event.target.value))}
                            aria-label="Período do dashboard"
                        >
                            <option value={30}>Últimos 30 dias</option>
                            <option value={7}>Últimos 7 dias</option>
                            <option value={90}>Últimos 90 dias</option>
                            <option value="all">Todo o histórico</option>
                        </select>
                    </label>
                    <label className="remote-primary-filter">
                        <span>Unidade</span>
                        <select value={dashboardFilters.unitId} onChange={(event) => updateDashboardFilter('unitId', event.target.value)}>
                            <option value="">Todas</option>
                            {availableFilters.units.map((unit) => <option key={unit.id} value={unit.id}>{unit.name}</option>)}
                        </select>
                    </label>
                    <label className="remote-primary-filter">
                        <span>Setor</span>
                        <select value={dashboardFilters.sectorId} onChange={(event) => updateDashboardFilter('sectorId', event.target.value)}>
                            <option value="">Todos</option>
                            {availableFilters.sectors.map((sector) => <option key={sector.id} value={sector.id}>{sector.name}</option>)}
                        </select>
                    </label>
                    <button
                        type="button"
                        className={`remote-filter-trigger${filtersOpen ? ' is-open' : ''}`}
                        onClick={() => setFiltersOpen((current) => !current)}
                        aria-expanded={filtersOpen}
                        aria-controls="dashboard-advanced-filters"
                    >
                        <SlidersHorizontal size={17} />
                        Mais filtros
                        {activeFilterCount > 0 && <span>{activeFilterCount}</span>}
                    </button>
                    {activeFilterCount > 0 && (
                        <button type="button" className="remote-filter-clear" onClick={clearDashboardFilters}>
                            Limpar
                        </button>
                    )}
                </div>

                {filtersOpen && (
                    <div className="remote-dashboard-filters" id="dashboard-advanced-filters">
                        <div className="remote-filter-panel-heading">
                            <div>
                                <strong>Filtros avançados</strong>
                                <span>Refine a operação exibida no painel.</span>
                            </div>
                            <button type="button" aria-label="Fechar filtros" onClick={() => setFiltersOpen(false)}>
                                <X size={18} />
                            </button>
                        </div>
                        <label>
                            <span>Unidade</span>
                            <select value={dashboardFilters.unitId} onChange={(event) => updateDashboardFilter('unitId', event.target.value)}>
                                <option value="">Todas</option>
                                {availableFilters.units.map((unit) => <option key={unit.id} value={unit.id}>{unit.name}</option>)}
                            </select>
                        </label>
                        <label>
                            <span>Setor</span>
                            <select value={dashboardFilters.sectorId} onChange={(event) => updateDashboardFilter('sectorId', event.target.value)}>
                                <option value="">Todos</option>
                                {availableFilters.sectors.map((sector) => <option key={sector.id} value={sector.id}>{sector.name}</option>)}
                            </select>
                        </label>
                        <label>
                            <span>Usuário</span>
                            <select value={dashboardFilters.profileId} onChange={(event) => updateDashboardFilter('profileId', event.target.value)}>
                                <option value="">Todos</option>
                                {availableFilters.users.map((profile) => <option key={profile.id} value={profile.id}>{profile.name || profile.email}</option>)}
                            </select>
                        </label>
                        <label>
                            <span>Momento</span>
                            <select value={dashboardFilters.momentId || ''} onChange={(event) => updateDashboardFilter('momentId', event.target.value)}>
                                <option value="">Todos</option>
                                {availableFilters.moments.map((moment) => <option key={moment.id} value={moment.id}>{moment.name}</option>)}
                            </select>
                        </label>
                        <label>
                            <span>De</span>
                            <input type="date" value={dashboardFilters.from} onChange={(event) => updateDashboardFilter('from', event.target.value)} />
                        </label>
                        <label>
                            <span>Até</span>
                            <input type="date" value={dashboardFilters.to} onChange={(event) => updateDashboardFilter('to', event.target.value)} />
                        </label>
                        <div className="remote-filter-panel-actions">
                            <button type="button" className="remote-filter-clear" onClick={clearDashboardFilters} disabled={!activeFilterCount}>
                                Limpar filtros
                            </button>
                            <button type="button" className="remote-filter-done" onClick={() => setFiltersOpen(false)}>
                                Ver resultados
                            </button>
                        </div>
                    </div>
                )}

                {activeFilterChips.length > 0 && (
                    <div className="remote-active-filters" aria-label="Filtros ativos">
                        {activeFilterChips.map((filter) => (
                            <button
                                type="button"
                                key={filter.key}
                                onClick={() => updateDashboardFilter(filter.key, '')}
                                aria-label={`Remover filtro ${filter.label}: ${filter.value}`}
                            >
                                <span>{filter.label}: <strong>{filter.value}</strong></span>
                                <X size={14} />
                            </button>
                        ))}
                    </div>
                )}
            </section>

            {widgetPrefs.summary && <section className="remote-summary-grid" aria-label="Resumo operacional">
                <StatCard label="Agendados" value={stats.totalScheduled} helper="Execuções importadas" tone="primary" />
                <StatCard label="Pendentes" value={stats.pending} helper="Aguardando conclusão" tone="warning" />
                <StatCard label="Em andamento" value={stats.inProgress} helper="Execuções abertas" tone="info" />
                <StatCard label="Atrasados" value={stats.overdue} helper="Com prazo vencido" tone="danger" />
                <StatCard label="Finalizados" value={stats.completed} helper={stats.completionRate + '% de conclusão'} tone="success" />
            </section>}

            {widgetPrefs.summary && <section className="analytics-overview-grid" aria-label="Visão analítica da operação">
                <article className="analytics-card analytics-completion-card">
                    <div className="analytics-card-heading">
                        <div>
                            <p className="remote-eyebrow">Eficiência operacional</p>
                            <h2>Taxa de conclusão</h2>
                        </div>
                        <span className="analytics-insight-pill">{stats.completed} finalizados</span>
                    </div>
                    <div className="analytics-completion-body">
                        <CompletionGauge value={stats.completionRate} />
                        <div className="analytics-copy">
                            <strong>{stats.pending + stats.inProgress + stats.overdue} execuções exigem atenção</strong>
                            <span>Distribuição calculada a partir dos registros filtrados no período.</span>
                        </div>
                    </div>
                </article>

                <article className="analytics-card analytics-status-card">
                    <div className="analytics-card-heading">
                        <div>
                            <p className="remote-eyebrow">Composição do período</p>
                            <h2>Execuções por status</h2>
                        </div>
                        <span className="analytics-insight-pill">{stats.totalScheduled} agendadas</span>
                    </div>
                    <StatusDistribution stats={stats} />
                </article>
            </section>}

            {widgetPrefs.alerts && <section className="remote-dashboard-panel remote-activity-manager">
                <div className="remote-panel-heading">
                    <div>
                        <p className="remote-eyebrow">Fila de trabalho</p>
                        <h2>Atividades do workspace</h2>
                    </div>
                    <div className="remote-tabs" role="tablist" aria-label="Atividades">
                        <button type="button" className={activeTab === 'todo' ? 'active' : ''} onClick={() => setActiveTab('todo')}>
                            A fazer
                        </button>
                        <button type="button" className={activeTab === 'upcoming' ? 'active' : ''} onClick={() => setActiveTab('upcoming')}>
                            Próximos
                        </button>
                        <button type="button" onClick={() => navigate('/checklists')}>
                            Histórico
                        </button>
                    </div>
                </div>

                <div className="remote-activity-toolbar">
                    <label className="remote-activity-search">
                        <Search size={18} aria-hidden="true" />
                        <span className="sr-only">Buscar na fila de trabalho</span>
                        <input
                            type="search"
                            value={taskQuery}
                            onChange={(event) => setTaskQuery(event.target.value)}
                            placeholder="Buscar atividade, checklist ou responsável"
                        />
                    </label>
                    <div className="remote-activity-pulse" aria-label="Resumo da fila">
                        <span><strong>{tasks.late.length}</strong>Atrasadas</span>
                        <span><strong>{tasks.now.length}</strong>Agora</span>
                        <span><strong>{tasks.upcoming.length}</strong>Próximas</span>
                    </div>
                </div>

                {loading ? (
                    <div className="remote-state">
                        <LoaderCircle size={22} className="is-spinning" />
                        Carregando indicadores remotos…
                    </div>
                ) : error ? (
                    <div className="remote-state remote-state-error">
                        <AlertTriangle size={22} />
                        <span>{error}</span>
                        <button type="button" className="remote-link-button" onClick={loadDashboard}>Tentar novamente</button>
                    </div>
                ) : visibleTaskList.length === 0 ? (
                    <div className="remote-state remote-state-empty">
                        {taskQuery ? <Search size={24} /> : <CheckCircle2 size={24} />}
                        <span>{taskQuery ? 'Nenhuma atividade corresponde à busca.' : activeTab === 'upcoming' ? 'Nenhuma atividade futura encontrada.' : 'Nenhuma atividade pendente encontrada.'}</span>
                        {taskQuery && <button type="button" className="remote-link-button" onClick={() => setTaskQuery('')}>Limpar busca</button>}
                    </div>
                ) : (
                    <div className="remote-task-list">
                        {visibleTaskList.map((task) => (
                            <TaskCard
                                key={task.response_id + '-' + task.id}
                                task={task}
                                status={activeTab === 'upcoming' ? 'upcoming' : (tasks.late.some((lateTask) => lateTask.response_id === task.response_id) ? 'late' : 'now')}
                            />
                        ))}
                    </div>
                )}
            </section>}

            {widgetPrefs.rankings && <section className="remote-dashboard-panel remote-rankings-panel">
                <div className="remote-panel-heading">
                    <div>
                        <p className="remote-eyebrow">Desempenho</p>
                        <h2>Rankings do período</h2>
                    </div>
                    <span className="remote-panel-caption">Score médio e conclusão</span>
                </div>
                <div className="remote-rankings-grid">
                    {[
                        ['Usuários', rankings.users],
                        ['Unidades', rankings.units],
                        ['Setores', rankings.sectors],
                    ].map(([title, items]) => (
                        <article className="remote-ranking-card" key={title}>
                            <h3>{title}</h3>
                            {items.length === 0 ? (
                                <p className="remote-state-inline">Sem dados no período.</p>
                            ) : items.map((item, index) => (
                                <div className="remote-ranking-row" key={item.id}>
                                    <div className="remote-ranking-label">
                                        <span>{index + 1}. {item.label}</span>
                                        <strong>{item.score}%</strong>
                                    </div>
                                    <div className="remote-ranking-track" aria-hidden="true">
                                        <span style={{ width: `${item.score}%` }} />
                                    </div>
                                    <small>{item.completed} concluídos de {item.total} · {item.completionRate}% conclusão</small>
                                </div>
                            ))}
                        </article>
                    ))}
                </div>
            </section>}

            {widgetPrefs.trend && <section className="remote-dashboard-panel remote-trend-panel">
                <div className="remote-panel-heading">
                    <div>
                        <p className="remote-eyebrow">Evolução</p>
                        <h2>Indicadores por dia</h2>
                    </div>
                    <span className="remote-panel-caption">Score médio dos registros</span>
                </div>
                <TrendChart data={trend} />
            </section>}

            {widgetPrefs.details && <section className="remote-dashboard-panel remote-detail-panel">
                <div className="remote-panel-heading">
                    <div>
                        <p className="remote-eyebrow">Detalhamento</p>
                        <h2>Execuções do período</h2>
                    </div>
                    <div className="remote-detail-actions">
                        <button type="button" className="remote-refresh-button" onClick={() => setDetailColumnsOpen((current) => !current)} aria-expanded={detailColumnsOpen}>
                            <SlidersHorizontal size={15} /> Colunas
                        </button>
                        <button type="button" className="remote-refresh-button" onClick={exportDetails} disabled={details.length === 0}>
                            <Download size={15} /> Exportar
                        </button>
                    </div>
                </div>
                {detailColumnsOpen && <div className="remote-columns-menu" role="menu" aria-label="Colunas do detalhamento">
                    {DETAIL_COLUMNS.map(([key, label]) => (
                        <label key={key}>
                            <input
                                type="checkbox"
                                checked={detailColumns[key]}
                                onChange={() => setDetailColumns((current) => ({ ...current, [key]: !current[key] }))}
                            />
                            {label}
                        </label>
                    ))}
                </div>}
                {details.length === 0 ? <div className="remote-state remote-state-empty">Nenhuma execução encontrada no período.</div> : <div className="remote-detail-table-wrap">
                    <table className="remote-detail-table">
                        <thead>
                            <tr>
                                <th><input type="checkbox" aria-label="Selecionar todas as linhas" checked={allVisibleDetailsSelected} onChange={toggleAllDetailSelection} /></th>
                                {DETAIL_COLUMNS.filter(([key]) => detailColumns[key]).map(([key, label]) => <th key={key}>{label}</th>)}
                            </tr>
                        </thead>
                        <tbody>
                            {visibleDetails.map((item) => (
                                <tr key={item.id}>
                                    <td><input type="checkbox" aria-label={`Selecionar linha ${item.checklist}`} checked={selectedDetailIds.includes(item.id)} onChange={() => toggleDetailSelection(item.id)} /></td>
                                    {DETAIL_COLUMNS.filter(([key]) => detailColumns[key]).map(([key]) => <td key={key}>{formatDetailCell(item, key)}</td>)}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>}
                <div className="remote-detail-pagination">
                    <span>{details.length === 0 ? '0' : `${detailPage * detailPageSize + 1}–${Math.min((detailPage + 1) * detailPageSize, details.length)} de ${details.length}`}</span>
                    <label>Linhas por página
                        <select value={detailPageSize} onChange={(event) => { setDetailPageSize(Number(event.target.value)); setDetailPage(0); }}>
                            <option value={10}>10</option>
                            <option value={20}>20</option>
                            <option value={50}>50</option>
                        </select>
                    </label>
                    <button type="button" className="remote-link-button" onClick={() => setDetailPage(0)} disabled={detailPage === 0}>Primeira</button>
                    <button type="button" className="remote-link-button" onClick={() => setDetailPage((current) => Math.max(0, current - 1))} disabled={detailPage === 0}>Anterior</button>
                    <span>Página {Math.min(detailPage + 1, detailPageCount)} de {detailPageCount}</span>
                    <button type="button" className="remote-link-button" onClick={() => setDetailPage((current) => Math.min(detailPageCount - 1, current + 1))} disabled={detailPage >= detailPageCount - 1}>Próxima</button>
                    <button type="button" className="remote-link-button" onClick={() => setDetailPage(detailPageCount - 1)} disabled={detailPage >= detailPageCount - 1}>Última</button>
                </div>
            </section>}

            <section className="remote-dashboard-footer-grid">
                {widgetPrefs.completion && <article className="remote-dashboard-panel compact">
                    <div className="remote-panel-heading">
                        <div>
                            <p className="remote-eyebrow">Conclusão</p>
                            <h2>Taxa de conclusão</h2>
                        </div>
                        <CalendarDays size={20} />
                    </div>
                    <div className="remote-progress-row">
                        <strong>{stats.completionRate}%</strong>
                        <span>{stats.completed.toLocaleString('pt-BR')} finalizados</span>
                    </div>
                    <div className="remote-progress-track">
                        <span style={{ width: Math.min(stats.completionRate, 100) + '%' }} />
                    </div>
                </article>}
                {widgetPrefs.coverage && <article className="remote-dashboard-panel compact">
                    <div className="remote-panel-heading">
                        <div>
                            <p className="remote-eyebrow">Cobertura</p>
                            <h2>Dados modelados</h2>
                        </div>
                        <CheckCircle2 size={20} />
                    </div>
                    <div className="remote-progress-row">
                        <strong>{(data.checklists || []).length.toLocaleString('pt-BR')}</strong>
                        <span>checklists disponíveis para execução</span>
                    </div>
                    <button type="button" className="remote-link-button" onClick={() => navigate('/checklists')}>
                        Abrir biblioteca
                        <ChevronRight size={16} />
                    </button>
                </article>}
            </section>
            <div className="dashboard-floating-actions">
                <button type="button" className="dashboard-support-button" onClick={() => navigate('/help')}>
                    <LifeBuoy size={16} /> Abrir central de suporte
                </button>
                <button type="button" className="dashboard-koru-button" onClick={() => setKoruOpen(true)}>
                    <MessageCircle size={17} /> Abrir Koru IA
                </button>
            </div>
            {koruOpen && <div className="koru-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setKoruOpen(false); }}>
                <section className="koru-modal" role="dialog" aria-modal="true" aria-labelledby="koru-title">
                    <header className="koru-modal-header">
                        <div><p className="remote-eyebrow">Assistente operacional</p><h2 id="koru-title"><MessageCircle size={19} /> Koru <span>Online</span></h2><small>Consulta dados reais do painel gestor</small></div>
                        <button type="button" className="remote-modal-close" onClick={() => setKoruOpen(false)} aria-label="Fechar Koru"><X size={18} /></button>
                    </header>
                    <div className="koru-message-list" aria-live="polite">
                        {koruMessages.map((message) => <div key={message.id} className={`koru-message ${message.role}`}><span>{message.text}</span></div>)}
                        {koruBusy && <div className="koru-message assistant"><span>Consultando Supabase…</span></div>}
                    </div>
                    <div className="koru-suggestions">
                        {['Resuma os principais alertas de hoje', 'Quais checklists mais atrasaram esta semana?', 'Como estão as unidades nos últimos 7 dias?', 'Quem precisa de acompanhamento agora?'].map((suggestion) => <button type="button" key={suggestion} onClick={() => sendKoruMessage(suggestion)} disabled={koruBusy}>{suggestion}</button>)}
                    </div>
                    <form className="koru-composer" onSubmit={(event) => { event.preventDefault(); sendKoruMessage(); }}>
                        <input value={koruDraft} onChange={(event) => setKoruDraft(event.target.value)} placeholder="Mensagem para Koru" aria-label="Mensagem para Koru" />
                        <button type="submit" disabled={koruBusy || !koruDraft.trim()} aria-label="Enviar mensagem"><Send size={16} /></button>
                    </form>
                </section>
            </div>}
            {customizationOpen && <div className="remote-dashboard-modal-backdrop" role="presentation">
                <section className="remote-dashboard-modal" role="dialog" aria-modal="true" aria-labelledby="dashboard-customization-title">
                    <div className="remote-dashboard-modal-header">
                        <div>
                            <p className="remote-eyebrow">Personalização</p>
                            <h2 id="dashboard-customization-title"><LayoutDashboard size={20} /> Dashboard</h2>
                            <p>Escolha os widgets ativos para este workspace. A preferência é salva no Supabase.</p>
                        </div>
                        <button type="button" className="remote-modal-close" aria-label="Fechar personalização" onClick={() => setCustomizationOpen(false)}>
                            <X size={18} />
                        </button>
                    </div>
                    <div className="remote-widget-catalog">
                        {WIDGET_CATALOG.map(([id, label, description]) => (
                            <label className="remote-widget-option" key={id}>
                                <input type="checkbox" checked={Boolean(widgetPrefs[id])} onChange={() => toggleWidget(id)} />
                                <span>
                                    <strong>{label}</strong>
                                    <small>{description}</small>
                                </span>
                            </label>
                        ))}
                    </div>
                    <div className="remote-dashboard-modal-actions">
                        <button type="button" className="remote-link-button" onClick={() => setWidgetPrefs(DEFAULT_WIDGETS)}>Restaurar padrão</button>
                        <div>
                            <button type="button" className="remote-refresh-button" onClick={() => setCustomizationOpen(false)}>Cancelar</button>
                            <button type="button" className="remote-refresh-button primary" onClick={saveWidgetPreferences} disabled={savingWidgets}>
                                {savingWidgets ? <LoaderCircle size={15} className="is-spinning" /> : <CheckCircle2 size={15} />}
                                {savingWidgets ? 'Salvando…' : 'Aplicar'}
                            </button>
                        </div>
                    </div>
                </section>
            </div>}
        </div>
    );
};

export default DashboardRemote;

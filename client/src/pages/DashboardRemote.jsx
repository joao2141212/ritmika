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

const isCancellationError = (error) => (
    error?.name === 'CancelledError'
    || error?.name === 'AbortError'
    || /cancelled|canceled|aborted/i.test(String(error?.message || ''))
);

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
            className="flex w-full flex-col gap-2 rounded-xl border border-[#dce8e9] bg-white p-4 text-left transition-shadow hover:shadow-[0_8px_20px_rgba(24,48,64,0.08)]"
            onClick={() => navigate('/checklists/' + task.id + '/details', {
                state: { executionId: task.execution_id },
            })}
        >
            <span className={`text-xs font-bold ${isLate ? 'text-[#b42318]' : isUpcoming ? 'text-[#b26a00]' : 'text-[#08766c]'}`}>
                <Clock3 size={14} />
                {isLate ? statusLabel + ' · ' + task.delay : statusLabel + ' · ' + (task.dueIn || task.startTime)}
            </span>
            <span className="text-sm font-bold text-[#17363d]">{task.title}</span>
            <span className="flex items-center justify-between gap-3 text-xs text-[#6c8187]">
                <span>{task.due_at ? new Date(task.due_at).toLocaleString('pt-BR') : 'Sem horário definido'}</span>
                <ChevronRight size={18} />
            </span>
        </button>
    );
};

const StatCard = ({ label, value, helper }) => (
    <article className="rounded-2xl border border-[#dce8e9] bg-white p-4 shadow-[0_10px_30px_rgba(24,48,64,0.05)]">
        <span className="text-xs font-bold uppercase tracking-[0.1em] text-[#6c8187]">{label}</span>
        <strong className="mt-2 block text-2xl font-extrabold text-[#17363d]">{value.toLocaleString('pt-BR')}</strong>
        <small className="mt-1 block text-xs text-[#6c8187]">{helper}</small>
    </article>
);

const CompletionGauge = ({ value }) => {
    const normalized = Math.max(0, Math.min(100, Number(value) || 0));
    const circumference = 2 * Math.PI * 52;
    const offset = circumference * (1 - normalized / 100);

    return (
        <div className="relative grid size-36 place-items-center" aria-label={`${normalized}% de conclusão`}>
            <svg viewBox="0 0 132 132" role="img" aria-hidden="true">
                <circle className="fill-none stroke-[#e8f0ef]" cx="66" cy="66" r="52" strokeWidth="10" />
                <circle
                    className="fill-none stroke-[#08766c]"
                    cx="66"
                    cy="66"
                    r="52"
                    strokeDasharray={circumference}
                    strokeDashoffset={offset}
                />
            </svg>
            <div className="absolute inset-0 grid place-content-center text-center"><strong className="block text-xl font-extrabold text-[#17363d]">{normalized}%</strong><span className="text-xs text-[#6c8187]">concluído</span></div>
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
        <div className="grid gap-4">
            <div className="flex h-4 overflow-hidden rounded-full bg-[#e8f0ef]" aria-label="Distribuição das execuções por status">
                {total > 0 && items.map(([label, value, tone]) => (
                    <span
                        key={label}
                        className={`block h-full ${tone === 'success' ? 'bg-[#08766c]' : tone === 'info' ? 'bg-[#3b82b6]' : tone === 'warning' ? 'bg-[#d99a27]' : 'bg-[#c94d42]'}`}
                        style={{ width: `${((Number(value) || 0) / total) * 100}%` }}
                        title={`${label}: ${value}`}
                    />
                ))}
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs text-[#6c8187]">
                {items.map(([label, value, tone]) => (
                    <div className="flex items-center gap-2" key={label}>
                        <span className={`size-2 rounded-full ${tone === 'success' ? 'bg-[#08766c]' : tone === 'info' ? 'bg-[#3b82b6]' : tone === 'warning' ? 'bg-[#d99a27]' : 'bg-[#c94d42]'}`} />
                        <span>{label}</span>
                        <strong className="ml-auto text-[#17363d]">{Number(value || 0).toLocaleString('pt-BR')}</strong>
                    </div>
                ))}
            </div>
        </div>
    );
};

const TrendChart = ({ data }) => {
    const visible = data.slice(-14);
    if (visible.length === 0) return <div className="flex min-h-40 items-center justify-center text-sm text-[#6c8187]">Sem evolução registrada no período.</div>;

    const width = 720;
    const height = 220;
    const paddingX = 30;
    const paddingY = 24;
    const xFor = (index) => paddingX + (index * (width - paddingX * 2)) / Math.max(1, visible.length - 1);
    const yFor = (score) => height - paddingY - (Math.max(0, Math.min(100, Number(score) || 0)) / 100) * (height - paddingY * 2);
    const points = visible.map((item, index) => `${xFor(index)},${yFor(item.score)}`).join(' ');
    const areaPoints = `${paddingX},${height - paddingY} ${points} ${xFor(visible.length - 1)},${height - paddingY}`;

    return (
        <div className="overflow-x-auto">
            <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Evolução do score médio no período">
                {[0, 25, 50, 75, 100].map((score) => (
                    <g key={score}>
                        <line className="stroke-[#dce8e9]" x1={paddingX} x2={width - paddingX} y1={yFor(score)} y2={yFor(score)} />
                        <text className="fill-[#6c8187] text-[10px]" x="0" y={yFor(score) + 4}>{score}%</text>
                    </g>
                ))}
                <polygon className="fill-[#e8f8f3]" points={areaPoints} />
                <polyline className="fill-none stroke-[#08766c]" strokeWidth="3" points={points} />
                {visible.map((item, index) => (
                    <circle key={item.date} cx={xFor(index)} cy={yFor(item.score)} r="4">
                        <title>{new Date(`${item.date}T12:00:00`).toLocaleDateString('pt-BR')}: {item.score}%</title>
                    </circle>
                ))}
            </svg>
            <div className="flex min-w-[720px] justify-between text-[11px] text-[#6c8187]" aria-hidden="true">
                {visible.map((item, index) => (
                    <span key={item.date} className={index % Math.ceil(visible.length / 5) === 0 ? '' : 'invisible'}>
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
    const workspaceId = user?.workspace_id || null;
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
            const requestDashboard = () => dashboardService.getData({ periodDays, ...dashboardFilters });
            let dashboardData;
            try {
                dashboardData = await requestDashboard();
            } catch (requestError) {
                if (!isCancellationError(requestError)) throw requestError;
                logger.warn({
                    file: 'client/src/pages/DashboardRemote.jsx',
                    fn: 'DashboardRemote.loadDashboard',
                    operation: 'dashboard.load.retry_after_cancellation',
                    layer: 'client-data',
                    status: 'retrying',
                    errorCode: 'DASHBOARD_REQUEST_CANCELLED',
                    error: requestError,
                    workspaceId,
                    periodDays,
                    filters: dashboardFilters,
                    retryAttempt: 1,
                });
                await new Promise((resolve) => window.setTimeout(resolve, 150));
                dashboardData = await requestDashboard();
            }
            setData(dashboardData);
        } catch (loadError) {
            const telemetry = logger.error({
                file: 'client/src/pages/DashboardRemote.jsx',
                fn: 'DashboardRemote.loadDashboard',
                operation: 'dashboard.load',
                layer: 'client-data',
                status: 'error',
                errorCode: loadError?.code || 'DASHBOARD_LOAD_FAILED',
                error: loadError,
                workspaceId,
                periodDays,
                filters: dashboardFilters,
                source: 'supabase',
                nextAction: 'retry_dashboard_load_or_search_console_by_correlation_id',
            });
            const cause = loadError?.message || loadError?.error_description || 'Falha desconhecida no carregamento remoto';
            const code = loadError?.code || loadError?.status || 'DASHBOARD_LOAD_FAILED';
            const reference = telemetry?.correlationId || telemetry?.eventId || 'sem-referencia';
            setError(`Falha ao carregar indicadores. Causa: ${cause}. Código: ${code}. Referência: ${reference}.`);
            toast.error(`Dashboard indisponível. Código ${code}. Ref. ${reference}`);
        } finally {
            setLoading(false);
        }
    }, [dashboardFilters, periodDays, workspaceId]);

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
        <div className={`min-h-full bg-[#f4f8f8] p-5 text-[#17363d] sm:p-7 lg:p-10 ${filtersOpen ? 'overflow-hidden' : ''}`}>
            <header className="mb-6 flex items-start justify-between gap-5 max-[760px]:flex-col">
                <div>
                    <p className="mb-1 text-xs font-bold uppercase tracking-[0.13em] text-[#08766c]">Painel do workspace</p>
                    <h1 className="m-0 text-[clamp(28px,3.5vw,42px)] font-extrabold tracking-[-0.04em]">Olá, {user?.name || 'gestor'}</h1>
                    <p className="mt-2 max-w-2xl text-sm text-[#6c8187]">
                        A operação real do Ritmika, sincronizada com os dados do workspace.
                    </p>
                </div>
                <div className="flex flex-wrap items-center gap-2 max-[760px]:w-full max-[760px]:flex-col">
                    <button type="button" className="inline-flex min-h-10 items-center justify-center gap-2 rounded-[10px] border border-[#dce8e9] bg-white px-3 text-xs font-bold text-[#38515f] hover:border-[#9bcfc7] hover:text-[#08766c] max-[760px]:w-full" aria-label="Personalizar dashboard" onClick={() => setCustomizationOpen(true)}>
                        <SlidersHorizontal size={16} /> <span>Personalizar</span>
                    </button>
                    <button
                        type="button"
                        className="relative grid size-10 place-items-center rounded-[10px] border border-[#dce8e9] bg-white text-[#38515f] max-[760px]:w-full"
                        aria-label="Abrir notificações"
                        onClick={() => navigate('/notifications')}
                    >
                        <Bell size={20} />
                        {stats.unreadNotifications > 0 && <span>{stats.unreadNotifications}</span>}
                    </button>
                    <button type="button" className="inline-flex min-h-10 items-center justify-center gap-2 rounded-[10px] border border-[#dce8e9] bg-white px-3 text-xs font-bold text-[#38515f] disabled:cursor-wait disabled:opacity-60 max-[760px]:w-full" onClick={loadDashboard} disabled={loading}>
                        <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                        <span>Atualizar</span>
                    </button>
                    <button type="button" className="inline-flex min-h-10 items-center justify-center gap-2 rounded-[10px] border border-[#dce8e9] bg-white px-3 text-xs font-bold text-[#38515f] disabled:cursor-wait disabled:opacity-60 max-[760px]:w-full" aria-label="Exportar dashboard" onClick={exportDashboard} disabled={loading}>
                        <Download size={16} />
                        <span>Exportar</span>
                    </button>
                </div>
            </header>

            <section className="mb-6 rounded-2xl border border-[#dce8e9] bg-white p-4 shadow-[0_10px_30px_rgba(24,48,64,0.05)]" aria-label="Filtros do dashboard">
                <div className="flex flex-wrap items-end gap-3">
                    <label className="grid min-w-[170px] gap-1.5 text-xs font-bold text-[#6c8187]">
                        <span>Período</span>
                        <select className="min-h-10 rounded-[10px] border border-[#dce8e9] bg-white px-3 text-sm font-normal text-[#38515f] outline-none focus:border-[#08766c]"
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
                    <label className="grid min-w-[170px] gap-1.5 text-xs font-bold text-[#6c8187]">
                        <span>Unidade</span>
                        <select className="min-h-10 rounded-[10px] border border-[#dce8e9] bg-white px-3 text-sm font-normal text-[#38515f] outline-none focus:border-[#08766c]" value={dashboardFilters.unitId} onChange={(event) => updateDashboardFilter('unitId', event.target.value)}>
                            <option value="">Todas</option>
                            {availableFilters.units.map((unit) => <option key={unit.id} value={unit.id}>{unit.name}</option>)}
                        </select>
                    </label>
                    <label className="grid min-w-[170px] gap-1.5 text-xs font-bold text-[#6c8187]">
                        <span>Setor</span>
                        <select className="min-h-10 rounded-[10px] border border-[#dce8e9] bg-white px-3 text-sm font-normal text-[#38515f] outline-none focus:border-[#08766c]" value={dashboardFilters.sectorId} onChange={(event) => updateDashboardFilter('sectorId', event.target.value)}>
                            <option value="">Todos</option>
                            {availableFilters.sectors.map((sector) => <option key={sector.id} value={sector.id}>{sector.name}</option>)}
                        </select>
                    </label>
                    <button
                        type="button"
                        className={`inline-flex min-h-10 items-center gap-2 rounded-[10px] border px-3 text-xs font-bold transition-colors ${filtersOpen ? 'border-[#08766c] bg-[#e8f8f3] text-[#08766c]' : 'border-[#dce8e9] bg-white text-[#38515f]'}`}
                        onClick={() => setFiltersOpen((current) => !current)}
                        aria-expanded={filtersOpen}
                        aria-controls="dashboard-advanced-filters"
                    >
                        <SlidersHorizontal size={17} />
                        Mais filtros
                        {activeFilterCount > 0 && <span>{activeFilterCount}</span>}
                    </button>
                    {activeFilterCount > 0 && (
                        <button type="button" className="min-h-10 rounded-[10px] border-0 bg-transparent px-3 text-xs font-bold text-[#08766c]" onClick={clearDashboardFilters}>
                            Limpar
                        </button>
                    )}
                </div>

                {filtersOpen && (
                    <div className="mt-3 grid grid-cols-2 gap-3 rounded-xl border border-[#dce8e9] bg-[#f7fbfa] p-4 max-[640px]:grid-cols-1" id="dashboard-advanced-filters">
                        <div className="col-span-full flex items-center justify-between border-b border-[#dce8e9] pb-3">
                            <div>
                                <strong>Filtros avançados</strong>
                                <span>Refine a operação exibida no painel.</span>
                            </div>
                            <button className="rounded-lg p-2 text-[#38515f] hover:bg-white" type="button" aria-label="Fechar filtros" onClick={() => setFiltersOpen(false)}>
                                <X size={18} />
                            </button>
                        </div>
                        <label className="grid gap-1.5 text-xs font-bold text-[#6c8187]">
                            <span>Unidade</span>
                            <select className="min-h-10 rounded-[10px] border border-[#dce8e9] bg-white px-3 text-sm font-normal text-[#38515f]" value={dashboardFilters.unitId} onChange={(event) => updateDashboardFilter('unitId', event.target.value)}>
                                <option value="">Todas</option>
                                {availableFilters.units.map((unit) => <option key={unit.id} value={unit.id}>{unit.name}</option>)}
                            </select>
                        </label>
                        <label className="grid gap-1.5 text-xs font-bold text-[#6c8187]">
                            <span>Setor</span>
                            <select className="min-h-10 rounded-[10px] border border-[#dce8e9] bg-white px-3 text-sm font-normal text-[#38515f]" value={dashboardFilters.sectorId} onChange={(event) => updateDashboardFilter('sectorId', event.target.value)}>
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
                        <div className="col-span-2 flex justify-end gap-2 max-[640px]:col-span-1">
                            <button type="button" className="rounded-lg border border-[#dce8e9] bg-white px-3 py-2 text-xs font-bold text-[#38515f] disabled:opacity-50" onClick={clearDashboardFilters} disabled={!activeFilterCount}>
                                Limpar filtros
                            </button>
                            <button type="button" className="rounded-lg bg-[#08766c] px-3 py-2 text-xs font-bold text-white" onClick={() => setFiltersOpen(false)}>
                                Ver resultados
                            </button>
                        </div>
                    </div>
                )}

                {activeFilterChips.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2" aria-label="Filtros ativos">
                        {activeFilterChips.map((filter) => (
                            <button
                                type="button"
                                key={filter.key}
                                onClick={() => updateDashboardFilter(filter.key, '')}
                                className="inline-flex items-center gap-2 rounded-full bg-[#e8f8f3] px-3 py-1.5 text-xs text-[#08766c]"
                                aria-label={`Remover filtro ${filter.label}: ${filter.value}`}
                            >
                                <span>{filter.label}: <strong>{filter.value}</strong></span>
                                <X size={14} />
                            </button>
                        ))}
                    </div>
                )}
            </section>

            {widgetPrefs.summary && <section className="mb-6 grid grid-cols-5 gap-3 max-[1100px]:grid-cols-3 max-[700px]:grid-cols-2" aria-label="Resumo operacional">
                <StatCard label="Agendados" value={stats.totalScheduled} helper="Execuções importadas" tone="primary" />
                <StatCard label="Pendentes" value={stats.pending} helper="Aguardando conclusão" tone="warning" />
                <StatCard label="Em andamento" value={stats.inProgress} helper="Execuções abertas" tone="info" />
                <StatCard label="Atrasados" value={stats.overdue} helper="Com prazo vencido" tone="danger" />
                <StatCard label="Finalizados" value={stats.completed} helper={stats.completionRate + '% de conclusão'} tone="success" />
            </section>}

            {widgetPrefs.summary && <section className="mb-6 grid grid-cols-2 gap-4 max-[800px]:grid-cols-1" aria-label="Visão analítica da operação">
                <article className="rounded-2xl border border-[#dce8e9] bg-white p-5 shadow-[0_10px_30px_rgba(24,48,64,0.05)]">
                    <div className="mb-5 flex items-start justify-between gap-3">
                        <div>
                            <p className="mb-1 text-xs font-bold uppercase tracking-[0.12em] text-[#08766c]">Eficiência operacional</p>
                            <h2 className="m-0 text-xl font-extrabold">Taxa de conclusão</h2>
                        </div>
                        <span className="rounded-full bg-[#e8f8f3] px-3 py-1.5 text-xs font-bold text-[#08766c]">{stats.completed} finalizados</span>
                    </div>
                    <div className="flex flex-wrap items-center gap-5">
                        <CompletionGauge value={stats.completionRate} />
                        <div className="grid gap-1 text-sm text-[#6c8187]">
                            <strong className="text-[#17363d]">{stats.pending + stats.inProgress + stats.overdue} execuções exigem atenção</strong>
                            <span>Distribuição calculada a partir dos registros filtrados no período.</span>
                        </div>
                    </div>
                </article>

                <article className="rounded-2xl border border-[#dce8e9] bg-white p-5 shadow-[0_10px_30px_rgba(24,48,64,0.05)]">
                    <div className="mb-5 flex items-start justify-between gap-3">
                        <div>
                            <p className="mb-1 text-xs font-bold uppercase tracking-[0.12em] text-[#08766c]">Composição do período</p>
                            <h2 className="m-0 text-xl font-extrabold">Execuções por status</h2>
                        </div>
                        <span className="rounded-full bg-[#e8f8f3] px-3 py-1.5 text-xs font-bold text-[#08766c]">{stats.totalScheduled} agendadas</span>
                    </div>
                    <StatusDistribution stats={stats} />
                </article>
            </section>}

            {widgetPrefs.alerts && <section className="mb-6 rounded-2xl border border-[#dce8e9] bg-white p-5 shadow-[0_10px_30px_rgba(24,48,64,0.05)]">
                <div className="mb-5 flex items-start justify-between gap-4 max-[760px]:flex-col">
                    <div>
                        <p className="mb-1 text-xs font-bold uppercase tracking-[0.12em] text-[#08766c]">Fila de trabalho</p>
                        <h2 className="m-0 text-xl font-extrabold">Atividades do workspace</h2>
                    </div>
                    <div className="flex flex-wrap gap-1 rounded-xl bg-[#f1f7f6] p-1" role="tablist" aria-label="Atividades">
                        <button type="button" className={`rounded-lg px-3 py-2 text-xs font-bold transition-colors ${activeTab === 'todo' ? 'bg-white text-[#08766c] shadow-sm' : 'text-[#6c8187]'}`} onClick={() => setActiveTab('todo')}>
                            A fazer
                        </button>
                        <button type="button" className={`rounded-lg px-3 py-2 text-xs font-bold transition-colors ${activeTab === 'upcoming' ? 'bg-white text-[#08766c] shadow-sm' : 'text-[#6c8187]'}`} onClick={() => setActiveTab('upcoming')}>
                            Próximos
                        </button>
                        <button type="button" className="rounded-lg px-3 py-2 text-xs font-bold text-[#6c8187] transition-colors hover:bg-white hover:text-[#08766c]" onClick={() => navigate('/checklists')}>
                            Histórico
                        </button>
                    </div>
                </div>

                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                    <label className="flex min-h-10 min-w-0 flex-1 items-center gap-2 rounded-[10px] border border-[#dce8e9] bg-white px-3 text-[#6c8187] focus-within:border-[#08766c] max-[700px]:basis-full">
                        <Search size={18} aria-hidden="true" />
                        <input
                            type="search"
                            aria-label="Buscar na fila de trabalho"
                            value={taskQuery}
                            onChange={(event) => setTaskQuery(event.target.value)}
                            placeholder="Buscar atividade, checklist ou responsável"
                            className="min-w-0 flex-1 border-0 bg-transparent text-sm text-[#17363d] outline-none placeholder:text-[#91a4a8]"
                        />
                    </label>
                    <div className="flex flex-wrap gap-2 text-xs text-[#6c8187]" aria-label="Resumo da fila">
                        <span className="rounded-lg bg-[#fff2ef] px-2.5 py-2"><strong className="mr-1 text-[#b42318]">{tasks.late.length}</strong>Atrasadas</span>
                        <span className="rounded-lg bg-[#e8f8f3] px-2.5 py-2"><strong className="mr-1 text-[#08766c]">{tasks.now.length}</strong>Agora</span>
                        <span className="rounded-lg bg-[#f1f7f6] px-2.5 py-2"><strong className="mr-1 text-[#38515f]">{tasks.upcoming.length}</strong>Próximas</span>
                    </div>
                </div>

                {loading ? (
                    <div className="flex min-h-64 items-center justify-center gap-2 text-[#6c8187]">
                        <LoaderCircle size={22} className="animate-spin" />
                        Carregando indicadores remotos…
                    </div>
                ) : error ? (
                    <div className="flex min-h-64 flex-col items-center justify-center gap-3 text-center text-[#b42318]">
                        <AlertTriangle size={22} />
                        <span>{error}</span>
                        <button type="button" className="inline-flex min-h-10 items-center rounded-[10px] border border-[#dce8e9] bg-white px-3 text-xs font-bold text-[#38515f]" onClick={loadDashboard}>Tentar novamente</button>
                    </div>
                ) : visibleTaskList.length === 0 ? (
                    <div className="flex min-h-64 flex-col items-center justify-center gap-3 text-center text-[#6c8187]">
                        {taskQuery ? <Search size={24} /> : <CheckCircle2 size={24} />}
                        <span>{taskQuery ? 'Nenhuma atividade corresponde à busca.' : activeTab === 'upcoming' ? 'Nenhuma atividade futura encontrada.' : 'Nenhuma atividade pendente encontrada.'}</span>
                        {taskQuery && <button type="button" className="inline-flex min-h-10 items-center rounded-[10px] border border-[#dce8e9] bg-white px-3 text-xs font-bold text-[#38515f]" onClick={() => setTaskQuery('')}>Limpar busca</button>}
                    </div>
                ) : (
                    <div className="grid gap-3">
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

            {widgetPrefs.rankings && <section className="mb-6 rounded-2xl border border-[#dce8e9] bg-white p-5 shadow-[0_10px_30px_rgba(24,48,64,0.05)]">
                <div className="mb-5 flex items-start justify-between gap-4 max-[760px]:flex-col">
                    <div>
                        <p className="mb-1 text-xs font-bold uppercase tracking-[0.12em] text-[#08766c]">Desempenho</p>
                        <h2 className="m-0 text-xl font-extrabold">Rankings do período</h2>
                    </div>
                    <span className="text-xs text-[#6c8187]">Score médio e conclusão</span>
                </div>
                <div className="grid grid-cols-3 gap-3 max-[850px]:grid-cols-1">
                    {[
                        ['Usuários', rankings.users],
                        ['Unidades', rankings.units],
                        ['Setores', rankings.sectors],
                    ].map(([title, items]) => (
                        <article className="rounded-xl border border-[#dce8e9] bg-[#fbfdfd] p-4" key={title}>
                            <h3 className="mb-3 text-sm font-extrabold">{title}</h3>
                            {items.length === 0 ? (
                                <p className="text-xs text-[#6c8187]">Sem dados no período.</p>
                            ) : items.map((item, index) => (
                                <div className="border-b border-[#edf3f2] py-2.5 last:border-0" key={item.id}>
                                    <div className="mb-1.5 flex items-center justify-between gap-3 text-xs text-[#38515f]">
                                        <span>{index + 1}. {item.label}</span>
                                        <strong className="text-[#08766c]">{item.score}%</strong>
                                    </div>
                                    <div className="h-1.5 overflow-hidden rounded-full bg-[#e8f0ef]" aria-hidden="true">
                                        <span className="block h-full rounded-full bg-[#08766c]" style={{ width: `${item.score}%` }} />
                                    </div>
                                    <small className="mt-1 block text-[11px] text-[#6c8187]">{item.completed} concluídos de {item.total} · {item.completionRate}% conclusão</small>
                                </div>
                            ))}
                        </article>
                    ))}
                </div>
            </section>}

            {widgetPrefs.trend && <section className="mb-6 rounded-2xl border border-[#dce8e9] bg-white p-5 shadow-[0_10px_30px_rgba(24,48,64,0.05)]">
                <div className="mb-5 flex items-start justify-between gap-4 max-[760px]:flex-col">
                    <div>
                        <p className="mb-1 text-xs font-bold uppercase tracking-[0.12em] text-[#08766c]">Evolução</p>
                        <h2 className="m-0 text-xl font-extrabold">Indicadores por dia</h2>
                    </div>
                    <span className="text-xs text-[#6c8187]">Score médio dos registros</span>
                </div>
                <TrendChart data={trend} />
            </section>}

            {widgetPrefs.details && <section className="mb-6 rounded-2xl border border-[#dce8e9] bg-white p-5 shadow-[0_10px_30px_rgba(24,48,64,0.05)]">
                <div className="mb-5 flex items-start justify-between gap-4 max-[760px]:flex-col">
                    <div>
                        <p className="mb-1 text-xs font-bold uppercase tracking-[0.12em] text-[#08766c]">Detalhamento</p>
                        <h2 className="m-0 text-xl font-extrabold">Execuções do período</h2>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <button type="button" className="inline-flex min-h-10 items-center gap-2 rounded-[10px] border border-[#dce8e9] bg-white px-3 text-xs font-bold text-[#38515f]" onClick={() => setDetailColumnsOpen((current) => !current)} aria-expanded={detailColumnsOpen}>
                            <SlidersHorizontal size={15} /> Colunas
                        </button>
                        <button type="button" className="inline-flex min-h-10 items-center gap-2 rounded-[10px] border border-[#dce8e9] bg-white px-3 text-xs font-bold text-[#38515f] disabled:cursor-not-allowed disabled:opacity-50" onClick={exportDetails} disabled={details.length === 0}>
                            <Download size={15} /> Exportar
                        </button>
                    </div>
                </div>
                {detailColumnsOpen && <div className="mb-4 grid grid-cols-2 gap-2 rounded-xl border border-[#dce8e9] bg-[#f7fbfa] p-3 max-[640px]:grid-cols-1" role="menu" aria-label="Colunas do detalhamento">
                    {DETAIL_COLUMNS.map(([key, label]) => (
                            <label key={key} className="flex items-center gap-2 text-xs text-[#38515f]">
                            <input
                                type="checkbox"
                                checked={detailColumns[key]}
                                onChange={() => setDetailColumns((current) => ({ ...current, [key]: !current[key] }))}
                            />
                            {label}
                        </label>
                    ))}
                </div>}
                {details.length === 0 ? <div className="flex min-h-40 items-center justify-center text-sm text-[#6c8187]">Nenhuma execução encontrada no período.</div> : <div className="overflow-x-auto rounded-xl border border-[#dce8e9]">
                    <table className="min-w-full border-collapse text-left text-xs">
                        <thead>
                            <tr>
                                <th className="border-b border-[#dce8e9] bg-[#f7fbfa] px-3 py-2"><input type="checkbox" aria-label="Selecionar todas as linhas" checked={allVisibleDetailsSelected} onChange={toggleAllDetailSelection} /></th>
                                {DETAIL_COLUMNS.filter(([key]) => detailColumns[key]).map(([key, label]) => <th className="border-b border-[#dce8e9] bg-[#f7fbfa] px-3 py-2 font-bold text-[#38515f]" key={key}>{label}</th>)}
                            </tr>
                        </thead>
                        <tbody>
                            {visibleDetails.map((item) => (
                                <tr key={item.id}>
                                    <td className="border-b border-[#edf3f2] px-3 py-2"><input type="checkbox" aria-label={`Selecionar linha ${item.checklist}`} checked={selectedDetailIds.includes(item.id)} onChange={() => toggleDetailSelection(item.id)} /></td>
                                    {DETAIL_COLUMNS.filter(([key]) => detailColumns[key]).map(([key]) => <td className="border-b border-[#edf3f2] px-3 py-2 text-[#38515f]" key={key}>{formatDetailCell(item, key)}</td>)}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>}
                <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-[#6c8187]">
                    <span>{details.length === 0 ? '0' : `${detailPage * detailPageSize + 1}–${Math.min((detailPage + 1) * detailPageSize, details.length)} de ${details.length}`}</span>
                    <label>Linhas por página
                        <select value={detailPageSize} onChange={(event) => { setDetailPageSize(Number(event.target.value)); setDetailPage(0); }}>
                            <option value={10}>10</option>
                            <option value={20}>20</option>
                            <option value={50}>50</option>
                        </select>
                    </label>
                    <button type="button" className="rounded-lg border border-[#dce8e9] bg-white px-2.5 py-2 text-xs font-bold text-[#38515f] disabled:opacity-50" onClick={() => setDetailPage(0)} disabled={detailPage === 0}>Primeira</button>
                    <button type="button" className="rounded-lg border border-[#dce8e9] bg-white px-2.5 py-2 text-xs font-bold text-[#38515f] disabled:opacity-50" onClick={() => setDetailPage((current) => Math.max(0, current - 1))} disabled={detailPage === 0}>Anterior</button>
                    <span>Página {Math.min(detailPage + 1, detailPageCount)} de {detailPageCount}</span>
                    <button type="button" className="rounded-lg border border-[#dce8e9] bg-white px-2.5 py-2 text-xs font-bold text-[#38515f] disabled:opacity-50" onClick={() => setDetailPage((current) => Math.min(detailPageCount - 1, current + 1))} disabled={detailPage >= detailPageCount - 1}>Próxima</button>
                    <button type="button" className="rounded-lg border border-[#dce8e9] bg-white px-2.5 py-2 text-xs font-bold text-[#38515f] disabled:opacity-50" onClick={() => setDetailPage(detailPageCount - 1)} disabled={detailPage >= detailPageCount - 1}>Última</button>
                </div>
            </section>}

            <section className="mb-6 grid grid-cols-2 gap-4 max-[800px]:grid-cols-1">
                {widgetPrefs.completion && <article className="rounded-2xl border border-[#dce8e9] bg-white p-5 shadow-[0_10px_30px_rgba(24,48,64,0.05)]">
                    <div className="mb-5 flex items-start justify-between gap-4">
                        <div>
                            <p className="mb-1 text-xs font-bold uppercase tracking-[0.12em] text-[#08766c]">Conclusão</p>
                            <h2 className="m-0 text-xl font-extrabold">Taxa de conclusão</h2>
                        </div>
                        <CalendarDays size={20} />
                    </div>
                    <div className="remote-progress-row">
                        <strong>{stats.completionRate}%</strong>
                        <span>{stats.completed.toLocaleString('pt-BR')} finalizados</span>
                    </div>
                    <div className="h-3 overflow-hidden rounded-full bg-[#e8f0ef]">
                        <span className="block h-full rounded-full bg-[#08766c]" style={{ width: Math.min(stats.completionRate, 100) + '%' }} />
                    </div>
                </article>}
                {widgetPrefs.coverage && <article className="rounded-2xl border border-[#dce8e9] bg-white p-5 shadow-[0_10px_30px_rgba(24,48,64,0.05)]">
                    <div className="mb-5 flex items-start justify-between gap-4">
                        <div>
                            <p className="mb-1 text-xs font-bold uppercase tracking-[0.12em] text-[#08766c]">Cobertura</p>
                            <h2 className="m-0 text-xl font-extrabold">Dados modelados</h2>
                        </div>
                        <CheckCircle2 size={20} />
                    </div>
                    <div className="mb-4 flex items-baseline gap-2 text-sm text-[#6c8187]">
                        <strong className="text-2xl font-extrabold text-[#17363d]">{(data.checklists || []).length.toLocaleString('pt-BR')}</strong>
                        <span>checklists disponíveis para execução</span>
                    </div>
                    <button type="button" className="inline-flex items-center gap-1 text-xs font-bold text-[#08766c]" onClick={() => navigate('/checklists')}>
                        Abrir biblioteca
                        <ChevronRight size={16} />
                    </button>
                </article>}
            </section>
            <div className="fixed bottom-5 right-5 z-20 flex gap-2 max-[640px]:bottom-3 max-[640px]:left-3 max-[640px]:right-3">
                <button type="button" className="inline-flex items-center gap-2 rounded-xl border border-[#dce8e9] bg-white px-3 py-2 text-xs font-bold text-[#38515f] shadow-lg" onClick={() => navigate('/help')}>
                    <LifeBuoy size={16} /> Abrir central de suporte
                </button>
                <button type="button" className="inline-flex items-center gap-2 rounded-xl bg-[#08766c] px-3 py-2 text-xs font-bold text-white shadow-lg" onClick={() => setKoruOpen(true)}>
                    <MessageCircle size={17} /> Abrir Koru IA
                </button>
            </div>
            {koruOpen && <div className="fixed inset-0 z-30 grid place-items-center bg-[#17363d]/40 p-4" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setKoruOpen(false); }}>
                <section className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl" role="dialog" aria-modal="true" aria-labelledby="koru-title">
                    <header className="flex items-start justify-between gap-4 border-b border-[#dce8e9] p-5">
                        <div><p className="mb-1 text-xs font-bold uppercase tracking-[0.12em] text-[#08766c]">Assistente operacional</p><h2 className="m-0 flex items-center gap-2 text-xl font-extrabold" id="koru-title"><MessageCircle size={19} /> Koru <span>Online</span></h2><small className="text-xs text-[#6c8187]">Consulta dados reais do painel gestor</small></div>
                        <button type="button" className="grid size-9 place-items-center rounded-lg border border-[#dce8e9] text-[#38515f]" onClick={() => setKoruOpen(false)} aria-label="Fechar Koru"><X size={18} /></button>
                    </header>
                    <div className="grid max-h-80 gap-2 overflow-y-auto p-5" aria-live="polite">
                        {koruMessages.map((message) => <div key={message.id} className={`max-w-[85%] rounded-xl px-3 py-2 text-sm ${message.role === 'assistant' ? 'bg-[#f1f7f6] text-[#38515f]' : 'ml-auto bg-[#08766c] text-white'}`}><span>{message.text}</span></div>)}
                        {koruBusy && <div className="max-w-[85%] rounded-xl bg-[#f1f7f6] px-3 py-2 text-sm text-[#38515f]"><span>Consultando Supabase…</span></div>}
                    </div>
                    <div className="flex flex-wrap gap-2 px-5 pb-3">
                        {['Resuma os principais alertas de hoje', 'Quais checklists mais atrasaram esta semana?', 'Como estão as unidades nos últimos 7 dias?', 'Quem precisa de acompanhamento agora?'].map((suggestion) => <button className="rounded-full border border-[#dce8e9] px-3 py-1.5 text-xs text-[#38515f] disabled:opacity-50" type="button" key={suggestion} onClick={() => sendKoruMessage(suggestion)} disabled={koruBusy}>{suggestion}</button>)}
                    </div>
                    <form className="flex gap-2 border-t border-[#dce8e9] p-4" onSubmit={(event) => { event.preventDefault(); sendKoruMessage(); }}>
                        <input className="min-w-0 flex-1 rounded-lg border border-[#dce8e9] px-3 text-sm outline-none focus:border-[#08766c]" value={koruDraft} onChange={(event) => setKoruDraft(event.target.value)} placeholder="Mensagem para Koru" aria-label="Mensagem para Koru" />
                        <button className="grid size-10 place-items-center rounded-lg bg-[#08766c] text-white disabled:opacity-50" type="submit" disabled={koruBusy || !koruDraft.trim()} aria-label="Enviar mensagem"><Send size={16} /></button>
                    </form>
                </section>
            </div>}
            {customizationOpen && <div className="fixed inset-0 z-30 grid place-items-center bg-[#17363d]/40 p-4" role="presentation">
                <section className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl bg-white p-5 shadow-2xl" role="dialog" aria-modal="true" aria-labelledby="dashboard-customization-title">
                    <div className="mb-5 flex items-start justify-between gap-4">
                        <div>
                            <p className="mb-1 text-xs font-bold uppercase tracking-[0.12em] text-[#08766c]">Personalização</p>
                            <h2 className="m-0 flex items-center gap-2 text-xl font-extrabold" id="dashboard-customization-title"><LayoutDashboard size={20} /> Dashboard</h2>
                            <p className="mt-2 text-sm text-[#6c8187]">Escolha os widgets ativos para este workspace. A preferência é salva no Supabase.</p>
                        </div>
                        <button type="button" className="grid size-9 place-items-center rounded-lg border border-[#dce8e9] text-[#38515f]" aria-label="Fechar personalização" onClick={() => setCustomizationOpen(false)}>
                            <X size={18} />
                        </button>
                    </div>
                    <div className="grid gap-2">
                        {WIDGET_CATALOG.map(([id, label, description]) => (
                            <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-[#dce8e9] p-3" key={id}>
                                <input type="checkbox" checked={Boolean(widgetPrefs[id])} onChange={() => toggleWidget(id)} />
                                <span>
                                    <strong className="block text-sm text-[#17363d]">{label}</strong>
                                    <small className="mt-1 block text-xs text-[#6c8187]">{description}</small>
                                </span>
                            </label>
                        ))}
                    </div>
                    <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
                        <button type="button" className="text-xs font-bold text-[#08766c]" onClick={() => setWidgetPrefs(DEFAULT_WIDGETS)}>Restaurar padrão</button>
                        <div>
                            <button type="button" className="inline-flex min-h-10 items-center rounded-[10px] border border-[#dce8e9] bg-white px-3 text-xs font-bold text-[#38515f]" onClick={() => setCustomizationOpen(false)}>Cancelar</button>
                            <button type="button" className="inline-flex min-h-10 items-center gap-2 rounded-[10px] bg-[#08766c] px-3 text-xs font-bold text-white disabled:opacity-50" onClick={saveWidgetPreferences} disabled={savingWidgets}>
                                {savingWidgets ? <LoaderCircle size={15} className="animate-spin" /> : <CheckCircle2 size={15} />}
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

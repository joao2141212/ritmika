import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    AlertTriangle,
    Bell,
    CalendarDays,
    CheckCircle2,
    ChevronRight,
    Clock3,
    LoaderCircle,
    RefreshCw,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { dashboardService } from '../services/checklistProducaoService';
import '../styles/dashboard-remote.css';

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

const DashboardRemote = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [data, setData] = useState(EMPTY_DATA);
    const [activeTab, setActiveTab] = useState('todo');
    const [periodDays, setPeriodDays] = useState(30);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const loadDashboard = useCallback(async () => {
        try {
            setLoading(true);
            setError('');
            setData(await dashboardService.getData(periodDays));
        } catch (loadError) {
            setError(loadError instanceof Error ? loadError.message : 'Não foi possível carregar o dashboard.');
            toast.error('Não foi possível carregar o dashboard.');
        } finally {
            setLoading(false);
        }
    }, [periodDays]);

    useEffect(() => {
        loadDashboard();
    }, [loadDashboard]);

    const stats = data.stats || EMPTY_DATA.stats;
    const tasks = data.tasks || EMPTY_DATA.tasks;
    const rankings = data.rankings || EMPTY_DATA.rankings;
    const trend = data.trend || EMPTY_DATA.trend;
    const taskList = activeTab === 'upcoming' ? tasks.upcoming : tasks.late.concat(tasks.now);

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

    return (
        <div className="dashboard-remote ritmika-light-mode">
            <header className="remote-dashboard-header">
                <div>
                    <p className="remote-eyebrow">Painel do workspace</p>
                    <h1>Olá, {user?.name || 'gestor'}</h1>
                    <p className="remote-dashboard-subtitle">
                        A operação real do Ritmika, sincronizada com os dados do workspace.
                    </p>
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
                </div>
                <div className="remote-header-actions">
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
                        Atualizar
                    </button>
                    <button type="button" className="remote-refresh-button" onClick={exportDashboard} disabled={loading}>
                        Exportar
                    </button>
                </div>
            </header>

            <section className="remote-summary-grid" aria-label="Resumo operacional">
                <StatCard label="Agendados" value={stats.totalScheduled} helper="Execuções importadas" tone="primary" />
                <StatCard label="Pendentes" value={stats.pending} helper="Aguardando conclusão" tone="warning" />
                <StatCard label="Em andamento" value={stats.inProgress} helper="Execuções abertas" tone="info" />
                <StatCard label="Atrasados" value={stats.overdue} helper="Com prazo vencido" tone="danger" />
                <StatCard label="Finalizados" value={stats.completed} helper={stats.completionRate + '% de conclusão'} tone="success" />
            </section>

            <section className="remote-dashboard-panel">
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
                ) : taskList.length === 0 ? (
                    <div className="remote-state remote-state-empty">
                        <CheckCircle2 size={24} />
                        <span>{activeTab === 'upcoming' ? 'Nenhuma atividade futura encontrada.' : 'Nenhuma atividade pendente encontrada.'}</span>
                    </div>
                ) : (
                    <div className="remote-task-list">
                        {taskList.map((task) => (
                            <TaskCard
                                key={task.response_id + '-' + task.id}
                                task={task}
                                status={activeTab === 'upcoming' ? 'upcoming' : (tasks.late.some((lateTask) => lateTask.response_id === task.response_id) ? 'late' : 'now')}
                            />
                        ))}
                    </div>
                )}
            </section>

            <section className="remote-dashboard-panel remote-rankings-panel">
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
            </section>

            <section className="remote-dashboard-panel remote-trend-panel">
                <div className="remote-panel-heading">
                    <div>
                        <p className="remote-eyebrow">Evolução</p>
                        <h2>Indicadores por dia</h2>
                    </div>
                    <span className="remote-panel-caption">Score médio dos registros</span>
                </div>
                {trend.length === 0 ? (
                    <div className="remote-state remote-state-empty">Sem evolução registrada no período.</div>
                ) : (
                    <div className="remote-trend-list">
                        {trend.slice(-7).map((item) => (
                            <div className="remote-trend-row" key={item.date}>
                                <span>{new Date(`${item.date}T12:00:00`).toLocaleDateString('pt-BR')}</span>
                                <div className="remote-ranking-track" aria-hidden="true">
                                    <span style={{ width: `${item.score}%` }} />
                                </div>
                                <strong>{item.score}%</strong>
                                <small>{item.completed}/{item.total} concluídos</small>
                            </div>
                        ))}
                    </div>
                )}
            </section>

            <section className="remote-dashboard-footer-grid">
                <article className="remote-dashboard-panel compact">
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
                </article>
                <article className="remote-dashboard-panel compact">
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
                </article>
            </section>
        </div>
    );
};

export default DashboardRemote;

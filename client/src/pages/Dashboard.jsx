import { useEffect, useState } from 'react';
// JSX runtime usage is not recognized by the project's no-unused-vars rule.
// eslint-disable-next-line no-unused-vars
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { CheckCircle, Clock, AlertTriangle, Calendar, ChevronRight, Bell } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { storage, STORAGE_KEYS, simulateApiDelay, mockDashboardData } from '../data/mockData';
import '../styles/dashboard.css';

const TaskCard = ({ task, status }) => {
    const navigate = useNavigate();

    const getStatusColor = () => {
        if (status === 'late') return 'var(--danger)';
        if (status === 'now') return 'var(--success)';
        return 'var(--text-secondary)';
    };

    const getStatusBg = () => {
        if (status === 'late') return 'var(--danger-bg)';
        if (status === 'now') return 'var(--success-bg)';
        return 'transparent';
    };

    const handleExecute = () => {
        // Pass the full task object in state so Execution page can use it even if API fails
        navigate(`/checklists/${task.id}/execute`, { state: { checklistData: task } });
    };

    return (
        <motion.div
            className="task-card glass-panel"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            whileHover={{ scale: 1.02, y: -2, boxShadow: '0 10px 30px -10px rgba(0,0,0,0.5)' }}
            whileTap={{ scale: 0.98 }}
            onClick={handleExecute}
            style={{ borderLeft: `4px solid ${getStatusColor()}` }}
        >
            <div className="task-info">
                <h3>{task.title}</h3>
                <div className="task-meta">
                    <div className="status-badge" style={{ background: getStatusBg(), color: getStatusColor() }}>
                        <Clock size={14} />
                        <span>{status === 'late' ? `Atrasado: ${task.delay}` : status === 'now' ? `Vence em: ${task.dueIn}` : task.startTime}</span>
                    </div>
                </div>
            </div>
            <div className="action-icon">
                <ChevronRight size={20} color="var(--text-secondary)" />
            </div>
        </motion.div>
    );
};

const Dashboard = () => {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('todo'); // todo, upcoming, history
    const [tasks, setTasks] = useState({
        late: [],
        now: [],
        upcoming: []
    });

    useEffect(() => {
        // Carregar dados persistentes do dashboard
        const loadDashboardData = async () => {
            try {
                await simulateApiDelay(200);
                let dashboardData = storage.get(STORAGE_KEYS.dashboard, {});

                if (!dashboardData || !dashboardData.tasks) {
                    dashboardData = { ...mockDashboardData };
                    storage.set(STORAGE_KEYS.dashboard, dashboardData);
                }

                setTasks(dashboardData.tasks);
            } catch (error) {
                console.error('Erro ao carregar dashboard:', error);
                setTasks(mockDashboardData.tasks);
            }
        };
        loadDashboardData();
    }, []);

    return (
        <div className="dashboard-container">
            <header className="page-header">
                <div className="header-content">
                    <div className="user-welcome">
                        <h1>Olá, Pedro</h1>
                        <p>Você tem <span style={{ color: 'var(--danger)', fontWeight: 'bold' }}>2 tarefas atrasadas</span></p>
                    </div>
                    <div className="header-actions">
                        <button className="icon-btn" onClick={() => toast('Sem notificações novas')}>
                            <Bell size={24} />
                            <span className="badge">2</span>
                        </button>
                    </div>
                </div>

                <div className="tabs-container">
                    <button
                        className={`tab-btn ${activeTab === 'todo' ? 'active' : ''}`}
                        onClick={() => setActiveTab('todo')}
                    >
                        A Fazer
                    </button>
                    <button
                        className={`tab-btn ${activeTab === 'upcoming' ? 'active' : ''}`}
                        onClick={() => setActiveTab('upcoming')}
                    >
                        Próximos
                    </button>
                    <button
                        className={`tab-btn ${activeTab === 'history' ? 'active' : ''}`}
                        onClick={() => navigate('/checklists')} // Redirect to full history
                    >
                        Histórico
                    </button>
                </div>
            </header>

            <div className="tasks-container">
                {activeTab === 'todo' && (
                    <>
                        {tasks.late.length > 0 && (
                            <section className="task-section">
                                <h2 style={{ color: 'var(--danger)', display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <AlertTriangle size={18} /> Atrasados
                                </h2>
                                <div className="task-list">
                                    {tasks.late.map(task => (
                                        <TaskCard key={task.id} task={task} status="late" />
                                    ))}
                                </div>
                            </section>
                        )}

                        <section className="task-section">
                            <h2 style={{ color: 'var(--success)', display: 'flex', alignItems: 'center', gap: 8 }}>
                                <CheckCircle size={18} /> A Fazer Agora
                            </h2>
                            <div className="task-list">
                                {tasks.now.map(task => (
                                    <TaskCard key={task.id} task={task} status="now" />
                                ))}
                            </div>
                        </section>
                    </>
                )}

                {activeTab === 'upcoming' && (
                    <section className="task-section">
                        <h2 style={{ color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 8 }}>
                            <Calendar size={18} /> Próximos
                        </h2>
                        <div className="task-list">
                            {tasks.upcoming.map(task => (
                                <TaskCard key={task.id} task={task} status="upcoming" />
                            ))}
                        </div>
                    </section>
                )}
            </div>

            <button className="fab-btn" onClick={() => navigate('/checklists/new')}>
                + Novo Checklist
            </button>
        </div>
    );
};

export default Dashboard;

import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Activity, ChevronRight, KeyRound, LoaderCircle, RefreshCw, Search, ShieldCheck, Sparkles, UserCog, Users } from 'lucide-react';
import toast from 'react-hot-toast';
import { teamService } from '../services/checklistProducaoService';
import '../styles/team-remote.css';
import '../styles/team-hub.css';

const ROLE_LABELS = {
    owner: 'Proprietário',
    admin: 'Administrador',
    manager: 'Gestor',
    operator: 'Operador',
    employee: 'Colaborador',
    viewer: 'Leitura',
};

const safePercent = (value) => Math.max(0, Math.min(100, Number(value) || 0));

const TeamRemote = () => {
    const navigate = useNavigate();
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [query, setQuery] = useState('');
    const [role, setRole] = useState('all');

    const filteredUsers = useMemo(() => {
        const normalizedQuery = query.trim().toLocaleLowerCase();
        return users.filter((member) => {
            const memberRole = String(member.role || 'operator').toLocaleLowerCase();
            const searchable = [member.name, member.email, memberRole]
                .filter(Boolean)
                .join(' ')
                .toLocaleLowerCase();
            return (role === 'all' || memberRole === role)
                && (!normalizedQuery || searchable.includes(normalizedQuery));
        });
    }, [query, role, users]);

    const summary = useMemo(() => {
        const total = users.length;
        const accessEnabled = users.filter((member) => member.auth_user_id).length;
        const managers = users.filter((member) => member.is_owner || ['owner', 'admin', 'manager'].includes(String(member.role || '').toLocaleLowerCase())).length;
        const averageCompletion = total
            ? Math.round(users.reduce((sum, member) => sum + safePercent(member.completion_rate), 0) / total)
            : 0;
        return { total, accessEnabled, managers, averageCompletion };
    }, [users]);

    const loadTeam = async () => {
        try {
            setLoading(true);
            setError('');
            setUsers(await teamService.getAll());
        } catch (loadError) {
            setError(loadError instanceof Error ? loadError.message : 'Não foi possível carregar a equipe.');
            toast.error('Não foi possível carregar a equipe.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadTeam();
    }, []);

    return (
        <div className="team-remote team-hub ritmika-light-mode">
            <header className="team-hub-hero">
                <div>
                    <p className="remote-eyebrow">Pessoas e acessos</p>
                    <h1>Equipe</h1>
                    <p>Veja quem opera o workspace, acompanhe desempenho e abra a manutenção de acesso no mesmo fluxo.</p>
                </div>
                <div className="team-hub-actions">
                    <button type="button" className="team-hub-secondary" onClick={loadTeam} disabled={loading}>
                        <RefreshCw size={16} className={loading ? 'is-spinning' : ''} />
                        Atualizar
                    </button>
                    <button type="button" className="team-hub-primary" onClick={() => navigate('/configurations?tab=users')}>
                        <UserCog size={17} />
                        Gerenciar acessos
                    </button>
                </div>
            </header>

            <section className="team-hub-stats" aria-label="Resumo da equipe">
                <article><span className="team-stat-icon is-teal"><Users size={19} /></span><div><strong>{summary.total}</strong><span>perfis no workspace</span></div></article>
                <article><span className="team-stat-icon is-blue"><KeyRound size={19} /></span><div><strong>{summary.accessEnabled}</strong><span>com acesso ao app</span></div></article>
                <article><span className="team-stat-icon is-violet"><ShieldCheck size={19} /></span><div><strong>{summary.managers}</strong><span>gestores e admins</span></div></article>
                <article><span className="team-stat-icon is-amber"><Activity size={19} /></span><div><strong>{summary.averageCompletion}%</strong><span>conclusão média</span></div></article>
            </section>

            <section className="team-hub-panel">
                <div className="team-hub-toolbar">
                    <div>
                        <h2>Colaboradores</h2>
                        <p>{filteredUsers.length} de {users.length} perfis exibidos</p>
                    </div>
                    <div className="team-hub-filters">
                        <label className="team-hub-search">
                            <Search size={17} />
                            <span className="sr-only">Buscar colaborador</span>
                            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar por nome ou e-mail" />
                        </label>
                        <label className="team-hub-role-filter">
                            <span className="sr-only">Filtrar por papel</span>
                            <select value={role} onChange={(event) => setRole(event.target.value)}>
                                <option value="all">Todos os papéis</option>
                                <option value="admin">Administradores</option>
                                <option value="manager">Gestores</option>
                                <option value="operator">Operadores</option>
                                <option value="viewer">Leitura</option>
                            </select>
                        </label>
                    </div>
                </div>

                {loading ? (
                    <div className="team-remote-state"><LoaderCircle size={22} className="is-spinning" /> Carregando equipe…</div>
                ) : error ? (
                    <div className="team-remote-state team-remote-error"><span>{error}</span><button type="button" onClick={loadTeam}>Tentar novamente</button></div>
                ) : users.length === 0 ? (
                    <div className="team-hub-empty"><Users size={28} /><h3>Nenhum perfil encontrado</h3><p>Convide a primeira pessoa pela manutenção de usuários.</p><button type="button" onClick={() => navigate('/configurations?tab=users')}>Abrir usuários</button></div>
                ) : filteredUsers.length === 0 ? (
                    <div className="team-hub-empty"><Search size={27} /><h3>Nenhum resultado</h3><p>Remova os filtros ou tente outro termo.</p><button type="button" onClick={() => { setQuery(''); setRole('all'); }}>Limpar filtros</button></div>
                ) : (
                    <div className="team-hub-grid">
                        {filteredUsers.map((member, index) => {
                            const completion = safePercent(member.completion_rate);
                            const score = safePercent(member.average_score);
                            const roleKey = String(member.role || 'operator').toLocaleLowerCase();
                            return (
                                <article className="team-member-card" key={member.id}>
                                    <div className="team-member-topline">
                                        <div className="team-member-identity">
                                            <span className="team-member-avatar">{member.name?.charAt(0)?.toUpperCase() || '?'}</span>
                                            <div><strong>{member.name || 'Sem nome'}</strong><span>{member.email || 'Sem e-mail de acesso'}</span></div>
                                        </div>
                                        {index === 0 && member.completed_count > 0 ? <span className="team-highlight"><Sparkles size={13} /> Destaque</span> : null}
                                    </div>
                                    <div className="team-member-badges">
                                        <span className={`team-role-badge role-${roleKey}`}>{ROLE_LABELS[roleKey] || member.role || 'Operador'}</span>
                                        <span className={`team-access-badge ${member.auth_user_id ? 'is-enabled' : 'is-pending'}`}>{member.auth_user_id ? 'Acesso ativo' : 'Perfil sem login'}</span>
                                    </div>
                                    <div className="team-member-metrics">
                                        <div><span>Execuções</span><strong>{member.execution_count || 0}</strong><small>{member.completed_count || 0} concluídas</small></div>
                                        <div><span>Score médio</span><strong>{Math.round(score)}%</strong><small>qualidade operacional</small></div>
                                    </div>
                                    <div className="team-progress-block">
                                        <div><span>Taxa de conclusão</span><strong>{Math.round(completion)}%</strong></div>
                                        <span className="team-progress-track" role="progressbar" aria-label={`Conclusão de ${member.name || 'colaborador'}`} aria-valuemin="0" aria-valuemax="100" aria-valuenow={Math.round(completion)}><span style={{ width: `${completion}%` }} /></span>
                                    </div>
                                    <button type="button" className="team-member-manage" onClick={() => navigate(`/configurations?tab=users&user=${encodeURIComponent(member.id)}`)}>
                                        Revisar perfil e acesso <ChevronRight size={16} />
                                    </button>
                                </article>
                            );
                        })}
                    </div>
                )}
            </section>
        </div>
    );
};

export default TeamRemote;

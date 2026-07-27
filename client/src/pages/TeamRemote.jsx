import { useEffect, useState } from 'react';
import { LoaderCircle, RefreshCw, Star, Trophy, Users } from 'lucide-react';
import toast from 'react-hot-toast';
import { teamService } from '../services/checklistProducaoService';
import '../styles/team-remote.css';

const TeamRemote = () => {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

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
        <div className="team-remote ritmika-light-mode">
            <header className="team-remote-header">
                <div>
                    <p className="remote-eyebrow">Workspace remoto</p>
                    <h1>Equipe</h1>
                    <p>Perfis e desempenho calculados a partir das execuções importadas.</p>
                </div>
                <button type="button" className="team-remote-refresh" onClick={loadTeam} disabled={loading}>
                    <RefreshCw size={16} />
                    Atualizar
                </button>
            </header>

            <section className="team-remote-panel">
                {loading ? (
                    <div className="team-remote-state"><LoaderCircle size={22} className="is-spinning" /> Carregando equipe…</div>
                ) : error ? (
                    <div className="team-remote-state team-remote-error"><span>{error}</span><button type="button" onClick={loadTeam}>Tentar novamente</button></div>
                ) : users.length === 0 ? (
                    <div className="team-remote-state"><Users size={26} /> Nenhum perfil encontrado.</div>
                ) : (
                    <div className="team-remote-list">
                        <div className="team-remote-list-head">
                            <span>Posição</span>
                            <span>Colaborador</span>
                            <span>Execuções</span>
                            <span>Conclusão</span>
                        </div>
                        {users.map((user, index) => (
                            <article className="team-remote-row" key={user.id}>
                                <div className="team-rank">
                                    {index === 0 ? <Trophy size={20} /> : <span>#{index + 1}</span>}
                                </div>
                                <div className="team-person">
                                    <div className="team-avatar">{user.name?.charAt(0) || '?'}</div>
                                    <div>
                                        <strong>{user.name}</strong>
                                        <span>{user.role}{user.is_owner ? ' · proprietário' : ''}</span>
                                    </div>
                                </div>
                                <div className="team-metric">
                                    <strong>{user.execution_count}</strong>
                                    <span>{user.completed_count} concluídas</span>
                                </div>
                                <div className="team-metric team-completion">
                                    <strong>{user.completion_rate}%</strong>
                                    <span><Star size={13} fill="currentColor" /> Média {user.average_score}%</span>
                                </div>
                            </article>
                        ))}
                    </div>
                )}
            </section>
        </div>
    );
};

export default TeamRemote;

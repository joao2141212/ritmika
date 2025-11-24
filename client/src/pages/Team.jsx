import { useEffect, useState } from 'react';
import axios from 'axios';
import { Trophy, Medal, User, Star } from 'lucide-react';
import { storage, STORAGE_KEYS, simulateApiDelay } from '../data/mockData';
import '../styles/team.css'; // Will create next

const Team = () => {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchTeam = async () => {
            try {
                await simulateApiDelay(400);
                const teamData = storage.get(STORAGE_KEYS.team, []);
                setUsers(teamData || []);
            } catch (error) {
                console.error('Erro ao carregar equipe:', error);
                setUsers([]);
            } finally {
                setLoading(false);
            }
        };
        fetchTeam();
    }, []);

    const getRankIcon = (index) => {
        if (index === 0) return <Trophy color="#FFD700" size={24} />;
        if (index === 1) return <Medal color="#C0C0C0" size={24} />;
        if (index === 2) return <Medal color="#CD7F32" size={24} />;
        return <span className="rank-number">#{index + 1}</span>;
    };

    return (
        <div className="team-container">
            <header className="page-header">
                <h1>Ranking da Equipe</h1>
                <p>Reconhecimento e desempenho</p>
            </header>

            <div className="leaderboard glass-panel">
                <div className="leaderboard-header">
                    <span>Colocação</span>
                    <span>Colaborador</span>
                    <span>Pontos</span>
                </div>

                {users.map((user, index) => (
                    <div key={user.id} className={`leaderboard-row ${index === 0 ? 'winner' : ''}`}>
                        <div className="rank-col">
                            {getRankIcon(index)}
                        </div>
                        <div className="user-col">
                            <div className="avatar-circle">
                                {user.name.charAt(0)}
                            </div>
                            <div>
                                <div className="user-name">{user.name}</div>
                                <div className="user-role">{user.role}</div>
                            </div>
                        </div>
                        <div className="points-col">
                            <Star size={16} fill="var(--warning)" color="var(--warning)" />
                            {user.points}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default Team;

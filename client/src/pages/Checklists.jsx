import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, Play, Edit, Search, Clock, ListChecks } from 'lucide-react';
import { checklistProducaoService } from '../services/checklistProducaoService';
import '../styles/checklists.css';

const Checklists = () => {
    const navigate = useNavigate();
    const [checklists, setChecklists] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadChecklists = async () => {
            try {
                setLoading(true);
                const data = await checklistProducaoService.getAll();
                setChecklists(data || []);
            } catch (error) {
                console.error('Erro ao carregar checklists:', error);
                setChecklists([]);
            } finally {
                setLoading(false);
            }
        };
        loadChecklists();
    }, []);

    const filteredChecklists = checklists.filter(c =>
        c.nome.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (loading) {
        return (
            <div className="checklists-container">
                <div className="loading-state">Carregando checklists...</div>
            </div>
        );
    }

    return (
        <div className="checklists-container">
            <header className="checklists-header">
                <div className="header-title">
                    <h1>Checklists de Produção</h1>
                    <p>Gerencie inventários de Cozinha e Bebidas</p>
                </div>
                <div className="header-actions">
                    <div className="search-bar">
                        <Search size={18} className="search-icon" />
                        <input
                            type="text"
                            placeholder="Buscar checklist..."
                            className="search-input"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>
            </header>

            <div className="checklists-grid">
                {filteredChecklists.map((checklist, index) => (
                    <motion.div
                        key={checklist.id}
                        className="checklist-card glass-panel"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                        onClick={() => navigate(`/checklists/${checklist.id}/contagem`)}
                    >
                        <div className="card-content">
                            <h3>{checklist.nome}</h3>
                            <p className="checklist-type">{checklist.tipo === 'cozinha' ? '🍳 Cozinha' : '🍕 Bebidas'}</p>
                            <div className="card-meta">
                                <span className="meta-badge">
                                    <ListChecks size={14} /> {checklist.produtos_checklist?.length || 0} produtos
                                </span>
                                <span className="meta-badge">
                                    <Clock size={14} /> {checklist.frequencia}
                                </span>
                            </div>
                            {checklist.responsaveis && checklist.responsaveis.length > 0 && (
                                <div className="responsaveis">
                                    <small>Responsáveis: {checklist.responsaveis.join(', ')}</small>
                                </div>
                            )}
                        </div>

                        <div className="card-actions">
                            <Link
                                to={`/checklists/${checklist.id}/historico`}
                                className="action-btn"
                                onClick={(e) => e.stopPropagation()}
                            >
                                <Clock size={16} /> Histórico
                            </Link>
                            <Link
                                to={`/checklists/${checklist.id}/contagem`}
                                className="action-btn primary"
                                onClick={(e) => e.stopPropagation()}
                            >
                                <Play size={16} /> Fazer Contagem
                            </Link>
                        </div>
                    </motion.div>
                ))}
            </div>

            {filteredChecklists.length === 0 && (
                <div className="empty-state">
                    <p>Nenhum checklist encontrado.</p>
                </div>
            )}
        </div>
    );
};

export default Checklists;

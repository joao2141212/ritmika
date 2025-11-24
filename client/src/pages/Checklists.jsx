import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Plus, Play, Edit, Search, Clock, ListChecks } from 'lucide-react';
import { motion } from 'framer-motion';
import { checklistAPI, simulateApiDelay } from '../data/mockData';
import '../styles/checklists.css';

const Checklists = () => {
    const navigate = useNavigate();
    const [checklists, setChecklists] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        const loadChecklists = async () => {
            try {
                const data = await checklistAPI.getAll();
                setChecklists(data || []);
            } catch (error) {
                console.error('Erro ao carregar checklists:', error);
                setChecklists([]);
            }
        };
        loadChecklists();
    }, []);

    const filteredChecklists = checklists.filter(c =>
        c.title.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="checklists-container">
            <header className="checklists-header">
                <div className="header-title">
                    <h1>Biblioteca de Modelos</h1>
                    <p>Gerencie os padrões operacionais da sua empresa</p>
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
                    <Link to="/checklists/new" className="create-btn">
                        <Plus size={20} /> Novo Modelo
                    </Link>
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
                        onClick={() => navigate(`/checklists/${checklist.id}/execute`)}
                    >
                        <div className="card-content">
                            <h3>{checklist.title}</h3>
                            <p>{checklist.description || 'Sem descrição definida.'}</p>
                            <div className="card-meta">
                                <span className="meta-badge"><ListChecks size={14} /> {checklist.items?.length || 0} itens</span>
                                <span className="meta-badge"><Clock size={14} /> 15 min</span>
                            </div>
                        </div>

                        <div className="card-actions">
                            <button
                                className="action-btn"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    // Navigate to edit (not implemented yet, placeholder)
                                    alert('Editar modelo');
                                }}
                            >
                                <Edit size={16} /> Editar
                            </button>
                            <Link
                                to={`/checklists/${checklist.id}/execute`}
                                className="action-btn primary"
                                onClick={(e) => e.stopPropagation()}
                            >
                                <Play size={16} /> Executar
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

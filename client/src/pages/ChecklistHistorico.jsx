import { useEffect, useState } from 'react';
// JSX runtime usage is not recognized by the project's no-unused-vars rule.
// eslint-disable-next-line no-unused-vars
import { motion } from 'framer-motion';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Calendar, Filter, Download, ExternalLink, FileCheck2 } from 'lucide-react';
import { checklistProducaoService, contagemService, executionService } from '../services/checklistProducaoService';
import toast from 'react-hot-toast';
import '../styles/historico.css';

const ChecklistHistorico = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    
    const [checklist, setChecklist] = useState(null);
    const [contagens, setContagens] = useState([]);
    const [execucoes, setExecucoes] = useState([]);
    const [loading, setLoading] = useState(true);
    
    // Filters
    const [dataInicio, setDataInicio] = useState('');
    const [dataFim, setDataFim] = useState('');

    useEffect(() => {
        loadData();
    // The loader is intentionally tied to the route id and filter state.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id]);

    const loadData = async () => {
        try {
            setLoading(true);
            const checklistData = await checklistProducaoService.getById(id);
            setChecklist(checklistData);
            
            await Promise.all([loadContagens(), loadExecucoes()]);
        } catch (error) {
            console.error('Erro ao carregar dados:', error);
            toast.error('Erro ao carregar histórico');
        } finally {
            setLoading(false);
        }
    };

    const loadExecucoes = async () => {
        try {
            const data = await executionService.getByChecklist(id, {
                limit: 100,
                from: dataInicio || undefined,
                to: dataFim || undefined,
            });
            setExecucoes(data);
        } catch (error) {
            console.error('Erro ao carregar execuções:', error);
            toast.error('Erro ao carregar execuções');
        }
    };

    const loadContagens = async () => {
        try {
            const data = await contagemService.getByChecklist(id, dataInicio, dataFim);
            setContagens(data);
        } catch (error) {
            console.error('Erro ao carregar contagens:', error);
            toast.error('Erro ao carregar contagens');
        }
    };

    const handleFilter = () => {
        Promise.all([loadContagens(), loadExecucoes()]);
    };

    const exportToCSV = () => {
        if (contagens.length === 0) {
            toast.error('Nenhum dado para exportar');
            return;
        }

        const headers = ['Data', 'Dia', 'Turno', 'Produto', 'Categoria', 'Contagem', 'Pedido', 'Responsável', 'Observações'];
        const rows = contagens.map(c => [
            c.data_contagem,
            c.dia_semana,
            c.turno,
            c.produtos_checklist?.nome || '',
            c.produtos_checklist?.categoria || '',
            c.quantidade_contada,
            c.quantidade_pedida || '',
            c.retirado_por,
            c.observacoes || ''
        ]);

        const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `historico_${checklist?.nome}_${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        
        toast.success('Histórico exportado!');
    };

    if (loading) {
        return (
            <div className="historico-container">
                <div className="loading-state">Carregando histórico...</div>
            </div>
        );
    }

    if (!checklist) {
        return (
            <div className="historico-container">
                <div className="error-state">Checklist não encontrado</div>
            </div>
        );
    }

    // Group contagens by date and turno
    const contagensPorData = contagens.reduce((acc, contagem) => {
        const key = `${contagem.data_contagem}_${contagem.turno}`;
        if (!acc[key]) {
            acc[key] = {
                data: contagem.data_contagem,
                dia_semana: contagem.dia_semana,
                turno: contagem.turno,
                retirado_por: contagem.retirado_por,
                items: []
            };
        }
        acc[key].items.push(contagem);
        return acc;
    }, {});

    return (
        <div className="historico-container">
            <header className="historico-header">
                <button onClick={() => navigate('/checklists')} className="back-btn">
                    <ArrowLeft size={20} />
                </button>
                <div className="header-info">
                    <h1>Histórico: {checklist.nome}</h1>
                    <p>{contagens.length} registros encontrados</p>
                </div>
            </header>

            {/* Filtros */}
            <div className="filters-panel glass-panel">
                <div className="filters-row">
                    <div className="filter-field">
                        <label><Calendar size={16} /> Data Início</label>
                        <input
                            type="date"
                            value={dataInicio}
                            onChange={(e) => setDataInicio(e.target.value)}
                        />
                    </div>
                    <div className="filter-field">
                        <label><Calendar size={16} /> Data Fim</label>
                        <input
                            type="date"
                            value={dataFim}
                            onChange={(e) => setDataFim(e.target.value)}
                        />
                    </div>
                    <button onClick={handleFilter} className="filter-btn">
                        <Filter size={18} /> Filtrar
                    </button>
                    <button onClick={exportToCSV} className="export-btn">
                        <Download size={18} /> Exportar CSV
                    </button>
                </div>
            </div>

            <section className="execution-history-panel glass-panel">
                <div className="history-section-heading">
                    <div>
                        <h2><FileCheck2 size={18} /> Execuções do checklist</h2>
                        <p>{execucoes.length} execuções encontradas</p>
                    </div>
                </div>
                {execucoes.length === 0 ? (
                    <p className="history-empty-inline">Nenhuma execução registrada para este período.</p>
                ) : (
                    <div className="execution-history-list">
                        {execucoes.map((execucao) => (
                            <div className="execution-history-row" key={execucao.id}>
                                <div>
                                    <strong>{new Date(execucao.started_at || execucao.created_at).toLocaleString('pt-BR')}</strong>
                                    <span>{execucao.user_name || 'Usuário'} · {execucao.progress || 0}% preenchido</span>
                                </div>
                                <div className="execution-history-actions">
                                    <span className={'execution-status ' + (execucao.status === 'completed' ? 'completed' : 'in-progress')}>
                                        {execucao.status === 'completed' ? 'Concluída' : 'Em andamento'}
                                    </span>
                                    <button type="button" onClick={() => navigate('/checklists/' + id + '/details', { state: { executionId: execucao.id } })} aria-label="Abrir detalhes">
                                        <ExternalLink size={15} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </section>

            {/* Lista de contagens */}
            <div className="contagens-list">
                {Object.values(contagensPorData).map((grupo, index) => (
                    <motion.div
                        key={`${grupo.data}_${grupo.turno}`}
                        className="contagem-grupo glass-panel"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                    >
                        <div className="grupo-header">
                            <div className="grupo-info">
                                <h3>{new Date(grupo.data).toLocaleDateString('pt-BR')}</h3>
                                <div className="grupo-meta">
                                    <span className="badge">{grupo.dia_semana}</span>
                                    {grupo.turno !== 'unico' && (
                                        <span className="badge">{grupo.turno}</span>
                                    )}
                                    <span className="badge">👤 {grupo.retirado_por}</span>
                                </div>
                            </div>
                            <div className="grupo-stats">
                                <span>{grupo.items.length} produtos</span>
                            </div>
                        </div>

                        <div className="items-table">
                            <table>
                                <thead>
                                    <tr>
                                        <th>Produto</th>
                                        <th>Categoria</th>
                                        <th>Contagem</th>
                                        {checklist.tipo === 'bebidas' && <th>Pedido</th>}
                                        <th>Observações</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {grupo.items.map((item) => (
                                        <tr key={item.id}>
                                            <td>{item.produtos_checklist?.nome}</td>
                                            <td><span className="cat-badge">{item.produtos_checklist?.categoria}</span></td>
                                            <td className="qty">{item.quantidade_contada} {item.produtos_checklist?.unidade}</td>
                                            {checklist.tipo === 'bebidas' && (
                                                <td className="qty">{item.quantidade_pedida || '-'}</td>
                                            )}
                                            <td className="obs">{item.observacoes || '-'}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </motion.div>
                ))}
            </div>

            {contagens.length === 0 && (
                <div className="empty-state glass-panel">
                    <p>Nenhuma contagem registrada ainda.</p>
                </div>
            )}
        </div>
    );
};

export default ChecklistHistorico;

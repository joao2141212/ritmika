import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, Calendar, User, Clock } from 'lucide-react';
import { checklistProducaoService, contagemService, getDiaSemana, formatDate } from '../services/checklistProducaoService';
import { useAuth } from '../context/AuthContext';
import { logger } from '../lib/logger';
import toast from 'react-hot-toast';
import '../styles/contagem.css';

const ChecklistContagem = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    
    const [checklist, setChecklist] = useState(null);
    const [produtos, setProdutos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    
    // Form state
    const [dataContagem, setDataContagem] = useState(formatDate(new Date()));
    const [turno, setTurno] = useState('dia');
    const [retiradoPor, setRetiradoPor] = useState(user?.name || '');
    const [contagens, setContagens] = useState({});

    useEffect(() => {
        loadChecklist();
    // The loader is intentionally tied to the route id and kept local to this page.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id]);

    const loadChecklist = async () => {
        try {
            setLoading(true);
            const data = await checklistProducaoService.getById(id);
            setChecklist(data);
            
            const produtosData = await checklistProducaoService.getProdutos(id);
            setProdutos(produtosData);
            
            // Initialize contagens object
            const initialContagens = {};
            produtosData.forEach(p => {
                initialContagens[p.id] = {
                    quantidade_contada: '',
                    quantidade_pedida: '',
                    observacoes: ''
                };
            });
            setContagens(initialContagens);
        } catch (error) {
            logger.error({
                file: 'client/src/pages/ChecklistContagem.jsx',
                function: 'ChecklistContagem.loadChecklist',
                operation: 'checklist_count.load',
                errorCode: 'CHECKLIST_COUNT_LOAD_FAILED',
                checklistId: id,
                error,
            });
            toast.error('Erro ao carregar checklist');
        } finally {
            setLoading(false);
        }
    };

    const handleContagemChange = (produtoId, field, value) => {
        setContagens(prev => ({
            ...prev,
            [produtoId]: {
                ...prev[produtoId],
                [field]: value
            }
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!retiradoPor.trim()) {
            toast.error('Informe quem está fazendo a contagem');
            return;
        }

        try {
            setSaving(true);
            
            const contagensArray = produtos
                .filter(p => contagens[p.id]?.quantidade_contada !== '')
                .map(p => ({
                    produto_id: p.id,
                    checklist_id: id,
                    user_id: user.id,
                    data_contagem: dataContagem,
                    dia_semana: getDiaSemana(dataContagem),
                    turno: checklist.turno_ativado ? turno : 'unico',
                    quantidade_contada: parseFloat(contagens[p.id].quantidade_contada) || 0,
                    quantidade_pedida: parseFloat(contagens[p.id].quantidade_pedida) || 0,
                    retirado_por: retiradoPor,
                    observacoes: contagens[p.id].observacoes || '',
                    status: 'completo'
                }));

            if (contagensArray.length === 0) {
                toast.error('Preencha pelo menos um produto');
                return;
            }

            await contagemService.createBatch(contagensArray);
            
            toast.success(`Contagem salva! ${contagensArray.length} produtos registrados`);
            navigate('/checklists');
        } catch (error) {
            logger.error({
                file: 'client/src/pages/ChecklistContagem.jsx',
                function: 'ChecklistContagem.handleSubmit',
                operation: 'checklist_count.save',
                errorCode: 'CHECKLIST_COUNT_SAVE_FAILED',
                checklistId: id,
                userId: user?.id,
                error,
            });
            toast.error('Erro ao salvar contagem');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="contagem-container">
                <div className="loading-state">Carregando...</div>
            </div>
        );
    }

    if (!checklist) {
        return (
            <div className="contagem-container">
                <div className="error-state">Checklist não encontrado</div>
            </div>
        );
    }

    // Group produtos by category
    const produtosPorCategoria = produtos.reduce((acc, produto) => {
        const cat = produto.categoria || 'Sem Categoria';
        if (!acc[cat]) acc[cat] = [];
        acc[cat].push(produto);
        return acc;
    }, {});

    return (
        <div className="contagem-container">
            <header className="contagem-header">
                <button onClick={() => navigate('/checklists')} className="back-btn">
                    <ArrowLeft size={20} />
                </button>
                <div className="header-info">
                    <h1>{checklist.nome}</h1>
                    <p>{checklist.tipo === 'cozinha' ? '🍳 Cozinha' : '🍕 Bebidas'} • {produtos.length} produtos</p>
                </div>
            </header>

            <form onSubmit={handleSubmit} className="contagem-form">
                {/* Campos de cabeçalho */}
                <div className="form-header glass-panel">
                    <div className="form-row">
                        <div className="form-field">
                            <label><Calendar size={16} /> Data</label>
                            <input
                                type="date"
                                value={dataContagem}
                                onChange={(e) => setDataContagem(e.target.value)}
                                required
                            />
                            <small>{getDiaSemana(dataContagem)}</small>
                        </div>

                        {checklist.turno_ativado && (
                            <div className="form-field">
                                <label><Clock size={16} /> Turno</label>
                                <select value={turno} onChange={(e) => setTurno(e.target.value)} required>
                                    <option value="dia">Dia</option>
                                    <option value="noite">Noite</option>
                                </select>
                            </div>
                        )}

                        <div className="form-field">
                            <label><User size={16} /> Responsável</label>
                            <input
                                type="text"
                                value={retiradoPor}
                                onChange={(e) => setRetiradoPor(e.target.value)}
                                placeholder="Nome do responsável"
                                required
                            />
                        </div>
                    </div>
                </div>

                {/* Lista de produtos por categoria */}
                <div className="produtos-list">
                    {Object.entries(produtosPorCategoria).map(([categoria, prods]) => (
                        <div key={categoria} className="categoria-section glass-panel">
                            <h3 className="categoria-title">{categoria}</h3>
                            <div className="produtos-grid">
                                {prods.map((produto) => (
                                    <div key={produto.id} className="produto-item">
                                        <div className="produto-info">
                                            <h4>{produto.nome}</h4>
                                            <div className="produto-meta">
                                                <span className="badge">Min: {produto.quantidade_minima}</span>
                                                <span className="badge">{produto.unidade}</span>
                                                {produto.fornecedor && (
                                                    <span className="badge">{produto.fornecedor}</span>
                                                )}
                                            </div>
                                        </div>

                                        <div className="produto-inputs">
                                            <div className="input-group">
                                                <label>Contagem</label>
                                                <input
                                                    type="number"
                                                    step="0.01"
                                                    value={contagens[produto.id]?.quantidade_contada || ''}
                                                    onChange={(e) => handleContagemChange(produto.id, 'quantidade_contada', e.target.value)}
                                                    placeholder="0"
                                                />
                                            </div>

                                            {checklist.tipo === 'bebidas' && (
                                                <div className="input-group">
                                                    <label>Pedido</label>
                                                    <input
                                                        type="number"
                                                        step="0.01"
                                                        value={contagens[produto.id]?.quantidade_pedida || ''}
                                                        onChange={(e) => handleContagemChange(produto.id, 'quantidade_pedida', e.target.value)}
                                                        placeholder="0"
                                                    />
                                                </div>
                                            )}

                                            <div className="input-group full-width">
                                                <label>Observações</label>
                                                <input
                                                    type="text"
                                                    value={contagens[produto.id]?.observacoes || ''}
                                                    onChange={(e) => handleContagemChange(produto.id, 'observacoes', e.target.value)}
                                                    placeholder="Opcional"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>

                {/* Botão de salvar */}
                <div className="form-footer">
                    <button type="submit" className="save-btn" disabled={saving}>
                        <Save size={20} />
                        {saving ? 'Salvando...' : 'Salvar Contagem'}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default ChecklistContagem;

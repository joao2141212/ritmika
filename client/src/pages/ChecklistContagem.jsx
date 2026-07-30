import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, Calendar, User, Clock } from 'lucide-react';
import { checklistProducaoService, contagemService, getDiaSemana, formatDate } from '../services/checklistProducaoService';
import { useAuth } from '../context/AuthContext';
import { logger } from '../lib/logger';
import toast from 'react-hot-toast';

const ChecklistContagem = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    
    const [checklist, setChecklist] = useState(null);
    const [produtos, setProdutos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState('');
    const [saving, setSaving] = useState(false);
    
    // Form state
    const [dataContagem, setDataContagem] = useState(formatDate(new Date()));
    const [turno, setTurno] = useState('dia');
    const [retiradoPor, setRetiradoPor] = useState(user?.name || '');
    const [contagens, setContagens] = useState({});

    async function loadChecklist() {
        try {
            setLoading(true);
            setLoadError('');
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
            setLoadError('Não foi possível carregar este checklist. Tente novamente.');
            toast.error('Erro ao carregar checklist');
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        // The loader owns async state synchronization for this route.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        loadChecklist();
    // The loader is intentionally tied to the route id and kept local to this page.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id]);

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

        if (!user?.id) {
            toast.error('Sua sessão expirou. Entre novamente para salvar a contagem.');
            return;
        }
        
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
            <div className="mx-auto max-w-[1400px] p-4 md:p-8">
                <div className="flex min-h-[400px] items-center justify-center text-xl text-operation-muted">Carregando...</div>
            </div>
        );
    }

    if (loadError) {
        return (
            <div className="mx-auto max-w-[1400px] p-4 md:p-8">
                <div className="flex min-h-[400px] flex-col items-center justify-center gap-4 text-center text-operation-muted" role="alert">
                    <p className="text-xl">{loadError}</p>
                    <button type="button" className="rounded-xl bg-operation-ink px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-operation-mint-dark" onClick={loadChecklist}>Tentar novamente</button>
                </div>
            </div>
        );
    }

    if (!checklist) {
        return (
            <div className="mx-auto max-w-[1400px] p-4 md:p-8">
                <div className="flex min-h-[400px] items-center justify-center text-xl text-operation-muted">Checklist não encontrado</div>
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
        <div className="mx-auto max-w-[1400px] p-4 md:p-8">
            <header className="mb-8 flex items-center gap-4">
                <button aria-label="Voltar para checklists" onClick={() => navigate('/checklists')} className="cursor-pointer rounded-xl border border-operation-line bg-white p-3 text-operation-ink transition-all duration-300 hover:-translate-x-1 hover:bg-operation-mint-dark hover:text-white">
                    <ArrowLeft size={20} />
                </button>
                <div>
                    <h1 className="m-0 text-[1.8rem] text-operation-ink">{checklist.nome}</h1>
                    <p className="mt-1 text-operation-muted">{checklist.tipo === 'cozinha' ? '🍳 Cozinha' : '🍕 Bebidas'} • {produtos.length} produtos</p>
                </div>
            </header>

            <form onSubmit={handleSubmit} className="flex flex-col gap-8">
                {/* Campos de cabeçalho */}
                <div className="rounded-2xl bg-white p-6 shadow-[0_16px_40px_rgba(23,49,58,0.07)]">
                    <div className="grid gap-6 md:grid-cols-[repeat(auto-fit,minmax(200px,1fr))]">
                        <div className="flex flex-col gap-2">
                            <label className="flex items-center gap-2 text-sm font-semibold text-operation-ink"><Calendar size={16} /> Data</label>
                            <input
                                className="rounded-lg border border-operation-line bg-white/5 p-3 text-base text-operation-ink outline-none focus:border-operation-mint focus:bg-white/10"
                                type="date"
                                value={dataContagem}
                                onChange={(e) => setDataContagem(e.target.value)}
                                required
                            />
                            <small className="text-sm text-operation-muted">{getDiaSemana(dataContagem)}</small>
                        </div>

                        {checklist.turno_ativado && (
                            <div className="flex flex-col gap-2">
                                <label className="flex items-center gap-2 text-sm font-semibold text-operation-ink"><Clock size={16} /> Turno</label>
                                <select className="rounded-lg border border-operation-line bg-white/5 p-3 text-base text-operation-ink outline-none focus:border-operation-mint focus:bg-white/10" value={turno} onChange={(e) => setTurno(e.target.value)} required>
                                    <option value="dia">Dia</option>
                                    <option value="noite">Noite</option>
                                </select>
                            </div>
                        )}

                        <div className="flex flex-col gap-2">
                            <label className="flex items-center gap-2 text-sm font-semibold text-operation-ink"><User size={16} /> Responsável</label>
                            <input
                                className="rounded-lg border border-operation-line bg-white/5 p-3 text-base text-operation-ink outline-none focus:border-operation-mint focus:bg-white/10"
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
                <div className="flex flex-col gap-8">
                    {Object.entries(produtosPorCategoria).map(([categoria, prods]) => (
                        <div key={categoria} className="rounded-2xl bg-white p-6 shadow-[0_16px_40px_rgba(23,49,58,0.07)]">
                            <h3 className="m-0 mb-6 border-b-2 border-operation-line pb-3 text-[1.3rem] text-operation-mint-dark">{categoria}</h3>
                            <div className="grid gap-6">
                                {prods.map((produto) => (
                                    <div key={produto.id} className="rounded-xl border border-operation-line bg-white/[0.03] p-5 transition-all duration-300 hover:-translate-y-0.5 hover:border-operation-mint hover:bg-white/[0.05]">
                                        <div className="mb-4">
                                            <h4 className="m-0 mb-2 text-[1.1rem] text-operation-ink">{produto.nome}</h4>
                                            <div className="flex flex-wrap gap-2">
                                                <span className="rounded-md bg-operation-soft px-3 py-1 text-xs font-medium text-operation-mint-dark">Min: {produto.quantidade_minima}</span>
                                                <span className="rounded-md bg-operation-soft px-3 py-1 text-xs font-medium text-operation-mint-dark">{produto.unidade}</span>
                                                {produto.fornecedor && (
                                                    <span className="rounded-md bg-operation-soft px-3 py-1 text-xs font-medium text-operation-mint-dark">{produto.fornecedor}</span>
                                                )}
                                            </div>
                                        </div>

                                        <div className="grid gap-4 md:grid-cols-[repeat(auto-fit,minmax(150px,1fr))]">
                                            <div className="flex flex-col gap-1.5">
                                                <label className="text-sm font-semibold text-operation-muted">Contagem</label>
                                                <input
                                                    className="rounded-lg border border-operation-line bg-white/5 p-[0.65rem] text-[0.95rem] text-operation-ink outline-none focus:border-operation-mint focus:bg-white/[0.08]"
                                                    type="number"
                                                    step="0.01"
                                                    value={contagens[produto.id]?.quantidade_contada || ''}
                                                    onChange={(e) => handleContagemChange(produto.id, 'quantidade_contada', e.target.value)}
                                                    placeholder="0"
                                                />
                                            </div>

                                            {checklist.tipo === 'bebidas' && (
                                                <div className="flex flex-col gap-1.5">
                                                        <label className="text-sm font-semibold text-operation-muted">Pedido</label>
                                                    <input
                                                        className="rounded-lg border border-operation-line bg-white/5 p-[0.65rem] text-[0.95rem] text-operation-ink outline-none focus:border-operation-mint focus:bg-white/[0.08]"
                                                        type="number"
                                                        step="0.01"
                                                        value={contagens[produto.id]?.quantidade_pedida || ''}
                                                        onChange={(e) => handleContagemChange(produto.id, 'quantidade_pedida', e.target.value)}
                                                        placeholder="0"
                                                    />
                                                </div>
                                            )}

                                            <div className="col-span-full flex flex-col gap-1.5">
                                                <label className="text-sm font-semibold text-operation-muted">Observações</label>
                                                <input
                                                    className="rounded-lg border border-operation-line bg-white/5 p-[0.65rem] text-[0.95rem] text-operation-ink outline-none focus:border-operation-mint focus:bg-white/[0.08]"
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
                <div className="sticky bottom-8 flex justify-center py-4">
                    <button type="submit" className="flex items-center justify-center gap-3 rounded-xl border-0 bg-gradient-to-br from-operation-mint-dark to-operation-coral px-12 py-4 text-[1.1rem] font-semibold text-white shadow-[0_4px_20px_rgba(23,49,58,0.3)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_6px_30px_rgba(23,49,58,0.4)] disabled:cursor-not-allowed disabled:opacity-60 max-md:w-full" disabled={saving}>
                        <Save size={20} />
                        {saving ? 'Salvando...' : 'Salvar Contagem'}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default ChecklistContagem;

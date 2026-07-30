import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, Play, Edit, Search, Clock, ListChecks } from 'lucide-react';
import { checklistProducaoService } from '../services/checklistProducaoService';
import { logger } from '../lib/logger';

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
                logger.error({
                    file: 'client/src/pages/Checklists.jsx',
                    function: 'Checklists.loadChecklists',
                    operation: 'checklists.list',
                    errorCode: 'CHECKLISTS_LIST_FAILED',
                    error,
                });
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
            <div className="mx-auto min-h-screen max-w-7xl bg-[#f6fafb] px-4 py-8 text-operation-ink sm:px-6 lg:px-8">
                <div className="flex min-h-[400px] items-center justify-center text-lg text-operation-muted">Carregando checklists...</div>
            </div>
        );
    }

    return (
        <div className="mx-auto min-h-screen max-w-7xl bg-[#f6fafb] px-4 py-8 text-operation-ink sm:px-6 lg:px-8">
            <header className="mb-8 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
                <div>
                    <h1 className="text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">Checklists de Produção</h1>
                    <p className="mt-2 text-sm text-operation-muted">Gerencie inventários de Cozinha e Bebidas</p>
                </div>
                <div className="w-full md:max-w-sm">
                    <div className="flex items-center gap-3 rounded-xl border border-operation-line bg-white px-4 py-3 shadow-[0_8px_24px_rgba(23,49,58,0.05)] focus-within:border-operation-mint focus-within:ring-4 focus-within:ring-operation-mint/15">
                        <Search size={18} className="shrink-0 text-operation-muted" />
                        <input
                            type="text"
                            placeholder="Buscar checklist..."
                            className="min-w-0 flex-1 border-0 bg-transparent text-sm text-operation-ink outline-none placeholder:text-operation-muted/70"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>
            </header>

            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                {filteredChecklists.map((checklist, index) => (
                    <motion.div
                        key={checklist.id}
                        className="group flex cursor-pointer flex-col justify-between rounded-2xl border border-operation-line bg-white p-6 shadow-[0_12px_30px_rgba(23,49,58,0.06)] transition-all duration-300 hover:-translate-y-1 hover:border-operation-mint hover:shadow-[0_18px_40px_rgba(23,49,58,0.1)]"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                        onClick={() => navigate(`/checklists/${checklist.id}/contagem`)}
                    >
                        <div>
                            <h3 className="text-xl font-semibold tracking-[-0.025em]">{checklist.nome}</h3>
                            <p className="mt-2 text-sm text-operation-muted">{checklist.tipo === 'cozinha' ? '🍳 Cozinha' : '🍕 Bebidas'}</p>
                            <div className="mt-5 flex flex-wrap gap-2">
                                <span className="inline-flex items-center gap-1.5 rounded-full bg-operation-soft px-3 py-1.5 text-xs font-semibold text-operation-mint-dark">
                                    <ListChecks size={14} /> {checklist.produtos_checklist?.length || 0} produtos
                                </span>
                                <span className="inline-flex items-center gap-1.5 rounded-full bg-operation-soft px-3 py-1.5 text-xs font-semibold text-operation-mint-dark">
                                    <Clock size={14} /> {checklist.frequencia}
                                </span>
                            </div>
                            {checklist.responsaveis && checklist.responsaveis.length > 0 && (
                                <div className="mt-5 border-t border-operation-line pt-4">
                                    <small className="text-xs leading-5 text-operation-muted">Responsáveis: {checklist.responsaveis.join(', ')}</small>
                                </div>
                            )}
                        </div>

                        <div className="mt-7 flex flex-wrap gap-2 border-t border-operation-line pt-4">
                            <Link
                                to={`/checklists/${checklist.id}/historico`}
                                className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-operation-line px-3 py-2 text-xs font-semibold text-operation-ink transition-colors hover:border-operation-mint hover:bg-operation-soft"
                                onClick={(e) => e.stopPropagation()}
                            >
                                <Clock size={16} /> Histórico
                            </Link>
                            <Link
                                to={`/checklists/${checklist.id}/contagem`}
                                className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-operation-ink px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-operation-mint-dark"
                                onClick={(e) => e.stopPropagation()}
                            >
                                <Play size={16} /> Fazer Contagem
                            </Link>
                        </div>
                    </motion.div>
                ))}
            </div>

            {filteredChecklists.length === 0 && (
                <div className="rounded-2xl border border-dashed border-operation-line bg-white/70 px-6 py-16 text-center text-sm text-operation-muted">
                    <p>Nenhum checklist encontrado.</p>
                </div>
            )}
        </div>
    );
};

export default Checklists;

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    CalendarDays,
    CheckCircle2,
    ClipboardCheck,
    Eye,
    EyeOff,
    ListChecks,
    Pencil,
    Play,
    Plus,
    Search,
    UsersRound,
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { checklistProducaoService } from '../services/checklistProducaoService';
import { logger } from '../lib/logger';
import '../styles/checklist-workspace.css';

const isPublished = (checklist) => ['ativo', 'active'].includes(checklist?.status);

const titleOf = (checklist) => checklist?.title || checklist?.nome || 'Checklist sem título';

const itemsOf = (checklist) => {
    if (Array.isArray(checklist?.items) && checklist.items.length > 0) return checklist.items;
    return Array.isArray(checklist?.produtos_checklist) ? checklist.produtos_checklist : [];
};

const scheduleOf = (checklist) => {
    const schedule = checklist?.schedule || {};
    const mode = checklist?.schedule_recurrence_type || schedule.mode || checklist?.frequencia;
    const time = checklist?.schedule_time || schedule.time;
    if (!mode || mode === 'manual') return 'Execução pontual';
    return `${mode}${time ? ` · ${String(time).slice(0, 5)}` : ''}`;
};

const ChecklistWorkspace = () => {
    const navigate = useNavigate();
    const [checklists, setChecklists] = useState([]);
    const [query, setQuery] = useState('');
    const [filter, setFilter] = useState('all');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [busyId, setBusyId] = useState(null);

    const loadChecklists = useCallback(async () => {
        try {
            setLoading(true);
            setError('');
            const data = await checklistProducaoService.getManagerList();
            setChecklists(Array.isArray(data) ? data : []);
        } catch (loadError) {
            logger.error({
                fn: 'ChecklistWorkspace.loadChecklists',
                status: 'error',
                error: loadError instanceof Error ? loadError.message : String(loadError),
            });
            setError('Não foi possível carregar os checklists locais.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadChecklists();
    }, [loadChecklists]);

    const filteredChecklists = useMemo(() => {
        const normalizedQuery = query.trim().toLocaleLowerCase();
        return checklists.filter((checklist) => {
            const matchesFilter = filter === 'all'
                || (filter === 'published' && isPublished(checklist))
                || (filter === 'draft' && !isPublished(checklist));
            const searchable = [
                titleOf(checklist),
                checklist.description,
                checklist.descricao,
                checklist.tipo,
            ].filter(Boolean).join(' ').toLocaleLowerCase();
            return matchesFilter && (!normalizedQuery || searchable.includes(normalizedQuery));
        });
    }, [checklists, filter, query]);

    const publishedCount = checklists.filter(isPublished).length;
    const draftCount = checklists.length - publishedCount;
    const itemCount = checklists.reduce((total, checklist) => total + itemsOf(checklist).length, 0);

    const togglePublication = async (checklist) => {
        const nextStatus = isPublished(checklist) ? 'inativo' : 'ativo';
        try {
            setBusyId(checklist.id);
            await checklistProducaoService.publish(checklist.id, nextStatus);
            toast.success(nextStatus === 'ativo' ? 'Checklist publicado.' : 'Checklist movido para rascunho.');
            await loadChecklists();
        } catch (publishError) {
            logger.error({
                fn: 'ChecklistWorkspace.togglePublication',
                status: 'error',
                checklistId: checklist.id,
                error: publishError instanceof Error ? publishError.message : String(publishError),
            });
            toast.error('Não foi possível atualizar o status.');
        } finally {
            setBusyId(null);
        }
    };

    return (
        <section className="ritmika-light-mode">
            <header className="checklist-topbar">
                <div>
                    <p className="checklist-eyebrow">Operação · Checklists</p>
                    <h1>Modelos de checklist</h1>
                    <p className="checklist-subtitle">
                        Crie, publique, atribua e acompanhe execuções no workspace remoto.
                    </p>
                </div>
                <button
                    type="button"
                    className="light-button primary"
                    onClick={() => navigate('/checklists/new')}
                >
                    <Plus size={17} />
                    Novo checklist
                </button>
            </header>

            <div className="checklist-toolbar">
                <div className="checklist-filters" aria-label="Filtro de status">
                    {[
                        ['all', 'Todos'],
                        ['published', 'Publicados'],
                        ['draft', 'Rascunhos'],
                    ].map(([value, label]) => (
                        <button
                            key={value}
                            type="button"
                            className={`filter-chip ${filter === value ? 'active' : ''}`}
                            onClick={() => setFilter(value)}
                        >
                            {label}
                        </button>
                    ))}
                </div>
                <label className="search-field">
                    <Search size={17} aria-hidden="true" />
                    <input
                        value={query}
                        onChange={(event) => setQuery(event.target.value)}
                        placeholder="Buscar checklist"
                        aria-label="Buscar checklist"
                    />
                </label>
            </div>

            <div className="manager-stats" aria-label="Resumo de checklists">
                <div className="manager-stat"><span>Total</span><strong>{checklists.length}</strong></div>
                <div className="manager-stat"><span>Publicados</span><strong>{publishedCount}</strong></div>
                <div className="manager-stat"><span>Rascunhos</span><strong>{draftCount}</strong></div>
                <div className="manager-stat"><span>Itens modelados</span><strong>{itemCount}</strong></div>
            </div>

            {loading && <div className="empty-state">Carregando modelos locais…</div>}
            {!loading && error && (
                <div className="error-state">
                    <p>{error}</p>
                    <button type="button" className="light-button secondary" onClick={loadChecklists}>Tentar novamente</button>
                </div>
            )}
            {!loading && !error && filteredChecklists.length === 0 && (
                <div className="empty-state">
                    <ClipboardCheck size={30} aria-hidden="true" />
                    <p>Nenhum checklist corresponde ao filtro atual.</p>
                </div>
            )}

            {!loading && !error && filteredChecklists.length > 0 && (
                <div className="checklist-card-grid">
                    {filteredChecklists.map((checklist) => {
                        const published = isPublished(checklist);
                        const items = itemsOf(checklist);
                        return (
                            <article className="checklist-card" key={checklist.id}>
                                <div className="checklist-card-head">
                                    <div>
                                        <p className="checklist-eyebrow">{checklist.tipo || 'Operacional'}</p>
                                        <h2>{titleOf(checklist)}</h2>
                                    </div>
                                    <span className={`status-pill ${published ? 'active' : 'inactive'}`}>
                                        {published ? <CheckCircle2 size={13} /> : <EyeOff size={13} />}
                                        {published ? 'Publicado' : 'Rascunho'}
                                    </span>
                                </div>
                                <p>{checklist.description || checklist.descricao || 'Sem descrição cadastrada.'}</p>
                                <div className="checklist-card-meta">
                                    <span><ListChecks size={14} /> {items.length} itens</span>
                                    <span><CalendarDays size={14} /> {scheduleOf(checklist)}</span>
                                    <span><UsersRound size={14} /> {(checklist.responsaveis || []).length || 1} responsável(is)</span>
                                </div>
                                <div className="checklist-card-actions">
                                    <button
                                        type="button"
                                        className="light-button primary"
                                        onClick={() => navigate(`/checklists/${encodeURIComponent(checklist.id)}/execute`)}
                                    >
                                        <Play size={15} /> Executar
                                    </button>
                                    <button
                                        type="button"
                                        className="light-button secondary"
                                        onClick={() => navigate(`/checklists/${encodeURIComponent(checklist.id)}/edit`)}
                                    >
                                        <Pencil size={15} /> Editar
                                    </button>
                                    <button
                                        type="button"
                                        className="light-button ghost"
                                        disabled={busyId === checklist.id}
                                        onClick={() => togglePublication(checklist)}
                                    >
                                        {published ? <EyeOff size={15} /> : <Eye size={15} />}
                                        {published ? 'Despublicar' : 'Publicar'}
                                    </button>
                                </div>
                            </article>
                        );
                    })}
                </div>
            )}
        </section>
    );
};

export default ChecklistWorkspace;

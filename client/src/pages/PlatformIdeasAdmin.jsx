import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Building2, Check, Inbox, LoaderCircle, RefreshCw, Search, ShieldCheck, ThumbsUp } from 'lucide-react';
import toast from 'react-hot-toast';
import { parityService } from '../services/checklistProducaoService';
import { usePlatformAdmin } from '../hooks/usePlatformAdmin';
import { normalizeSearchText } from '../lib/plainText';
import { logger } from '../lib/logger';
import '../styles/platform-ideas-admin.css';

const STATUS_OPTIONS = [
    ['', 'Todos'],
    ['open', 'Aberta'],
    ['in_progress', 'Em andamento'],
    ['planned', 'Planejada'],
    ['closed', 'Concluída'],
    ['declined', 'Não seguirá'],
];

const PRIORITY_OPTIONS = [
    ['', 'Todas'],
    ['critical', 'Crítica'],
    ['high', 'Alta'],
    ['medium', 'Média'],
    ['low', 'Baixa'],
    ['none', 'Sem prioridade'],
];

const statusLabel = Object.fromEntries(STATUS_OPTIONS);
const priorityLabel = Object.fromEntries(PRIORITY_OPTIONS);

const formatDate = (value) => value
    ? new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value))
    : 'Sem data';

const PlatformIdeasAdmin = () => {
    const { isPlatformAdmin, loadingPlatformAccess } = usePlatformAdmin();
    const [ideas, setIdeas] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [filters, setFilters] = useState({ status: '', priority: '', workspaceId: '', search: '' });
    const [draftSearch, setDraftSearch] = useState('');
    const [selectedId, setSelectedId] = useState('');
    const [editing, setEditing] = useState({ status: 'open', priority: 'none', adminNote: '' });
    const [saving, setSaving] = useState(false);

    const loadIdeas = useCallback(async () => {
        if (!isPlatformAdmin) return;
        try {
            setLoading(true);
            setError('');
            const result = await parityService.getPlatformIdeas(filters);
            setIdeas(Array.isArray(result) ? result : []);
        } catch (loadError) {
            logger.error({
                fn: 'PlatformIdeasAdmin.loadIdeas',
                status: 'error',
                filters,
                errorCode: loadError?.code || 'PLATFORM_IDEAS_LOAD_FAILED',
                error: loadError instanceof Error ? loadError.message : String(loadError),
            });
            setError('Não foi possível carregar a fila de sugestões.');
        } finally {
            setLoading(false);
        }
    }, [filters, isPlatformAdmin]);

    useEffect(() => {
        loadIdeas();
    }, [loadIdeas]);

    const workspaces = useMemo(() => Array.from(new Map(
        ideas.map((idea) => [idea.workspace_id, idea.workspace_name || idea.workspace_id]),
    ).entries()), [ideas]);

    const selectedIdea = ideas.find((idea) => idea.id === selectedId) || null;

    const selectIdea = (idea) => {
        setSelectedId(idea.id);
        setEditing({
            status: idea.status || 'open',
            priority: idea.priority || 'none',
            adminNote: idea.admin_note || '',
        });
    };

    const submitSearch = (event) => {
        event.preventDefault();
        setFilters((current) => ({ ...current, search: normalizeSearchText(draftSearch) }));
    };

    const saveCuration = async () => {
        if (!selectedIdea) return;
        try {
            setSaving(true);
            const updated = await parityService.updatePlatformIdea(selectedIdea.id, editing);
            setIdeas((current) => current.map((idea) => idea.id === selectedIdea.id ? { ...idea, ...updated } : idea));
            toast.success('Curadoria atualizada.');
        } catch (saveError) {
            logger.error({
                fn: 'PlatformIdeasAdmin.saveCuration',
                status: 'error',
                ideaId: selectedIdea.id,
                errorCode: saveError?.code || 'PLATFORM_IDEA_UPDATE_FAILED',
                error: saveError instanceof Error ? saveError.message : String(saveError),
            });
            toast.error('Não foi possível atualizar a sugestão.');
        } finally {
            setSaving(false);
        }
    };

    if (loadingPlatformAccess) {
        return <div className="platform-admin-state"><LoaderCircle className="is-spinning" /> Verificando acesso master…</div>;
    }

    if (!isPlatformAdmin) {
        return (
            <div className="platform-admin-state platform-admin-denied">
                <ShieldCheck size={34} />
                <h1>Área restrita da plataforma</h1>
                <p>Esta central é exclusiva para proprietários e curadores do Ritmika.</p>
            </div>
        );
    }

    return (
        <div className="platform-ideas-page">
            <header className="platform-ideas-header">
                <div>
                    <p className="remote-eyebrow">Administração da plataforma</p>
                    <h1>Central de sugestões</h1>
                    <p>Curadoria consolidada das ideias enviadas por todos os clientes.</p>
                </div>
                <button type="button" className="platform-refresh" onClick={loadIdeas} disabled={loading}>
                    <RefreshCw size={17} className={loading ? 'is-spinning' : ''} /> Atualizar
                </button>
            </header>

            <section className="platform-ideas-metrics" aria-label="Resumo da fila">
                <article><span>Total recebido</span><strong>{ideas.length}</strong><Inbox size={20} /></article>
                <article><span>Críticas e altas</span><strong>{ideas.filter((idea) => ['critical', 'high'].includes(idea.priority)).length}</strong><AlertTriangle size={20} /></article>
                <article><span>Em andamento</span><strong>{ideas.filter((idea) => idea.status === 'in_progress').length}</strong><LoaderCircle size={20} /></article>
                <article><span>Clientes na fila</span><strong>{new Set(ideas.map((idea) => idea.workspace_id)).size}</strong><Building2 size={20} /></article>
            </section>

            <section className="platform-ideas-filters" aria-label="Filtros da central">
                <form onSubmit={submitSearch}>
                    <Search size={17} />
                    <input value={draftSearch} onChange={(event) => setDraftSearch(event.target.value)} placeholder="Buscar sugestão, cliente ou autor" aria-label="Buscar na central" />
                </form>
                <label><span>Status</span><select value={filters.status} onChange={(event) => setFilters((current) => ({ ...current, status: event.target.value }))}>{STATUS_OPTIONS.map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label>
                <label><span>Prioridade</span><select value={filters.priority} onChange={(event) => setFilters((current) => ({ ...current, priority: event.target.value }))}>{PRIORITY_OPTIONS.map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label>
                <label><span>Cliente</span><select value={filters.workspaceId} onChange={(event) => setFilters((current) => ({ ...current, workspaceId: event.target.value }))}><option value="">Todos</option>{workspaces.map(([id, name]) => <option value={id} key={id}>{name}</option>)}</select></label>
            </section>

            {error ? (
                <div className="platform-admin-state platform-admin-error"><AlertTriangle /><strong>{error}</strong><button type="button" onClick={loadIdeas}>Tentar novamente</button></div>
            ) : loading ? (
                <div className="platform-admin-state"><LoaderCircle className="is-spinning" /> Carregando fila consolidada…</div>
            ) : ideas.length === 0 ? (
                <div className="platform-admin-state"><Inbox size={34} /><strong>Nenhuma sugestão nesta visão</strong><span>A fila será atualizada quando clientes enviarem ideias.</span></div>
            ) : (
                <div className="platform-ideas-workspace">
                    <section className="platform-ideas-list" aria-label="Sugestões recebidas">
                        {ideas.map((idea) => (
                            <button type="button" className={`platform-idea-card ${selectedId === idea.id ? 'selected' : ''}`} onClick={() => selectIdea(idea)} key={idea.id}>
                                <div className="platform-idea-card-top">
                                    <span className={`platform-priority priority-${idea.priority || 'none'}`}>{priorityLabel[idea.priority] || 'Sem prioridade'}</span>
                                    <span>{formatDate(idea.created_at)}</span>
                                </div>
                                <h2>{idea.title}</h2>
                                <p>{idea.description || 'Sem descrição.'}</p>
                                <div className="platform-idea-card-meta">
                                    <span><Building2 size={15} /> {idea.workspace_name || idea.workspace_id}</span>
                                    <span><ThumbsUp size={15} /> {idea.vote_count || 0}</span>
                                    <span>{statusLabel[idea.status] || idea.status}</span>
                                </div>
                            </button>
                        ))}
                    </section>

                    <aside className={`platform-curation ${selectedIdea ? 'visible' : ''}`} aria-label="Painel de curadoria">
                        {selectedIdea ? (
                            <>
                                <div><span className="platform-curation-kicker">{selectedIdea.workspace_name || selectedIdea.workspace_id}</span><h2>{selectedIdea.title}</h2><p>{selectedIdea.description || 'Sem descrição.'}</p></div>
                                <dl>
                                    <div><dt>Autor</dt><dd>{selectedIdea.author_name || selectedIdea.author_email || 'Não identificado'}</dd></div>
                                    <div><dt>Categoria</dt><dd>{selectedIdea.category || 'Sem categoria'}</dd></div>
                                    <div><dt>Votos</dt><dd>{selectedIdea.vote_count || 0}</dd></div>
                                </dl>
                                <label><span>Status</span><select value={editing.status} onChange={(event) => setEditing((current) => ({ ...current, status: event.target.value }))}>{STATUS_OPTIONS.filter(([value]) => value).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label>
                                <label><span>Prioridade</span><select value={editing.priority} onChange={(event) => setEditing((current) => ({ ...current, priority: event.target.value }))}>{PRIORITY_OPTIONS.filter(([value]) => value).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label>
                                <label><span>Nota interna</span><textarea value={editing.adminNote} onChange={(event) => setEditing((current) => ({ ...current, adminNote: event.target.value }))} placeholder="Contexto, decisão e próximo passo para a equipe interna" /></label>
                                <button type="button" className="platform-save" onClick={saveCuration} disabled={saving}>{saving ? <LoaderCircle className="is-spinning" size={17} /> : <Check size={17} />}{saving ? 'Salvando…' : 'Salvar curadoria'}</button>
                            </>
                        ) : <div className="platform-curation-empty"><ShieldCheck size={30} /><strong>Selecione uma sugestão</strong><span>Revise contexto, votos e cliente antes de decidir.</span></div>}
                    </aside>
                </div>
            )}
        </div>
    );
};

export default PlatformIdeasAdmin;

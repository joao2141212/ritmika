import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Building2, Check, Inbox, LoaderCircle, RefreshCw, Search, ShieldCheck, ThumbsUp } from 'lucide-react';
import toast from 'react-hot-toast';
import { parityService } from '../services/checklistProducaoService';
import { usePlatformAdmin } from '../hooks/usePlatformAdmin';
import { normalizeSearchText } from '../lib/plainText';
import { logger } from '../lib/logger';

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
        void Promise.resolve().then(loadIdeas);
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
        return <div className="flex min-h-screen items-center justify-center gap-3 bg-[#f6fafb] px-6 text-sm text-operation-muted"><LoaderCircle className="animate-spin" /> Verificando acesso master…</div>;
    }

    if (!isPlatformAdmin) {
        return (
            <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-[#f6fafb] px-6 text-center text-operation-muted">
                <ShieldCheck size={34} />
                <h1>Área restrita da plataforma</h1>
                <p>Esta central é exclusiva para proprietários e curadores do Ritmika.</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#f6fafb] px-4 py-8 text-operation-ink sm:px-6 lg:px-8">
            <header className="mx-auto mb-8 flex max-w-6xl flex-col gap-5 md:flex-row md:items-end md:justify-between">
                <div>
                    <p className="mb-2 text-xs font-bold uppercase tracking-[0.16em] text-operation-mint-dark">Administração da plataforma</p>
                    <h1 className="text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">Central de sugestões</h1>
                    <p className="mt-2 text-sm text-operation-muted">Curadoria consolidada das ideias enviadas por todos os clientes.</p>
                </div>
                <button type="button" className="inline-flex min-h-10 items-center gap-2 self-start rounded-xl border border-operation-line bg-white px-3.5 py-2 text-sm font-semibold transition-colors hover:border-operation-mint hover:bg-operation-soft disabled:cursor-wait disabled:opacity-60 md:self-auto" onClick={loadIdeas} disabled={loading}>
                    <RefreshCw size={17} className={loading ? 'animate-spin' : ''} /> Atualizar
                </button>
            </header>

            <section className="mx-auto mb-6 grid max-w-6xl gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-label="Resumo da fila">
                <article className="rounded-2xl border border-operation-line bg-white p-5 shadow-[0_10px_26px_rgba(23,49,58,0.05)]"><span className="text-sm text-operation-muted">Total recebido</span><strong className="mt-3 block text-3xl font-semibold">{ideas.length}</strong><Inbox className="mt-2 text-operation-mint-dark" size={20} /></article>
                <article className="rounded-2xl border border-operation-line bg-white p-5 shadow-[0_10px_26px_rgba(23,49,58,0.05)]"><span className="text-sm text-operation-muted">Críticas e altas</span><strong className="mt-3 block text-3xl font-semibold">{ideas.filter((idea) => ['critical', 'high'].includes(idea.priority)).length}</strong><AlertTriangle className="mt-2 text-amber-600" size={20} /></article>
                <article className="rounded-2xl border border-operation-line bg-white p-5 shadow-[0_10px_26px_rgba(23,49,58,0.05)]"><span className="text-sm text-operation-muted">Em andamento</span><strong className="mt-3 block text-3xl font-semibold">{ideas.filter((idea) => idea.status === 'in_progress').length}</strong><LoaderCircle className="mt-2 text-operation-mint-dark" size={20} /></article>
                <article className="rounded-2xl border border-operation-line bg-white p-5 shadow-[0_10px_26px_rgba(23,49,58,0.05)]"><span className="text-sm text-operation-muted">Clientes na fila</span><strong className="mt-3 block text-3xl font-semibold">{new Set(ideas.map((idea) => idea.workspace_id)).size}</strong><Building2 className="mt-2 text-operation-mint-dark" size={20} /></article>
            </section>

            <section className="mx-auto mb-6 grid max-w-6xl gap-3 rounded-2xl border border-operation-line bg-white p-5 shadow-[0_10px_26px_rgba(23,49,58,0.05)] md:grid-cols-4" aria-label="Filtros da central">
                <form className="flex items-center gap-3 rounded-xl border border-operation-line px-4 py-3 focus-within:border-operation-mint md:col-span-4" onSubmit={submitSearch}>
                    <Search className="text-operation-muted" size={17} />
                    <input className="min-w-0 flex-1 border-0 bg-transparent text-sm outline-none placeholder:text-operation-muted/70" value={draftSearch} onChange={(event) => setDraftSearch(event.target.value)} placeholder="Buscar sugestão, cliente ou autor" aria-label="Buscar na central" />
                </form>
                <label className="grid gap-2 text-xs font-semibold"><span>Status</span><select className="rounded-xl border border-operation-line bg-white px-3 py-2.5 text-sm font-normal outline-none focus:border-operation-mint" value={filters.status} onChange={(event) => setFilters((current) => ({ ...current, status: event.target.value }))}>{STATUS_OPTIONS.map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label>
                <label className="grid gap-2 text-xs font-semibold"><span>Prioridade</span><select className="rounded-xl border border-operation-line bg-white px-3 py-2.5 text-sm font-normal outline-none focus:border-operation-mint" value={filters.priority} onChange={(event) => setFilters((current) => ({ ...current, priority: event.target.value }))}>{PRIORITY_OPTIONS.map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label>
                <label className="grid gap-2 text-xs font-semibold"><span>Cliente</span><select className="rounded-xl border border-operation-line bg-white px-3 py-2.5 text-sm font-normal outline-none focus:border-operation-mint" value={filters.workspaceId} onChange={(event) => setFilters((current) => ({ ...current, workspaceId: event.target.value }))}><option value="">Todos</option>{workspaces.map(([id, name]) => <option value={id} key={id}>{name}</option>)}</select></label>
            </section>

            {error ? (
                <div className="mx-auto flex max-w-6xl flex-col items-center justify-center gap-4 rounded-2xl border border-red-200 bg-red-50 px-6 py-16 text-center text-sm text-red-700" role="alert"><AlertTriangle /><strong>{error}</strong><button type="button" className="rounded-xl border border-red-200 bg-white px-3.5 py-2 font-semibold hover:bg-red-100" onClick={loadIdeas}>Tentar novamente</button></div>
            ) : loading ? (
                <div className="mx-auto flex max-w-6xl items-center justify-center gap-3 rounded-2xl border border-operation-line bg-white px-6 py-16 text-sm text-operation-muted"><LoaderCircle className="animate-spin" /> Carregando fila consolidada…</div>
            ) : ideas.length === 0 ? (
                <div className="mx-auto flex max-w-6xl flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-operation-line bg-white px-6 py-16 text-center text-sm text-operation-muted"><Inbox size={34} /><strong className="text-base text-operation-ink">Nenhuma sugestão nesta visão</strong><span>A fila será atualizada quando clientes enviarem ideias.</span></div>
            ) : (
                <div className="mx-auto grid max-w-6xl gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(320px,0.8fr)]">
                    <section className="grid gap-3" aria-label="Sugestões recebidas">
                        {ideas.map((idea) => (
                            <button type="button" className={`rounded-2xl border p-5 text-left transition-all ${selectedId === idea.id ? 'border-operation-mint bg-operation-soft' : 'border-operation-line bg-white hover:border-operation-mint'}`} onClick={() => selectIdea(idea)} key={idea.id}>
                                <div className="flex items-center justify-between gap-3 text-xs text-operation-muted">
                                    <span className="rounded-full bg-white px-2.5 py-1 font-semibold text-operation-mint-dark">{priorityLabel[idea.priority] || 'Sem prioridade'}</span>
                                    <span>{formatDate(idea.created_at)}</span>
                                </div>
                                <h2 className="mt-4 text-lg font-semibold">{idea.title}</h2>
                                <p className="mt-2 text-sm leading-6 text-operation-muted">{idea.description || 'Sem descrição.'}</p>
                                <div className="mt-4 flex flex-wrap gap-3 text-xs text-operation-muted">
                                    <span className="inline-flex items-center gap-1"><Building2 size={15} /> {idea.workspace_name || idea.workspace_id}</span>
                                    <span className="inline-flex items-center gap-1"><ThumbsUp size={15} /> {idea.vote_count || 0}</span>
                                    <span>{statusLabel[idea.status] || idea.status}</span>
                                </div>
                            </button>
                        ))}
                    </section>

                    <aside className="rounded-2xl border border-operation-line bg-white p-5 shadow-[0_12px_30px_rgba(23,49,58,0.06)]" aria-label="Painel de curadoria">
                        {selectedIdea ? (
                            <>
                                <div><span className="text-xs font-semibold uppercase tracking-[0.12em] text-operation-mint-dark">{selectedIdea.workspace_name || selectedIdea.workspace_id}</span><h2 className="mt-3 text-xl font-semibold">{selectedIdea.title}</h2><p className="mt-2 text-sm leading-6 text-operation-muted">{selectedIdea.description || 'Sem descrição.'}</p></div>
                                <dl className="my-6 grid gap-3 rounded-xl bg-[#f6fafb] p-4 text-sm">
                                    <div><dt className="text-xs text-operation-muted">Autor</dt><dd className="mt-1 font-semibold">{selectedIdea.author_name || selectedIdea.author_email || 'Não identificado'}</dd></div>
                                    <div><dt className="text-xs text-operation-muted">Categoria</dt><dd className="mt-1 font-semibold">{selectedIdea.category || 'Sem categoria'}</dd></div>
                                    <div><dt className="text-xs text-operation-muted">Votos</dt><dd className="mt-1 font-semibold">{selectedIdea.vote_count || 0}</dd></div>
                                </dl>
                                <label className="grid gap-2 text-xs font-semibold"><span>Status</span><select className="rounded-xl border border-operation-line px-3 py-2.5 text-sm font-normal outline-none focus:border-operation-mint" value={editing.status} onChange={(event) => setEditing((current) => ({ ...current, status: event.target.value }))}>{STATUS_OPTIONS.filter(([value]) => value).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label>
                                <label className="mt-4 grid gap-2 text-xs font-semibold"><span>Prioridade</span><select className="rounded-xl border border-operation-line px-3 py-2.5 text-sm font-normal outline-none focus:border-operation-mint" value={editing.priority} onChange={(event) => setEditing((current) => ({ ...current, priority: event.target.value }))}>{PRIORITY_OPTIONS.filter(([value]) => value).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label>
                                <label className="mt-4 grid gap-2 text-xs font-semibold"><span>Nota interna</span><textarea className="min-h-28 rounded-xl border border-operation-line px-3 py-2.5 text-sm font-normal outline-none focus:border-operation-mint" value={editing.adminNote} onChange={(event) => setEditing((current) => ({ ...current, adminNote: event.target.value }))} placeholder="Contexto, decisão e próximo passo para a equipe interna" /></label>
                                <button type="button" className="mt-5 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-operation-ink px-4 py-3 text-sm font-semibold text-white hover:bg-operation-mint-dark disabled:cursor-wait disabled:opacity-60" onClick={saveCuration} disabled={saving}>{saving ? <LoaderCircle className="animate-spin" size={17} /> : <Check size={17} />}{saving ? 'Salvando…' : 'Salvar curadoria'}</button>
                            </>
                        ) : <div className="flex min-h-64 flex-col items-center justify-center gap-3 text-center text-sm text-operation-muted"><ShieldCheck size={30} /><strong className="text-base text-operation-ink">Selecione uma sugestão</strong><span>Revise contexto, votos e cliente antes de decidir.</span></div>}
                    </aside>
                </div>
            )}
        </div>
    );
};

export default PlatformIdeasAdmin;

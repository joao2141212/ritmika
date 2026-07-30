import { useEffect, useState } from 'react';
import { Check, Lightbulb, LoaderCircle, Plus, Search, ThumbsUp } from 'lucide-react';
import toast from 'react-hot-toast';
import { parityService } from '../services/checklistProducaoService';

const IdeasRemote = () => {
    const [ideas, setIdeas] = useState([]);
    const [filters, setFilters] = useState({ status: '', search: '' });
    const [draftSearch, setDraftSearch] = useState('');
    const [showForm, setShowForm] = useState(false);
    const [draft, setDraft] = useState({ title: '', description: '', category: '' });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    const loadIdeas = async (nextFilters = filters) => {
        try {
            setLoading(true);
            setError('');
            setIdeas(await parityService.getIdeas(nextFilters));
        } catch (loadError) {
            setError(loadError instanceof Error ? loadError.message : 'Não foi possível carregar as ideias.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        void Promise.resolve().then(loadIdeas);
        // Filters are the remote query contract for this page.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [filters.status, filters.search]);

    const submitSearch = (event) => {
        event.preventDefault();
        setFilters((current) => ({ ...current, search: draftSearch }));
    };

    const createIdea = async (event) => {
        event.preventDefault();
        try {
            setSaving(true);
            await parityService.createIdea(draft);
            setDraft({ title: '', description: '', category: '' });
            setShowForm(false);
            toast.success('Sugestão enviada.');
            await loadIdeas(filters);
        } catch (saveError) {
            toast.error(saveError instanceof Error ? saveError.message : 'Não foi possível enviar a sugestão.');
        } finally {
            setSaving(false);
        }
    };

    const toggleVote = async (idea) => {
        try {
            const result = await parityService.toggleIdeaVote(idea.id);
            setIdeas((current) => current.map((item) => item.id === idea.id ? { ...item, voted: result.voted, vote_count: Math.max(0, Number(item.vote_count || 0) + (result.voted ? 1 : -1)) } : item));
        } catch (voteError) {
            toast.error(voteError instanceof Error ? voteError.message : 'Não foi possível registrar o voto.');
        }
    };

    return (
        <div className="min-h-screen bg-[#f6fafb] px-4 py-8 text-operation-ink sm:px-6 lg:px-8">
            <header className="mx-auto mb-8 flex max-w-5xl flex-col gap-5 md:flex-row md:items-end md:justify-between"><div><p className="mb-2 text-xs font-bold uppercase tracking-[0.16em] text-operation-mint-dark">Colaboração do workspace</p><h1 className="text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">Ideias &amp; Sugestões</h1><p className="mt-2 text-sm text-operation-muted">Crie sugestões e vote nas ideias persistidas para este workspace.</p></div><button type="button" className="inline-flex min-h-10 items-center gap-2 self-start rounded-xl bg-operation-ink px-3.5 py-2 text-sm font-semibold text-white hover:bg-operation-mint-dark md:self-auto" onClick={() => setShowForm((current) => !current)}><Plus size={16} /> Nova sugestão</button></header>
            <main className="mx-auto grid max-w-5xl gap-5">{showForm && <form className="grid gap-4 rounded-2xl border border-operation-line bg-white p-5 shadow-[0_12px_30px_rgba(23,49,58,0.06)]" onSubmit={createIdea}><label className="grid gap-2 text-sm font-semibold"><span>Título</span><input className="rounded-xl border border-operation-line px-3 py-2.5 text-sm font-normal outline-none focus:border-operation-mint" value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} required /></label><label className="grid gap-2 text-sm font-semibold"><span>Descrição</span><textarea className="min-h-24 rounded-xl border border-operation-line px-3 py-2.5 text-sm font-normal outline-none focus:border-operation-mint" value={draft.description} onChange={(event) => setDraft({ ...draft, description: event.target.value })} /></label><label className="grid gap-2 text-sm font-semibold"><span>Categoria</span><input className="rounded-xl border border-operation-line px-3 py-2.5 text-sm font-normal outline-none focus:border-operation-mint" value={draft.category} onChange={(event) => setDraft({ ...draft, category: event.target.value })} placeholder="Opcional" /></label><button type="submit" className="inline-flex min-h-10 w-fit items-center gap-2 rounded-xl bg-operation-ink px-3.5 py-2 text-sm font-semibold text-white disabled:cursor-wait disabled:opacity-60" disabled={saving}>{saving ? <LoaderCircle size={16} className="animate-spin" /> : <Check size={16} />}{saving ? 'Enviando…' : 'Enviar sugestão'}</button></form>}
            <section className="rounded-2xl border border-operation-line bg-white p-5 shadow-[0_12px_30px_rgba(23,49,58,0.06)]"><div className="flex flex-col gap-3 sm:flex-row"><form className="flex flex-1 items-center gap-3 rounded-xl border border-operation-line px-4 py-3 focus-within:border-operation-mint" onSubmit={submitSearch}><Search size={16} className="text-operation-muted" /><input className="min-w-0 flex-1 border-0 bg-transparent text-sm outline-none placeholder:text-operation-muted/70" value={draftSearch} onChange={(event) => setDraftSearch(event.target.value)} placeholder="Buscar ideias" /></form><select className="rounded-xl border border-operation-line bg-white px-3 py-2.5 text-sm outline-none focus:border-operation-mint" value={filters.status} onChange={(event) => setFilters((current) => ({ ...current, status: event.target.value }))} aria-label="Filtrar status"><option value="">Todos os status</option><option value="open">Aberto</option><option value="in_progress">Em andamento</option><option value="closed">Encerradas</option></select></div>
                {loading ? <div className="flex items-center justify-center gap-3 px-6 py-16 text-sm text-operation-muted"><LoaderCircle size={22} className="animate-spin" /> Carregando ideias remotas…</div> : error ? <div className="flex flex-col items-center justify-center gap-4 rounded-xl border border-red-200 bg-red-50 px-6 py-16 text-center text-sm text-red-700" role="alert">{error}<button type="button" className="rounded-xl border border-red-200 bg-white px-3.5 py-2 font-semibold text-red-700 hover:bg-red-100" onClick={() => loadIdeas(filters)}>Tentar novamente</button></div> : ideas.length === 0 ? <div className="flex flex-col items-center justify-center gap-3 px-6 py-16 text-center text-sm text-operation-muted"><Lightbulb size={30} /><strong className="text-base text-operation-ink">Nenhuma ideia encontrada</strong><span>As sugestões criadas neste workspace aparecerão aqui.</span></div> : <div className="mt-5 grid gap-3 border-t border-operation-line pt-5">{ideas.map((idea) => <article className="flex flex-col gap-4 rounded-xl border border-operation-line p-5 sm:flex-row sm:items-start sm:justify-between" key={idea.id}><div><span className="rounded-full bg-operation-soft px-3 py-1 text-xs font-semibold text-operation-mint-dark">{idea.status}</span><h2 className="mt-4 text-lg font-semibold">{idea.title}</h2><p className="mt-2 text-sm leading-6 text-operation-muted">{idea.description || 'Sem descrição.'}</p><small className="mt-3 block text-xs text-operation-muted">{idea.category || 'Sem categoria'} · {idea.created_at ? new Date(idea.created_at).toLocaleDateString('pt-BR') : '-'}</small></div><button type="button" className={'inline-flex min-h-10 items-center gap-2 self-start rounded-xl border px-3.5 py-2 text-sm font-semibold ' + (idea.voted ? 'border-operation-mint bg-operation-soft text-operation-mint-dark' : 'border-operation-line text-operation-ink hover:border-operation-mint')} onClick={() => toggleVote(idea)}><ThumbsUp size={16} /> {idea.vote_count || 0}</button></article>)}</div>}
            </section>
            </main>
        </div>
    );
};

export default IdeasRemote;

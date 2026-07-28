import { useEffect, useState } from 'react';
import { Check, Lightbulb, LoaderCircle, Plus, Search, ThumbsUp } from 'lucide-react';
import toast from 'react-hot-toast';
import { parityService } from '../services/checklistProducaoService';
import '../styles/parity-pages.css';

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
        loadIdeas();
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
        <div className="parity-page ritmika-light-mode">
            <header className="parity-header"><div><p className="remote-eyebrow">Colaboração do workspace</p><h1>Ideias &amp; Sugestões</h1><p>Crie sugestões e vote nas ideias persistidas para este workspace.</p></div><button type="button" className="parity-button parity-button-primary" onClick={() => setShowForm((current) => !current)}><Plus size={16} /> Nova sugestão</button></header>
            {showForm && <form className="parity-panel parity-form" onSubmit={createIdea}><label><span>Título</span><input value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} required /></label><label><span>Descrição</span><textarea value={draft.description} onChange={(event) => setDraft({ ...draft, description: event.target.value })} /></label><label><span>Categoria</span><input value={draft.category} onChange={(event) => setDraft({ ...draft, category: event.target.value })} placeholder="Opcional" /></label><button type="submit" className="parity-button parity-button-primary" disabled={saving}>{saving ? <LoaderCircle size={16} className="is-spinning" /> : <Check size={16} />}{saving ? 'Enviando…' : 'Enviar sugestão'}</button></form>}
            <section className="parity-panel">
                <div className="parity-toolbar"><form className="parity-search" onSubmit={submitSearch}><Search size={16} /><input value={draftSearch} onChange={(event) => setDraftSearch(event.target.value)} placeholder="Buscar ideias" /></form><select value={filters.status} onChange={(event) => setFilters((current) => ({ ...current, status: event.target.value }))} aria-label="Filtrar status"><option value="">Todos os status</option><option value="open">Aberto</option><option value="in_progress">Em andamento</option><option value="closed">Encerradas</option></select></div>
                {loading ? <div className="parity-state"><LoaderCircle size={22} className="is-spinning" /> Carregando ideias remotas…</div> : error ? <div className="parity-state parity-error">{error}<button type="button" className="parity-button" onClick={() => loadIdeas(filters)}>Tentar novamente</button></div> : ideas.length === 0 ? <div className="parity-state"><Lightbulb size={30} /><strong>Nenhuma ideia encontrada</strong><span>As sugestões criadas neste workspace aparecerão aqui.</span></div> : <div className="parity-list">{ideas.map((idea) => <article className="parity-list-row" key={idea.id}><div><span className="parity-badge">{idea.status}</span><h2>{idea.title}</h2><p>{idea.description || 'Sem descrição.'}</p><small>{idea.category || 'Sem categoria'} · {idea.created_at ? new Date(idea.created_at).toLocaleDateString('pt-BR') : '-'}</small></div><button type="button" className={'parity-vote ' + (idea.voted ? 'is-voted' : '')} onClick={() => toggleVote(idea)}><ThumbsUp size={16} /> {idea.vote_count || 0}</button></article>)}</div>}
            </section>
        </div>
    );
};

export default IdeasRemote;

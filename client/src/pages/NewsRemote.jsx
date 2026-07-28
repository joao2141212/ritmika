import { useEffect, useState } from 'react';
import { CalendarDays, LoaderCircle, Newspaper, RefreshCw, Search } from 'lucide-react';
import { parityService } from '../services/checklistProducaoService';
import '../styles/parity-pages.css';

const NewsRemote = () => {
    const [entries, setEntries] = useState([]);
    const [category, setCategory] = useState('');
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const loadNews = async () => {
        try {
            setLoading(true);
            setError('');
            setEntries(await parityService.getNewsEntries({ category, search }));
        } catch (loadError) {
            setError(loadError instanceof Error ? loadError.message : 'Não foi possível carregar as novidades.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadNews();
        // Category and search are the remote filters for this page.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [category, search]);

    return (
        <div className="parity-page ritmika-light-mode">
            <header className="parity-header"><div><p className="remote-eyebrow">Atualizações do produto</p><h1>Novidades</h1><p>Notas publicadas para o seu workspace.</p></div><button type="button" className="parity-button" onClick={loadNews} disabled={loading}><RefreshCw size={16} /> Atualizar</button></header>
            <section className="parity-panel"><div className="parity-toolbar"><div className="parity-search"><Search size={16} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar novidades" /></div><select value={category} onChange={(event) => setCategory(event.target.value)} aria-label="Filtrar categoria"><option value="">Todos</option><option value="new">Novo</option><option value="improved">Melhorado</option><option value="fixed">Corrigido</option></select></div>{loading ? <div className="parity-state"><LoaderCircle size={22} className="is-spinning" /> Carregando novidades remotas…</div> : error ? <div className="parity-state parity-error">{error}<button type="button" className="parity-button" onClick={loadNews}>Tentar novamente</button></div> : entries.length === 0 ? <div className="parity-state"><Newspaper size={30} /><strong>Nenhuma novidade publicada</strong><span>As notas de produto aparecerão quando forem publicadas no workspace.</span></div> : <div className="parity-news-list">{entries.map((entry) => <article className="parity-news-card" key={entry.id}><div className="parity-news-meta"><span className="parity-badge">{entry.category}</span><span><CalendarDays size={14} />{entry.published_at ? new Date(entry.published_at).toLocaleDateString('pt-BR') : '-'}</span></div><h2>{entry.title}</h2><p>{entry.summary || entry.body || 'Sem resumo.'}</p></article>)}</div>}</section>
        </div>
    );
};

export default NewsRemote;

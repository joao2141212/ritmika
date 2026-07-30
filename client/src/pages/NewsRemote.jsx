import { useEffect, useState } from 'react';
import { CalendarDays, LoaderCircle, Newspaper, RefreshCw, Search } from 'lucide-react';
import { parityService } from '../services/checklistProducaoService';

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
        void Promise.resolve().then(loadNews);
        // Category and search are the remote filters for this page.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [category, search]);

    return (
        <div className="min-h-screen bg-[#f6fafb] px-4 py-8 text-operation-ink sm:px-6 lg:px-8">
            <header className="mx-auto mb-8 flex max-w-7xl flex-col gap-5 md:flex-row md:items-end md:justify-between"><div><p className="mb-2 text-xs font-bold uppercase tracking-[0.16em] text-operation-mint-dark">Atualizações do produto</p><h1 className="text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">Novidades</h1><p className="mt-2 text-sm text-operation-muted">Notas publicadas para o seu workspace.</p></div><button type="button" className="inline-flex min-h-10 items-center gap-2 self-start rounded-xl border border-operation-line bg-white px-3.5 py-2 text-sm font-semibold transition-colors hover:border-operation-mint hover:bg-operation-soft disabled:cursor-wait disabled:opacity-60 md:self-auto" onClick={loadNews} disabled={loading}><RefreshCw size={16} className={loading ? 'animate-spin' : ''} /> Atualizar</button></header>
            <main className="mx-auto max-w-7xl"><section className="rounded-2xl border border-operation-line bg-white p-5 shadow-[0_12px_30px_rgba(23,49,58,0.06)]"><div className="flex flex-col gap-3 sm:flex-row"><div className="flex flex-1 items-center gap-3 rounded-xl border border-operation-line px-4 py-3 focus-within:border-operation-mint focus-within:ring-4 focus-within:ring-operation-mint/15"><Search size={16} className="text-operation-muted" /><input className="min-w-0 flex-1 border-0 bg-transparent text-sm outline-none placeholder:text-operation-muted/70" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar novidades" /></div><select className="rounded-xl border border-operation-line bg-white px-3 py-2.5 text-sm outline-none focus:border-operation-mint" value={category} onChange={(event) => setCategory(event.target.value)} aria-label="Filtrar categoria"><option value="">Todos</option><option value="new">Novo</option><option value="improved">Melhorado</option><option value="fixed">Corrigido</option></select></div>{loading ? <div className="flex items-center justify-center gap-3 px-6 py-16 text-sm text-operation-muted"><LoaderCircle size={22} className="animate-spin" /> Carregando novidades remotas…</div> : error ? <div className="flex flex-col items-center justify-center gap-4 rounded-xl border border-red-200 bg-red-50 px-6 py-16 text-center text-sm text-red-700" role="alert">{error}<button type="button" className="rounded-xl border border-red-200 bg-white px-3.5 py-2 font-semibold text-red-700 hover:bg-red-100" onClick={loadNews}>Tentar novamente</button></div> : entries.length === 0 ? <div className="flex flex-col items-center justify-center gap-3 px-6 py-16 text-center text-sm text-operation-muted"><Newspaper size={30} /><strong className="text-base text-operation-ink">Nenhuma novidade publicada</strong><span>As notas de produto aparecerão quando forem publicadas no workspace.</span></div> : <div className="mt-5 grid gap-4 border-t border-operation-line pt-5">{entries.map((entry) => <article className="rounded-xl border border-operation-line p-5 transition-colors hover:border-operation-mint" key={entry.id}><div className="flex flex-wrap items-center gap-3 text-xs text-operation-muted"><span className="rounded-full bg-operation-soft px-3 py-1 font-semibold text-operation-mint-dark">{entry.category}</span><span className="inline-flex items-center gap-1"><CalendarDays size={14} />{entry.published_at ? new Date(entry.published_at).toLocaleDateString('pt-BR') : '-'}</span></div><h2 className="mt-4 text-lg font-semibold">{entry.title}</h2><p className="mt-2 text-sm leading-6 text-operation-muted">{entry.summary || entry.body || 'Sem resumo.'}</p></article>)}</div>}</section></main>
        </div>
    );
};

export default NewsRemote;

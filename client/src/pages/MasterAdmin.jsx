import { useCallback, useEffect, useMemo, useState } from 'react';
import {
    Building2,
    CheckCircle2,
    FileEdit,
    LoaderCircle,
    Megaphone,
    Plus,
    RefreshCw,
    Save,
    Send,
    ShieldCheck,
    UsersRound,
    X,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { parityService } from '../services/checklistProducaoService';
import { usePlatformAdmin } from '../hooks/usePlatformAdmin';
import { logger } from '../lib/logger';

const EMPTY_DRAFT = {
    id: '',
    workspace_id: '',
    title: '',
    summary: '',
    body: '',
    category: 'produto',
    is_published: false,
    metadata: {},
};

const MasterAdmin = () => {
    const { isPlatformAdmin, loadingPlatformAccess } = usePlatformAdmin();
    const [entries, setEntries] = useState([]);
    const [workspaces, setWorkspaces] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [search, setSearch] = useState('');
    const [status, setStatus] = useState('all');
    const [editorOpen, setEditorOpen] = useState(false);
    const [draft, setDraft] = useState(EMPTY_DRAFT);
    const [saving, setSaving] = useState(false);

    const loadMasterData = useCallback(async () => {
        if (!isPlatformAdmin) return;
        try {
            setLoading(true);
            setError('');
            const [news, workspaceRows] = await Promise.all([
                parityService.getPlatformNewsEntries(),
                parityService.getPlatformWorkspaces(),
            ]);
            setEntries(news);
            setWorkspaces(workspaceRows);
        } catch (loadError) {
            logger.error({
                fn: 'MasterAdmin.loadMasterData',
                status: 'error',
                errorCode: loadError?.code || 'MASTER_DATA_LOAD_FAILED',
                error: loadError instanceof Error ? loadError.message : String(loadError),
            });
            setError(loadError instanceof Error ? loadError.message : 'Não foi possível carregar a gestão master.');
        } finally {
            setLoading(false);
        }
    }, [isPlatformAdmin]);

    useEffect(() => {
        loadMasterData();
    }, [loadMasterData]);

    const visibleEntries = useMemo(() => {
        const normalized = search.trim().toLocaleLowerCase('pt-BR');
        return entries.filter((entry) => {
            if (status === 'published' && !entry.is_published) return false;
            if (status === 'draft' && entry.is_published) return false;
            if (!normalized) return true;
            return [entry.title, entry.summary, entry.body, entry.workspace?.name]
                .filter(Boolean)
                .join(' ')
                .toLocaleLowerCase('pt-BR')
                .includes(normalized);
        });
    }, [entries, search, status]);

    const openNew = () => {
        setDraft(EMPTY_DRAFT);
        setEditorOpen(true);
    };

    const openEntry = (entry) => {
        setDraft({
            id: entry.id,
            workspace_id: entry.workspace_id || '',
            title: entry.title || '',
            summary: entry.summary || '',
            body: entry.body || '',
            category: entry.category || 'produto',
            is_published: Boolean(entry.is_published),
            metadata: entry.metadata || {},
        });
        setEditorOpen(true);
    };

    const saveDraft = async (event) => {
        event.preventDefault();
        try {
            setSaving(true);
            const saved = await parityService.savePlatformNewsEntry({ ...draft, is_published: false });
            setEntries((current) => [saved, ...current.filter((entry) => entry.id !== saved.id)]);
            setDraft((current) => ({ ...current, ...saved, workspace_id: saved.workspace_id || '' }));
            toast.success('Rascunho salvo. Nenhum cliente foi notificado.');
        } catch (saveError) {
            logger.error({
                fn: 'MasterAdmin.saveDraft',
                status: 'error',
                errorCode: saveError?.code || 'MASTER_NEWS_SAVE_FAILED',
                newsId: draft.id || null,
                workspaceId: draft.workspace_id || null,
                error: saveError instanceof Error ? saveError.message : String(saveError),
            });
            toast.error(saveError instanceof Error ? saveError.message : 'Não foi possível salvar o rascunho.');
        } finally {
            setSaving(false);
        }
    };

    const togglePublished = async (entry, publish) => {
        const audience = entry.workspace_id ? (entry.workspace?.name || 'cliente selecionado') : 'todos os clientes';
        if (publish && !window.confirm(`Publicar “${entry.title}” para ${audience}?`)) return;
        try {
            const saved = await parityService.setPlatformNewsPublished(entry.id, publish);
            setEntries((current) => current.map((item) => item.id === saved.id ? { ...item, ...saved } : item));
            toast.success(publish ? 'Novidade publicada.' : 'Novidade retirada de exibição.');
        } catch (publishError) {
            logger.error({
                fn: 'MasterAdmin.togglePublished',
                status: 'error',
                errorCode: publishError?.code || 'MASTER_NEWS_PUBLISH_FAILED',
                newsId: entry.id,
                workspaceId: entry.workspace_id || null,
                publish,
                error: publishError instanceof Error ? publishError.message : String(publishError),
            });
            toast.error('Não foi possível alterar a publicação.');
        }
    };

    if (loadingPlatformAccess) {
        return <div className="flex min-h-screen items-center justify-center gap-2 bg-[#f4f8f8] text-[#6c8187]"><LoaderCircle className="animate-spin" /> Verificando acesso master…</div>;
    }

    if (!isPlatformAdmin) {
        return (
            <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-[#f4f8f8] text-center text-[#b42318]">
                <ShieldCheck size={28} />
                <h1>Acesso restrito</h1>
                <p>Esta área exige privilégio de administração da plataforma.</p>
            </div>
        );
    }

    return (
        <main className="min-h-screen bg-[#f4f8f8] p-5 text-[#17363d] sm:p-8">
            <header className="mx-auto mb-6 flex max-w-6xl items-start justify-between gap-5 max-[760px]:flex-col">
                <div>
                    <p className="mb-1 text-xs font-bold uppercase tracking-[0.12em] text-[#08766c]">Ritmika master</p>
                    <h1 className="m-0 text-[clamp(28px,4vw,42px)] font-extrabold">Gestão da plataforma</h1>
                    <p className="mt-2 text-sm text-[#6c8187]">Clientes, comunicação de produto e operação global em um ambiente protegido.</p>
                </div>
                <div className="flex flex-wrap gap-2">
                    <button type="button" className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-[#dce8e9] bg-white px-3 text-xs font-bold text-[#38515f] disabled:opacity-50" onClick={loadMasterData} disabled={loading}>
                        <RefreshCw size={16} className={loading ? 'animate-spin' : ''} /> Atualizar
                    </button>
                    <button type="button" className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-[#08766c] px-3 text-xs font-bold text-white" onClick={openNew}>
                        <Plus size={16} /> Nova atualização
                    </button>
                </div>
            </header>

            <section className="mx-auto mb-6 grid max-w-6xl grid-cols-4 gap-3 max-[700px]:grid-cols-2" aria-label="Resumo da plataforma">
                <article className="rounded-xl border border-[#dce8e9] bg-white p-4"><span className="text-[#08766c]"><Building2 size={18} /></span><div className="mt-2"><small className="block text-xs text-[#6c8187]">Clientes</small><strong className="text-2xl">{workspaces.length}</strong></div></article>
                <article className="rounded-xl border border-[#dce8e9] bg-white p-4"><span className="text-[#08766c]"><Megaphone size={18} /></span><div className="mt-2"><small className="block text-xs text-[#6c8187]">Publicadas</small><strong className="text-2xl">{entries.filter((entry) => entry.is_published).length}</strong></div></article>
                <article className="rounded-xl border border-[#dce8e9] bg-white p-4"><span className="text-[#08766c]"><FileEdit size={18} /></span><div className="mt-2"><small className="block text-xs text-[#6c8187]">Rascunhos</small><strong className="text-2xl">{entries.filter((entry) => !entry.is_published).length}</strong></div></article>
                <article className="rounded-xl border border-[#dce8e9] bg-white p-4"><span className="text-[#08766c]"><UsersRound size={18} /></span><div className="mt-2"><small className="block text-xs text-[#6c8187]">Alcance global</small><strong className="text-2xl">{entries.filter((entry) => !entry.workspace_id).length}</strong></div></article>
            </section>

            <section className="mx-auto max-w-6xl rounded-2xl border border-[#dce8e9] bg-white p-5 shadow-[0_10px_30px_rgba(24,48,64,0.05)]">
                <div className="mb-5 flex items-start justify-between gap-4 max-[700px]:flex-col">
                    <div><p className="mb-1 text-xs font-bold uppercase tracking-[0.12em] text-[#08766c]">Comunicação do produto</p><h2 className="m-0 text-xl font-extrabold">Novidades</h2></div>
                    <span className="text-xs text-[#6c8187]">Publicações só aparecem após confirmação explícita.</span>
                </div>
                <div className="mb-4 flex flex-wrap gap-3">
                    <input className="min-h-10 min-w-60 flex-1 rounded-lg border border-[#dce8e9] px-3 text-sm" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar por título, conteúdo ou cliente" />
                    <select className="min-h-10 rounded-lg border border-[#dce8e9] bg-white px-3 text-sm" value={status} onChange={(event) => setStatus(event.target.value)}>
                        <option value="all">Todos os estados</option>
                        <option value="draft">Rascunhos</option>
                        <option value="published">Publicadas</option>
                    </select>
                </div>

                {loading ? <div className="flex min-h-40 items-center justify-center gap-2 text-sm text-[#6c8187]"><LoaderCircle className="animate-spin" /> Carregando…</div>
                    : error ? <div className="rounded-xl bg-[#fff2ef] p-4 text-sm text-[#b42318]">{error}</div>
                        : visibleEntries.length === 0 ? <div className="flex min-h-40 items-center justify-center text-sm text-[#6c8187]">Nenhuma novidade corresponde aos filtros.</div>
                            : <div className="grid gap-3">{visibleEntries.map((entry) => (
                                <article className="rounded-xl border border-[#dce8e9] p-4" key={entry.id}>
                                    <button type="button" className="block w-full text-left" onClick={() => openEntry(entry)}>
                                        <span className={`inline-flex rounded-full px-2 py-1 text-[11px] font-bold ${entry.is_published ? 'bg-[#e8f8f3] text-[#08766c]' : 'bg-[#f1f3f3] text-[#6c8187]'}`}>
                                            {entry.is_published ? 'Publicada' : 'Rascunho'}
                                        </span>
                                        <strong className="mt-2 block text-base">{entry.title}</strong>
                                        <p className="mt-1 text-sm text-[#6c8187]">{entry.summary}</p>
                                        <small className="text-xs text-[#91a4a8]">{entry.workspace_id ? (entry.workspace?.name || 'Cliente específico') : 'Todos os clientes'} · {entry.category}</small>
                                    </button>
                                    <div className="mt-3 flex flex-wrap gap-2">
                                        <button type="button" className="inline-flex items-center gap-1 rounded-lg border border-[#dce8e9] px-3 py-2 text-xs font-bold text-[#38515f]" onClick={() => openEntry(entry)}><FileEdit size={15} /> Editar</button>
                                        <button type="button" className="inline-flex items-center gap-1 rounded-lg bg-[#08766c] px-3 py-2 text-xs font-bold text-white" onClick={() => togglePublished(entry, !entry.is_published)}>
                                            {entry.is_published ? <X size={15} /> : <Send size={15} />}
                                            {entry.is_published ? 'Retirar' : 'Publicar'}
                                        </button>
                                    </div>
                                </article>
                            ))}</div>}
            </section>

            {editorOpen && (
                <div className="fixed inset-0 z-30 grid place-items-center bg-[#17363d]/40 p-4" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && setEditorOpen(false)}>
                    <form className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-5 shadow-2xl" onSubmit={saveDraft} role="dialog" aria-modal="true" aria-labelledby="master-editor-title">
                        <header className="mb-5 flex items-start justify-between gap-3"><div><p className="mb-1 text-xs font-bold uppercase tracking-[0.12em] text-[#08766c]">Editor seguro</p><h2 className="m-0 text-xl font-extrabold" id="master-editor-title">{draft.id ? 'Editar atualização' : 'Nova atualização'}</h2></div><button className="grid size-9 place-items-center rounded-lg border border-[#dce8e9]" type="button" onClick={() => setEditorOpen(false)} aria-label="Fechar editor"><X /></button></header>
                        <div className="grid grid-cols-2 gap-3 max-[600px]:grid-cols-1">
                            <label className="grid gap-1 text-xs font-bold text-[#38515f]"><span>Público</span><select className="min-h-10 rounded-lg border border-[#dce8e9] px-3 text-sm font-normal" value={draft.workspace_id} onChange={(event) => setDraft({ ...draft, workspace_id: event.target.value })}><option value="">Todos os clientes</option>{workspaces.map((workspace) => <option key={workspace.id} value={workspace.id}>{workspace.name}</option>)}</select></label>
                            <label className="grid gap-1 text-xs font-bold text-[#38515f]"><span>Categoria</span><select className="min-h-10 rounded-lg border border-[#dce8e9] px-3 text-sm font-normal" value={draft.category} onChange={(event) => setDraft({ ...draft, category: event.target.value })}><option value="produto">Produto</option><option value="melhoria">Melhoria</option><option value="correcao">Correção</option><option value="seguranca">Segurança</option><option value="aviso">Aviso</option></select></label>
                        </div>
                        <label className="mt-3 grid gap-1 text-xs font-bold text-[#38515f]"><span>Título</span><input className="min-h-10 rounded-lg border border-[#dce8e9] px-3 text-sm font-normal" value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} maxLength={120} required /></label>
                        <label className="mt-3 grid gap-1 text-xs font-bold text-[#38515f]"><span>Resumo</span><textarea className="rounded-lg border border-[#dce8e9] p-3 text-sm font-normal" value={draft.summary} onChange={(event) => setDraft({ ...draft, summary: event.target.value })} rows={2} maxLength={280} required /></label>
                        <label className="mt-3 grid gap-1 text-xs font-bold text-[#38515f]"><span>Conteúdo</span><textarea className="rounded-lg border border-[#dce8e9] p-3 text-sm font-normal" value={draft.body} onChange={(event) => setDraft({ ...draft, body: event.target.value })} rows={9} required /></label>
                        <div className="mt-4 flex items-start gap-2 rounded-lg bg-[#f1f7f6] p-3 text-xs text-[#38515f]"><CheckCircle2 size={16} /><span>Salvar cria ou atualiza apenas o rascunho. A publicação é uma ação separada.</span></div>
                        <footer className="mt-5 flex justify-end gap-2"><button type="button" className="rounded-lg px-3 py-2 text-xs font-bold text-[#08766c]" onClick={() => setEditorOpen(false)}>Cancelar</button><button type="submit" className="inline-flex items-center gap-2 rounded-lg bg-[#08766c] px-3 py-2 text-xs font-bold text-white disabled:opacity-50" disabled={saving}>{saving ? <LoaderCircle size={16} className="animate-spin" /> : <Save size={16} />}{saving ? 'Salvando…' : 'Salvar rascunho'}</button></footer>
                    </form>
                </div>
            )}
        </main>
    );
};

export default MasterAdmin;

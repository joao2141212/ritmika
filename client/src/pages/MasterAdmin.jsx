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
import { checklistProducaoService as parityService } from '../services/checklistProducaoService';
import { usePlatformAdmin } from '../hooks/usePlatformAdmin';
import { logger } from '../lib/logger';
import '../styles/master-admin.css';

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
        return <div className="master-state"><LoaderCircle className="is-spinning" /> Verificando acesso master…</div>;
    }

    if (!isPlatformAdmin) {
        return (
            <div className="master-state master-denied">
                <ShieldCheck size={28} />
                <h1>Acesso restrito</h1>
                <p>Esta área exige privilégio de administração da plataforma.</p>
            </div>
        );
    }

    return (
        <main className="master-admin ritmika-light-mode">
            <header className="master-header">
                <div>
                    <p className="remote-eyebrow">Ritmika master</p>
                    <h1>Gestão da plataforma</h1>
                    <p>Clientes, comunicação de produto e operação global em um ambiente protegido.</p>
                </div>
                <div className="master-header-actions">
                    <button type="button" className="master-secondary" onClick={loadMasterData} disabled={loading}>
                        <RefreshCw size={16} className={loading ? 'is-spinning' : ''} /> Atualizar
                    </button>
                    <button type="button" className="master-primary" onClick={openNew}>
                        <Plus size={16} /> Nova atualização
                    </button>
                </div>
            </header>

            <section className="master-summary-grid" aria-label="Resumo da plataforma">
                <article><span><Building2 size={18} /></span><div><small>Clientes</small><strong>{workspaces.length}</strong></div></article>
                <article><span><Megaphone size={18} /></span><div><small>Publicadas</small><strong>{entries.filter((entry) => entry.is_published).length}</strong></div></article>
                <article><span><FileEdit size={18} /></span><div><small>Rascunhos</small><strong>{entries.filter((entry) => !entry.is_published).length}</strong></div></article>
                <article><span><UsersRound size={18} /></span><div><small>Alcance global</small><strong>{entries.filter((entry) => !entry.workspace_id).length}</strong></div></article>
            </section>

            <section className="master-panel">
                <div className="master-panel-heading">
                    <div><p className="remote-eyebrow">Comunicação do produto</p><h2>Novidades</h2></div>
                    <span>Publicações só aparecem após confirmação explícita.</span>
                </div>
                <div className="master-filters">
                    <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar por título, conteúdo ou cliente" />
                    <select value={status} onChange={(event) => setStatus(event.target.value)}>
                        <option value="all">Todos os estados</option>
                        <option value="draft">Rascunhos</option>
                        <option value="published">Publicadas</option>
                    </select>
                </div>

                {loading ? <div className="master-state"><LoaderCircle className="is-spinning" /> Carregando…</div>
                    : error ? <div className="master-state master-error">{error}</div>
                        : visibleEntries.length === 0 ? <div className="master-state">Nenhuma novidade corresponde aos filtros.</div>
                            : <div className="master-news-list">{visibleEntries.map((entry) => (
                                <article key={entry.id}>
                                    <button type="button" className="master-news-content" onClick={() => openEntry(entry)}>
                                        <span className={`master-status ${entry.is_published ? 'is-published' : 'is-draft'}`}>
                                            {entry.is_published ? 'Publicada' : 'Rascunho'}
                                        </span>
                                        <strong>{entry.title}</strong>
                                        <p>{entry.summary}</p>
                                        <small>{entry.workspace_id ? (entry.workspace?.name || 'Cliente específico') : 'Todos os clientes'} · {entry.category}</small>
                                    </button>
                                    <div className="master-news-actions">
                                        <button type="button" onClick={() => openEntry(entry)}><FileEdit size={15} /> Editar</button>
                                        <button type="button" className={entry.is_published ? 'is-unpublish' : 'is-publish'} onClick={() => togglePublished(entry, !entry.is_published)}>
                                            {entry.is_published ? <X size={15} /> : <Send size={15} />}
                                            {entry.is_published ? 'Retirar' : 'Publicar'}
                                        </button>
                                    </div>
                                </article>
                            ))}</div>}
            </section>

            {editorOpen && (
                <div className="master-dialog-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && setEditorOpen(false)}>
                    <form className="master-editor" onSubmit={saveDraft} role="dialog" aria-modal="true" aria-labelledby="master-editor-title">
                        <header><div><p className="remote-eyebrow">Editor seguro</p><h2 id="master-editor-title">{draft.id ? 'Editar atualização' : 'Nova atualização'}</h2></div><button type="button" onClick={() => setEditorOpen(false)} aria-label="Fechar editor"><X /></button></header>
                        <div className="master-editor-grid">
                            <label><span>Público</span><select value={draft.workspace_id} onChange={(event) => setDraft({ ...draft, workspace_id: event.target.value })}><option value="">Todos os clientes</option>{workspaces.map((workspace) => <option key={workspace.id} value={workspace.id}>{workspace.name}</option>)}</select></label>
                            <label><span>Categoria</span><select value={draft.category} onChange={(event) => setDraft({ ...draft, category: event.target.value })}><option value="produto">Produto</option><option value="melhoria">Melhoria</option><option value="correcao">Correção</option><option value="seguranca">Segurança</option><option value="aviso">Aviso</option></select></label>
                        </div>
                        <label><span>Título</span><input value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} maxLength={120} required /></label>
                        <label><span>Resumo</span><textarea value={draft.summary} onChange={(event) => setDraft({ ...draft, summary: event.target.value })} rows={2} maxLength={280} required /></label>
                        <label><span>Conteúdo</span><textarea value={draft.body} onChange={(event) => setDraft({ ...draft, body: event.target.value })} rows={9} required /></label>
                        <div className="master-editor-note"><CheckCircle2 size={16} /><span>Salvar cria ou atualiza apenas o rascunho. A publicação é uma ação separada.</span></div>
                        <footer><button type="button" className="master-secondary" onClick={() => setEditorOpen(false)}>Cancelar</button><button type="submit" className="master-primary" disabled={saving}>{saving ? <LoaderCircle size={16} className="is-spinning" /> : <Save size={16} />}{saving ? 'Salvando…' : 'Salvar rascunho'}</button></footer>
                    </form>
                </div>
            )}
        </main>
    );
};

export default MasterAdmin;

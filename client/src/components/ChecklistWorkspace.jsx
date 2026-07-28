import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    CalendarDays,
    CheckSquare2,
    CheckCircle2,
    ChevronLeft,
    ChevronRight,
    ClipboardCheck,
    Columns3,
    Download,
    Archive,
    Eye,
    EyeOff,
    Folder,
    FolderPlus,
    LayoutGrid,
    ListChecks,
    MoreHorizontal,
    Pencil,
    Play,
    Plus,
    Search,
    Square,
    Table2,
    UsersRound,
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { checklistProducaoService } from '../services/checklistProducaoService';
import { logger } from '../lib/logger';
import '../styles/checklist-workspace.css';
import '../styles/checklist-parity.css';

const isPublished = (checklist) => ['ativo', 'active'].includes(checklist?.status);

const isArchived = (checklist) => ['archived', 'arquivado'].includes(checklist?.status);

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

const statusLabelOf = (checklist) => {
    if (isArchived(checklist)) return 'Arquivado';
    return isPublished(checklist) ? 'Ativo' : 'Inativo';
};

const DEFAULT_COLUMNS = {
    checklist: true,
    responsible: true,
    sector: true,
    status: true,
    moment: true,
    execution: true,
    time: true,
};

const ChecklistWorkspace = () => {
    const navigate = useNavigate();
    const [checklists, setChecklists] = useState([]);
    const [query, setQuery] = useState('');
    const [filter, setFilter] = useState('all');
    const [unitFilter, setUnitFilter] = useState('');
    const [sectorFilter, setSectorFilter] = useState('');
    const [momentFilter, setMomentFilter] = useState('');
    const [folderFilter, setFolderFilter] = useState('');
    const [references, setReferences] = useState({ units: [], sectors: [], moments: [], profiles: [] });
    const [folders, setFolders] = useState([]);
    const [selectedIds, setSelectedIds] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [busyId, setBusyId] = useState(null);
    const [bulkBusy, setBulkBusy] = useState(false);
    const [viewMode, setViewMode] = useState('table');
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(20);
    const [columns, setColumns] = useState(DEFAULT_COLUMNS);
    const [columnsOpen, setColumnsOpen] = useState(false);
    const [bulkMenuOpen, setBulkMenuOpen] = useState(false);
    const [columnFilters, setColumnFilters] = useState({
        checklist: '',
        responsible: '',
        sector: '',
        status: '',
        moment: '',
    });
    const [folderDialogOpen, setFolderDialogOpen] = useState(false);
    const [folderName, setFolderName] = useState('');
    const [folderBusy, setFolderBusy] = useState(false);
    const [moveFolderOpen, setMoveFolderOpen] = useState(false);
    const [moveFolderId, setMoveFolderId] = useState('');

    const loadChecklists = useCallback(async () => {
        try {
            setLoading(true);
            setError('');
            const [checklistsResult, referencesResult, foldersResult] = await Promise.allSettled([
                checklistProducaoService.getManagerList(),
                checklistProducaoService.getReferences(),
                checklistProducaoService.getChecklistFolders(),
            ]);
            if (checklistsResult.status === 'rejected') throw checklistsResult.reason;
            setChecklists(Array.isArray(checklistsResult.value) ? checklistsResult.value : []);
            if (referencesResult.status === 'fulfilled') {
                setReferences({
                    units: Array.isArray(referencesResult.value?.units) ? referencesResult.value.units : [],
                    sectors: Array.isArray(referencesResult.value?.sectors) ? referencesResult.value.sectors : [],
                    moments: Array.isArray(referencesResult.value?.moments) ? referencesResult.value.moments : [],
                    profiles: Array.isArray(referencesResult.value?.profiles) ? referencesResult.value.profiles : [],
                });
            } else {
                logger.error({
                    fn: 'ChecklistWorkspace.loadReferences',
                    status: 'error',
                    error: referencesResult.reason instanceof Error
                        ? referencesResult.reason.message
                        : String(referencesResult.reason),
                });
            }
            if (foldersResult.status === 'fulfilled') {
                setFolders(Array.isArray(foldersResult.value) ? foldersResult.value : []);
            } else {
                logger.error({
                    fn: 'ChecklistWorkspace.loadFolders',
                    status: 'error',
                    error: foldersResult.reason instanceof Error
                        ? foldersResult.reason.message
                        : String(foldersResult.reason),
                });
            }
        } catch (loadError) {
            logger.error({
                fn: 'ChecklistWorkspace.loadChecklists',
                status: 'error',
                error: loadError instanceof Error ? loadError.message : String(loadError),
            });
            setError('Não foi possível carregar os checklists remotos.');
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
                || (filter === 'draft' && !isPublished(checklist) && !isArchived(checklist))
                || (filter === 'archived' && isArchived(checklist));
            const matchesUnit = !unitFilter || String(checklist.unit_id || '') === unitFilter;
            const matchesSector = !sectorFilter || String(checklist.sector_id || '') === sectorFilter;
            const matchesMoment = !momentFilter || String(checklist.moment_id || '') === momentFilter;
            const matchesFolder = !folderFilter || String(checklist.folder_id || '') === folderFilter;
            const responsible = [checklist.user_name, ...(checklist.responsaveis || [])].filter(Boolean).join(' ');
            const status = statusLabelOf(checklist);
            const searchable = [
                titleOf(checklist),
                checklist.description,
                checklist.descricao,
                checklist.tipo,
                checklist.unit_name,
                checklist.sector_name,
                checklist.moment_name,
                responsible,
            ].filter(Boolean).join(' ').toLocaleLowerCase();
            const matchesColumnFilters = (!columnFilters.checklist
                || titleOf(checklist).toLocaleLowerCase().includes(columnFilters.checklist.toLocaleLowerCase()))
                && (!columnFilters.responsible
                    || responsible.toLocaleLowerCase().includes(columnFilters.responsible.toLocaleLowerCase()))
                && (!columnFilters.sector
                    || String(checklist.sector_name || '').toLocaleLowerCase().includes(columnFilters.sector.toLocaleLowerCase()))
                && (!columnFilters.status || status === columnFilters.status)
                && (!columnFilters.moment
                    || String(checklist.moment_name || '').toLocaleLowerCase().includes(columnFilters.moment.toLocaleLowerCase()));
            return matchesFilter && matchesUnit && matchesSector && matchesMoment && matchesFolder && matchesColumnFilters
                && (!normalizedQuery || searchable.includes(normalizedQuery));
        });
    }, [checklists, columnFilters, filter, folderFilter, momentFilter, query, sectorFilter, unitFilter]);

    const pageCount = Math.max(1, Math.ceil(filteredChecklists.length / pageSize));
    const safePage = Math.min(page, pageCount);
    const pagedChecklists = useMemo(() => {
        const start = (safePage - 1) * pageSize;
        return filteredChecklists.slice(start, start + pageSize);
    }, [filteredChecklists, pageSize, safePage]);

    useEffect(() => {
        setPage(1);
    }, [columnFilters, filter, folderFilter, momentFilter, query, sectorFilter, unitFilter, pageSize]);

    useEffect(() => {
        if (page > pageCount) setPage(pageCount);
    }, [page, pageCount]);

    const publishedCount = checklists.filter(isPublished).length;
    const draftCount = checklists.filter((checklist) => !isPublished(checklist) && !isArchived(checklist)).length;
    const archivedCount = checklists.filter(isArchived).length;
    const itemCount = checklists.reduce((total, checklist) => total + itemsOf(checklist).length, 0);
    const visibleIds = pagedChecklists.map((checklist) => String(checklist.id));
    const allVisibleSelected = visibleIds.length > 0 && visibleIds.every((id) => selectedIds.includes(id));

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

    const toggleSelection = (id) => {
        const normalizedId = String(id);
        setSelectedIds((current) => current.includes(normalizedId)
            ? current.filter((item) => item !== normalizedId)
            : [...current, normalizedId]);
    };

    const toggleSelectAll = () => {
        setSelectedIds((current) => {
            if (allVisibleSelected) return current.filter((id) => !visibleIds.includes(id));
            return Array.from(new Set([...current, ...visibleIds]));
        });
    };

    const runBulkStatus = async (status) => {
        if (selectedIds.length === 0) return;
        try {
            setBulkBusy(true);
            await checklistProducaoService.bulkUpdateStatus(selectedIds, status);
            setSelectedIds([]);
            toast.success(status === 'ativo' ? 'Checklists publicados.' : 'Checklists movidos para rascunho.');
            await loadChecklists();
        } catch (bulkError) {
            logger.error({
                fn: 'ChecklistWorkspace.runBulkStatus',
                status: 'error',
                checklistIds: selectedIds,
                targetStatus: status,
                error: bulkError instanceof Error ? bulkError.message : String(bulkError),
            });
            toast.error('Não foi possível atualizar os checklists selecionados.');
        } finally {
            setBulkBusy(false);
        }
    };

    const archiveSelected = async () => {
        if (selectedIds.length === 0) return;
        try {
            setBulkBusy(true);
            await checklistProducaoService.archiveMany(selectedIds);
            setSelectedIds([]);
            toast.success('Checklists arquivados.');
            await loadChecklists();
        } catch (archiveError) {
            logger.error({
                fn: 'ChecklistWorkspace.archiveSelected',
                status: 'error',
                checklistIds: selectedIds,
                error: archiveError instanceof Error ? archiveError.message : String(archiveError),
            });
            toast.error('Não foi possível arquivar os checklists selecionados.');
        } finally {
            setBulkBusy(false);
        }
    };

    const exportChecklists = () => {
        const escapeCsv = (value) => `"${String(value ?? '').replaceAll('"', '""')}"`;
        const rows = filteredChecklists.map((checklist) => [
            titleOf(checklist),
            isArchived(checklist) ? 'Arquivado' : (isPublished(checklist) ? 'Publicado' : 'Rascunho'),
            checklist.tipo || '',
            checklist.unit_name || checklist.unit || '',
            checklist.sector_name || checklist.sector || '',
            itemsOf(checklist).length,
            scheduleOf(checklist),
            checklist.id,
        ]);
        const csv = '\uFEFF' + [
            ['Título', 'Status', 'Tipo', 'Unidade', 'Setor', 'Itens', 'Agendamento', 'Checklist ID'],
            ...rows,
        ].map((row) => row.map(escapeCsv).join(';')).join('\n');
        const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
        const link = document.createElement('a');
        link.href = url;
        link.download = 'ritmika-checklists.csv';
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.setTimeout(() => URL.revokeObjectURL(url), 0);
        toast.success('Checklists exportados.');
    };

    const updateColumnFilter = (column, value) => {
        setColumnFilters((current) => ({ ...current, [column]: value }));
    };

    const toggleColumn = (column) => {
        setColumns((current) => ({ ...current, [column]: !current[column] }));
    };

    const createFolder = async (event) => {
        event.preventDefault();
        const normalizedName = folderName.trim();
        if (!normalizedName) return;
        try {
            setFolderBusy(true);
            const folder = await checklistProducaoService.createChecklistFolder(normalizedName);
            setFolders((current) => current.some((item) => item.id === folder.id)
                ? current
                : [...current, folder]);
            setFolderName('');
            setFolderDialogOpen(false);
            toast.success('Pasta criada.');
        } catch (folderError) {
            logger.error({
                fn: 'ChecklistWorkspace.createFolder',
                status: 'error',
                error: folderError instanceof Error ? folderError.message : String(folderError),
            });
            toast.error('Não foi possível criar a pasta.');
        } finally {
            setFolderBusy(false);
        }
    };

    const moveSelectedToFolder = async () => {
        if (selectedIds.length === 0) return;
        try {
            setBulkBusy(true);
            await checklistProducaoService.moveChecklistsToFolder(selectedIds, moveFolderId || null);
            setChecklists((current) => current.map((checklist) => selectedIds.includes(String(checklist.id))
                ? { ...checklist, folder_id: moveFolderId || null }
                : checklist));
            setSelectedIds([]);
            setMoveFolderOpen(false);
            setMoveFolderId('');
            setBulkMenuOpen(false);
            toast.success(moveFolderId ? 'Checklists movidos para a pasta.' : 'Checklists removidos da pasta.');
        } catch (moveError) {
            logger.error({
                fn: 'ChecklistWorkspace.moveSelectedToFolder',
                status: 'error',
                checklistIds: selectedIds,
                folderId: moveFolderId || null,
                error: moveError instanceof Error ? moveError.message : String(moveError),
            });
            toast.error('Não foi possível mover os checklists.');
        } finally {
            setBulkBusy(false);
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
                        ['archived', 'Arquivados'],
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
                <div className="checklist-filter-selects">
                    <label>
                        <span>Unidade</span>
                        <select value={unitFilter} onChange={(event) => setUnitFilter(event.target.value)}>
                            <option value="">Todas</option>
                            {references.units.map((unit) => (
                                <option key={unit.id} value={unit.id}>{unit.name}</option>
                            ))}
                        </select>
                    </label>
                    <label>
                        <span>Setor</span>
                        <select value={sectorFilter} onChange={(event) => setSectorFilter(event.target.value)}>
                            <option value="">Todos</option>
                            {references.sectors.map((sector) => (
                                <option key={sector.id} value={sector.id}>{sector.name}</option>
                            ))}
                        </select>
                    </label>
                    <label>
                        <span>Momento</span>
                        <select value={momentFilter} onChange={(event) => setMomentFilter(event.target.value)}>
                            <option value="">Todos</option>
                            {references.moments.map((moment) => (
                                <option key={moment.id} value={moment.id}>{moment.name}</option>
                            ))}
                        </select>
                    </label>
                </div>
            </div>

            <div className="checklist-parity-toolbar" aria-label="Controles da tabela de checklists">
                <button
                    type="button"
                    className="light-button secondary"
                    onClick={() => setFolderDialogOpen(true)}
                >
                    <FolderPlus size={15} /> Nova pasta
                </button>
                <label className="checklist-folder-filter">
                    <Folder size={15} aria-hidden="true" />
                    <select value={folderFilter} onChange={(event) => setFolderFilter(event.target.value)} aria-label="Filtrar por pasta">
                        <option value="">Todas as pastas</option>
                        {folders.map((folder) => (
                            <option key={folder.id} value={folder.id}>{folder.name}</option>
                        ))}
                    </select>
                </label>
                <div className="checklist-parity-spacer" />
                <div className="checklist-view-toggle" aria-label="Modo de visualização">
                    <button
                        type="button"
                        className={viewMode === 'table' ? 'active' : ''}
                        onClick={() => setViewMode('table')}
                        aria-label="Visualização em tabela"
                    >
                        <Table2 size={15} /> Tabela
                    </button>
                    <button
                        type="button"
                        className={viewMode === 'cards' ? 'active' : ''}
                        onClick={() => setViewMode('cards')}
                        aria-label="Visualização em cartões"
                    >
                        <LayoutGrid size={15} /> Cartões
                    </button>
                </div>
                <div className="checklist-menu-anchor">
                    <button
                        type="button"
                        className="light-button ghost"
                        onClick={() => setColumnsOpen((current) => !current)}
                        aria-expanded={columnsOpen}
                    >
                        <Columns3 size={15} /> Colunas
                    </button>
                    {columnsOpen && (
                        <div className="checklist-popover checklist-columns-menu" role="menu">
                            <strong>Mostrar colunas</strong>
                            {[
                                ['checklist', 'Checklist'],
                                ['responsible', 'Responsável'],
                                ['sector', 'Setor'],
                                ['status', 'Status'],
                                ['moment', 'Momento'],
                                ['execution', 'Execução'],
                                ['time', 'Horário'],
                            ].map(([key, label]) => (
                                <label key={key} className="checklist-menu-checkbox">
                                    <input type="checkbox" checked={columns[key]} onChange={() => toggleColumn(key)} />
                                    {label}
                                </label>
                            ))}
                        </div>
                    )}
                </div>
                <div className="checklist-menu-anchor">
                    <button
                        type="button"
                        className="light-button ghost"
                        onClick={() => setBulkMenuOpen((current) => !current)}
                        aria-expanded={bulkMenuOpen}
                    >
                        <MoreHorizontal size={15} /> Ações em massa
                        {selectedIds.length > 0 ? ` (${selectedIds.length})` : ''}
                    </button>
                    {bulkMenuOpen && (
                        <div className="checklist-popover checklist-bulk-menu" role="menu">
                            <button type="button" onClick={() => setFolderDialogOpen(true)} disabled={selectedIds.length === 0}>
                                <FolderPlus size={14} /> Nova pasta
                            </button>
                            <button type="button" onClick={() => setMoveFolderOpen(true)} disabled={selectedIds.length === 0 || folders.length === 0}>
                                <Folder size={14} /> Mover para pasta
                            </button>
                            <span className="checklist-menu-separator" />
                            <button type="button" onClick={() => runBulkStatus('ativo')} disabled={selectedIds.length === 0 || bulkBusy}>
                                <CheckCircle2 size={14} /> Ativar
                            </button>
                            <button type="button" onClick={() => runBulkStatus('inativo')} disabled={selectedIds.length === 0 || bulkBusy}>
                                <EyeOff size={14} /> Desativar
                            </button>
                            <span className="checklist-menu-separator" />
                            <button type="button" onClick={exportChecklists} disabled={filteredChecklists.length === 0}>
                                <Download size={14} /> Exportar selecionados
                            </button>
                            <button type="button" disabled title="A duplicação mantém o checklist original e será liberada após o contrato de cópia remota.">
                                <ClipboardCheck size={14} /> Duplicar
                            </button>
                            <button type="button" disabled title="A troca em lote exige vínculo de unidade por checklist no contrato remoto.">
                                <Folder size={14} /> Trocar unidade
                            </button>
                            <button type="button" disabled title="A troca em lote exige vínculo de responsável por checklist no contrato remoto.">
                                <UsersRound size={14} /> Trocar responsável
                            </button>
                            <span className="checklist-menu-separator" />
                            <button type="button" onClick={archiveSelected} disabled={selectedIds.length === 0 || bulkBusy}>
                                <Archive size={14} /> Arquivar
                            </button>
                        </div>
                    )}
                </div>
            </div>

            <div className="manager-stats" aria-label="Resumo de checklists">
                <div className="manager-stat"><span>Total</span><strong>{checklists.length}</strong></div>
                <div className="manager-stat"><span>Publicados</span><strong>{publishedCount}</strong></div>
                <div className="manager-stat"><span>Rascunhos</span><strong>{draftCount}</strong></div>
                <div className="manager-stat"><span>Arquivados</span><strong>{archivedCount}</strong></div>
                <div className="manager-stat"><span>Itens modelados</span><strong>{itemCount}</strong></div>
            </div>

            <div className="checklist-bulk-toolbar" aria-label="Ações em lote">
                <label className="checklist-select-all">
                    <input
                        type="checkbox"
                        checked={allVisibleSelected}
                        onChange={toggleSelectAll}
                        disabled={visibleIds.length === 0 || bulkBusy}
                    />
                    {allVisibleSelected ? <CheckSquare2 size={16} /> : <Square size={16} />}
                    <span>Selecionar visíveis ({selectedIds.length})</span>
                </label>
                <div className="checklist-bulk-actions">
                    <button type="button" className="light-button ghost" onClick={exportChecklists} disabled={loading || filteredChecklists.length === 0}>
                        <Download size={15} /> Exportar CSV
                    </button>
                    <button type="button" className="light-button primary" onClick={() => runBulkStatus('ativo')} disabled={bulkBusy || selectedIds.length === 0}>
                        <CheckCircle2 size={15} /> Publicar selecionados
                    </button>
                    <button type="button" className="light-button secondary" onClick={() => runBulkStatus('inativo')} disabled={bulkBusy || selectedIds.length === 0}>
                        <EyeOff size={15} /> Rascunho
                    </button>
                    <button type="button" className="light-button danger" onClick={archiveSelected} disabled={bulkBusy || selectedIds.length === 0}>
                        <Archive size={15} /> Arquivar
                    </button>
                </div>
            </div>

            {loading && <div className="empty-state">Carregando modelos remotos…</div>}
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

            {!loading && !error && filteredChecklists.length > 0 && viewMode === 'table' && (
                <div className="checklist-table-shell">
                    <div className="checklist-table-scroll">
                        <table className="checklist-parity-table">
                            <thead>
                                <tr>
                                    <th className="checklist-table-select">
                                        <input
                                            type="checkbox"
                                            checked={allVisibleSelected}
                                            onChange={toggleSelectAll}
                                            aria-label="Selecionar todos os checklists visíveis"
                                            disabled={bulkBusy}
                                        />
                                    </th>
                                    {columns.checklist && <th>Checklist</th>}
                                    {columns.responsible && <th>Responsável</th>}
                                    {columns.sector && <th>Setor</th>}
                                    {columns.status && <th>Status</th>}
                                    {columns.moment && <th>Momento</th>}
                                    {columns.execution && <th>Execução</th>}
                                    {columns.time && <th>Horário</th>}
                                    <th className="checklist-table-actions">Ações</th>
                                </tr>
                                <tr className="checklist-filter-row">
                                    <th />
                                    {columns.checklist && (
                                        <th><input value={columnFilters.checklist} onChange={(event) => updateColumnFilter('checklist', event.target.value)} placeholder="Filtrar" aria-label="Filtrar coluna Checklist" /></th>
                                    )}
                                    {columns.responsible && (
                                        <th><input value={columnFilters.responsible} onChange={(event) => updateColumnFilter('responsible', event.target.value)} placeholder="Filtrar" aria-label="Filtrar coluna Responsável" /></th>
                                    )}
                                    {columns.sector && (
                                        <th><input value={columnFilters.sector} onChange={(event) => updateColumnFilter('sector', event.target.value)} placeholder="Filtrar" aria-label="Filtrar coluna Setor" /></th>
                                    )}
                                    {columns.status && (
                                        <th>
                                            <select value={columnFilters.status} onChange={(event) => updateColumnFilter('status', event.target.value)} aria-label="Filtrar coluna Status">
                                                <option value="">Todos</option>
                                                <option value="Ativo">Ativo</option>
                                                <option value="Inativo">Inativo</option>
                                                <option value="Arquivado">Arquivado</option>
                                            </select>
                                        </th>
                                    )}
                                    {columns.moment && (
                                        <th><input value={columnFilters.moment} onChange={(event) => updateColumnFilter('moment', event.target.value)} placeholder="Filtrar" aria-label="Filtrar coluna Momento" /></th>
                                    )}
                                    {columns.execution && <th />}
                                    {columns.time && <th />}
                                    <th />
                                </tr>
                            </thead>
                            <tbody>
                                {pagedChecklists.map((checklist) => {
                                    const published = isPublished(checklist);
                                    const schedule = checklist.schedule || {};
                                    const responsible = checklist.user_name || checklist.responsaveis?.join(', ') || '—';
                                    return (
                                        <tr key={checklist.id}>
                                            <td className="checklist-table-select">
                                                <input
                                                    type="checkbox"
                                                    checked={selectedIds.includes(String(checklist.id))}
                                                    onChange={() => toggleSelection(checklist.id)}
                                                    disabled={bulkBusy}
                                                    aria-label={`Selecionar ${titleOf(checklist)}`}
                                                />
                                            </td>
                                            {columns.checklist && (
                                                <td>
                                                    <button type="button" className="checklist-title-link" onClick={() => navigate(`/checklists/${encodeURIComponent(checklist.id)}/edit`)}>
                                                        {titleOf(checklist)}
                                                    </button>
                                                    <small>{itemsOf(checklist).length} itens</small>
                                                </td>
                                            )}
                                            {columns.responsible && <td>{responsible}</td>}
                                            {columns.sector && <td>{checklist.sector_name || '—'}</td>}
                                            {columns.status && (
                                                <td><span className={`status-pill ${published ? 'active' : 'inactive'}`}>{statusLabelOf(checklist)}</span></td>
                                            )}
                                            {columns.moment && <td>{checklist.moment_name || '—'}</td>}
                                            {columns.execution && <td>{scheduleOf(checklist)}</td>}
                                            {columns.time && <td>{checklist.schedule_time || schedule.schedule_time || '—'}</td>}
                                            <td className="checklist-table-actions">
                                                <button type="button" className="icon-button" onClick={() => navigate(`/checklists/${encodeURIComponent(checklist.id)}/execute`)} aria-label={`Executar ${titleOf(checklist)}`} title="Executar">
                                                    <Play size={15} />
                                                </button>
                                                <button type="button" className="icon-button" onClick={() => navigate(`/checklists/${encodeURIComponent(checklist.id)}/edit`)} aria-label={`Editar ${titleOf(checklist)}`} title="Editar">
                                                    <Pencil size={15} />
                                                </button>
                                                <button type="button" className="icon-button" onClick={() => togglePublication(checklist)} disabled={busyId === checklist.id} aria-label={published ? `Desativar ${titleOf(checklist)}` : `Ativar ${titleOf(checklist)}`} title={published ? 'Desativar' : 'Ativar'}>
                                                    {published ? <EyeOff size={15} /> : <Eye size={15} />}
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                    <footer className="checklist-table-pagination">
                        <span>
                            {((safePage - 1) * pageSize) + 1}–{Math.min(safePage * pageSize, filteredChecklists.length)} de {filteredChecklists.length}
                        </span>
                        <label>
                            Linhas por página
                            <select value={pageSize} onChange={(event) => setPageSize(Number(event.target.value))}>
                                <option value="20">20</option>
                                <option value="50">50</option>
                                <option value="100">100</option>
                            </select>
                        </label>
                        <button type="button" className="icon-button" onClick={() => setPage((current) => Math.max(1, current - 1))} disabled={safePage <= 1} aria-label="Página anterior">
                            <ChevronLeft size={16} />
                        </button>
                        <span>Página {safePage} de {pageCount}</span>
                        <button type="button" className="icon-button" onClick={() => setPage((current) => Math.min(pageCount, current + 1))} disabled={safePage >= pageCount} aria-label="Próxima página">
                            <ChevronRight size={16} />
                        </button>
                    </footer>
                </div>
            )}

            {!loading && !error && filteredChecklists.length > 0 && viewMode === 'cards' && (
                <div className="checklist-card-grid">
                    {pagedChecklists.map((checklist) => {
                        const published = isPublished(checklist);
                        const items = itemsOf(checklist);
                        return (
                            <article className="checklist-card" key={checklist.id}>
                                <label className="checklist-card-select">
                                    <input
                                        type="checkbox"
                                        checked={selectedIds.includes(String(checklist.id))}
                                        onChange={() => toggleSelection(checklist.id)}
                                        disabled={bulkBusy}
                                    />
                                    <span>Selecionar</span>
                                </label>
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

            {folderDialogOpen && (
                <div className="checklist-dialog-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setFolderDialogOpen(false); }}>
                    <form className="checklist-dialog" onSubmit={createFolder} role="dialog" aria-modal="true" aria-labelledby="new-folder-title">
                        <div className="checklist-dialog-header">
                            <div>
                                <p className="checklist-eyebrow">Organização</p>
                                <h2 id="new-folder-title">Nova pasta</h2>
                            </div>
                            <button type="button" className="icon-button" onClick={() => setFolderDialogOpen(false)} aria-label="Fechar nova pasta">×</button>
                        </div>
                        <label className="checklist-dialog-field">
                            Nome da pasta
                            <input value={folderName} onChange={(event) => setFolderName(event.target.value)} placeholder="Ex.: Operação diária" autoFocus />
                        </label>
                        <p className="checklist-dialog-help">A pasta organiza checklists de todas as unidades que você pode acessar.</p>
                        <div className="checklist-dialog-actions">
                            <button type="button" className="light-button ghost" onClick={() => setFolderDialogOpen(false)}>Cancelar</button>
                            <button type="submit" className="light-button primary" disabled={folderBusy || !folderName.trim()}>{folderBusy ? 'Criando…' : 'Criar'}</button>
                        </div>
                    </form>
                </div>
            )}

            {moveFolderOpen && (
                <div className="checklist-dialog-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setMoveFolderOpen(false); }}>
                    <form className="checklist-dialog" onSubmit={(event) => { event.preventDefault(); moveSelectedToFolder(); }} role="dialog" aria-modal="true" aria-labelledby="move-folder-title">
                        <div className="checklist-dialog-header">
                            <div>
                                <p className="checklist-eyebrow">Ação em massa</p>
                                <h2 id="move-folder-title">Mover para pasta</h2>
                            </div>
                            <button type="button" className="icon-button" onClick={() => setMoveFolderOpen(false)} aria-label="Fechar mover para pasta">×</button>
                        </div>
                        <label className="checklist-dialog-field">
                            Pasta de destino
                            <select value={moveFolderId} onChange={(event) => setMoveFolderId(event.target.value)}>
                                <option value="">Sem pasta</option>
                                {folders.map((folder) => <option key={folder.id} value={folder.id}>{folder.name}</option>)}
                            </select>
                        </label>
                        <p className="checklist-dialog-help">{selectedIds.length} checklist(s) serão atualizados no workspace remoto.</p>
                        <div className="checklist-dialog-actions">
                            <button type="button" className="light-button ghost" onClick={() => setMoveFolderOpen(false)}>Cancelar</button>
                            <button type="submit" className="light-button primary" disabled={bulkBusy}>{bulkBusy ? 'Movendo…' : 'Mover'}</button>
                        </div>
                    </form>
                </div>
            )}
        </section>
    );
};

export default ChecklistWorkspace;

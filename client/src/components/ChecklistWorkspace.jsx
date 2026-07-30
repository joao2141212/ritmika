import { lazy, Suspense, useCallback, useEffect, useMemo, useState } from 'react';
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
    Plus,
    Search,
    Square,
    Table2,
    UsersRound,
    X,
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { checklistProducaoService } from '../services/checklistProducaoService';
import { logger } from '../lib/logger';

const ChecklistBuilderWorkspace = lazy(() => import('./ChecklistBuilderWorkspace'));

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
    execution: false,
    time: false,
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
    const [filtersOpen, setFiltersOpen] = useState(false);
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
    const [editingChecklistId, setEditingChecklistId] = useState(null);

    useEffect(() => {
        if (!columnsOpen && !bulkMenuOpen) return undefined;

        const closeMenus = () => {
            setColumnsOpen(false);
            setBulkMenuOpen(false);
        };
        const closeOnOutsidePointer = (event) => {
            if (!(event.target instanceof Element) || !event.target.closest('.checklist-menu-anchor')) {
                closeMenus();
            }
        };
        const closeOnEscape = (event) => {
            if (event.key === 'Escape') closeMenus();
        };

        document.addEventListener('pointerdown', closeOnOutsidePointer);
        document.addEventListener('keydown', closeOnEscape);
        return () => {
            document.removeEventListener('pointerdown', closeOnOutsidePointer);
            document.removeEventListener('keydown', closeOnEscape);
        };
    }, [columnsOpen, bulkMenuOpen]);

    const closeEditor = useCallback(() => setEditingChecklistId(null), []);

    useEffect(() => {
        if (!editingChecklistId) return undefined;
        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        const closeOnEscape = (event) => {
            if (event.key === 'Escape') closeEditor();
        };
        window.addEventListener('keydown', closeOnEscape);
        return () => {
            document.body.style.overflow = previousOverflow;
            window.removeEventListener('keydown', closeOnEscape);
        };
    }, [closeEditor, editingChecklistId]);

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
        void Promise.resolve().then(loadChecklists);
    }, [loadChecklists]);

    const filteredChecklists = useMemo(() => {
        const normalizedQuery = normalizeSearchText(query);
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
            ].filter(Boolean).join(' ');
            const matchesColumnFilters = (!columnFilters.checklist
                || matchesSearchText(titleOf(checklist), columnFilters.checklist))
                && (!columnFilters.responsible
                    || matchesSearchText(responsible, columnFilters.responsible))
                && (!columnFilters.sector
                    || matchesSearchText(checklist.sector_name, columnFilters.sector))
                && (!columnFilters.status || status === columnFilters.status)
                && (!columnFilters.moment
                    || matchesSearchText(checklist.moment_name, columnFilters.moment));
            return matchesFilter && matchesUnit && matchesSector && matchesMoment && matchesFolder && matchesColumnFilters
                && (!normalizedQuery || normalizeSearchText(searchable).includes(normalizedQuery));
        });
    }, [checklists, columnFilters, filter, folderFilter, momentFilter, query, sectorFilter, unitFilter]);

    const pageCount = Math.max(1, Math.ceil(filteredChecklists.length / pageSize));
    const safePage = Math.min(page, pageCount);
    const pagedChecklists = useMemo(() => {
        const start = (safePage - 1) * pageSize;
        return filteredChecklists.slice(start, start + pageSize);
    }, [filteredChecklists, pageSize, safePage]);

    useEffect(() => {
        void Promise.resolve().then(() => setPage(1));
    }, [columnFilters, filter, folderFilter, momentFilter, query, sectorFilter, unitFilter, pageSize]);

    useEffect(() => {
        if (page > pageCount) void Promise.resolve().then(() => setPage(pageCount));
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

    const activeAdvancedFilters = [unitFilter, sectorFilter, momentFilter, folderFilter].filter(Boolean).length;
    const hasColumnFilters = Object.values(columnFilters).some(Boolean);
    const hasActiveFilters = Boolean(query.trim())
        || filter !== 'all'
        || activeAdvancedFilters > 0
        || hasColumnFilters;

    const clearFilters = () => {
        setQuery('');
        setFilter('all');
        setUnitFilter('');
        setSectorFilter('');
        setMomentFilter('');
        setFolderFilter('');
        setColumnFilters({
            checklist: '',
            responsible: '',
            sector: '',
            status: '',
            moment: '',
        });
        setPage(1);
    };

    return (
        <section className="min-h-screen bg-[#f4f8f8] p-5 text-[#17363d] sm:p-8">
            <header className="mx-auto mb-6 flex max-w-7xl items-start justify-between gap-5 max-[760px]:flex-col">
                <div>
                    <p className="mb-1 text-xs font-bold uppercase tracking-[0.12em] text-[#08766c]">Operação · Checklists</p>
                    <h1 className="m-0 text-[clamp(28px,4vw,42px)] font-extrabold">Modelos de checklist</h1>
                    <p className="mt-2 max-w-2xl text-sm text-[#6c8187]">
                        Crie, publique, atribua e acompanhe execuções no workspace remoto.
                    </p>
                </div>
                <button
                    type="button"
                    className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-[#08766c] px-3 text-xs font-bold text-white"
                    onClick={() => navigate('/checklists/new')}
                >
                    <Plus size={17} />
                    Novo checklist
                </button>
            </header>

            <div className="mx-auto mb-4 flex max-w-7xl flex-wrap items-center gap-3">
                <label className="flex min-h-10 min-w-60 flex-1 items-center gap-2 rounded-lg border border-[#dce8e9] bg-white px-3 text-[#6c8187]">
                    <Search size={17} aria-hidden="true" />
                    <input
                        value={query}
                        onChange={(event) => setQuery(event.target.value)}
                        placeholder="Buscar checklist"
                        aria-label="Buscar checklist"
                        className="min-w-0 flex-1 border-0 bg-transparent text-sm outline-none"
                    />
                </label>
                <div className="flex flex-wrap gap-1 rounded-lg bg-white p-1" aria-label="Filtro de status">
                    {[
                        ['all', 'Todos'],
                        ['published', 'Publicados'],
                        ['draft', 'Rascunhos'],
                        ['archived', 'Arquivados'],
                    ].map(([value, label]) => (
                        <button
                            key={value}
                            type="button"
                            className={`rounded-lg px-3 py-2 text-xs font-bold transition-colors ${filter === value ? 'bg-[#e8f8f3] text-[#08766c]' : 'text-[#6c8187]'}`}
                            onClick={() => setFilter(value)}
                        >
                            {label}
                        </button>
                    ))}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <button
                        type="button"
                        className="inline-flex min-h-10 items-center rounded-lg border border-[#dce8e9] bg-white px-3 text-xs font-bold text-[#38515f]"
                        onClick={() => setFiltersOpen((current) => !current)}
                        aria-expanded={filtersOpen}
                    >
                        {filtersOpen ? 'Ocultar filtros' : 'Filtros'}
                        {activeAdvancedFilters > 0 ? ' (' + activeAdvancedFilters + ')' : ''}
                    </button>
                    {hasActiveFilters && (
                        <button type="button" className="inline-flex min-h-10 items-center rounded-lg px-3 text-xs font-bold text-[#08766c]" onClick={clearFilters}>
                            Limpar filtros
                        </button>
                    )}
                </div>
            </div>

            {filtersOpen && (
                <div className="mx-auto mb-4 grid max-w-7xl grid-cols-4 gap-3 rounded-xl border border-[#dce8e9] bg-white p-4 max-[800px]:grid-cols-2 max-[560px]:grid-cols-1" aria-label="Filtros avançados">
                    <label className="grid gap-1 text-xs font-bold text-[#38515f]">
                        <span>Unidade</span>
                        <select className="min-h-10 rounded-lg border border-[#dce8e9] bg-white px-2 text-sm font-normal" value={unitFilter} onChange={(event) => setUnitFilter(event.target.value)}>
                            <option value="">Todas</option>
                            {references.units.map((unit) => (
                                <option key={unit.id} value={unit.id}>{unit.name}</option>
                            ))}
                        </select>
                    </label>
                    <label className="grid gap-1 text-xs font-bold text-[#38515f]">
                        <span>Setor</span>
                        <select className="min-h-10 rounded-lg border border-[#dce8e9] bg-white px-2 text-sm font-normal" value={sectorFilter} onChange={(event) => setSectorFilter(event.target.value)}>
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
                    <label>
                        <span>Pasta</span>
                        <select value={folderFilter} onChange={(event) => setFolderFilter(event.target.value)}>
                            <option value="">Todas as pastas</option>
                            {folders.map((folder) => (
                                <option key={folder.id} value={folder.id}>{folder.name}</option>
                            ))}
                        </select>
                    </label>
                </div>
            )}

            <div className="mx-auto mb-4 flex max-w-7xl flex-wrap items-center gap-3" aria-label="Controles da tabela de checklists">
                <button
                    type="button"
                    className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-[#dce8e9] bg-white px-3 text-xs font-bold text-[#38515f]"
                    onClick={() => setFolderDialogOpen(true)}
                >
                    <FolderPlus size={15} /> Nova pasta
                </button>
                <div className="flex-1" />
                <div className="flex gap-1 rounded-lg bg-white p-1" aria-label="Modo de visualização">
                    <button
                        type="button"
                        className={`rounded-lg px-3 py-2 text-xs font-bold ${viewMode === 'table' ? 'bg-[#e8f8f3] text-[#08766c]' : 'text-[#6c8187]'}`}
                        onClick={() => setViewMode('table')}
                        aria-label="Visualização em tabela"
                    >
                        <Table2 size={15} /> Tabela
                    </button>
                    <button
                        type="button"
                        className={`rounded-lg px-3 py-2 text-xs font-bold ${viewMode === 'cards' ? 'bg-[#e8f8f3] text-[#08766c]' : 'text-[#6c8187]'}`}
                        onClick={() => setViewMode('cards')}
                        aria-label="Visualização em cartões"
                    >
                        <LayoutGrid size={15} /> Cartões
                    </button>
                </div>
                <div className="relative">
                    <button
                        type="button"
                        className="inline-flex min-h-10 items-center gap-2 rounded-lg px-3 text-xs font-bold text-[#08766c]"
                        onClick={() => {
                            setColumnsOpen((current) => !current);
                            setBulkMenuOpen(false);
                        }}
                        aria-expanded={columnsOpen}
                    >
                        <Columns3 size={15} /> Colunas
                    </button>
                    {columnsOpen && (
                        <div className="absolute right-0 z-10 mt-2 grid min-w-48 gap-2 rounded-xl border border-[#dce8e9] bg-white p-3 text-xs shadow-xl" role="menu">
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
                                <label key={key} className="flex items-center gap-2 text-[#38515f]">
                                    <input type="checkbox" checked={columns[key]} onChange={() => toggleColumn(key)} />
                                    {label}
                                </label>
                            ))}
                        </div>
                    )}
                </div>
                <div className="relative">
                    <button
                        type="button"
                        className="inline-flex min-h-10 items-center gap-2 rounded-lg px-3 text-xs font-bold text-[#08766c]"
                        onClick={() => {
                            setBulkMenuOpen((current) => !current);
                            setColumnsOpen(false);
                        }}
                        aria-expanded={bulkMenuOpen}
                    >
                        <MoreHorizontal size={15} /> Ações em massa
                        {selectedIds.length > 0 ? ` (${selectedIds.length})` : ''}
                    </button>
                    {bulkMenuOpen && (
                        <div className="absolute right-0 z-10 mt-2 grid min-w-56 gap-1 rounded-xl border border-[#dce8e9] bg-white p-2 text-xs shadow-xl" role="menu">
                            <button type="button" onClick={() => setFolderDialogOpen(true)} disabled={selectedIds.length === 0}>
                                <FolderPlus size={14} /> Nova pasta
                            </button>
                            <button type="button" onClick={() => setMoveFolderOpen(true)} disabled={selectedIds.length === 0 || folders.length === 0}>
                                <Folder size={14} /> Mover para pasta
                            </button>
                            <span className="my-1 h-px bg-[#edf3f2]" />
                            <button type="button" onClick={() => runBulkStatus('ativo')} disabled={selectedIds.length === 0 || bulkBusy}>
                                <CheckCircle2 size={14} /> Ativar
                            </button>
                            <button type="button" onClick={() => runBulkStatus('inativo')} disabled={selectedIds.length === 0 || bulkBusy}>
                                <EyeOff size={14} /> Desativar
                            </button>
                            <span className="my-1 h-px bg-[#edf3f2]" />
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
                            <span className="my-1 h-px bg-[#edf3f2]" />
                            <button type="button" onClick={archiveSelected} disabled={selectedIds.length === 0 || bulkBusy}>
                                <Archive size={14} /> Arquivar
                            </button>
                        </div>
                    )}
                </div>
            </div>

            <div className="mx-auto mb-4 grid max-w-7xl grid-cols-5 gap-3 max-[800px]:grid-cols-3 max-[520px]:grid-cols-2" aria-label="Resumo de checklists">
                <div className="rounded-xl border border-[#dce8e9] bg-white p-3"><span className="text-xs text-[#6c8187]">Total</span><strong className="mt-1 block text-xl">{checklists.length}</strong></div>
                <div className="rounded-xl border border-[#dce8e9] bg-white p-3"><span className="text-xs text-[#6c8187]">Publicados</span><strong className="mt-1 block text-xl">{publishedCount}</strong></div>
                <div className="rounded-xl border border-[#dce8e9] bg-white p-3"><span className="text-xs text-[#6c8187]">Rascunhos</span><strong className="mt-1 block text-xl">{draftCount}</strong></div>
                <div className="rounded-xl border border-[#dce8e9] bg-white p-3"><span className="text-xs text-[#6c8187]">Arquivados</span><strong className="mt-1 block text-xl">{archivedCount}</strong></div>
                <div className="rounded-xl border border-[#dce8e9] bg-white p-3"><span className="text-xs text-[#6c8187]">Itens modelados</span><strong className="mt-1 block text-xl">{itemCount}</strong></div>
            </div>

            <div className="mx-auto mb-4 flex max-w-7xl flex-wrap items-center justify-between gap-3 rounded-xl border border-[#dce8e9] bg-white p-3" aria-label="Ações em lote">
                <label className="flex items-center gap-2 text-xs font-bold text-[#38515f]">
                    <input
                        type="checkbox"
                        checked={allVisibleSelected}
                        onChange={toggleSelectAll}
                        disabled={visibleIds.length === 0 || bulkBusy}
                    />
                    {allVisibleSelected ? <CheckSquare2 size={16} /> : <Square size={16} />}
                    <span>Selecionar visíveis ({selectedIds.length})</span>
                </label>
                <div className="flex flex-wrap gap-2">
                    <button type="button" className="inline-flex min-h-10 items-center gap-2 rounded-lg px-3 text-xs font-bold text-[#08766c] disabled:opacity-50" onClick={exportChecklists} disabled={loading || filteredChecklists.length === 0}>
                        <Download size={15} /> Exportar CSV
                    </button>
                    <button type="button" className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-[#08766c] px-3 text-xs font-bold text-white disabled:opacity-50" onClick={() => runBulkStatus('ativo')} disabled={bulkBusy || selectedIds.length === 0}>
                        <CheckCircle2 size={15} /> Publicar selecionados
                    </button>
                    <button type="button" className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-[#dce8e9] bg-white px-3 text-xs font-bold text-[#38515f] disabled:opacity-50" onClick={() => runBulkStatus('inativo')} disabled={bulkBusy || selectedIds.length === 0}>
                        <EyeOff size={15} /> Rascunho
                    </button>
                    <button type="button" className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-[#b42318] px-3 text-xs font-bold text-white disabled:opacity-50" onClick={archiveSelected} disabled={bulkBusy || selectedIds.length === 0}>
                        <Archive size={15} /> Arquivar
                    </button>
                </div>
            </div>

            {loading && <div className="mx-auto flex min-h-48 max-w-7xl items-center justify-center rounded-xl border border-[#dce8e9] bg-white text-sm text-[#6c8187]">Carregando modelos remotos…</div>}
            {!loading && error && (
                <div className="mx-auto flex max-w-7xl flex-col items-center gap-3 rounded-xl border border-[#f1c8c3] bg-white p-8 text-center text-[#b42318]">
                    <p>{error}</p>
                    <button type="button" className="rounded-lg border border-[#dce8e9] bg-white px-3 py-2 text-xs font-bold text-[#38515f]" onClick={loadChecklists}>Tentar novamente</button>
                </div>
            )}
            {!loading && !error && filteredChecklists.length === 0 && (
                <div className="mx-auto flex max-w-7xl flex-col items-center gap-3 rounded-xl border border-[#dce8e9] bg-white p-8 text-center text-sm text-[#6c8187]">
                    <ClipboardCheck size={30} aria-hidden="true" />
                    <p>{hasActiveFilters ? 'Nenhum checklist corresponde aos filtros aplicados.' : 'Ainda não há checklists no workspace.'}</p>
                    {hasActiveFilters ? (
                        <button type="button" className="rounded-lg border border-[#dce8e9] bg-white px-3 py-2 text-xs font-bold text-[#38515f]" onClick={clearFilters}>
                            Limpar filtros
                        </button>
                    ) : (
                        <button type="button" className="rounded-lg bg-[#08766c] px-3 py-2 text-xs font-bold text-white" onClick={() => navigate('/checklists/new')}>
                            <Plus size={16} /> Criar checklist
                        </button>
                    )}
                </div>
            )}

            {!loading && !error && filteredChecklists.length > 0 && viewMode === 'table' && (
                <div className="mx-auto max-w-7xl overflow-hidden rounded-xl border border-[#dce8e9] bg-white">
                    <div className="overflow-x-auto">
                        <table className="min-w-full border-collapse text-left text-xs">
                            <thead>
                                <tr>
                                    <th className="border-b border-[#dce8e9] bg-[#f7fbfa] px-3 py-3">
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
                                    <th className="border-b border-[#dce8e9] bg-[#f7fbfa] px-3 py-3">Ações</th>
                                </tr>
                                <tr className="border-b border-[#dce8e9] bg-[#fbfdfd]">
                                    <th />
                                    {columns.checklist && (
                                        <th className="px-2 py-2"><input className="w-full rounded border border-[#dce8e9] px-2 py-1 text-xs" value={columnFilters.checklist} onChange={(event) => updateColumnFilter('checklist', event.target.value)} placeholder="Filtrar" aria-label="Filtrar coluna Checklist" /></th>
                                    )}
                                    {columns.responsible && (
                                        <th className="px-2 py-2"><input className="w-full rounded border border-[#dce8e9] px-2 py-1 text-xs" value={columnFilters.responsible} onChange={(event) => updateColumnFilter('responsible', event.target.value)} placeholder="Filtrar" aria-label="Filtrar coluna Responsável" /></th>
                                    )}
                                    {columns.sector && (
                                        <th className="px-2 py-2"><input className="w-full rounded border border-[#dce8e9] px-2 py-1 text-xs" value={columnFilters.sector} onChange={(event) => updateColumnFilter('sector', event.target.value)} placeholder="Filtrar" aria-label="Filtrar coluna Setor" /></th>
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
                                        <tr key={checklist.id} className="hover:bg-[#fbfdfd]">
                                            <td className="border-b border-[#edf3f2] px-3 py-3" data-label="Selecionar">
                                                <input
                                                    type="checkbox"
                                                    checked={selectedIds.includes(String(checklist.id))}
                                                    onChange={() => toggleSelection(checklist.id)}
                                                    disabled={bulkBusy}
                                                    aria-label={`Selecionar ${titleOf(checklist)}`}
                                                />
                                            </td>
                                            {columns.checklist && (
                                                <td className="border-b border-[#edf3f2] px-3 py-3" data-label="Checklist">
                                                    <button type="button" className="font-bold text-[#08766c]" onClick={() => setEditingChecklistId(checklist.id)}>
                                                        {titleOf(checklist)}
                                                    </button>
                                                    <small className="ml-2 text-[11px] text-[#6c8187]">{itemsOf(checklist).length} itens</small>
                                                </td>
                                            )}
                                            {columns.responsible && <td data-label="Responsável">{responsible}</td>}
                                            {columns.sector && <td data-label="Setor">{checklist.sector_name || '—'}</td>}
                                            {columns.status && (
                                                <td className="border-b border-[#edf3f2] px-3 py-3" data-label="Status"><span className={`rounded-full px-2 py-1 text-[11px] font-bold ${published ? 'bg-[#e8f8f3] text-[#08766c]' : 'bg-[#f1f3f3] text-[#6c8187]'}`}>{statusLabelOf(checklist)}</span></td>
                                            )}
                                            {columns.moment && <td data-label="Momento">{checklist.moment_name || '—'}</td>}
                                            {columns.execution && <td data-label="Execução">{scheduleOf(checklist)}</td>}
                                            {columns.time && <td data-label="Horário">{checklist.schedule_time || schedule.schedule_time || '—'}</td>}
                                            <td className="border-b border-[#edf3f2] px-3 py-3" data-label="Ações">
                                                <button
                                                    type="button"
                                                    className="inline-flex items-center gap-1 rounded-lg bg-[#e8f8f3] px-2 py-1.5 text-xs font-bold text-[#08766c]"
                                                    onClick={() => navigate(`/checklists/${encodeURIComponent(checklist.id)}/historico`)}
                                                    aria-label={`Acompanhar ${titleOf(checklist)}`}
                                                >
                                                    <ClipboardCheck size={14} /> <span>Acompanhar</span>
                                                </button>
                                                <button type="button" className="grid size-8 place-items-center rounded-lg border border-[#dce8e9]" onClick={() => setEditingChecklistId(checklist.id)} aria-label={`Editar ${titleOf(checklist)}`} title="Editar">
                                                    <Pencil size={15} />
                                                </button>
                                                <button type="button" className="grid size-8 place-items-center rounded-lg border border-[#dce8e9] disabled:opacity-50" onClick={() => togglePublication(checklist)} disabled={busyId === checklist.id} aria-label={published ? `Desativar ${titleOf(checklist)}` : `Ativar ${titleOf(checklist)}`} title={published ? 'Desativar' : 'Ativar'}>
                                                    {published ? <EyeOff size={15} /> : <Eye size={15} />}
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                    <footer className="flex flex-wrap items-center justify-end gap-3 border-t border-[#dce8e9] p-3 text-xs text-[#6c8187]">
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
                        <button type="button" className="grid size-9 place-items-center rounded-lg border border-[#dce8e9] disabled:opacity-50" onClick={() => setPage((current) => Math.max(1, current - 1))} disabled={safePage <= 1} aria-label="Página anterior">
                            <ChevronLeft size={16} />
                        </button>
                        <span>Página {safePage} de {pageCount}</span>
                        <button type="button" className="grid size-9 place-items-center rounded-lg border border-[#dce8e9] disabled:opacity-50" onClick={() => setPage((current) => Math.min(pageCount, current + 1))} disabled={safePage >= pageCount} aria-label="Próxima página">
                            <ChevronRight size={16} />
                        </button>
                    </footer>
                </div>
            )}

            {!loading && !error && filteredChecklists.length > 0 && viewMode === 'cards' && (
                <div className="mx-auto grid max-w-7xl grid-cols-3 gap-4 max-[900px]:grid-cols-2 max-[600px]:grid-cols-1">
                    {pagedChecklists.map((checklist) => {
                        const published = isPublished(checklist);
                        const items = itemsOf(checklist);
                        return (
                            <article
                                className="rounded-xl border border-[#dce8e9] bg-white p-4 shadow-[0_8px_24px_rgba(24,48,64,0.05)]"
                                key={checklist.id}
                            >
                                <label className="mb-3 flex items-center gap-2 text-xs text-[#6c8187]">
                                    <input
                                        type="checkbox"
                                        checked={selectedIds.includes(String(checklist.id))}
                                        onChange={() => toggleSelection(checklist.id)}
                                        disabled={bulkBusy}
                                    />
                                    <span>Selecionar</span>
                                </label>
                                <div className="mb-4 flex items-start justify-between gap-3">
                                    <div>
                                        <p className="mb-1 text-xs font-bold uppercase tracking-[0.1em] text-[#08766c]">{checklist.tipo || 'Operacional'}</p>
                                        <h2 className="m-0 text-lg font-extrabold">{titleOf(checklist)}</h2>
                                    </div>
                                    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-bold ${published ? 'bg-[#e8f8f3] text-[#08766c]' : 'bg-[#f1f3f3] text-[#6c8187]'}`}>
                                        {published ? <CheckCircle2 size={13} /> : <EyeOff size={13} />}
                                        {published ? 'Publicado' : 'Rascunho'}
                                    </span>
                                </div>
                                <p>{checklist.description || checklist.descricao || 'Sem descrição cadastrada.'}</p>
                                <div className="my-4 grid gap-2 text-xs text-[#6c8187]">
                                    <span><ListChecks size={14} /> {items.length} itens</span>
                                    <span><CalendarDays size={14} /> {scheduleOf(checklist)}</span>
                                    <span><UsersRound size={14} /> {(checklist.responsaveis || []).length || 1} responsável(is)</span>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    <button
                                        type="button"
                                        className="inline-flex min-h-9 items-center gap-2 rounded-lg bg-[#08766c] px-3 text-xs font-bold text-white"
                                        onClick={() => navigate(`/checklists/${encodeURIComponent(checklist.id)}/historico`)}
                                    >
                                        <ClipboardCheck size={15} /> Acompanhar
                                    </button>
                                    <button
                                        type="button"
                                        className="inline-flex min-h-9 items-center gap-2 rounded-lg border border-[#dce8e9] bg-white px-3 text-xs font-bold text-[#38515f]"
                                        onClick={() => setEditingChecklistId(checklist.id)}
                                    >
                                        <Pencil size={15} /> Editar
                                    </button>
                                    <button
                                        type="button"
                                        className="inline-flex min-h-9 items-center gap-2 rounded-lg px-3 text-xs font-bold text-[#08766c] disabled:opacity-50"
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

            {editingChecklistId && (
                <div className="fixed inset-0 z-30 grid place-items-center bg-[#17363d]/40 p-4">
                    <section className="relative max-h-[90vh] w-full max-w-6xl overflow-y-auto rounded-2xl bg-white p-5 shadow-2xl" role="dialog" aria-modal="true" aria-label="Editar checklist">
                        <button type="button" className="absolute right-4 top-4 grid size-9 place-items-center rounded-lg border border-[#dce8e9] text-[#38515f]" onClick={closeEditor} aria-label="Fechar editor" autoFocus>
                            <X size={20} />
                        </button>
                        <Suspense fallback={<div className="p-8 text-center text-sm text-[#6c8187]" role="status">Abrindo editor…</div>}>
                            <ChecklistBuilderWorkspace
                                checklistId={editingChecklistId}
                                embedded
                                onClose={closeEditor}
                                onSaved={loadChecklists}
                            />
                        </Suspense>
                    </section>
                </div>
            )}

            {folderDialogOpen && (
                <div className="fixed inset-0 z-30 grid place-items-center bg-[#17363d]/40 p-4" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setFolderDialogOpen(false); }}>
                    <form className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl" onSubmit={createFolder} role="dialog" aria-modal="true" aria-labelledby="new-folder-title">
                        <div className="mb-5 flex items-start justify-between gap-3">
                            <div>
                                <p className="mb-1 text-xs font-bold uppercase tracking-[0.1em] text-[#08766c]">Organização</p>
                                <h2 className="m-0 text-xl font-extrabold" id="new-folder-title">Nova pasta</h2>
                            </div>
                            <button type="button" className="grid size-9 place-items-center rounded-lg border border-[#dce8e9]" onClick={() => setFolderDialogOpen(false)} aria-label="Fechar nova pasta">×</button>
                        </div>
                        <label className="grid gap-1 text-xs font-bold text-[#38515f]">
                            Nome da pasta
                            <input className="min-h-10 rounded-lg border border-[#dce8e9] px-3 text-sm font-normal" value={folderName} onChange={(event) => setFolderName(event.target.value)} placeholder="Ex.: Operação diária" autoFocus />
                        </label>
                        <p className="mt-2 text-xs text-[#6c8187]">A pasta organiza checklists de todas as unidades que você pode acessar.</p>
                        <div className="mt-5 flex justify-end gap-2">
                            <button type="button" className="rounded-lg px-3 py-2 text-xs font-bold text-[#08766c]" onClick={() => setFolderDialogOpen(false)}>Cancelar</button>
                            <button type="submit" className="rounded-lg bg-[#08766c] px-3 py-2 text-xs font-bold text-white disabled:opacity-50" disabled={folderBusy || !folderName.trim()}>{folderBusy ? 'Criando…' : 'Criar'}</button>
                        </div>
                    </form>
                </div>
            )}

            {moveFolderOpen && (
                <div className="fixed inset-0 z-30 grid place-items-center bg-[#17363d]/40 p-4" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setMoveFolderOpen(false); }}>
                    <form className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl" onSubmit={(event) => { event.preventDefault(); moveSelectedToFolder(); }} role="dialog" aria-modal="true" aria-labelledby="move-folder-title">
                        <div className="mb-5 flex items-start justify-between gap-3">
                            <div>
                                <p className="mb-1 text-xs font-bold uppercase tracking-[0.1em] text-[#08766c]">Ação em massa</p>
                                <h2 className="m-0 text-xl font-extrabold" id="move-folder-title">Mover para pasta</h2>
                            </div>
                            <button type="button" className="grid size-9 place-items-center rounded-lg border border-[#dce8e9]" onClick={() => setMoveFolderOpen(false)} aria-label="Fechar mover para pasta">×</button>
                        </div>
                        <label className="grid gap-1 text-xs font-bold text-[#38515f]">
                            Pasta de destino
                            <select className="min-h-10 rounded-lg border border-[#dce8e9] px-3 text-sm font-normal" value={moveFolderId} onChange={(event) => setMoveFolderId(event.target.value)}>
                                <option value="">Sem pasta</option>
                                {folders.map((folder) => <option key={folder.id} value={folder.id}>{folder.name}</option>)}
                            </select>
                        </label>
                        <p className="mt-2 text-xs text-[#6c8187]">{selectedIds.length} checklist(s) serão atualizados no workspace remoto.</p>
                        <div className="mt-5 flex justify-end gap-2">
                            <button type="button" className="rounded-lg px-3 py-2 text-xs font-bold text-[#08766c]" onClick={() => setMoveFolderOpen(false)}>Cancelar</button>
                            <button type="submit" className="rounded-lg bg-[#08766c] px-3 py-2 text-xs font-bold text-white disabled:opacity-50" disabled={bulkBusy}>{bulkBusy ? 'Movendo…' : 'Mover'}</button>
                        </div>
                    </form>
                </div>
            )}
        </section>
    );
};

export default ChecklistWorkspace;
import { matchesSearchText, normalizeSearchText } from '../lib/plainText';

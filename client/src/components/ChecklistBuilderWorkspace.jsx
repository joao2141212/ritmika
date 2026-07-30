import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
    ArrowLeft,
    CalendarDays,
    ChevronDown,
    ChevronUp,
    GripVertical,
    Layers3,
    ListChecks,
    Plus,
    Save,
    Send,
    Trash2,
    UserRound,
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { checklistProducaoService } from '../services/checklistProducaoService';
import { logger } from '../lib/logger';
import { toPlainText } from '../lib/plainText';

const typeOptions = [
    ['check', 'Check'],
    ['text', 'Texto'],
    ['selection', 'Lista de seleção'],
    ['date_time', 'Data/Hora'],
    ['numeric', 'Numérico'],
    ['gps', 'GPS'],
    ['barcode', 'Código de barras/QR'],
    ['separator', 'Separador'],
    ['signature', 'Assinatura'],
];

const makeId = (prefix = 'local') => {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) return `${prefix}-${crypto.randomUUID()}`;
    return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
};

const today = () => new Date().toISOString().slice(0, 10);

const emptyItem = () => ({
    id: makeId('item'),
    title: '',
    description: '',
    type: 'check',
    weight: 1,
    required: true,
    is_required: true,
    allow_not_applicable: false,
    rule: '',
    evidenceLabel: '',
    evidenceRequired: false,
    optionsCsv: 'Opção 1, Opção 2',
    config: {},
});

const itemFromSource = (item, index) => ({
    ...emptyItem(),
    ...item,
    id: item.id || makeId(`item-${index + 1}`),
    title: item.title || item.text || item.name || item.nome || `Item ${index + 1}`,
    description: toPlainText(item.description || item.descricao || ''),
    type: item.type || item.tipo_resposta || 'check',
    weight: Number(item.weight ?? item.peso ?? 1),
    required: item.required ?? item.is_required ?? item.obrigatorio !== false,
    is_required: item.is_required ?? item.required ?? item.obrigatorio !== false,
    allow_not_applicable: Boolean(item.allow_not_applicable),
    evidenceLabel: item.evidenceLabel || item.evidences?.[0]?.name || item.evidences?.[0]?.label || '',
    evidenceRequired: Boolean(
        item.evidenceRequired
        ?? item.evidence_required
        ?? item.evidences?.some((evidence) => evidence?.is_required),
    ),
    optionsCsv: Array.isArray(item.config?.options) ? item.config.options.join(', ') : 'Opção 1, Opção 2',
});

const itemsFromChecklist = (checklist) => {
    if (Array.isArray(checklist?.items) && checklist.items.length > 0) {
        return checklist.items.map(itemFromSource);
    }
    if (Array.isArray(checklist?.produtos_checklist) && checklist.produtos_checklist.length > 0) {
        return checklist.produtos_checklist.map((product, index) => itemFromSource({
            id: product.id,
            title: product.nome,
            type: product.tipo_resposta || 'numeric',
            required: product.obrigatorio !== false,
        }, index));
    }
    return [emptyItem()];
};

const ChecklistBuilderWorkspace = ({ checklistId, embedded = false, onClose, onSaved }) => {
    const navigate = useNavigate();
    const { id: routeId } = useParams();
    const id = checklistId || routeId;
    const editing = Boolean(id);
    const [loading, setLoading] = useState(editing);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [form, setForm] = useState({
        title: '',
        description: '',
        status: 'inativo',
        unit: '',
        unitId: '',
        sector: '',
        sectorId: '',
        moment: '',
        momentId: '',
        responsible: '',
        responsibleProfileId: '',
        scheduleMode: 'recorrente',
        frequency: 'semanal',
        interval: 1,
        time: '08:00',
        startDate: today(),
        endDate: '',
        weekdays: [1],
        adhocMode: 'disabled',
    });
    const [items, setItems] = useState([emptyItem()]);
    const [references, setReferences] = useState({ units: [], sectors: [], moments: [], profiles: [] });
    const [referencesLoading, setReferencesLoading] = useState(true);

    useEffect(() => {
        let active = true;
        const loadReferences = async () => {
            try {
                const loaded = await checklistProducaoService.getReferences();
                if (active) setReferences(loaded);
            } catch (loadError) {
                logger.error({
                    fn: 'ChecklistBuilderWorkspace.loadReferences',
                    status: 'error',
                    error: loadError instanceof Error ? loadError.message : String(loadError),
                });
            } finally {
                if (active) setReferencesLoading(false);
            }
        };
        loadReferences();
        return () => { active = false; };
    }, []);

    useEffect(() => {
        if (!editing) return undefined;
        let active = true;
        const loadChecklist = async () => {
            try {
                setLoading(true);
                const checklist = await checklistProducaoService.getById(id);
                if (!checklist) throw new Error('Checklist não encontrado');
                if (!active) return;
                const schedule = checklist.schedule || {};
                setForm((current) => ({
                    ...current,
                    title: checklist.title || checklist.nome || '',
                    description: toPlainText(checklist.description || checklist.descricao || ''),
                    status: ['ativo', 'active'].includes(checklist.status) ? 'ativo' : 'inativo',
                    unit: checklist.unit_name || checklist.unit || current.unit,
                    unitId: checklist.unit_id ? String(checklist.unit_id) : current.unitId,
                    sector: checklist.sector_name || checklist.sector || current.sector,
                    sectorId: checklist.sector_id ? String(checklist.sector_id) : current.sectorId,
                    moment: checklist.moment_name || checklist.moment || current.moment,
                    momentId: checklist.moment_id ? String(checklist.moment_id) : current.momentId,
                    responsible: checklist.user_name || checklist.responsaveis?.[0] || current.responsible,
                    responsibleProfileId: checklist.responsible_profile_id
                        ? String(checklist.responsible_profile_id)
                        : current.responsibleProfileId,
                    scheduleMode: checklist.schedule_recurrence_type || schedule.mode || current.scheduleMode,
                    frequency: checklist.frequency || schedule.frequency || current.frequency,
                    interval: Number(checklist.schedule_interval || schedule.interval || 1),
                    time: String(checklist.schedule_time || schedule.time || current.time).slice(0, 5),
                    startDate: checklist.schedule_start_date || schedule.startDate || current.startDate,
                    endDate: checklist.schedule_end_date || schedule.endDate || '',
                    weekdays: Array.isArray(schedule.weekdays)
                        ? schedule.weekdays
                        : checklist.schedule_day_of_week == null ? current.weekdays : [checklist.schedule_day_of_week],
                    adhocMode: checklist.adhoc_mode || schedule.adhoc_mode || current.adhocMode,
                }));
                setItems(itemsFromChecklist(checklist));
            } catch (loadError) {
                logger.error({
                    fn: 'ChecklistBuilderWorkspace.loadChecklist',
                    status: 'error',
                    checklistId: id,
                    error: loadError instanceof Error ? loadError.message : String(loadError),
                });
                if (active) setError('Não foi possível abrir este checklist remoto.');
            } finally {
                if (active) setLoading(false);
            }
        };
        loadChecklist();
        return () => { active = false; };
    }, [editing, id]);

    const updateForm = (field, value) => setForm((current) => ({ ...current, [field]: value }));

    const updateReference = (idField, labelField, options, value) => {
        const selected = options.find((option) => option.id === value);
        setForm((current) => ({
            ...current,
            [idField]: value,
            [labelField]: selected?.name || '',
        }));
    };

    const updateItem = (itemId, field, value) => {
        setItems((current) => current.map((item) => (
            item.id === itemId ? { ...item, [field]: value } : item
        )));
    };

    const removeItem = (itemId) => {
        setItems((current) => {
            const next = current.filter((item) => item.id !== itemId);
            return next.length > 0 ? next : [emptyItem()];
        });
    };

    const moveItem = (index, direction) => {
        const target = index + direction;
        if (target < 0 || target >= items.length) return;
        setItems((current) => {
            const next = [...current];
            [next[index], next[target]] = [next[target], next[index]];
            return next;
        });
    };

    const payloadFor = (status) => {
        const normalizedItems = items.map((item, index) => ({
            ...item,
            title: item.title.trim(),
            text: item.title.trim(),
            name: item.title.trim(),
            description: toPlainText(item.description),
            descricao: toPlainText(item.description),
            order: index,
            is_required: Boolean(item.required),
            required: Boolean(item.required),
            config: {
                ...(item.config || {}),
                ...(item.type === 'selection'
                    ? { options: item.optionsCsv.split(',').map((option) => option.trim()).filter(Boolean) }
                    : {}),
            },
            evidences: item.evidenceLabel.trim()
                ? [{
                    name: item.evidenceLabel.trim(),
                    type: 'file',
                    is_required: Boolean(item.evidenceRequired),
                }]
                : [],
        }));

        return {
            title: form.title.trim(),
            nome: form.title.trim(),
            description: toPlainText(form.description),
            descricao: toPlainText(form.description),
            status,
            unit: form.unit,
            unit_id: form.unitId || null,
            sector: form.sector,
            sector_id: form.sectorId || null,
            moment: form.moment,
            moment_id: form.momentId || null,
            user_name: form.responsible,
            responsible_profile_id: form.responsibleProfileId || null,
            responsaveis: form.responsible ? [form.responsible] : [],
            schedule_recurrence_type: form.scheduleMode,
            schedule_time: form.time,
            schedule_start_date: form.startDate,
            schedule_end_date: form.endDate || null,
            schedule_interval: Number(form.interval) || 1,
            schedule_day_of_week: form.weekdays[0] ?? null,
            adhoc_mode: form.adhocMode,
            schedule: {
                mode: form.scheduleMode,
                frequency: form.frequency,
                time: form.time,
                startDate: form.startDate,
                endDate: form.endDate || null,
                interval: Number(form.interval) || 1,
                weekdays: form.weekdays,
                adhoc_mode: form.adhocMode,
            },
            items: normalizedItems,
        };
    };

    const handleSave = async (statusOverride = form.status) => {
        const title = form.title.trim();
        const validItems = items.filter((item) => item.title.trim() || item.type === 'separator');
        if (!title) {
            toast.error('Dê um título para o checklist.');
            return;
        }
        if (validItems.length === 0) {
            toast.error('Adicione pelo menos um item.');
            return;
        }

        try {
            setSaving(true);
            const payload = payloadFor(statusOverride);
            if (editing) {
                await checklistProducaoService.update(id, payload);
            } else {
                await checklistProducaoService.create(payload);
            }
            toast.success(statusOverride === 'ativo' ? 'Checklist publicado.' : 'Rascunho salvo.');
            if (onSaved) await onSaved();
            if (embedded) onClose?.();
            else navigate('/checklists');
        } catch (saveError) {
            logger.error({
                fn: 'ChecklistBuilderWorkspace.handleSave',
                status: 'error',
                checklistId: id || null,
                error: saveError instanceof Error ? saveError.message : String(saveError),
            });
            toast.error('Não foi possível salvar o checklist.');
        } finally {
            setSaving(false);
        }
    };

    const previewItems = useMemo(() => items.filter((item) => item.type !== 'separator'), [items]);

    if (loading) {
        return <section className="mx-auto grid min-h-[320px] max-w-6xl place-items-center p-6 text-slate-600"><div className="rounded-2xl border border-slate-200 bg-white px-6 py-8 shadow-sm">Abrindo checklist remoto…</div></section>;
    }

    if (error) {
        return (
            <section className="mx-auto grid min-h-[320px] max-w-6xl place-items-center p-6">
                <div className="grid gap-4 rounded-2xl border border-red-200 bg-red-50 p-6 text-red-800"><p>{error}</p><button type="button" className="inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-300 bg-white px-4 font-bold text-slate-700 transition hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-600" onClick={() => embedded ? onClose?.() : navigate('/checklists')}>Voltar</button></div>
            </section>
        );
    }

    return (
        <section className="mx-auto grid max-w-7xl gap-6 p-4 text-slate-900 sm:p-6 lg:p-8">
            <header className="flex flex-col gap-5 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:flex-row sm:items-end sm:justify-between sm:p-7">
                <div>
                    <button type="button" className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 font-bold text-slate-700 transition hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-600" onClick={() => embedded ? onClose?.() : navigate('/checklists')}>
                        <ArrowLeft size={16} /> Checklists
                    </button>
                    <p className="mt-5 text-xs font-extrabold uppercase tracking-[0.14em] text-teal-700">{editing ? 'Editar modelo' : 'Novo modelo'}</p>
                    <h1 className="mt-2 text-3xl font-extrabold tracking-tight sm:text-4xl">{editing ? form.title || 'Editar checklist' : 'Novo checklist'}</h1>
                    <p className="mt-2 max-w-2xl text-slate-600">Modele itens, evidências, agenda e origem da execução.</p>
                </div>
                <div className="flex flex-wrap gap-3">
                    <button type="button" className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 font-bold text-slate-700 transition hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-600 disabled:cursor-wait disabled:opacity-60" disabled={saving} onClick={() => handleSave('inativo')}>
                        <Save size={16} /> Salvar rascunho
                    </button>
                    <button type="button" className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-teal-700 px-4 font-bold text-white transition hover:bg-teal-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-600 disabled:cursor-wait disabled:opacity-60" disabled={saving} onClick={() => handleSave('ativo')}>
                        <Send size={16} /> Publicar
                    </button>
                </div>
            </header>

            <div className="grid min-w-0 gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
                <div className="grid min-w-0 gap-6">
                    <section className="grid gap-5 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
                        <h2 className="text-xl font-extrabold">Identidade do checklist</h2>
                        <div className="grid gap-4">
                            <label className="grid gap-2 font-bold text-slate-700">Título
                                <input className="min-h-11 rounded-xl border border-slate-300 px-3.5 text-slate-900 outline-none transition focus:border-teal-600 focus:ring-4 focus:ring-teal-600/15" value={form.title} onChange={(event) => updateForm('title', event.target.value)} placeholder="Ex.: Abertura da cozinha" />
                            </label>
                            <label className="grid gap-2 font-bold text-slate-700">Descrição
                                <textarea className="min-h-28 rounded-xl border border-slate-300 px-3.5 py-3 text-slate-900 outline-none transition focus:border-teal-600 focus:ring-4 focus:ring-teal-600/15" value={form.description} onChange={(event) => updateForm('description', event.target.value)} placeholder="Explique a finalidade e o processo de execução." />
                            </label>
                        </div>
                    </section>

                    <section className="grid gap-5 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
                        <div className="flex flex-col gap-3 border-b border-slate-200 pb-4 sm:flex-row sm:items-start sm:justify-between">
                            <div>
                                <h2><ListChecks size={19} /> Itens do checklist</h2>
                                <p>Use os tipos observados no Koncluí e mantenha a ordem da execução.</p>
                            </div>
                            <button type="button" className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-slate-300 bg-white px-3.5 font-bold text-slate-700 transition hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-600" onClick={() => setItems((current) => [...current, emptyItem()])}>
                                <Plus size={16} /> Adicionar item
                            </button>
                        </div>
                        <div className="grid gap-4">
                            {items.map((item, index) => (
                                <article className="grid gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:p-5" key={item.id}>
                                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                        <h2 className="flex min-w-0 items-center gap-2 text-lg font-extrabold"><span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-teal-100 text-sm text-teal-800">{index + 1}</span><span className="truncate">{item.title || 'Item sem título'}</span></h2>
                                        <div className="flex items-center gap-2">
                                            <GripVertical size={17} aria-hidden="true" />
                                            <button type="button" className="grid h-10 w-10 place-items-center rounded-lg border border-slate-300 bg-white text-slate-700 transition hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-600 disabled:cursor-not-allowed disabled:opacity-40" aria-label={`Mover item ${index + 1} para cima`} disabled={index === 0} onClick={() => moveItem(index, -1)}><ChevronUp size={16} aria-hidden="true" /></button>
                                            <button type="button" className="grid h-10 w-10 place-items-center rounded-lg border border-slate-300 bg-white text-slate-700 transition hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-600 disabled:cursor-not-allowed disabled:opacity-40" aria-label={`Mover item ${index + 1} para baixo`} disabled={index === items.length - 1} onClick={() => moveItem(index, 1)}><ChevronDown size={16} aria-hidden="true" /></button>
                                            <button type="button" className="grid h-10 w-10 place-items-center rounded-lg border border-slate-300 bg-white text-slate-700 transition hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-600" aria-label={`Remover item ${index + 1}`} onClick={() => removeItem(item.id)}><Trash2 size={16} /></button>
                                        </div>
                                    </div>
                                    <div className="grid gap-4">
                                        <div className="grid gap-4 sm:grid-cols-2">
                                            <label className="grid gap-2 font-bold text-slate-700">Título do item
                                                <input className="min-h-11 rounded-xl border border-slate-300 bg-white px-3.5 text-slate-900 outline-none focus:border-teal-600 focus:ring-4 focus:ring-teal-600/15" value={item.title} onChange={(event) => updateItem(item.id, 'title', event.target.value)} placeholder="Descreva a atividade" />
                                            </label>
                                            <label className="grid gap-2 font-bold text-slate-700">Tipo de item
                                                <select className="min-h-11 rounded-xl border border-slate-300 bg-white px-3.5 text-slate-900 outline-none focus:border-teal-600 focus:ring-4 focus:ring-teal-600/15" value={item.type} onChange={(event) => updateItem(item.id, 'type', event.target.value)}>
                                                    {typeOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                                                </select>
                                            </label>
                                            <label className="grid gap-2 font-bold text-slate-700 sm:col-span-2">Descrição da atividade
                                                <textarea className="min-h-24 rounded-xl border border-slate-300 px-3.5 py-3 text-slate-900 outline-none focus:border-teal-600 focus:ring-4 focus:ring-teal-600/15" value={item.description} onChange={(event) => updateItem(item.id, 'description', event.target.value)} placeholder="Instruções adicionais para o operador" />
                                            </label>
                                        </div>
                                        {item.type === 'selection' && (
                                            <label className="grid gap-2 font-bold text-slate-700">Opções separadas por vírgula
                                                <input className="min-h-11 rounded-xl border border-slate-300 bg-white px-3.5 text-slate-900 outline-none focus:border-teal-600 focus:ring-4 focus:ring-teal-600/15" value={item.optionsCsv} onChange={(event) => updateItem(item.id, 'optionsCsv', event.target.value)} />
                                            </label>
                                        )}
                                        <div className="grid gap-4 sm:grid-cols-2">
                                            <label className="grid gap-2 font-bold text-slate-700">Evidência
                                                <input className="min-h-11 rounded-xl border border-slate-300 bg-white px-3.5 text-slate-900 outline-none focus:border-teal-600 focus:ring-4 focus:ring-teal-600/15" value={item.evidenceLabel} onChange={(event) => updateItem(item.id, 'evidenceLabel', event.target.value)} placeholder="Ex.: Foto do equipamento" />
                                            </label>
                                            <label className="grid gap-2 font-bold text-slate-700">Peso
                                                <input className="min-h-11 rounded-xl border border-slate-300 bg-white px-3.5 text-slate-900 outline-none focus:border-teal-600 focus:ring-4 focus:ring-teal-600/15" type="number" min="0" step="0.5" value={item.weight} onChange={(event) => updateItem(item.id, 'weight', event.target.value)} />
                                            </label>
                                        </div>
                                        <div className="grid gap-3 sm:grid-cols-2">
                                            <label className="flex min-h-11 items-center gap-2 font-semibold text-slate-700"><input type="checkbox" checked={item.required} onChange={(event) => updateItem(item.id, 'required', event.target.checked)} /> Obrigatório</label>
                                            <label className="flex min-h-11 items-center gap-2 font-semibold text-slate-700"><input type="checkbox" checked={item.allow_not_applicable} onChange={(event) => updateItem(item.id, 'allow_not_applicable', event.target.checked)} /> Permitir não se aplica</label>
                                            <label className="flex min-h-11 items-center gap-2 font-semibold text-slate-700">
                                                <input
                                                    type="checkbox"
                                                    checked={item.evidenceRequired}
                                                    disabled={!item.evidenceLabel.trim()}
                                                    onChange={(event) => updateItem(item.id, 'evidenceRequired', event.target.checked)}
                                                />
                                                Exigir evidência
                                            </label>
                                            <label className="grid gap-2 font-bold text-slate-700">Regra de visibilidade
                                                <select className="min-h-11 rounded-xl border border-slate-300 bg-white px-3.5 text-slate-900 outline-none focus:border-teal-600 focus:ring-4 focus:ring-teal-600/15" value={item.rule} onChange={(event) => updateItem(item.id, 'rule', event.target.value)}>
                                                    <option value="">Sempre visível</option>
                                                    <option value="show_if_yes">Se anterior = SIM</option>
                                                    <option value="show_if_no">Se anterior = NÃO</option>
                                                </select>
                                            </label>
                                        </div>
                                    </div>
                                </article>
                            ))}
                        </div>
                    </section>

                    <section className="grid gap-5 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
                        <h2><CalendarDays size={19} /> Agenda do operador</h2>
                        <div className="grid gap-4 md:grid-cols-3">
                            <label className="grid gap-2 font-bold text-slate-700">Modo
                                <select className="min-h-11 rounded-xl border border-slate-300 bg-white px-3.5 text-slate-900 outline-none focus:border-teal-600 focus:ring-4 focus:ring-teal-600/15" value={form.scheduleMode} onChange={(event) => updateForm('scheduleMode', event.target.value)}>
                                    <option value="recorrente">Recorrente</option>
                                    <option value="unica">Execução única</option>
                                    <option value="pontual">Apenas pontual</option>
                                </select>
                            </label>
                            <label className="grid gap-2 font-bold text-slate-700">Frequência
                                <select className="min-h-11 rounded-xl border border-slate-300 bg-white px-3.5 text-slate-900 outline-none focus:border-teal-600 focus:ring-4 focus:ring-teal-600/15" value={form.frequency} onChange={(event) => updateForm('frequency', event.target.value)}>
                                    <option value="diaria">Diária</option>
                                    <option value="semanal">Semanal</option>
                                    <option value="mensal">Mensal</option>
                                </select>
                            </label>
                            <label className="grid gap-2 font-bold text-slate-700">Repetir a cada
                                <input className="min-h-11 rounded-xl border border-slate-300 bg-white px-3.5 text-slate-900 outline-none focus:border-teal-600 focus:ring-4 focus:ring-teal-600/15" type="number" min="1" value={form.interval} onChange={(event) => updateForm('interval', event.target.value)} />
                            </label>
                            <label className="grid gap-2 font-bold text-slate-700">Data de início
                                <input className="min-h-11 rounded-xl border border-slate-300 bg-white px-3.5 text-slate-900 outline-none focus:border-teal-600 focus:ring-4 focus:ring-teal-600/15" type="date" value={form.startDate} onChange={(event) => updateForm('startDate', event.target.value)} />
                            </label>
                            <label className="grid gap-2 font-bold text-slate-700">Horário limite
                                <input className="min-h-11 rounded-xl border border-slate-300 bg-white px-3.5 text-slate-900 outline-none focus:border-teal-600 focus:ring-4 focus:ring-teal-600/15" type="time" value={form.time} onChange={(event) => updateForm('time', event.target.value)} />
                            </label>
                            <label className="grid gap-2 font-bold text-slate-700">Data de término
                                <input className="min-h-11 rounded-xl border border-slate-300 bg-white px-3.5 text-slate-900 outline-none focus:border-teal-600 focus:ring-4 focus:ring-teal-600/15" type="date" value={form.endDate} onChange={(event) => updateForm('endDate', event.target.value)} />
                            </label>
                        </div>
                        <div className="mt-4 flex flex-wrap gap-3">
                            {[['D', 0], ['S', 1], ['T', 2], ['Q', 3], ['Q', 4], ['S', 5], ['S', 6]].map(([label, value]) => (
                                <label className="flex min-h-11 items-center gap-2 rounded-lg border border-slate-200 px-3 font-semibold text-slate-700" key={`${label}-${value}`}><input type="checkbox" checked={form.weekdays.includes(value)} onChange={(event) => updateForm('weekdays', event.target.checked ? [...new Set([...form.weekdays, value])] : form.weekdays.filter((day) => day !== value))} /> {label}</label>
                            ))}
                        </div>
                    </section>

                    <section className="grid gap-5 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
                        <h2 className="flex items-center gap-2 text-xl font-extrabold"><Layers3 size={19} aria-hidden="true" /> Contexto e atribuição</h2>
                        {referencesLoading && <p className="text-sm text-slate-600">Carregando referências do workspace…</p>}
                        <div className="grid gap-4 md:grid-cols-3">
                            <label className="grid gap-2 font-bold text-slate-700">Unidade
                                <select className="min-h-11 rounded-xl border border-slate-300 bg-white px-3.5 text-slate-900 outline-none focus:border-teal-600 focus:ring-4 focus:ring-teal-600/15 disabled:cursor-wait disabled:opacity-60" value={form.unitId} disabled={referencesLoading} onChange={(event) => updateReference('unitId', 'unit', references.units, event.target.value)}>
                                    <option value="">Selecione uma unidade</option>
                                    {references.units.map((option) => <option key={option.id} value={option.id}>{option.name}</option>)}
                                </select>
                            </label>
                            <label className="grid gap-2 font-bold text-slate-700">Setor
                                <select className="min-h-11 rounded-xl border border-slate-300 bg-white px-3.5 text-slate-900 outline-none focus:border-teal-600 focus:ring-4 focus:ring-teal-600/15 disabled:cursor-wait disabled:opacity-60" value={form.sectorId} disabled={referencesLoading} onChange={(event) => updateReference('sectorId', 'sector', references.sectors, event.target.value)}>
                                    <option value="">Selecione um setor</option>
                                    {references.sectors.map((option) => <option key={option.id} value={option.id}>{option.name}</option>)}
                                </select>
                            </label>
                            <label className="grid gap-2 font-bold text-slate-700">Momento
                                <select className="min-h-11 rounded-xl border border-slate-300 bg-white px-3.5 text-slate-900 outline-none focus:border-teal-600 focus:ring-4 focus:ring-teal-600/15 disabled:cursor-wait disabled:opacity-60" value={form.momentId} disabled={referencesLoading} onChange={(event) => updateReference('momentId', 'moment', references.moments, event.target.value)}>
                                    <option value="">Selecione um momento</option>
                                    {references.moments.map((option) => <option key={option.id} value={option.id}>{option.name}</option>)}
                                </select>
                            </label>
                            <label className="grid gap-2 font-bold text-slate-700"><span className="flex items-center gap-2"><UserRound size={14} aria-hidden="true" /> Responsável padrão</span>
                                <select className="min-h-11 rounded-xl border border-slate-300 bg-white px-3.5 text-slate-900 outline-none focus:border-teal-600 focus:ring-4 focus:ring-teal-600/15 disabled:cursor-wait disabled:opacity-60" value={form.responsibleProfileId} disabled={referencesLoading} onChange={(event) => updateReference('responsibleProfileId', 'responsible', references.profiles, event.target.value)}>
                                    <option value="">Selecione um responsável</option>
                                    {references.profiles.map((option) => <option key={option.id} value={option.id}>{option.name}</option>)}
                                </select>
                            </label>
                            <label className="grid gap-2 font-bold text-slate-700">Execução pontual
                                <select className="min-h-11 rounded-xl border border-slate-300 bg-white px-3.5 text-slate-900 outline-none focus:border-teal-600 focus:ring-4 focus:ring-teal-600/15" value={form.adhocMode} onChange={(event) => updateForm('adhocMode', event.target.value)}>
                                    <option value="disabled">Não usar</option>
                                    <option value="panel">Somente pelo painel</option>
                                    <option value="app">Somente pelo app</option>
                                    <option value="both">Painel e app</option>
                                </select>
                            </label>
                            <label className="grid gap-2 font-bold text-slate-700">Status inicial
                                <select className="min-h-11 rounded-xl border border-slate-300 bg-white px-3.5 text-slate-900 outline-none focus:border-teal-600 focus:ring-4 focus:ring-teal-600/15" value={form.status} onChange={(event) => updateForm('status', event.target.value)}>
                                    <option value="inativo">Rascunho</option>
                                    <option value="ativo">Publicado</option>
                                </select>
                            </label>
                        </div>
                    </section>
                </div>

                <aside className="grid min-w-0">
                    <div className="grid gap-4 rounded-3xl border border-slate-200 bg-slate-900 p-4 text-white shadow-sm" aria-label="Prévia da execução">
                        <div className="flex items-center justify-between text-xs text-slate-300"><span>Ritmika operador</span><span>09:41</span></div>
                        <div className="grid gap-4 rounded-2xl bg-white p-4 text-slate-900">
                            <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-teal-700">Prévia</p>
                            <h2 className="text-xl font-extrabold">{form.title || 'Novo checklist'}</h2>
                            <div className="h-2 overflow-hidden rounded-full bg-slate-200"><span className="block h-full w-0 bg-teal-600" /></div>
                            {previewItems.length === 0 && <p>Nenhum item no checklist.</p>}
                            {previewItems.map((item, index) => (
                                <div className="grid gap-2 rounded-xl border border-slate-200 p-3" key={item.id}>
                                    <strong>{index + 1}. {item.title || 'Sem título'}{item.required ? <span className="text-red-600"> *</span> : null}</strong>
                                    {item.description && <small className="text-slate-600">{item.description}</small>}
                                    <div className="rounded-lg bg-slate-100 px-3 py-2 text-sm text-slate-600">{typeOptions.find(([value]) => value === item.type)?.[1] || 'Resposta'}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                </aside>
            </div>
        </section>
    );
};

export default ChecklistBuilderWorkspace;

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
import '../styles/checklist-workspace.css';

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
    optionsCsv: 'Opção 1, Opção 2',
    config: {},
});

const itemFromSource = (item, index) => ({
    ...emptyItem(),
    ...item,
    id: item.id || makeId(`item-${index + 1}`),
    title: item.title || item.text || item.name || item.nome || `Item ${index + 1}`,
    description: item.description || item.descricao || '',
    type: item.type || item.tipo_resposta || 'check',
    weight: Number(item.weight ?? item.peso ?? 1),
    required: item.required ?? item.is_required ?? item.obrigatorio !== false,
    is_required: item.is_required ?? item.required ?? item.obrigatorio !== false,
    allow_not_applicable: Boolean(item.allow_not_applicable),
    evidenceLabel: item.evidenceLabel || item.evidences?.[0]?.name || item.evidences?.[0]?.label || '',
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

const ChecklistBuilderWorkspace = () => {
    const navigate = useNavigate();
    const { id } = useParams();
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
                    description: checklist.description || checklist.descricao || '',
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
                    adhocMode: checklist.adhoc_mode || current.adhocMode,
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
                ? [{ name: item.evidenceLabel.trim(), type: 'text', is_required: false }]
                : [],
        }));

        return {
            title: form.title.trim(),
            nome: form.title.trim(),
            description: form.description.trim(),
            descricao: form.description.trim(),
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
            navigate('/checklists');
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
        return <section className="ritmika-light-mode"><div className="empty-state">Abrindo checklist remoto…</div></section>;
    }

    if (error) {
        return (
            <section className="ritmika-light-mode">
                <div className="error-state"><p>{error}</p><button type="button" className="light-button secondary" onClick={() => navigate('/checklists')}>Voltar</button></div>
            </section>
        );
    }

    return (
        <section className="ritmika-light-mode">
            <header className="builder-topbar">
                <div>
                    <button type="button" className="light-button secondary" onClick={() => navigate('/checklists')}>
                        <ArrowLeft size={16} /> Checklists
                    </button>
                    <p className="builder-eyebrow">{editing ? 'Editar modelo' : 'Novo modelo'}</p>
                    <h1>{editing ? form.title || 'Editar checklist' : 'Novo checklist'}</h1>
                    <p className="builder-subtitle">Modele itens, evidências, agenda e origem da execução.</p>
                </div>
                <div className="builder-actions">
                    <button type="button" className="light-button secondary" disabled={saving} onClick={() => handleSave('inativo')}>
                        <Save size={16} /> Salvar rascunho
                    </button>
                    <button type="button" className="light-button primary" disabled={saving} onClick={() => handleSave('ativo')}>
                        <Send size={16} /> Publicar
                    </button>
                </div>
            </header>

            <div className="builder-main-grid">
                <div className="builder-column">
                    <section className="builder-panel">
                        <h2>Identidade do checklist</h2>
                        <div className="field-grid">
                            <label className="field-label full">Título
                                <input className="light-input" value={form.title} onChange={(event) => updateForm('title', event.target.value)} placeholder="Ex.: Abertura da cozinha" />
                            </label>
                            <label className="field-label full">Descrição
                                <textarea className="light-textarea" value={form.description} onChange={(event) => updateForm('description', event.target.value)} placeholder="Explique a finalidade e o processo de execução." />
                            </label>
                        </div>
                    </section>

                    <section className="builder-panel">
                        <div className="item-editor-head">
                            <div>
                                <h2><ListChecks size={19} /> Itens do checklist</h2>
                                <p>Use os tipos observados no Koncluí e mantenha a ordem da execução.</p>
                            </div>
                            <button type="button" className="light-button ghost" onClick={() => setItems((current) => [...current, emptyItem()])}>
                                <Plus size={16} /> Adicionar item
                            </button>
                        </div>
                        <div className="item-list">
                            {items.map((item, index) => (
                                <article className="item-editor" key={item.id}>
                                    <div className="item-editor-head">
                                        <h2><span className="item-number">{index + 1}</span>{item.title || 'Item sem título'}</h2>
                                        <div className="item-editor-tools">
                                            <GripVertical size={17} aria-hidden="true" />
                                            <button type="button" className="light-icon-button" aria-label={`Mover item ${index + 1} para cima`} disabled={index === 0} onClick={() => moveItem(index, -1)}><ChevronUp size={16} /></button>
                                            <button type="button" className="light-icon-button" aria-label={`Mover item ${index + 1} para baixo`} disabled={index === items.length - 1} onClick={() => moveItem(index, 1)}><ChevronDown size={16} /></button>
                                            <button type="button" className="light-icon-button" aria-label={`Remover item ${index + 1}`} onClick={() => removeItem(item.id)}><Trash2 size={16} /></button>
                                        </div>
                                    </div>
                                    <div className="item-editor-body">
                                        <div className="field-grid">
                                            <label className="field-label">Título do item
                                                <input className="light-input" value={item.title} onChange={(event) => updateItem(item.id, 'title', event.target.value)} placeholder="Descreva a atividade" />
                                            </label>
                                            <label className="field-label">Tipo de item
                                                <select className="light-select" value={item.type} onChange={(event) => updateItem(item.id, 'type', event.target.value)}>
                                                    {typeOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                                                </select>
                                            </label>
                                            <label className="field-label full">Descrição da atividade
                                                <textarea className="light-textarea" value={item.description} onChange={(event) => updateItem(item.id, 'description', event.target.value)} placeholder="Instruções adicionais para o operador" />
                                            </label>
                                        </div>
                                        {item.type === 'selection' && (
                                            <label className="field-label">Opções separadas por vírgula
                                                <input className="light-input" value={item.optionsCsv} onChange={(event) => updateItem(item.id, 'optionsCsv', event.target.value)} />
                                            </label>
                                        )}
                                        <div className="item-options">
                                            <label className="field-label">Evidência
                                                <input className="light-input" value={item.evidenceLabel} onChange={(event) => updateItem(item.id, 'evidenceLabel', event.target.value)} placeholder="Ex.: Foto do equipamento" />
                                            </label>
                                            <label className="field-label">Peso
                                                <input className="light-input" type="number" min="0" step="0.5" value={item.weight} onChange={(event) => updateItem(item.id, 'weight', event.target.value)} />
                                            </label>
                                        </div>
                                        <div className="field-grid">
                                            <label className="checkbox-row"><input type="checkbox" checked={item.required} onChange={(event) => updateItem(item.id, 'required', event.target.checked)} /> Obrigatório</label>
                                            <label className="checkbox-row"><input type="checkbox" checked={item.allow_not_applicable} onChange={(event) => updateItem(item.id, 'allow_not_applicable', event.target.checked)} /> Permitir não se aplica</label>
                                            <label className="field-label">Regra de visibilidade
                                                <select className="light-select" value={item.rule} onChange={(event) => updateItem(item.id, 'rule', event.target.value)}>
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

                    <section className="builder-panel">
                        <h2><CalendarDays size={19} /> Agenda do operador</h2>
                        <div className="field-grid three">
                            <label className="field-label">Modo
                                <select className="light-select" value={form.scheduleMode} onChange={(event) => updateForm('scheduleMode', event.target.value)}>
                                    <option value="recorrente">Recorrente</option>
                                    <option value="unica">Execução única</option>
                                    <option value="pontual">Apenas pontual</option>
                                </select>
                            </label>
                            <label className="field-label">Frequência
                                <select className="light-select" value={form.frequency} onChange={(event) => updateForm('frequency', event.target.value)}>
                                    <option value="diaria">Diária</option>
                                    <option value="semanal">Semanal</option>
                                    <option value="mensal">Mensal</option>
                                </select>
                            </label>
                            <label className="field-label">Repetir a cada
                                <input className="light-input" type="number" min="1" value={form.interval} onChange={(event) => updateForm('interval', event.target.value)} />
                            </label>
                            <label className="field-label">Data de início
                                <input className="light-input" type="date" value={form.startDate} onChange={(event) => updateForm('startDate', event.target.value)} />
                            </label>
                            <label className="field-label">Horário limite
                                <input className="light-input" type="time" value={form.time} onChange={(event) => updateForm('time', event.target.value)} />
                            </label>
                            <label className="field-label">Data de término
                                <input className="light-input" type="date" value={form.endDate} onChange={(event) => updateForm('endDate', event.target.value)} />
                            </label>
                        </div>
                        <div className="builder-meta-row" style={{ marginTop: 16 }}>
                            {[['D', 0], ['S', 1], ['T', 2], ['Q', 3], ['Q', 4], ['S', 5], ['S', 6]].map(([label, value]) => (
                                <label className="checkbox-row" key={`${label}-${value}`}><input type="checkbox" checked={form.weekdays.includes(value)} onChange={(event) => updateForm('weekdays', event.target.checked ? [...new Set([...form.weekdays, value])] : form.weekdays.filter((day) => day !== value))} /> {label}</label>
                            ))}
                        </div>
                    </section>

                    <section className="builder-panel">
                        <h2><Layers3 size={19} /> Contexto e atribuição</h2>
                        {referencesLoading && <p className="builder-subtitle">Carregando referências do workspace…</p>}
                        <div className="field-grid three">
                            <label className="field-label">Unidade
                                <select className="light-select" value={form.unitId} disabled={referencesLoading} onChange={(event) => updateReference('unitId', 'unit', references.units, event.target.value)}>
                                    <option value="">Selecione uma unidade</option>
                                    {references.units.map((option) => <option key={option.id} value={option.id}>{option.name}</option>)}
                                </select>
                            </label>
                            <label className="field-label">Setor
                                <select className="light-select" value={form.sectorId} disabled={referencesLoading} onChange={(event) => updateReference('sectorId', 'sector', references.sectors, event.target.value)}>
                                    <option value="">Selecione um setor</option>
                                    {references.sectors.map((option) => <option key={option.id} value={option.id}>{option.name}</option>)}
                                </select>
                            </label>
                            <label className="field-label">Momento
                                <select className="light-select" value={form.momentId} disabled={referencesLoading} onChange={(event) => updateReference('momentId', 'moment', references.moments, event.target.value)}>
                                    <option value="">Selecione um momento</option>
                                    {references.moments.map((option) => <option key={option.id} value={option.id}>{option.name}</option>)}
                                </select>
                            </label>
                            <label className="field-label"><span><UserRound size={14} /> Responsável padrão</span>
                                <select className="light-select" value={form.responsibleProfileId} disabled={referencesLoading} onChange={(event) => updateReference('responsibleProfileId', 'responsible', references.profiles, event.target.value)}>
                                    <option value="">Selecione um responsável</option>
                                    {references.profiles.map((option) => <option key={option.id} value={option.id}>{option.name}</option>)}
                                </select>
                            </label>
                            <label className="field-label">Execução pontual
                                <select className="light-select" value={form.adhocMode} onChange={(event) => updateForm('adhocMode', event.target.value)}>
                                    <option value="disabled">Não usar</option>
                                    <option value="panel">Somente pelo painel</option>
                                    <option value="app">Somente pelo app</option>
                                    <option value="both">Painel e app</option>
                                </select>
                            </label>
                            <label className="field-label">Status inicial
                                <select className="light-select" value={form.status} onChange={(event) => updateForm('status', event.target.value)}>
                                    <option value="inativo">Rascunho</option>
                                    <option value="ativo">Publicado</option>
                                </select>
                            </label>
                        </div>
                    </section>
                </div>

                <aside className="builder-column">
                    <div className="preview-phone" aria-label="Prévia da execução">
                        <div className="preview-phone-bar"><span>Ritmika operador</span><span>09:41</span></div>
                        <div className="preview-phone-content">
                            <p className="builder-eyebrow">Prévia</p>
                            <h2>{form.title || 'Novo checklist'}</h2>
                            <div className="preview-progress"><span style={{ width: '0%' }} /></div>
                            {previewItems.length === 0 && <p>Nenhum item no checklist.</p>}
                            {previewItems.map((item, index) => (
                                <div className="preview-item" key={item.id}>
                                    <strong>{index + 1}. {item.title || 'Sem título'}{item.required ? <span className="required-mark"> *</span> : null}</strong>
                                    {item.description && <small>{item.description}</small>}
                                    <div className="preview-answer">{typeOptions.find(([value]) => value === item.type)?.[1] || 'Resposta'}</div>
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

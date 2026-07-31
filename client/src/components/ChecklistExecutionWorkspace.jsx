import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import {
    ArrowLeft,
    ArrowRight,
    Barcode,
    Check,
    CheckCircle2,
    Clock3,
    MapPin,
    Minus,
    Paperclip,
    RotateCcw,
    Save,
    Send,
    Signature,
    Sparkles,
    Upload,
    X,
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { checklistProducaoService, evidenceService, executionService } from '../services/checklistProducaoService';
import { logger } from '../lib/logger';
import RouteSkeleton from './RouteSkeleton';

const titleOf = (checklist) => checklist?.title || checklist?.nome || 'Checklist sem título';

const executionItemsOf = (checklist) => {
    if (Array.isArray(checklist?.items) && checklist.items.length > 0) {
        return checklist.items.map((item, index) => ({
            ...item,
            id: item.id || `item-${index + 1}`,
            title: item.title || item.text || item.name || `Item ${index + 1}`,
            description: item.description || item.descricao || '',
            type: item.type || item.tipo_resposta || 'check',
            required: item.required ?? item.is_required ?? item.obrigatorio !== false,
            allow_not_applicable: Boolean(item.allow_not_applicable),
        }));
    }
    return (checklist?.produtos_checklist || []).map((product, index) => ({
        id: product.id || `product-${index + 1}`,
        title: product.nome || `Item ${index + 1}`,
        description: product.categoria ? `${product.categoria} · ${product.unidade || 'unidade'}` : '',
        type: product.tipo_resposta || 'numeric',
        required: product.obrigatorio !== false,
        allow_not_applicable: false,
    }));
};

const isAnswered = (value) => value !== undefined && value !== null && value !== '';
const NOT_APPLICABLE = '__not_applicable__';

const requiresEvidence = (item) => Boolean(
    item.evidenceRequired
    ?? item.evidence_required
    ?? item.evidences?.some((evidence) => evidence?.is_required),
);

const groupEvidence = (rows = []) => rows.reduce((groups, evidence) => {
    const key = evidence.metadata?.item_source_id || evidence.checklist_item_id || 'general';
    groups[key] = groups[key] || [];
    groups[key].push(evidence);
    return groups;
}, {});

import { evaluateChecklistAvailability } from '../domain/checklistAvailability';

const ChecklistExecutionWorkspace = ({ backPath = '/checklists' }) => {
    const { id } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    const executionIdFromUrl = new URLSearchParams(location.search).get('executionId');
    const requestedExecutionId = executionIdFromUrl || location.state?.executionId || null;
    const [checklist, setChecklist] = useState(null);
    const [execution, setExecution] = useState(null);
    const [answers, setAnswers] = useState({});
    const [missingItems, setMissingItems] = useState([]);
    const [missingEvidenceItems, setMissingEvidenceItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [completed, setCompleted] = useState(false);
    const [error, setError] = useState('');
    const [evidenceByItem, setEvidenceByItem] = useState({});
    const [evidenceBusy, setEvidenceBusy] = useState({});
    const [activeItemIndex, setActiveItemIndex] = useState(0);
    const [stepFeedback, setStepFeedback] = useState('');
    const autosaveBaselineRef = useRef('');
    const queuedAnswersRef = useRef('');
    const saveQueueRef = useRef(Promise.resolve(true));
    const latestAnswersRef = useRef({});

    useEffect(() => {
        let active = true;
        const openExecution = async () => {
            try {
                setLoading(true);
                const data = await checklistProducaoService.getById(id);
                if (!data) throw new Error('Checklist não encontrado');
                const availability = evaluateChecklistAvailability(data);
                if (!requestedExecutionId && !availability.available) {
                    throw new Error('Esta atividade não está disponível neste horário ou canal.');
                }
                const started = requestedExecutionId
                    ? await executionService.getById(requestedExecutionId)
                    : await checklistProducaoService.startExecution(id, {
                        execution_type: availability.executionType,
                        execution_channel: 'app',
                        occurrence_key: availability.occurrenceKey,
                    });
                if (!started) throw new Error('Execução não encontrada');
                if (!requestedExecutionId) {
                    const search = new URLSearchParams(location.search);
                    search.set('executionId', started.id);
                    navigate({
                        pathname: location.pathname,
                        search: `?${search.toString()}`,
                    }, {
                        replace: true,
                        state: {
                            ...location.state,
                            executionId: started.id,
                        },
                    });
                }
                const evidence = await evidenceService.list(started.id);
                if (!active) return;
                setChecklist(data);
                setExecution(started);
                setAnswers(started.answers || {});
                autosaveBaselineRef.current = JSON.stringify(started.answers || {});
                queuedAnswersRef.current = '';
                latestAnswersRef.current = started.answers || {};
                setActiveItemIndex(0);
                setStepFeedback('');
                setCompleted(started.status === 'completed' || Boolean(started.completed_at));
                setEvidenceByItem(groupEvidence(evidence));
            } catch (openError) {
                logger.error({
                    fn: 'ChecklistExecutionWorkspace.openExecution',
                    status: 'error',
                    checklistId: id,
                    executionId: requestedExecutionId,
                    executionIdSource: executionIdFromUrl ? 'url' : location.state?.executionId ? 'navigation_state' : 'new',
                    error: openError instanceof Error ? openError.message : String(openError),
                });
                if (active) setError('Não foi possível iniciar esta execução remota.');
            } finally {
                if (active) setLoading(false);
            }
        };
        openExecution();
        return () => { active = false; };
    }, [
        executionIdFromUrl,
        id,
        location.pathname,
        location.search,
        location.state,
        navigate,
        requestedExecutionId,
    ]);

    const items = useMemo(() => executionItemsOf(checklist), [checklist]);
    const answerableItems = useMemo(() => items.filter((item) => item.type !== 'separator'), [items]);
    const answeredCount = answerableItems.filter((item) => isAnswered(answers[item.id])).length;
    const progress = answerableItems.length ? Math.round((answeredCount / answerableItems.length) * 100) : 0;
    const activeItem = answerableItems[activeItemIndex] || null;
    const isFirstItem = activeItemIndex === 0;
    const isLastItem = activeItemIndex === answerableItems.length - 1;
    latestAnswersRef.current = answers;

    const persistAnswers = useCallback((nextAnswers, { notify = false, force = false } = {}) => {
        if (!execution?.id) return Promise.resolve(false);
        const serializedAnswers = JSON.stringify(nextAnswers);
        if (!force && (
            autosaveBaselineRef.current === serializedAnswers
            || queuedAnswersRef.current === serializedAnswers
        )) {
            return Promise.resolve(true);
        }
        queuedAnswersRef.current = serializedAnswers;
        const saveOperation = saveQueueRef.current.then(async () => {
            const nextAnsweredCount = answerableItems.filter((item) => isAnswered(nextAnswers[item.id])).length;
            const nextProgress = answerableItems.length
                ? Math.round((nextAnsweredCount / answerableItems.length) * 100)
                : 0;
            try {
                setSaving(true);
                const saved = await checklistProducaoService.saveExecution(execution.id, {
                    answers: nextAnswers,
                    progress: nextProgress,
                    status: 'in_progress',
                });
                autosaveBaselineRef.current = serializedAnswers;
                if (queuedAnswersRef.current === serializedAnswers) queuedAnswersRef.current = '';
                setExecution((currentExecution) => saved || (
                    currentExecution
                        ? { ...currentExecution, answers: nextAnswers, progress: nextProgress }
                        : currentExecution
                ));
                if (notify) toast.success('Progresso salvo.');
                return true;
            } catch (saveError) {
                logger.error({
                    fn: 'ChecklistExecutionWorkspace.persistAnswers',
                    status: 'error',
                    executionId: execution.id,
                    answeredCount: nextAnsweredCount,
                    progress: nextProgress,
                    error: saveError instanceof Error ? saveError.message : String(saveError),
                });
                if (queuedAnswersRef.current === serializedAnswers) queuedAnswersRef.current = '';
                setStepFeedback('Não foi possível salvar este item. Tente novamente.');
                if (notify) toast.error('Não foi possível salvar o progresso.');
                return false;
            } finally {
                setSaving(false);
            }
        });
        saveQueueRef.current = saveOperation.catch(() => false);
        return saveOperation;
    }, [answerableItems, execution?.id]);

    useEffect(() => {
        const serializedAnswers = JSON.stringify(answers);
        if (!execution?.id || autosaveBaselineRef.current === serializedAnswers || queuedAnswersRef.current === serializedAnswers) {
            return undefined;
        }
        const timeoutId = window.setTimeout(() => {
            void persistAnswers(answers);
        }, 450);
        return () => window.clearTimeout(timeoutId);
    }, [answers, execution, persistAnswers]);

    useEffect(() => () => {
        const nextAnswers = latestAnswersRef.current;
        if (execution?.id && autosaveBaselineRef.current !== JSON.stringify(nextAnswers)) {
            void persistAnswers(nextAnswers);
        }
    }, [execution?.id, persistAnswers]);

    const setAnswer = (itemId, value) => {
        const isDeselecting = latestAnswersRef.current[itemId] === value;
        const nextValue = isDeselecting ? undefined : value;
        const nextAnswers = { ...latestAnswersRef.current, [itemId]: nextValue };
        latestAnswersRef.current = nextAnswers;
        setAnswers(nextAnswers);
        setMissingItems((current) => current.filter((missingId) => missingId !== itemId));
        setStepFeedback(
            isDeselecting
                ? 'Resposta desmarcada.'
                : nextValue === true
                    ? 'Boa. Este item está concluído.'
                    : nextValue === false
                        ? 'Registrado. Este ponto precisa de atenção.'
                        : nextValue === NOT_APPLICABLE
                            ? 'Tudo certo. Este item não se aplica agora.'
                            : 'Resposta registrada neste item.',
        );
        if (nextValue === NOT_APPLICABLE || isDeselecting) {
            setMissingEvidenceItems((current) => current.filter((missingId) => missingId !== itemId));
        }
        if (typeof nextValue === 'boolean' || nextValue === NOT_APPLICABLE || isDeselecting) {
            void persistAnswers(nextAnswers);
        }
    };

    const focusItem = (index) => {
        setActiveItemIndex(Math.max(0, Math.min(index, answerableItems.length - 1)));
        setStepFeedback('');
    };

    const validateCurrentItem = () => {
        if (!activeItem) return true;
        if (activeItem.required && !isAnswered(answers[activeItem.id])) {
            setMissingItems((current) => current.includes(activeItem.id) ? current : [...current, activeItem.id]);
            setStepFeedback('Responda este item obrigatório antes de continuar.');
            return false;
        }
        if (
            isAnswered(answers[activeItem.id])
            && requiresEvidence(activeItem)
            && answers[activeItem.id] !== NOT_APPLICABLE
            && (evidenceByItem[activeItem.id] || []).length === 0
        ) {
            setMissingEvidenceItems((current) => current.includes(activeItem.id) ? current : [...current, activeItem.id]);
            setStepFeedback('Anexe a evidência obrigatória deste item antes de continuar.');
            return false;
        }
        return true;
    };

    const goToNextItem = () => {
        if (!validateCurrentItem()) return;
        if (!isLastItem) focusItem(activeItemIndex + 1);
    };

    const saveProgress = async () => {
        if (!execution) return;
        await persistAnswers(answers, { notify: true, force: true });
    };

    const complete = async () => {
        const missing = answerableItems
            .filter((item) => item.required && !isAnswered(answers[item.id]))
            .map((item) => item.id);
        if (missing.length > 0) {
            setMissingItems(missing);
            focusItem(answerableItems.findIndex((item) => item.id === missing[0]));
            setStepFeedback('Há um item obrigatório sem resposta.');
            toast.error('Preencha os itens obrigatórios antes de concluir.');
            return;
        }
        const missingEvidence = answerableItems
            .filter((item) => (
                isAnswered(answers[item.id])
                && requiresEvidence(item)
                && answers[item.id] !== NOT_APPLICABLE
                && (evidenceByItem[item.id] || []).length === 0
            ))
            .map((item) => item.id);
        if (missingEvidence.length > 0) {
            setMissingEvidenceItems(missingEvidence);
            focusItem(answerableItems.findIndex((item) => item.id === missingEvidence[0]));
            setStepFeedback('Há uma evidência obrigatória pendente.');
            toast.error('Anexe as evidências obrigatórias antes de concluir.');
            return;
        }
        if (!execution) return;
        try {
            const progressSaved = await persistAnswers(answers, { force: true });
            if (!progressSaved) {
                toast.error('Não foi possível salvar o progresso antes de concluir.');
                return;
            }
            setSaving(true);
            const finished = await checklistProducaoService.completeExecution(execution.id, answers);
            setExecution(finished || execution);
            setCompleted(true);
            toast.success('Execução concluída.');
        } catch (completeError) {
            logger.error({
                fn: 'ChecklistExecutionWorkspace.complete',
                status: 'error',
                executionId: execution.id,
                error: completeError instanceof Error ? completeError.message : String(completeError),
            });
            toast.error('Não foi possível concluir a execução.');
        } finally {
            setSaving(false);
        }
    };

    const retry = async () => {
        if (!execution) return;
        try {
            const retried = await checklistProducaoService.retryExecution(execution.id);
            setExecution(retried || execution);
            setAnswers({});
            setMissingItems([]);
            setMissingEvidenceItems([]);
            setCompleted(false);
            setActiveItemIndex(0);
            setStepFeedback('');
            toast.success('Execução reiniciada.');
        } catch (retryError) {
            logger.error({
                fn: 'ChecklistExecutionWorkspace.retry',
                status: 'error',
                executionId: execution.id,
                error: retryError instanceof Error ? retryError.message : String(retryError),
            });
            toast.error('Não foi possível reiniciar a execução.');
        }
    };

    const uploadEvidence = async (item, event) => {
        const file = event.target.files?.[0];
        event.target.value = '';
        if (!file || !execution) return;
        try {
            setEvidenceBusy((current) => ({ ...current, [item.id]: true }));
            const uploaded = await evidenceService.upload({
                responseId: execution.id,
                checklistId: checklist?.id || id,
                itemId: item.id,
                file,
                title: item.title + ' · ' + file.name,
            });
            setEvidenceByItem((current) => ({
                ...current,
                [item.id]: [uploaded, ...(current[item.id] || [])],
            }));
            setMissingEvidenceItems((current) => current.filter((missingId) => missingId !== item.id));
            toast.success('Evidência anexada.');
        } catch (uploadError) {
            logger.error({
                fn: 'ChecklistExecutionWorkspace.uploadEvidence',
                status: 'error',
                executionId: execution.id,
                itemId: item.id,
                error: uploadError instanceof Error ? uploadError.message : String(uploadError),
            });
            toast.error(uploadError instanceof Error ? uploadError.message : 'Não foi possível anexar a evidência.');
        } finally {
            setEvidenceBusy((current) => ({ ...current, [item.id]: false }));
        }
    };

    const renderEvidence = (item) => {
        const evidence = evidenceByItem[item.id] || [];
        return (
            <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50/80 p-3.5">
                <div className="flex items-center justify-between gap-3 text-xs text-slate-600">
                    <span className="flex items-center gap-1.5 font-medium">
                        <Paperclip size={14} className="text-slate-400" />
                        Evidências ({evidence.length})
                        {requiresEvidence(item) && answers[item.id] !== NOT_APPLICABLE && (
                            <span className="font-bold text-red-500">· obrigatória</span>
                        )}
                    </span>
                    <label
                        className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-teal-600 px-3 py-1.5 text-xs font-bold text-white transition hover:bg-teal-700 active:scale-95"
                        htmlFor={'evidence-' + item.id}
                    >
                        <Upload size={14} />
                        {evidenceBusy[item.id] ? 'Enviando…' : 'Anexar'}
                    </label>
                    <input
                        id={'evidence-' + item.id}
                        type="file"
                        accept="image/*,application/pdf,video/*"
                        className="hidden"
                        onChange={(event) => uploadEvidence(item, event)}
                        disabled={Boolean(evidenceBusy[item.id])}
                    />
                </div>
                {evidence.length > 0 && (
                    <div className="mt-3 grid gap-2">
                        {evidence.map((itemEvidence) => (
                            <a
                                className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-teal-700 shadow-sm transition hover:bg-teal-50"
                                href={itemEvidence.url || '#'}
                                target="_blank"
                                rel="noreferrer"
                                key={itemEvidence.id || itemEvidence.storage_path}
                            >
                                <span className="truncate">{itemEvidence.title || 'Abrir evidência'}</span>
                                {itemEvidence.isHistorical && <small className="text-slate-400">Histórica</small>}
                            </a>
                        ))}
                    </div>
                )}
            </div>
        );
    };

    const renderAnswer = (item) => {
        const value = answers[item.id];
        const type = item.type === 'boolean' ? 'check' : item.type;
        if (type === 'check') {
            return (
                <div className="grid gap-2.5 sm:grid-cols-3" role="group" aria-label="Resultado da atividade">
                    <button
                        type="button"
                        data-answer="not-done"
                        aria-pressed={value === false}
                        className={`flex min-h-[72px] items-center gap-3 rounded-xl border p-3 text-left transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-600 active:scale-[0.98] ${value === false ? 'border-red-500 bg-red-50/90 text-red-900 shadow-sm' : 'border-slate-200 bg-white text-slate-700 hover:border-red-200 hover:bg-red-50/40'}`}
                        onClick={() => setAnswer(item.id, false)}
                    >
                        <span className={`grid size-9 shrink-0 place-items-center rounded-lg ${value === false ? 'bg-red-600 text-white' : 'bg-red-100 text-red-600'}`}>
                            <X size={20} aria-hidden="true" />
                        </span>
                        <span className="grid min-w-0">
                            <strong className="text-sm font-bold leading-tight">Não concluí</strong>
                            <small className="truncate text-xs font-normal opacity-75">Registrar pendência</small>
                        </span>
                    </button>

                    <button
                        type="button"
                        data-answer="done"
                        aria-pressed={value === true}
                        className={`flex min-h-[72px] items-center gap-3 rounded-xl border p-3 text-left transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-600 active:scale-[0.98] ${value === true ? 'border-teal-600 bg-teal-50/90 text-teal-900 shadow-sm' : 'border-slate-200 bg-white text-slate-700 hover:border-teal-200 hover:bg-teal-50/40'}`}
                        onClick={() => setAnswer(item.id, true)}
                    >
                        <span className={`grid size-9 shrink-0 place-items-center rounded-lg ${value === true ? 'bg-teal-600 text-white' : 'bg-teal-100 text-teal-700'}`}>
                            <Check size={20} aria-hidden="true" />
                        </span>
                        <span className="grid min-w-0">
                            <strong className="text-sm font-bold leading-tight">Concluído</strong>
                            <small className="truncate text-xs font-normal opacity-75">Tudo certo por aqui</small>
                        </span>
                    </button>

                    {item.allow_not_applicable && (
                        <button
                            type="button"
                            data-answer="not-applicable"
                            aria-pressed={value === NOT_APPLICABLE}
                            className={`flex min-h-[72px] items-center gap-3 rounded-xl border p-3 text-left transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-600 active:scale-[0.98] ${value === NOT_APPLICABLE ? 'border-slate-500 bg-slate-100 text-slate-900 shadow-sm' : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'}`}
                            onClick={() => setAnswer(item.id, NOT_APPLICABLE)}
                        >
                            <span className={`grid size-9 shrink-0 place-items-center rounded-lg ${value === NOT_APPLICABLE ? 'bg-slate-700 text-white' : 'bg-slate-100 text-slate-600'}`}>
                                <Minus size={20} aria-hidden="true" />
                            </span>
                            <span className="grid min-w-0">
                                <strong className="text-sm font-bold leading-tight">Não se aplica</strong>
                                <small className="truncate text-xs font-normal opacity-75">Fora de contexto</small>
                            </span>
                        </button>
                    )}
                </div>
            );
        }
        if (type === 'selection') {
            const options = Array.isArray(item.config?.options) && item.config.options.length > 0
                ? item.config.options
                : ['Opção 1', 'Opção 2'];
            return <select className="min-h-12 w-full rounded-xl border border-slate-300 bg-white px-3.5 text-sm text-slate-900 outline-none focus:border-teal-600 focus:ring-4 focus:ring-teal-600/15" value={value || ''} onChange={(event) => setAnswer(item.id, event.target.value)}><option value="">Selecione uma opção</option>{options.map((option) => <option key={option} value={option}>{option}</option>)}</select>;
        }
        if (type === 'numeric') {
            return (
                <input
                    className="min-h-12 w-full rounded-xl border border-slate-300 bg-white px-3.5 text-sm text-slate-900 outline-none focus:border-teal-600 focus:ring-4 focus:ring-teal-600/15"
                    type="number"
                    inputMode="decimal"
                    step="0.001"
                    value={value ?? ''}
                    onChange={(event) => setAnswer(item.id, event.target.value)}
                    placeholder="Informe um número"
                    aria-label={item.title || 'Resposta numérica'}
                />
            );
        }
        if (type === 'date_time' || type === 'datetime') return <input className="min-h-12 w-full rounded-xl border border-slate-300 bg-white px-3.5 text-sm text-slate-900 outline-none focus:border-teal-600 focus:ring-4 focus:ring-teal-600/15" type="datetime-local" value={value || ''} onChange={(event) => setAnswer(item.id, event.target.value)} aria-label={item.title || 'Data e hora'} />;
        if (type === 'gps') return <div className="flex items-center gap-2"><MapPin size={16} aria-hidden="true" /><input className="min-h-12 w-full rounded-xl border border-slate-300 bg-white px-3.5 text-sm text-slate-900 outline-none focus:border-teal-600 focus:ring-4 focus:ring-teal-600/15" value={value || ''} onChange={(event) => setAnswer(item.id, event.target.value)} placeholder="Latitude, longitude" aria-label={item.title || 'Latitude e longitude'} /></div>;
        if (type === 'barcode') return <div className="flex items-center gap-2"><Barcode size={16} aria-hidden="true" /><input className="min-h-12 w-full rounded-xl border border-slate-300 bg-white px-3.5 text-sm text-slate-900 outline-none focus:border-teal-600 focus:ring-4 focus:ring-teal-600/15" value={value || ''} onChange={(event) => setAnswer(item.id, event.target.value)} placeholder="Código de barras ou QR" aria-label={item.title || 'Código de barras ou QR'} /></div>;
        if (type === 'signature') return <div className="flex items-center gap-2"><Signature size={16} aria-hidden="true" /><input className="min-h-12 w-full rounded-xl border border-slate-300 bg-white px-3.5 text-sm text-slate-900 outline-none focus:border-teal-600 focus:ring-4 focus:ring-teal-600/15" value={value || ''} onChange={(event) => setAnswer(item.id, event.target.value)} placeholder="Nome para assinatura local" aria-label={item.title || 'Nome para assinatura local'} /></div>;
        return <textarea className="min-h-28 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-3 text-sm text-slate-900 outline-none focus:border-teal-600 focus:ring-4 focus:ring-teal-600/15" value={value || ''} onChange={(event) => setAnswer(item.id, event.target.value)} placeholder="Digite sua resposta" />;
    };

    if (loading) return <section className="grid min-h-screen place-items-center bg-slate-50 p-4"><RouteSkeleton variant="form" label="Carregando execução" /></section>;
    if (error || !checklist) return <section className="grid min-h-screen place-items-center bg-slate-50 p-4"><div className="grid gap-4 rounded-2xl border border-red-200 bg-red-50 p-6 text-red-800" role="alert"><p>{error || 'Checklist não encontrado.'}</p><button type="button" className="inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-300 bg-white px-4 font-bold text-slate-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-600" onClick={() => navigate(backPath)}>Voltar</button></div></section>;

    return (
        <section className="w-full text-slate-900">
            {/* Header limpo para mobile */}
            <div className="mb-4 flex items-center justify-between gap-3">
                <button
                    type="button"
                    className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-bold text-slate-700 shadow-sm transition hover:bg-slate-50"
                    onClick={() => navigate(backPath)}
                >
                    <ArrowLeft size={15} aria-hidden="true" /> Voltar
                </button>
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
                    <CheckCircle2 size={15} className="text-teal-600" />
                    <span>{answeredCount}/{answerableItems.length} respondidos</span>
                </div>
            </div>

            <div className="mb-4">
                <h1 className="m-0 text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">{titleOf(checklist)}</h1>
                {/* Barra de progresso discreta */}
                <div className="mt-2.5 flex items-center gap-3">
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-200" role="progressbar" aria-valuenow={progress}>
                        <div className="h-full rounded-full bg-teal-600 transition-all duration-300" style={{ width: `${progress}%` }} />
                    </div>
                    <span className="text-xs font-bold text-teal-700">{progress}%</span>
                </div>
            </div>

            {completed ? (
                <section className="rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm">
                    <div className="mx-auto mb-3 grid size-14 place-items-center rounded-full bg-teal-50 text-teal-600">
                        <CheckCircle2 size={36} />
                    </div>
                    <h2 className="m-0 text-xl font-bold">Execução concluída</h2>
                    <p className="mt-1.5 text-xs text-slate-500">Ótimo trabalho. Todas as informações foram salvas.</p>
                    <div className="my-4 flex justify-center gap-4 text-xs text-slate-600">
                        <span>Pontuação: <strong className="text-slate-900">{execution?.score ?? 100}%</strong></span>
                    </div>
                    <div className="flex justify-center gap-2">
                        <button type="button" className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700" onClick={() => navigate(backPath)}>Voltar à lista</button>
                        <button type="button" className="inline-flex items-center gap-1.5 rounded-lg bg-teal-600 px-3 py-2 text-xs font-bold text-white" onClick={retry}><RotateCcw size={15} /> Executar novamente</button>
                    </div>
                </section>
            ) : (
                <div className="grid gap-4">
                    {/* Navegador por Pílulas (Stepper) */}
                    <nav className="flex gap-1.5 overflow-x-auto py-1" aria-label="Itens da execução">
                        {answerableItems.map((item, index) => {
                            const hasIssue = missingItems.includes(item.id) || missingEvidenceItems.includes(item.id);
                            const state = hasIssue ? 'attention' : isAnswered(answers[item.id]) ? 'answered' : 'pending';
                            return (
                                <button
                                    type="button"
                                    className={`grid size-8 shrink-0 place-items-center rounded-full text-xs font-bold transition-all ${index === activeItemIndex ? 'bg-teal-600 text-white shadow-sm ring-2 ring-teal-600/30' : state === 'attention' ? 'bg-red-100 text-red-600 border border-red-300' : state === 'answered' ? 'bg-teal-50 text-teal-700 border border-teal-200' : 'bg-slate-100 text-slate-500 border border-slate-200'}`}
                                    aria-current={index === activeItemIndex ? 'step' : undefined}
                                    key={item.id}
                                    onClick={() => focusItem(index)}
                                >
                                    {index + 1}
                                </button>
                            );
                        })}
                    </nav>

                    {activeItem ? (
                        <div
                            className={`rounded-2xl border p-4 sm:p-5 ${missingItems.includes(activeItem.id) || missingEvidenceItems.includes(activeItem.id) ? 'border-red-300 bg-red-50/50' : 'border-slate-200 bg-white shadow-sm'}`}
                        >
                            <div className="flex items-center justify-between gap-2">
                                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Item {activeItemIndex + 1} de {answerableItems.length}</span>
                                <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold ${isAnswered(answers[activeItem.id]) ? 'bg-teal-50 text-teal-700' : 'bg-slate-100 text-slate-600'}`}>
                                    {answers[activeItem.id] === true
                                        ? <><Check size={13} /> Concluído</>
                                        : answers[activeItem.id] === false
                                            ? <><X size={13} /> Atenção</>
                                            : answers[activeItem.id] === NOT_APPLICABLE
                                                ? <><Minus size={13} /> Não se aplica</>
                                                : activeItem.required ? 'Obrigatório' : 'Opcional'}
                                </span>
                            </div>

                            <h2 className="mt-2 mb-1 text-lg font-bold text-slate-900 sm:text-xl">{activeItem.title || 'Atividade sem título'}{activeItem.required ? <span className="text-red-500"> *</span> : null}</h2>
                            {activeItem.description && <p className="mt-1 mb-0 text-xs leading-relaxed text-slate-500">{activeItem.description}</p>}

                            {/* Área de Resposta Direta sem Card Aninhado */}
                            <div className="mt-4 pt-4 border-t border-slate-100">
                                <p className="mb-2.5 text-xs font-bold uppercase tracking-wider text-slate-500">Como ficou este item?</p>
                                {renderAnswer(activeItem)}
                            </div>

                            {renderEvidence(activeItem)}

                            {stepFeedback && (
                                <p className={`mt-3 mb-0 rounded-lg px-3 py-2 text-xs font-bold ${missingItems.includes(activeItem.id) || missingEvidenceItems.includes(activeItem.id) ? 'bg-red-100 text-red-700' : 'bg-teal-50 text-teal-700'}`} role="status">
                                    {stepFeedback}
                                </p>
                            )}
                        </div>
                    ) : (
                        <div className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-xs text-slate-500">Este checklist não possui itens.</div>
                    )}

                    {/* Action Bar Única e Ajustada */}
                    <div className="sticky bottom-[calc(72px+env(safe-area-inset-bottom,0px))] sm:bottom-4 z-10 flex items-center gap-2 rounded-2xl border border-slate-200/90 bg-white/95 p-2 shadow-lg backdrop-blur-md">
                        <button
                            type="button"
                            className="inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 px-3.5 font-bold text-slate-700 hover:bg-slate-100 disabled:opacity-40"
                            disabled={isFirstItem || saving}
                            onClick={() => focusItem(activeItemIndex - 1)}
                            aria-label="Item anterior"
                        >
                            <ArrowLeft size={18} />
                        </button>

                        <button
                            type="button"
                            className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3.5 font-bold text-slate-700 hover:bg-slate-100 disabled:opacity-40"
                            disabled={saving || !execution}
                            onClick={saveProgress}
                            aria-label="Salvar progresso"
                        >
                            <Save size={18} />
                            <span className="hidden sm:inline text-xs">Salvar</span>
                        </button>

                        {isLastItem ? (
                            <button
                                type="button"
                                className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-teal-600 px-4 text-xs font-bold text-white shadow-sm hover:bg-teal-700 active:scale-[0.98] disabled:opacity-50"
                                disabled={saving || !activeItem}
                                onClick={complete}
                            >
                                <Send size={16} /> Concluir atividade
                            </button>
                        ) : (
                            <button
                                type="button"
                                className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-teal-600 px-4 text-xs font-bold text-white shadow-sm hover:bg-teal-700 active:scale-[0.98] disabled:opacity-50"
                                disabled={saving || !activeItem}
                                onClick={goToNextItem}
                            >
                                Próximo <ArrowRight size={16} />
                            </button>
                        )}
                    </div>
                </div>
            )}
        </section>
    );
};

export default ChecklistExecutionWorkspace;

import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import {
    ArrowLeft,
    Barcode,
    Check,
    CheckCircle2,
    Clock3,
    MapPin,
    Paperclip,
    RotateCcw,
    Save,
    Send,
    Signature,
    Upload,
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { checklistProducaoService, evidenceService, executionService } from '../services/checklistProducaoService';
import { logger } from '../lib/logger';
import RouteSkeleton from './RouteSkeleton';
import '../styles/checklist-workspace.css';

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

    const setAnswer = (itemId, value) => {
        setAnswers((current) => ({ ...current, [itemId]: value }));
        setMissingItems((current) => current.filter((missingId) => missingId !== itemId));
        setStepFeedback('Resposta registrada neste item.');
        if (value === NOT_APPLICABLE) {
            setMissingEvidenceItems((current) => current.filter((missingId) => missingId !== itemId));
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
        try {
            setSaving(true);
            const saved = await checklistProducaoService.saveExecution(execution.id, {
                answers,
                progress,
                status: 'in_progress',
            });
            setExecution(saved || execution);
            toast.success('Progresso salvo.');
        } catch (saveError) {
            logger.error({
                fn: 'ChecklistExecutionWorkspace.saveProgress',
                status: 'error',
                executionId: execution.id,
                error: saveError instanceof Error ? saveError.message : String(saveError),
            });
            toast.error('Não foi possível salvar o progresso.');
        } finally {
            setSaving(false);
        }
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
            <div className="execution-evidence">
                <div className="execution-evidence-head">
                    <span>
                        <Paperclip size={14} /> Evidências ({evidence.length})
                        {requiresEvidence(item) && answers[item.id] !== NOT_APPLICABLE && ' · obrigatória'}
                    </span>
                    <label className="evidence-upload-button" htmlFor={'evidence-' + item.id}>
                        <Upload size={14} />
                        {evidenceBusy[item.id] ? 'Enviando…' : 'Anexar'}
                    </label>
                    <input
                        id={'evidence-' + item.id}
                        type="file"
                        accept="image/*,application/pdf,video/*"
                        onChange={(event) => uploadEvidence(item, event)}
                        disabled={Boolean(evidenceBusy[item.id])}
                    />
                </div>
                {evidence.length > 0 && (
                    <div className="execution-evidence-list">
                        {evidence.map((itemEvidence) => (
                            <a
                                href={itemEvidence.url || '#'}
                                target="_blank"
                                rel="noreferrer"
                                key={itemEvidence.id || itemEvidence.storage_path}
                            >
                                {itemEvidence.title || 'Abrir evidência'}
                                {itemEvidence.isHistorical && <small>Histórica</small>}
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
                <div className="answer-segment" role="group" aria-label="Resultado da atividade">
                    <button type="button" data-answer="not-done" aria-pressed={value === false} className={value === false ? 'selected not-done' : 'not-done'} onClick={() => setAnswer(item.id, false)}>Não feito</button>
                    <button type="button" data-answer="done" aria-pressed={value === true} className={value === true ? 'selected done' : 'done'} onClick={() => setAnswer(item.id, true)}>Feito</button>
                    {item.allow_not_applicable && (
                        <button
                            type="button"
                            data-answer="not-applicable"
                            aria-pressed={value === NOT_APPLICABLE}
                            className={value === NOT_APPLICABLE ? 'selected not-applicable' : 'not-applicable'}
                            onClick={() => setAnswer(item.id, NOT_APPLICABLE)}
                        >
                            Não se aplica
                        </button>
                    )}
                </div>
            );
        }
        if (type === 'selection') {
            const options = Array.isArray(item.config?.options) && item.config.options.length > 0
                ? item.config.options
                : ['Opção 1', 'Opção 2'];
            return <select className="light-select" value={value || ''} onChange={(event) => setAnswer(item.id, event.target.value)}><option value="">Selecione uma opção</option>{options.map((option) => <option key={option} value={option}>{option}</option>)}</select>;
        }
        if (type === 'numeric') {
            return (
                <input
                    className="light-input"
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
        if (type === 'date_time' || type === 'datetime') return <input className="light-input" type="datetime-local" value={value || ''} onChange={(event) => setAnswer(item.id, event.target.value)} />;
        if (type === 'gps') return <div className="search-field"><MapPin size={16} /><input value={value || ''} onChange={(event) => setAnswer(item.id, event.target.value)} placeholder="Latitude, longitude" /></div>;
        if (type === 'barcode') return <div className="search-field"><Barcode size={16} /><input value={value || ''} onChange={(event) => setAnswer(item.id, event.target.value)} placeholder="Código de barras ou QR" /></div>;
        if (type === 'signature') return <div className="search-field"><Signature size={16} /><input value={value || ''} onChange={(event) => setAnswer(item.id, event.target.value)} placeholder="Nome para assinatura local" /></div>;
        return <textarea className="light-textarea" value={value || ''} onChange={(event) => setAnswer(item.id, event.target.value)} placeholder="Digite sua resposta" />;
    };

    if (loading) return <section className="ritmika-light-mode"><RouteSkeleton variant="form" label="Carregando execução" /></section>;
    if (error || !checklist) return <section className="ritmika-light-mode"><div className="error-state"><p>{error || 'Checklist não encontrado.'}</p><button type="button" className="light-button secondary" onClick={() => navigate(backPath)}>Voltar</button></div></section>;

    return (
        <section className="ritmika-light-mode operation-execution">
            <header className="execution-topbar">
                <div>
                    <button type="button" className="light-button secondary" onClick={() => navigate(backPath)}><ArrowLeft size={16} /> {backPath === '/app' ? 'Minhas atividades' : 'Checklists'}</button>
                    <p className="execution-eyebrow">Execução · Workspace Ritmika</p>
                    <h1>{titleOf(checklist)}</h1>
                    <p className="execution-subtitle">Responda aos itens, salve o progresso e conclua quando os obrigatórios estiverem preenchidos.</p>
                </div>
                <div className="execution-meta"><span><Clock3 size={14} /> {execution?.status === 'completed' ? 'Concluída' : 'Em andamento'}</span><span><CheckCircle2 size={14} /> {answeredCount}/{answerableItems.length} respondidos</span></div>
            </header>

            <div className="execution-shell">
                <div className="execution-column">
                    {completed ? (
                        <section className="completion-state">
                            <CheckCircle2 size={34} color="#0e9f8d" />
                            <h2>Execução concluída</h2>
                            <p>O resultado foi persistido no histórico do workspace Ritmika.</p>
                            <div className="execution-meta"><span>Pontuação</span><strong>{execution?.score ?? 100}%</strong><span>Atividade concluída</span></div>
                            <div className="builder-actions"><button type="button" className="light-button secondary" onClick={() => navigate(backPath)}>Voltar à lista</button><button type="button" className="light-button primary" onClick={retry}><RotateCcw size={16} /> Executar novamente</button></div>
                        </section>
                    ) : (
                        <section className="execution-panel execution-guided" data-testid="execution-guided-flow">
                            <div className="execution-guided-progress">
                                <div><strong>{progress}%</strong><span> concluído</span></div>
                                <span>{answeredCount}/{answerableItems.length} respondidos</span>
                                <div className="execution-progress" role="progressbar" aria-label="Progresso da execução" aria-valuemin="0" aria-valuemax="100" aria-valuenow={progress}><span style={{ width: `${progress}%` }} /></div>
                            </div>
                            <nav className="execution-step-trail" aria-label="Itens da execução">
                                {answerableItems.map((item, index) => {
                                    const hasIssue = missingItems.includes(item.id) || missingEvidenceItems.includes(item.id);
                                    const state = hasIssue ? 'attention' : isAnswered(answers[item.id]) ? 'answered' : 'pending';
                                    return (
                                        <button
                                            type="button"
                                            className="execution-step-dot"
                                            data-state={state}
                                            aria-current={index === activeItemIndex ? 'step' : undefined}
                                            aria-label={`Item ${index + 1}: ${item.title || 'Sem título'} · ${state === 'answered' ? 'respondido' : state === 'attention' ? 'requer atenção' : 'pendente'}`}
                                            key={item.id}
                                            onClick={() => focusItem(index)}
                                        >
                                            {index + 1}
                                        </button>
                                    );
                                })}
                            </nav>

                            {activeItem ? (
                                <article
                                    className={`execution-current-item ${missingItems.includes(activeItem.id) || missingEvidenceItems.includes(activeItem.id) ? 'missing' : ''}`}
                                    data-testid="execution-current-item"
                                >
                                    <div className="execution-current-head">
                                        <div>
                                            <p className="execution-item-position">Item {activeItemIndex + 1} de {answerableItems.length}</p>
                                            <h2>{activeItem.title || 'Atividade sem título'}{activeItem.required ? <span className="required-mark"> *</span> : null}</h2>
                                        </div>
                                        <span className={`execution-answer-status ${isAnswered(answers[activeItem.id]) ? 'answered' : ''}`}>
                                            {isAnswered(answers[activeItem.id]) ? 'Respondido' : activeItem.required ? 'Obrigatório' : 'Opcional'}
                                        </span>
                                    </div>
                                    {activeItem.description && <p className="execution-item-description">{activeItem.description}</p>}
                                    <div className="execution-answer-block">
                                        <p className="execution-answer-label">Informe o resultado</p>
                                        {renderAnswer(activeItem)}
                                    </div>
                                    {renderEvidence(activeItem)}
                                    {stepFeedback && (
                                        <p
                                            className={`execution-step-feedback ${missingItems.includes(activeItem.id) || missingEvidenceItems.includes(activeItem.id) ? 'error' : ''}`}
                                            role="status"
                                            aria-live="polite"
                                        >
                                            {stepFeedback}
                                        </p>
                                    )}
                                </article>
                            ) : (
                                <div className="execution-empty-items" role="status">Este checklist ainda não possui itens executáveis.</div>
                            )}

                            <div className="execution-action-dock">
                                <button type="button" className="light-button secondary" disabled={isFirstItem || saving} onClick={() => focusItem(activeItemIndex - 1)}><ArrowLeft size={16} /> Anterior</button>
                                <button type="button" className="light-button secondary save-progress" disabled={saving || !execution} onClick={saveProgress}><Save size={16} /> Salvar</button>
                                {isLastItem ? (
                                    <button type="button" className="light-button primary" disabled={saving || !activeItem} onClick={complete}><Send size={16} /> Concluir atividade</button>
                                ) : (
                                    <button type="button" className="light-button primary" disabled={saving || !activeItem} onClick={goToNextItem}>Próximo <span aria-hidden="true">→</span></button>
                                )}
                            </div>
                        </section>
                    )}
                </div>

                <aside className="execution-side">
                    <section className="execution-panel">
                        <h2>Resumo</h2>
                        <div className="execution-kpi"><span>Status</span><strong>{completed ? 'Concluído' : 'Em andamento'}</strong></div>
                        <div className="execution-kpi"><span>Obrigatórios</span><strong>{answerableItems.filter((item) => item.required).length}</strong></div>
                        <div className="execution-kpi"><span>Respondidos</span><strong>{answeredCount}</strong></div>
                        {completed && <div className="execution-kpi"><span>Pontuação</span><strong>{execution?.score ?? 100}%</strong></div>}
                    </section>
                    <section className="execution-panel"><h2>Como funciona</h2><p>Suas respostas podem ser salvas durante o preenchimento. A conclusão só é liberada quando os itens obrigatórios estiverem respondidos.</p></section>
                </aside>
            </div>
        </section>
    );
};

export default ChecklistExecutionWorkspace;

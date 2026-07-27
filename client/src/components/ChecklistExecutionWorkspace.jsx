import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
    ArrowLeft,
    Barcode,
    Check,
    CheckCircle2,
    Clock3,
    MapPin,
    RotateCcw,
    Save,
    Send,
    Signature,
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { checklistProducaoService } from '../services/checklistProducaoService';
import { logger } from '../lib/logger';
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

const ChecklistExecutionWorkspace = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [checklist, setChecklist] = useState(null);
    const [execution, setExecution] = useState(null);
    const [answers, setAnswers] = useState({});
    const [missingItems, setMissingItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [completed, setCompleted] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        let active = true;
        const openExecution = async () => {
            try {
                setLoading(true);
                const data = await checklistProducaoService.getById(id);
                if (!data) throw new Error('Checklist não encontrado');
                const started = await checklistProducaoService.startExecution(id, {
                    user_name: 'Operador local',
                    execution_type: 'manual',
                });
                if (!active) return;
                setChecklist(data);
                setExecution(started);
                setAnswers(started.answers || {});
            } catch (openError) {
                logger.error({
                    fn: 'ChecklistExecutionWorkspace.openExecution',
                    status: 'error',
                    checklistId: id,
                    error: openError instanceof Error ? openError.message : String(openError),
                });
                if (active) setError('Não foi possível iniciar esta execução local.');
            } finally {
                if (active) setLoading(false);
            }
        };
        openExecution();
        return () => { active = false; };
    }, [id]);

    const items = useMemo(() => executionItemsOf(checklist), [checklist]);
    const answerableItems = useMemo(() => items.filter((item) => item.type !== 'separator'), [items]);
    const answeredCount = answerableItems.filter((item) => isAnswered(answers[item.id])).length;
    const progress = answerableItems.length ? Math.round((answeredCount / answerableItems.length) * 100) : 0;

    const setAnswer = (itemId, value) => {
        setAnswers((current) => ({ ...current, [itemId]: value }));
        setMissingItems((current) => current.filter((missingId) => missingId !== itemId));
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
            toast.error('Preencha os itens obrigatórios antes de concluir.');
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
            setCompleted(false);
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

    const renderAnswer = (item) => {
        const value = answers[item.id];
        const type = item.type === 'boolean' ? 'check' : item.type;
        if (type === 'check') {
            return (
                <div className="answer-segment">
                    <button type="button" className={value === false ? 'selected' : ''} onClick={() => setAnswer(item.id, false)}>Não Feito</button>
                    <button type="button" className={value === true ? 'selected' : ''} onClick={() => setAnswer(item.id, true)}>Feito</button>
                </div>
            );
        }
        if (type === 'selection') {
            const options = Array.isArray(item.config?.options) && item.config.options.length > 0
                ? item.config.options
                : ['Opção 1', 'Opção 2'];
            return <select className="light-select" value={value || ''} onChange={(event) => setAnswer(item.id, event.target.value)}><option value="">Selecione uma opção</option>{options.map((option) => <option key={option} value={option}>{option}</option>)}</select>;
        }
        if (type === 'numeric') return <input className="light-input" type="number" value={value ?? ''} onChange={(event) => setAnswer(item.id, event.target.value)} placeholder="Informe um número" />;
        if (type === 'date_time') return <input className="light-input" type="datetime-local" value={value || ''} onChange={(event) => setAnswer(item.id, event.target.value)} />;
        if (type === 'gps') return <div className="search-field"><MapPin size={16} /><input value={value || ''} onChange={(event) => setAnswer(item.id, event.target.value)} placeholder="Latitude, longitude" /></div>;
        if (type === 'barcode') return <div className="search-field"><Barcode size={16} /><input value={value || ''} onChange={(event) => setAnswer(item.id, event.target.value)} placeholder="Código de barras ou QR" /></div>;
        if (type === 'signature') return <div className="search-field"><Signature size={16} /><input value={value || ''} onChange={(event) => setAnswer(item.id, event.target.value)} placeholder="Nome para assinatura local" /></div>;
        return <textarea className="light-textarea" value={value || ''} onChange={(event) => setAnswer(item.id, event.target.value)} placeholder="Digite sua resposta" />;
    };

    if (loading) return <section className="ritmika-light-mode"><div className="empty-state">Iniciando execução local…</div></section>;
    if (error || !checklist) return <section className="ritmika-light-mode"><div className="error-state"><p>{error || 'Checklist não encontrado.'}</p><button type="button" className="light-button secondary" onClick={() => navigate('/checklists')}>Voltar</button></div></section>;

    return (
        <section className="ritmika-light-mode">
            <header className="execution-topbar">
                <div>
                    <button type="button" className="light-button secondary" onClick={() => navigate('/checklists')}><ArrowLeft size={16} /> Checklists</button>
                    <p className="execution-eyebrow">Execução · Operador local</p>
                    <h1>{titleOf(checklist)}</h1>
                    <p className="execution-subtitle">Responda aos itens, salve o progresso e conclua quando os obrigatórios estiverem preenchidos.</p>
                </div>
                <div className="execution-meta"><span><Clock3 size={14} /> {execution?.status === 'completed' ? 'Concluída' : 'Em andamento'}</span><span><CheckCircle2 size={14} /> {answeredCount}/{answerableItems.length} respondidos</span></div>
            </header>

            <div className="execution-shell">
                <div className="execution-column">
                    {!completed && (
                        <section className="execution-panel">
                            <div className="execution-panel-head"><div><h2>Progresso</h2><p>{progress}% preenchido</p></div><strong>{answeredCount}/{answerableItems.length}</strong></div>
                            <div className="execution-progress"><span style={{ width: `${progress}%` }} /></div>
                        </section>
                    )}

                    {completed ? (
                        <section className="completion-state">
                            <CheckCircle2 size={34} color="#0e9f8d" />
                            <h2>Execução concluída</h2>
                            <p>O resultado foi persistido no histórico local do Ritmika.</p>
                            <div className="execution-meta"><span>Score</span><strong>{execution?.score ?? 100}%</strong><span>Status: completed</span></div>
                            <div className="builder-actions"><button type="button" className="light-button secondary" onClick={() => navigate('/checklists')}>Voltar à lista</button><button type="button" className="light-button primary" onClick={retry}><RotateCcw size={16} /> Executar novamente</button></div>
                        </section>
                    ) : (
                        <section className="execution-panel">
                            <div className="execution-items">
                                {items.map((item, index) => {
                                    if (item.type === 'separator') return <div className="preview-item" key={item.id}><strong>{item.title || `Etapa ${index + 1}`}</strong></div>;
                                    return (
                                        <article className={`execution-item ${missingItems.includes(item.id) ? 'missing' : ''}`} key={item.id}>
                                            <div><h3>{index + 1}. {item.title}{item.required ? <span className="required-mark"> *</span> : null}</h3>{item.description && <p>{item.description}</p>}</div>
                                            {renderAnswer(item)}
                                            {item.allow_not_applicable && <label className="checkbox-row"><input type="checkbox" checked={answers[item.id] === '__not_applicable__'} onChange={(event) => setAnswer(item.id, event.target.checked ? '__not_applicable__' : '')} /> Não se aplica</label>}
                                        </article>
                                    );
                                })}
                            </div>
                            <div className="builder-actions"><button type="button" className="light-button secondary" disabled={saving} onClick={saveProgress}><Save size={16} /> Salvar progresso</button><button type="button" className="light-button primary" disabled={saving} onClick={complete}><Send size={16} /> Concluir execução</button></div>
                        </section>
                    )}
                </div>

                <aside className="execution-side">
                    <section className="execution-panel">
                        <h2>Resumo</h2>
                        <div className="execution-kpi"><span>Status</span><strong>{completed ? 'Concluído' : 'Em andamento'}</strong></div>
                        <div className="execution-kpi"><span>Obrigatórios</span><strong>{answerableItems.filter((item) => item.required).length}</strong></div>
                        <div className="execution-kpi"><span>Respondidos</span><strong>{answeredCount}</strong></div>
                        {completed && <div className="execution-kpi"><span>Score</span><strong>{execution?.score ?? 100}%</strong></div>}
                    </section>
                    <section className="execution-panel"><h2>Estados cobertos</h2><p>Em andamento, validação de obrigatórios, concluído, retry e erro de persistência.</p></section>
                </aside>
            </div>
        </section>
    );
};

export default ChecklistExecutionWorkspace;

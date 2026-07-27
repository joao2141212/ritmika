import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { AlertTriangle, ArrowLeft, Camera, CheckCircle2, ChevronDown, ChevronUp, FileText, LoaderCircle, PenTool } from 'lucide-react';
import { jsPDF } from 'jspdf';
import toast from 'react-hot-toast';
import { executionService } from '../services/checklistProducaoService';
import '../styles/details-remote.css';

const answerLabel = (answer) => {
    if (answer === true) return 'Feito';
    if (answer === false) return 'Não feito';
    if (answer === '__not_applicable__') return 'Não se aplica';
    if (answer === undefined || answer === null || answer === '') return 'Sem resposta';
    return String(answer);
};

const ChecklistDetailsRemote = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    const executionId = location.state?.executionId || id;
    const [execution, setExecution] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [expandedItems, setExpandedItems] = useState({});

    useEffect(() => {
        let active = true;
        executionService.getById(executionId)
            .then((data) => {
                if (active) setExecution(data);
            })
            .catch((loadError) => {
                if (active) setError(loadError instanceof Error ? loadError.message : 'Não foi possível carregar a execução.');
            })
            .finally(() => {
                if (active) setLoading(false);
            });
        return () => { active = false; };
    }, [executionId]);

    const items = useMemo(() => {
        const snapshotItems = execution?.checklist_snapshot?.items;
        return Array.isArray(snapshotItems) ? snapshotItems.filter((item) => item.type !== 'separator') : [];
    }, [execution]);

    const itemRows = useMemo(() => items.map((item) => {
        const answer = execution?.answers?.[item.id];
        const failed = answer === false;
        return {
            ...item,
            answer,
            status: failed ? 'fail' : answerLabel(answer) === 'Sem resposta' ? 'pending' : 'ok',
            evidence: (execution?.evidence || []).filter((evidence) => evidence.metadata?.item_source_id === String(item.id)),
        };
    }), [execution, items]);

    const summary = useMemo(() => ({
        ok: itemRows.filter((item) => item.status === 'ok').length,
        fail: itemRows.filter((item) => item.status === 'fail').length,
        pending: itemRows.filter((item) => item.status === 'pending').length,
    }), [itemRows]);

    const generatePDF = () => {
        if (!execution) return;
        const doc = new jsPDF();
        const title = execution.checklist_title || execution.checklist_snapshot?.title || 'Checklist';
        doc.setFontSize(16);
        doc.text('Relatório: ' + title, 20, 20);
        doc.setFontSize(10);
        doc.text('Executado por: ' + (execution.user_name || 'Usuário'), 20, 30);
        doc.text('Data: ' + new Date(execution.started_at || execution.created_at).toLocaleString('pt-BR'), 20, 38);
        doc.text('Score: ' + (execution.score ?? execution.progress ?? 0) + '%', 20, 46);
        let y = 62;
        itemRows.forEach((item) => {
            const line = '- ' + (item.title || item.text || 'Item') + ': ' + answerLabel(item.answer);
            doc.text(line.slice(0, 105), 20, y);
            y += 8;
            if (y > 280) {
                doc.addPage();
                y = 20;
            }
        });
        doc.save('checklist-' + execution.id + '.pdf');
        toast.success('PDF gerado com os dados da execução.');
    };

    if (loading) {
        return <div className="details-remote-state"><LoaderCircle size={22} className="is-spinning" /> Carregando execução…</div>;
    }

    if (error || !execution) {
        return (
            <div className="details-remote-state details-remote-error">
                <AlertTriangle size={22} />
                <span>{error || 'Execução não encontrada.'}</span>
                <button type="button" onClick={() => navigate('/checklists')}>Voltar aos checklists</button>
            </div>
        );
    }

    const score = execution.score ?? execution.progress ?? 0;

    return (
        <div className="details-remote ritmika-light-mode">
            <header className="details-remote-header">
                <button type="button" className="details-remote-back" onClick={() => navigate('/checklists')}>
                    <ArrowLeft size={18} /> Checklists
                </button>
                <p className="remote-eyebrow">Histórico remoto</p>
                <h1>{execution.checklist_title || 'Detalhes da execução'}</h1>
                <p className="details-remote-meta">
                    {new Date(execution.started_at || execution.created_at).toLocaleString('pt-BR')} · {execution.user_name || 'Usuário'} · {execution.status === 'completed' ? 'Concluída' : 'Em andamento'}
                </p>
            </header>

            <section className="details-remote-summary">
                <div className="details-score">
                    <strong>{score}%</strong>
                    <span>Conformidade</span>
                </div>
                <div className="details-counts">
                    <span className="is-ok"><CheckCircle2 size={16} /> {summary.ok} respondidos</span>
                    <span className="is-fail"><AlertTriangle size={16} /> {summary.fail} falhas</span>
                    <span className="is-pending"><FileText size={16} /> {summary.pending} pendentes</span>
                </div>
                <button type="button" className="details-download" onClick={generatePDF}>
                    <FileText size={17} /> Baixar PDF
                </button>
            </section>

            <section className="details-remote-list">
                {itemRows.length === 0 ? (
                    <div className="details-remote-empty">Esta execução não possui itens no snapshot persistido.</div>
                ) : itemRows.map((item) => (
                    <article className={'details-remote-item ' + item.status} key={item.id}>
                        <button type="button" className="details-remote-item-header" onClick={() => setExpandedItems((current) => ({ ...current, [item.id]: !current[item.id] }))}>
                            <span className="details-item-title">
                                {item.status === 'fail' ? <AlertTriangle size={18} /> : <CheckCircle2 size={18} />}
                                {item.title || item.text}
                            </span>
                            {expandedItems[item.id] ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                        </button>
                        {expandedItems[item.id] && (
                            <div className="details-remote-item-body">
                                <p><strong>Resposta:</strong> {answerLabel(item.answer)}</p>
                                {item.description && <p><strong>Descrição:</strong> {item.description}</p>}
                                {item.type === 'signature' && item.answer && <p className="details-evidence-line"><PenTool size={15} /> Assinatura registrada</p>}
                                {item.evidence.length > 0 && (
                                    <div className="details-evidence-list">
                                        {item.evidence.map((evidence) => (
                                            <a href={evidence.url || '#'} target="_blank" rel="noreferrer" key={evidence.id}>
                                                <Camera size={15} /> {evidence.title || 'Abrir evidência'}
                                            </a>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                    </article>
                ))}
            </section>
        </div>
    );
};

export default ChecklistDetailsRemote;

import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { AlertTriangle, ArrowLeft, Camera, CheckCircle2, ChevronDown, ChevronUp, FileText, LoaderCircle, PenTool } from 'lucide-react';
import { jsPDF } from 'jspdf';
import toast from 'react-hot-toast';
import { executionService } from '../services/checklistProducaoService';
import { logger } from '../lib/logger';

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
    const executionId = new URLSearchParams(location.search).get('executionId')
        || location.state?.executionId
        || id;
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
                logger.error({
                    file: 'client/src/components/ChecklistDetailsRemote.jsx',
                    function: 'ChecklistDetailsRemote.loadExecution',
                    operation: 'execution.details.load',
                    errorCode: 'EXECUTION_DETAILS_LOAD_FAILED',
                    executionId,
                    error: loadError,
                });
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
        if (!execution) {
            logger.warn({
                file: 'client/src/components/ChecklistDetailsRemote.jsx',
                function: 'ChecklistDetailsRemote.generatePDF',
                operation: 'execution.pdf.generate',
                errorCode: 'EXECUTION_DETAILS_NOT_LOADED',
                executionId,
            });
            return;
        }

        try {
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
            logger.info({
                file: 'client/src/components/ChecklistDetailsRemote.jsx',
                function: 'ChecklistDetailsRemote.generatePDF',
                operation: 'execution.pdf.generate',
                status: 'success',
                executionId: execution.id,
            });
            toast.success('PDF gerado com os dados da execução.');
        } catch (pdfError) {
            logger.error({
                file: 'client/src/components/ChecklistDetailsRemote.jsx',
                function: 'ChecklistDetailsRemote.generatePDF',
                operation: 'execution.pdf.generate',
                errorCode: 'EXECUTION_PDF_GENERATE_FAILED',
                executionId: execution.id,
                error: pdfError,
            });
            toast.error('Não foi possível gerar o PDF.');
        }
    };

    if (loading) {
        return <div className="flex min-h-screen items-center justify-center gap-2 bg-[#f4f8f8] text-[#6c8187]"><LoaderCircle size={22} className="animate-spin" /> Carregando execução…</div>;
    }

    if (error || !execution) {
        return (
            <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-[#f4f8f8] text-center text-[#b42318]">
                <AlertTriangle size={22} />
                <span>{error || 'Execução não encontrada.'}</span>
                <button type="button" className="rounded-lg border border-[#dce8e9] bg-white px-3 py-2 text-xs font-bold text-[#38515f]" onClick={() => navigate('/checklists')}>Voltar aos checklists</button>
            </div>
        );
    }

    const score = execution.score ?? execution.progress ?? 0;

    return (
        <div className="min-h-screen bg-[#f4f8f8] p-5 text-[#17363d] sm:p-8">
            <header className="mx-auto mb-6 max-w-5xl">
                <button type="button" className="mb-4 inline-flex items-center gap-2 text-xs font-bold text-[#08766c]" onClick={() => navigate('/checklists')}>
                    <ArrowLeft size={18} /> Checklists
                </button>
                <p className="mb-1 text-xs font-bold uppercase tracking-[0.12em] text-[#08766c]">Histórico remoto</p>
                <h1 className="m-0 text-[clamp(28px,4vw,42px)] font-extrabold">{execution.checklist_title || 'Detalhes da execução'}</h1>
                <p className="mt-2 text-sm text-[#6c8187]">
                    {new Date(execution.started_at || execution.created_at).toLocaleString('pt-BR')} · {execution.user_name || 'Usuário'} · {execution.status === 'completed' ? 'Concluída' : 'Em andamento'}
                </p>
            </header>

            <section className="mx-auto mb-6 grid max-w-5xl grid-cols-[auto_1fr_auto] items-center gap-5 rounded-2xl border border-[#dce8e9] bg-white p-5 shadow-[0_10px_30px_rgba(24,48,64,0.05)] max-[700px]:grid-cols-1">
                <div className="text-center">
                    <strong className="block text-3xl font-extrabold text-[#08766c]">{score}%</strong>
                    <span className="text-xs text-[#6c8187]">Conformidade</span>
                </div>
                <div className="flex flex-wrap gap-3 text-xs">
                    <span className="inline-flex items-center gap-1.5 text-[#08766c]"><CheckCircle2 size={16} /> {summary.ok} respondidos</span>
                    <span className="inline-flex items-center gap-1.5 text-[#b42318]"><AlertTriangle size={16} /> {summary.fail} falhas</span>
                    <span className="inline-flex items-center gap-1.5 text-[#b26a00]"><FileText size={16} /> {summary.pending} pendentes</span>
                </div>
                <button type="button" className="inline-flex items-center gap-2 rounded-lg bg-[#08766c] px-3 py-2 text-xs font-bold text-white" onClick={generatePDF}>
                    <FileText size={17} /> Baixar PDF
                </button>
            </section>

            <section className="mx-auto grid max-w-5xl gap-3">
                {itemRows.length === 0 ? (
                    <div className="rounded-xl border border-[#dce8e9] bg-white p-6 text-center text-sm text-[#6c8187]">Esta execução não possui itens no snapshot persistido.</div>
                ) : itemRows.map((item) => (
                    <article className={'overflow-hidden rounded-xl border bg-white ' + (item.status === 'fail' ? 'border-[#f1c8c3]' : 'border-[#dce8e9]')} key={item.id}>
                        <button type="button" className="flex w-full items-center justify-between gap-3 p-4 text-left" onClick={() => setExpandedItems((current) => ({ ...current, [item.id]: !current[item.id] }))}>
                            <span className="flex items-center gap-2 text-sm font-bold">
                                {item.status === 'fail' ? <AlertTriangle size={18} /> : <CheckCircle2 size={18} />}
                                {item.title || item.text}
                            </span>
                            {expandedItems[item.id] ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                        </button>
                        {expandedItems[item.id] && (
                            <div className="border-t border-[#edf3f2] p-4 text-sm text-[#38515f]">
                                <p><strong>Resposta:</strong> {answerLabel(item.answer)}</p>
                                {item.description && <p className="mt-2"><strong>Descrição:</strong> {item.description}</p>}
                                {item.type === 'signature' && item.answer && <p className="mt-2 inline-flex items-center gap-1.5"><PenTool size={15} /> Assinatura registrada</p>}
                                {item.evidence.length > 0 && (
                                    <div className="mt-3 flex flex-wrap gap-2">
                                        {item.evidence.map((evidence) => (
                                            <a className="inline-flex items-center gap-1.5 rounded-lg bg-[#e8f8f3] px-3 py-2 text-xs font-bold text-[#08766c]" href={evidence.url || '#'} target="_blank" rel="noreferrer" key={evidence.id}>
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

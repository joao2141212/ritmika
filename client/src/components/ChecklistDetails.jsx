import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronDown, ChevronUp, CheckCircle, AlertTriangle, Camera, PenTool, FileText } from 'lucide-react';
import { jsPDF } from 'jspdf';
import { toast } from 'react-hot-toast';
import '../styles/details.css'; // Will create next

const ChecklistDetails = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [submission, setSubmission] = useState(null);
    const [loading, setLoading] = useState(true);
    const [expandedItems, setExpandedItems] = useState({});

    useEffect(() => {
        // Mock fetching submission details
        // In real app: GET /api/submissions/:id
        const mockSubmission = {
            id: 1,
            title: 'Abertura de Loja',
            user: 'Pedro Duarte',
            date: '23/11/2025 08:30',
            score: 85,
            items: [
                { id: 1, text: 'Verificar temperatura do freezer', answer: '-18°C', type: 'text', status: 'ok' },
                { id: 2, text: 'Chão limpo?', answer: 'Não', type: 'boolean', status: 'fail', comment: 'Havia sujeira no canto', photo: 'mock_url' },
                { id: 3, text: 'Assinatura do Gerente', answer: 'Assinado', type: 'signature', status: 'ok', signature: 'mock_sig' }
            ]
        };
        setTimeout(() => {
            setSubmission(mockSubmission);
            setLoading(false);
        }, 500);
    }, [id]);

    const toggleItem = (itemId) => {
        setExpandedItems(prev => ({ ...prev, [itemId]: !prev[itemId] }));
    };

    const generatePDF = () => {
        const doc = new jsPDF();
        doc.text(`Relatório: ${submission.title}`, 20, 20);
        doc.text(`Executado por: ${submission.user}`, 20, 30);
        doc.text(`Data: ${submission.date}`, 20, 40);
        doc.text(`Nota Final: ${submission.score}%`, 20, 50);

        let y = 70;
        submission.items.forEach(item => {
            doc.text(`- ${item.text}: ${item.answer} (${item.status.toUpperCase()})`, 20, y);
            y += 10;
        });

        doc.save(`checklist-${submission.id}.pdf`);
        toast.success('PDF gerado com sucesso!');
    };

    if (loading) return <div>Carregando...</div>;

    return (
        <div className="details-container">
            <header className="details-header">
                <button className="back-btn" onClick={() => navigate('/checklists')}>← Voltar</button>
                <h1>Detalhes da Execução</h1>
                <div className="meta-info">
                    <span>{submission.date}</span> • <span>{submission.user}</span>
                </div>
            </header>

            <div className="score-card glass-panel">
                <div className="score-circle" style={{ borderColor: submission.score >= 80 ? 'var(--success)' : 'var(--warning)' }}>
                    <span className="score-value">{submission.score}%</span>
                    <span className="score-label">Conformidade</span>
                </div>
                <div className="score-summary">
                    <div className="summary-item success">
                        <CheckCircle size={16} /> 2 Itens OK
                    </div>
                    <div className="summary-item fail">
                        <AlertTriangle size={16} /> 1 Falha
                    </div>
                </div>
            </div>

            <div className="items-list">
                {submission.items.map(item => (
                    <div key={item.id} className={`detail-item glass-panel ${item.status}`}>
                        <div className="item-header" onClick={() => toggleItem(item.id)}>
                            <div className="item-title">
                                {item.status === 'ok' ? <CheckCircle color="var(--success)" size={20} /> : <AlertTriangle color="var(--danger)" size={20} />}
                                <span>{item.text}</span>
                            </div>
                            <div className="item-toggle">
                                {expandedItems[item.id] ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                            </div>
                        </div>

                        {expandedItems[item.id] && (
                            <div className="item-body">
                                <div className="answer-row">
                                    <strong>Resposta:</strong> {item.answer}
                                </div>
                                {item.comment && (
                                    <div className="comment-box">
                                        <strong>Observação:</strong> {item.comment}
                                    </div>
                                )}
                                {item.photo && (
                                    <div className="evidence-box">
                                        <Camera size={16} /> Evidência Fotográfica (Simulada)
                                    </div>
                                )}
                                {item.signature && (
                                    <div className="evidence-box">
                                        <PenTool size={16} /> Assinatura Digital (Simulada)
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                ))}
            </div>

            <button className="fab-btn" onClick={generatePDF}>
                <FileText size={20} /> Baixar PDF
            </button>
        </div>
    );
};

export default ChecklistDetails;

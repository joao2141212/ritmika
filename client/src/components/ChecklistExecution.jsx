import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import SignatureCanvas from 'react-signature-canvas';
import { Camera, Check, AlertCircle, X } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'react-hot-toast';
import { checklistAPI, submissionAPI } from '../data/mockData';
import '../styles/execution.css'; // Will create next

const ChecklistExecution = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const location = useLocation(); // Hook to access passed state
    const [checklist, setChecklist] = useState(null);
    const [answers, setAnswers] = useState({});
    const [loading, setLoading] = useState(true);
    const sigPad = useRef({});

    useEffect(() => {
        const fetchChecklist = async () => {
            // 1. Try to use data passed via navigation (Mock/Simulation Mode)
            if (location.state?.checklistData) {
                console.log('Using mocked data from navigation');
                setChecklist(location.state.checklistData);
                setLoading(false);
                return;
            }

            // 2. Try to load from persistent storage
            try {
                const data = await checklistAPI.getById(id);
                if (data) {
                    setChecklist(data);
                } else {
                    // Fallback for direct URL access without state
                    setChecklist({
                        id: id,
                        title: 'Checklist Simulado',
                        description: 'Modo de demonstração',
                        items: [
                            { id: 'demo1', text: 'Item de Exemplo', type: 'boolean', is_required: true }
                        ]
                    });
                }
            } catch (error) {
                console.error(error);
                toast.error('Erro ao carregar checklist. Usando modo offline simulado.');
                // Fallback for direct URL access without state
                setChecklist({
                    id: id,
                    title: 'Checklist Simulado',
                    description: 'Modo de demonstração',
                    items: [
                        { id: 'demo1', text: 'Item de Exemplo', type: 'boolean', is_required: true }
                    ]
                });
            } finally {
                setLoading(false);
            }
        };
        fetchChecklist();
    }, [id, location.state]);

    const handleAnswer = (itemId, value) => {
        setAnswers(prev => ({ ...prev, [itemId]: value }));
    };

    const handleSubmit = async () => {
        // Validate required fields
        const missing = checklist.items.filter(item => item.is_required && !answers[item.id]);
        if (missing.length > 0) {
            toast.error(`Preencha: ${missing.map(i => i.text).join(', ')}`);
            return;
        }

        const submissionData = {
            answers,
            geolocation: { lat: 0, lng: 0 },
            timestamp: new Date().toISOString()
        };

        try {
            const result = await submissionAPI.submit(id, answers);
            toast.success(`Checklist enviado! (+${result.pointsEarned} pontos)`);
            navigate('/');
        } catch (error) {
            console.error(error);
            toast.error('Erro ao enviar checklist');

            // Fallback offline
            if (!navigator.onLine) {
                const pending = JSON.parse(localStorage.getItem('pendingSubmissions') || '[]');
                pending.push({ id, ...submissionData });
                localStorage.setItem('pendingSubmissions', JSON.stringify(pending));
                toast.success('Salvo offline! Será enviado quando conectar.');
                navigate('/');
            }
        }
    };

    if (loading) return <div>Carregando...</div>;
    if (!checklist) return <div>Checklist não encontrado</div>;

    // Helper to check if item should be visible
    const isVisible = (item, allItems, currentAnswers) => {
        if (!item.logic || !item.logic.action) return true;

        // Find previous item (simplified logic: assumes previous item in array order)
        const index = allItems.findIndex(i => i.id === item.id);
        if (index === 0) return true;
        const prevItem = allItems[index - 1];
        const prevAnswer = currentAnswers[prevItem.id];

        if (item.logic.action === 'show_if_yes') return prevAnswer === 'yes';
        if (item.logic.action === 'show_if_no') return prevAnswer === 'no';

        return true;
    };

    return (
        <div className="execution-container">
            <header className="execution-header">
                <motion.h1
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                >
                    {checklist.title}
                </motion.h1>
                <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.1 }}
                >
                    {checklist.description || 'Preencha todos os itens abaixo'}
                </motion.p>
            </header>

            <div className="items-list">
                {checklist.items.map((item, index, allItems) => {
                    if (!isVisible(item, allItems, answers)) return null;

                    return (
                        <motion.div
                            key={item.id}
                            className="execution-item glass-panel"
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.1 }}
                        >
                            <div className="item-label">
                                <span>{item.text}</span>
                                {item.is_required && <span className="required-badge">*</span>}
                            </div>

                            <div className="item-input-area">
                                {item.type === 'boolean' && (
                                    <div className="boolean-group">
                                        <button
                                            className={`bool-btn ${answers[item.id] === 'yes' ? 'active yes' : ''}`}
                                            onClick={() => handleAnswer(item.id, 'yes')}
                                        >
                                            Sim
                                        </button>
                                        <button
                                            className={`bool-btn ${answers[item.id] === 'no' ? 'active no' : ''}`}
                                            onClick={() => handleAnswer(item.id, 'no')}
                                        >
                                            Não
                                        </button>
                                    </div>
                                )}

                                {item.type === 'text' && (
                                    <input
                                        type="text"
                                        className="input-field"
                                        value={answers[item.id] || ''}
                                        onChange={(e) => handleAnswer(item.id, e.target.value)}
                                        placeholder="Digite sua resposta..."
                                    />
                                )}

                                {item.type === 'photo' && (
                                    <div className="photo-upload-container">
                                        <input
                                            type="file"
                                            accept="image/*"
                                            capture="environment"
                                            id={`photo-${item.id}`}
                                            style={{ display: 'none' }}
                                            onChange={(e) => {
                                                const file = e.target.files[0];
                                                if (file) {
                                                    // Compress and Preview Logic
                                                    const reader = new FileReader();
                                                    reader.onload = (event) => {
                                                        const img = new Image();
                                                        img.onload = () => {
                                                            const canvas = document.createElement('canvas');
                                                            const ctx = canvas.getContext('2d');

                                                            // Resize logic (Max 1024px)
                                                            const maxWidth = 1024;
                                                            const scale = maxWidth / img.width;
                                                            canvas.width = maxWidth;
                                                            canvas.height = img.height * scale;

                                                            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

                                                            // Compress to JPEG 0.7 quality
                                                            const compressedBase64 = canvas.toDataURL('image/jpeg', 0.7);
                                                            handleAnswer(item.id, compressedBase64);
                                                        };
                                                        img.src = event.target.result;
                                                    };
                                                    reader.readAsDataURL(file);
                                                }
                                            }}
                                        />

                                        {!answers[item.id] ? (
                                            <label htmlFor={`photo-${item.id}`} className="photo-btn">
                                                <Camera size={20} />
                                                Tirar Foto
                                            </label>
                                        ) : (
                                            <div className="photo-preview">
                                                <img src={answers[item.id]} alt="Evidência" />
                                                <button
                                                    className="remove-photo-btn"
                                                    onClick={() => handleAnswer(item.id, null)}
                                                >
                                                    <X size={16} /> Remover
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {item.type === 'signature' && (
                                    <div className="signature-pad-container">
                                        <SignatureCanvas
                                            penColor="white"
                                            canvasProps={{ className: 'sigCanvas' }}
                                            ref={(ref) => { sigPad.current[item.id] = ref }}
                                            onEnd={() => handleAnswer(item.id, sigPad.current[item.id].toDataURL())}
                                        />
                                        <button className="clear-sig" onClick={() => sigPad.current[item.id].clear()}>Limpar</button>
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    );
                })}
            </div>

            <motion.button
                className="submit-btn"
                onClick={handleSubmit}
                initial={{ opacity: 0, y: 50 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
            >
                Finalizar Checklist <Check size={20} />
            </motion.button>
        </div>
    );
};

export default ChecklistExecution;

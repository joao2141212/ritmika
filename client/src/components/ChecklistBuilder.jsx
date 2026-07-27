import { useState } from 'react';
// JSX runtime usage is not recognized by the project's no-unused-vars rule.
// eslint-disable-next-line no-unused-vars
import { motion } from 'framer-motion';
import { checklistProducaoService } from '../services/checklistProducaoService';
import { logger } from '../lib/logger';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Plus, Trash2, GripVertical, Save, ArrowLeft, Settings2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import '../styles/builder.css';

const SortableItem = ({ id, item, onDelete, onChange }) => {
    const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    };

    return (
        <motion.div
            ref={setNodeRef}
            style={style}
            className="builder-item glass-panel"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
        >
            <div {...attributes} {...listeners} className="drag-handle">
                <GripVertical size={20} />
            </div>
            <div className="item-content">
                <div className="item-header">
                    <div className="item-type-badge">
                        <Settings2 size={14} />
                        <select
                            value={item.type}
                            onChange={(e) => onChange(id, 'type', e.target.value)}
                            className="type-select"
                        >
                            <option value="boolean">Sim/Não</option>
                            <option value="text">Texto</option>
                            <option value="photo">Foto Obrigatória</option>
                            <option value="signature">Assinatura</option>
                            <option value="rating">Avaliação (1-5)</option>
                        </select>
                    </div>
                    <button onClick={() => onDelete(id)} className="delete-btn"><Trash2 size={18} /></button>
                </div>

                <input
                    type="text"
                    value={item.text}
                    onChange={(e) => onChange(id, 'text', e.target.value)}
                    placeholder="Descreva a tarefa..."
                    className="item-input-large"
                />

                <div className="item-footer">
                    <label className="toggle-label">
                        <input
                            type="checkbox"
                            checked={item.is_required}
                            onChange={(e) => onChange(id, 'is_required', e.target.checked)}
                            className="toggle-checkbox"
                        />
                        <span className="toggle-switch"></span>
                        <span className="toggle-text">Obrigatório</span>
                    </label>

                    <div className="logic-config">
                        <span className="logic-label">Regra:</span>
                        <select
                            value={item.logic?.action || ''}
                            onChange={(e) => onChange(id, 'logic', { ...item.logic, action: e.target.value })}
                            className="logic-select"
                        >
                            <option value="">Sempre visível</option>
                            <option value="show_if_yes">Se anterior = SIM</option>
                            <option value="show_if_no">Se anterior = NÃO</option>
                        </select>
                    </div>
                </div>
            </div>
        </motion.div>
    );
};

const ChecklistBuilder = () => {
    const navigate = useNavigate();
    const [title, setTitle] = useState('');
    const [items, setItems] = useState([
        { id: '1', text: '', type: 'boolean', is_required: true }
    ]);

    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );

    const handleDragEnd = (event) => {
        const { active, over } = event;
        if (active.id !== over.id) {
            setItems((items) => {
                const oldIndex = items.findIndex((i) => i.id === active.id);
                const newIndex = items.findIndex((i) => i.id === over.id);
                return arrayMove(items, oldIndex, newIndex);
            });
        }
    };

    const addItem = () => {
        const newId = Math.random().toString(36).substr(2, 9);
        setItems([...items, { id: newId, text: '', type: 'boolean', is_required: true }]);
    };

    const updateItem = (id, field, value) => {
        setItems(items.map(item => item.id === id ? { ...item, [field]: value } : item));
    };

    const deleteItem = (id) => {
        setItems(items.filter(item => item.id !== id));
    };

    const handleSave = async () => {
        if (!title.trim()) {
            toast.error('Dê um título para o checklist');
            return;
        }
        try {
            await checklistProducaoService.create({ title, items });
            toast.success('Checklist criado com sucesso!');
            navigate('/checklists');
        } catch (error) {
            logger.error({
                fn: 'ChecklistBuilder.handleSave',
                status: 'error',
                error: error instanceof Error ? error.message : String(error),
            });
            toast.error('Erro ao salvar checklist');
        }
    };

    return (
        <div className="builder-container">
            <header className="builder-header">
                <button className="back-btn" onClick={() => navigate(-1)}>
                    <ArrowLeft size={20} />
                </button>
                <div className="header-title">
                    <h1>Novo Modelo</h1>
                    <p>Crie um padrão de inspeção para sua equipe</p>
                </div>
                <button className="save-btn" onClick={handleSave}>
                    <Save size={18} /> Salvar
                </button>
            </header>

            <div className="builder-meta glass-panel">
                <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Título do Checklist (ex: Abertura de Loja)"
                    className="title-input-large"
                    autoFocus
                />
            </div>

            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SortableContext items={items} strategy={verticalListSortingStrategy}>
                    <div className="items-list">
                        {items.map((item) => (
                            <SortableItem
                                key={item.id}
                                id={item.id}
                                item={item}
                                onDelete={deleteItem}
                                onChange={updateItem}
                            />
                        ))}
                    </div>
                </SortableContext>
            </DndContext>

            <motion.button
                className="add-item-fab"
                onClick={addItem}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
            >
                <Plus size={24} /> Adicionar Item
            </motion.button>
        </div>
    );
};

export default ChecklistBuilder;

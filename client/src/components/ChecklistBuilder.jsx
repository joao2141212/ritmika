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
            className="flex gap-3 rounded-2xl border border-operation-line bg-white p-5 shadow-[0_12px_30px_rgba(23,49,58,0.06)]"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
        >
            <div {...attributes} {...listeners} className="cursor-grab rounded-lg p-2 text-operation-muted hover:bg-operation-soft active:cursor-grabbing">
                <GripVertical size={20} />
            </div>
            <div className="min-w-0 flex-1">
                <div className="mb-4 flex items-center justify-between gap-3">
                    <div className="inline-flex items-center gap-2 rounded-lg bg-operation-soft px-2.5 py-1.5 text-xs font-semibold text-operation-mint-dark">
                        <Settings2 size={14} />
                        <select
                            value={item.type}
                            onChange={(e) => onChange(id, 'type', e.target.value)}
                            className="border-0 bg-transparent text-xs font-semibold outline-none"
                        >
                            <option value="boolean">Sim/Não</option>
                            <option value="text">Texto</option>
                            <option value="photo">Foto Obrigatória</option>
                            <option value="signature">Assinatura</option>
                            <option value="rating">Avaliação (1-5)</option>
                        </select>
                    </div>
                    <button type="button" onClick={() => onDelete(id)} className="rounded-lg p-2 text-red-700 transition-colors hover:bg-red-50" aria-label="Excluir item"><Trash2 size={18} /></button>
                </div>

                <input
                    type="text"
                    value={item.text}
                    onChange={(e) => onChange(id, 'text', e.target.value)}
                    placeholder="Descreva a tarefa..."
                    className="min-h-11 w-full rounded-xl border border-operation-line px-3.5 text-sm outline-none focus:border-operation-mint focus:ring-4 focus:ring-operation-mint/15"
                />

                <div className="mt-4 flex flex-col gap-4 border-t border-operation-line pt-4 sm:flex-row sm:items-center sm:justify-between">
                    <label className="flex cursor-pointer items-center gap-2 text-sm font-semibold">
                        <input
                            type="checkbox"
                            checked={item.is_required}
                            onChange={(e) => onChange(id, 'is_required', e.target.checked)}
                            className="h-4 w-4 accent-[#0b6b61]"
                        />
                        <span>Obrigatório</span>
                    </label>

                    <div className="flex items-center gap-2 text-sm">
                        <span className="text-operation-muted">Regra:</span>
                        <select
                            value={item.logic?.action || ''}
                            onChange={(e) => onChange(id, 'logic', { ...item.logic, action: e.target.value })}
                            className="rounded-lg border border-operation-line px-2.5 py-2 text-xs outline-none focus:border-operation-mint"
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
        <div className="min-h-screen bg-[#f6fafb] px-4 py-8 text-operation-ink sm:px-6 lg:px-8">
            <header className="mx-auto mb-8 flex max-w-4xl items-center gap-4">
                <button type="button" aria-label="Voltar" className="rounded-xl border border-operation-line bg-white p-3 text-operation-ink hover:bg-operation-soft" onClick={() => navigate(-1)}>
                    <ArrowLeft size={20} />
                </button>
                <div className="min-w-0 flex-1">
                    <h1 className="text-2xl font-semibold tracking-[-0.035em]">Novo Modelo</h1>
                    <p className="mt-1 text-sm text-operation-muted">Crie um padrão de inspeção para sua equipe</p>
                </div>
                <button type="button" className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-operation-ink px-3.5 py-2 text-sm font-semibold text-white hover:bg-operation-mint-dark" onClick={handleSave}>
                    <Save size={18} /> Salvar
                </button>
            </header>

            <div className="mx-auto mb-5 max-w-4xl rounded-2xl border border-operation-line bg-white p-5 shadow-[0_12px_30px_rgba(23,49,58,0.06)]">
                <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Título do Checklist (ex: Abertura de Loja)"
                    className="min-h-12 w-full rounded-xl border border-operation-line px-4 text-base outline-none focus:border-operation-mint focus:ring-4 focus:ring-operation-mint/15"
                    autoFocus
                />
            </div>

            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SortableContext items={items} strategy={verticalListSortingStrategy}>
                    <div className="mx-auto grid max-w-4xl gap-4">
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
                className="mx-auto mt-6 flex min-h-11 items-center gap-2 rounded-xl border border-dashed border-operation-mint bg-operation-soft px-4 py-3 text-sm font-semibold text-operation-mint-dark transition-colors hover:bg-operation-mint/20"
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

import React, { useState } from 'react';
import { Plus, Trash2, GripVertical, Copy, Eye, EyeOff, ChevronDown, ChevronRight, Sparkles, Wand2 } from 'lucide-react';
import IconPicker from './IconPicker';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { nanoid } from 'nanoid';

const SortableItem = ({ item, index, onUpdate, onRemove, onDuplicate, isExpanded, onToggleExpand }) => {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
    } = useSortable({ id: item.id || `item-${index}` });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    };

    const isVisible = item.isVisible !== false; // true par défaut

    const handleGenerateAI = () => {
        // Simulation Beya3 AI
        onUpdate(index, { 
            ...item, 
            title: item.title ? `${item.title} (Généré)` : "Titre généré par IA ✨",
            description: item.description ? `${item.description} (Généré)` : "Description persuasive générée par Beya3 pour maximiser vos conversions."
        });
    };

    return (
        <div ref={setNodeRef} style={style} className={`bg-white rounded-xl border mb-3 transition-colors ${isExpanded ? 'border-indigo-300 ring-1 ring-indigo-300 shadow-md' : 'border-slate-200 hover:border-slate-300'}`}>
            {/* Header (Collapsed View) */}
            <div className="flex items-center gap-3 p-3">
                <button {...attributes} {...listeners} className="text-slate-400 hover:text-slate-600 cursor-grab active:cursor-grabbing">
                    <GripVertical size={16} />
                </button>
                
                <button onClick={onToggleExpand} className="flex-1 flex items-center gap-3 text-left overflow-hidden">
                    {item.icon?.value && (
                        <div className="w-8 h-8 rounded bg-slate-100 flex items-center justify-center flex-shrink-0 text-slate-600">
                            {/* Petit preview emoji ou text */}
                            {item.icon.type === 'emoji' ? <span className="text-sm">{item.icon.value}</span> : <span className="text-xs font-bold">{item.icon.value.substring(0,2)}</span>}
                        </div>
                    )}
                    <span className={`font-medium text-sm truncate ${!isVisible ? 'text-slate-400 line-through' : 'text-slate-700'}`}>
                        {item.title || item.text || `Élément ${index + 1}`}
                    </span>
                </button>

                <div className="flex items-center gap-1">
                    <button onClick={() => onUpdate(index, { ...item, isVisible: !isVisible })} className={`p-1.5 rounded-lg transition-colors ${isVisible ? 'text-slate-400 hover:text-indigo-600' : 'text-rose-400 hover:text-rose-600'}`} title={isVisible ? "Masquer" : "Afficher"}>
                        {isVisible ? <Eye size={16} /> : <EyeOff size={16} />}
                    </button>
                    <button onClick={() => onDuplicate(index)} className="p-1.5 text-slate-400 hover:text-indigo-600 rounded-lg transition-colors" title="Dupliquer">
                        <Copy size={16} />
                    </button>
                    <button onClick={() => onRemove(index)} className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg transition-colors" title="Supprimer">
                        <Trash2 size={16} />
                    </button>
                    <button onClick={onToggleExpand} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg transition-colors">
                        {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                    </button>
                </div>
            </div>

            {/* Body (Expanded View) */}
            {isExpanded && (
                <div className="p-4 border-t border-slate-100 bg-slate-50/50 rounded-b-xl space-y-6">
                    
                    {/* Icon Section */}
                    <div>
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Icône</label>
                        <IconPicker 
                            value={item.icon || { type: 'none', value: '' }} 
                            onChange={(newIcon) => onUpdate(index, { ...item, icon: newIcon })} 
                        />
                    </div>

                    {/* Content Section */}
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Contenu</label>
                            <button onClick={handleGenerateAI} className="text-xs flex items-center gap-1 font-bold text-indigo-600 hover:text-indigo-700 bg-indigo-50 px-2 py-1 rounded-md">
                                <Wand2 size={12} /> Réécrire avec IA
                            </button>
                        </div>
                        
                        <div>
                            <input
                                type="text"
                                placeholder="Titre principal"
                                value={item.title || item.text || ''}
                                onChange={(e) => onUpdate(index, { ...item, [item.title !== undefined ? 'title' : 'text']: e.target.value })}
                                className="w-full text-sm font-medium px-3 py-2 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                        </div>
                        
                        {item.description !== undefined && (
                            <div>
                                <textarea
                                    placeholder="Description détaillée..."
                                    value={item.description}
                                    onChange={(e) => onUpdate(index, { ...item, description: e.target.value })}
                                    className="w-full text-sm px-3 py-2 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 min-h-[80px]"
                                />
                            </div>
                        )}
                        {item.content !== undefined && (
                            <div>
                                <textarea
                                    placeholder="Contenu..."
                                    value={item.content}
                                    onChange={(e) => onUpdate(index, { ...item, content: e.target.value })}
                                    className="w-full text-sm px-3 py-2 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 min-h-[80px]"
                                />
                            </div>
                        )}
                    </div>

                    {/* Badge Section (Optional) */}
                    {item.badge !== undefined && (
                        <div className="p-3 bg-white border border-slate-200 rounded-lg">
                            <label className="flex items-center justify-between cursor-pointer mb-2">
                                <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">Badge / Tag</span>
                                <input 
                                    type="checkbox" 
                                    checked={item.badge.enabled} 
                                    onChange={(e) => onUpdate(index, { ...item, badge: { ...item.badge, enabled: e.target.checked } })}
                                    className="accent-indigo-600"
                                />
                            </label>
                            {item.badge.enabled && (
                                <div className="flex gap-2">
                                    <input 
                                        type="text" 
                                        value={item.badge.text} 
                                        onChange={(e) => onUpdate(index, { ...item, badge: { ...item.badge, text: e.target.value } })}
                                        placeholder="Ex: Nouveau"
                                        className="flex-1 text-xs px-2 py-1.5 border border-slate-200 rounded outline-none"
                                    />
                                    <input 
                                        type="color" 
                                        value={item.badge.color || '#ef4444'} 
                                        onChange={(e) => onUpdate(index, { ...item, badge: { ...item.badge, color: e.target.value } })}
                                        className="w-8 h-8 rounded cursor-pointer"
                                    />
                                </div>
                            )}
                        </div>
                    )}

                    {/* Card Style (Optional) */}
                    {item.card !== undefined && (
                        <div className="p-3 bg-white border border-slate-200 rounded-lg">
                            <label className="flex items-center justify-between cursor-pointer mb-2">
                                <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">Style Carte</span>
                                <input 
                                    type="checkbox" 
                                    checked={item.card.enabled} 
                                    onChange={(e) => onUpdate(index, { ...item, card: { ...item.card, enabled: e.target.checked } })}
                                    className="accent-indigo-600"
                                />
                            </label>
                            {item.card.enabled && (
                                <div className="space-y-2 mt-3">
                                    <div className="flex items-center justify-between text-xs">
                                        <span className="text-slate-500">Ombre</span>
                                        <select 
                                            value={item.card.shadow || 'md'} 
                                            onChange={(e) => onUpdate(index, { ...item, card: { ...item.card, shadow: e.target.value } })}
                                            className="border-slate-200 rounded"
                                        >
                                            <option value="none">Aucune</option>
                                            <option value="sm">Légère</option>
                                            <option value="md">Moyenne</option>
                                            <option value="lg">Forte</option>
                                        </select>
                                    </div>
                                    <div className="flex items-center justify-between text-xs">
                                        <span className="text-slate-500">Effet Hover</span>
                                        <select 
                                            value={item.card.hoverEffect || 'lift'} 
                                            onChange={(e) => onUpdate(index, { ...item, card: { ...item.card, hoverEffect: e.target.value } })}
                                            className="border-slate-200 rounded"
                                        >
                                            <option value="none">Aucun</option>
                                            <option value="lift">Lift (Soulèvement)</option>
                                            <option value="glow">Glow (Lueur)</option>
                                        </select>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default function ItemsManager({ items = [], onChange, defaultItem = {}, limit = 12 }) {
    const [expandedIndex, setExpandedIndex] = useState(null);

    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    // Make sure all items have an id for dnd-kit
    const safeItems = items.map((item) => ({ ...item, id: item.id || nanoid() }));

    const handleDragEnd = (event) => {
        const { active, over } = event;
        if (active.id !== over.id) {
            const oldIndex = safeItems.findIndex((i) => i.id === active.id);
            const newIndex = safeItems.findIndex((i) => i.id === over.id);
            onChange(arrayMove(safeItems, oldIndex, newIndex));
        }
    };

    const updateItem = (index, newItem) => {
        const newItems = [...safeItems];
        newItems[index] = newItem;
        onChange(newItems);
    };

    const removeItem = (index) => {
        const newItems = safeItems.filter((_, i) => i !== index);
        onChange(newItems);
        if (expandedIndex === index) setExpandedIndex(null);
    };

    const duplicateItem = (index) => {
        if (safeItems.length >= limit) {
            alert(`Limite de ${limit} éléments atteinte.`);
            return;
        }
        const itemToClone = safeItems[index];
        const newItem = { ...itemToClone, id: nanoid() };
        const newItems = [...safeItems];
        newItems.splice(index + 1, 0, newItem);
        onChange(newItems);
        setExpandedIndex(index + 1);
    };

    const addItem = () => {
        if (safeItems.length >= limit) {
            alert(`Limite de ${limit} éléments atteinte.`);
            return;
        }
        const newItem = { ...defaultItem, id: nanoid() };
        onChange([...safeItems, newItem]);
        setExpandedIndex(safeItems.length);
    };

    return (
        <div className="mb-6 pt-4 border-t border-slate-100">
            <div className="flex items-center justify-between mb-4">
                <h3 className="block text-sm font-bold text-slate-700">Éléments de la grille</h3>
                <span className="text-xs text-slate-400 font-medium">{safeItems.length} / {limit}</span>
            </div>
            
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SortableContext items={safeItems.map(i => i.id)} strategy={verticalListSortingStrategy}>
                    {safeItems.map((item, index) => (
                        <SortableItem
                            key={item.id}
                            item={item}
                            index={index}
                            onUpdate={updateItem}
                            onRemove={removeItem}
                            onDuplicate={duplicateItem}
                            isExpanded={expandedIndex === index}
                            onToggleExpand={() => setExpandedIndex(expandedIndex === index ? null : index)}
                        />
                    ))}
                </SortableContext>
            </DndContext>

            {safeItems.length < limit && (
                <button 
                    onClick={addItem}
                    className="w-full flex items-center justify-center gap-2 py-3 mt-2 bg-slate-50 text-slate-600 hover:bg-slate-100 rounded-xl font-bold text-sm transition-colors border border-dashed border-slate-300 hover:border-slate-400"
                >
                    <Plus size={16} />
                    Ajouter un élément
                </button>
            )}
        </div>
    );
}

import React, { useState } from 'react';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Plus, ChevronLeft, Type, Link, Image as ImageIcon, Code, AlignLeft, AlignCenter, AlignRight, Layers } from 'lucide-react';
import SortableBlockItem from './SortableBlockItem';


export default function SectionBlocksManager({ section, onChange }) {
    const [editingBlockId, setEditingBlockId] = useState(null);
    const blocks = section.blocks || [];

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );

    const handleDragEnd = (event) => {
        const { active, over } = event;
        if (over && active.id !== over.id) {
            const oldIndex = blocks.findIndex((b) => b.id === active.id);
            const newIndex = blocks.findIndex((b) => b.id === over.id);
            onChange(arrayMove(blocks, oldIndex, newIndex));
        }
    };

    const addBlock = (type) => {
        const newBlock = {
            id: `block-${Date.now()}`,
            type,
            settings: getDefaultSettingsForType(type)
        };
        onChange([...blocks, newBlock]);
        setEditingBlockId(newBlock.id);
    };

    const deleteBlock = (id) => {
        onChange(blocks.filter(b => b.id !== id));
        if (editingBlockId === id) setEditingBlockId(null);
    };

    const updateBlock = (id, updates) => {
        onChange(blocks.map(b => b.id === id ? { ...b, settings: { ...b.settings, ...updates } } : b));
    };

    const getDefaultSettingsForType = (type) => {
        switch (type) {
            case 'Heading': return { text: 'Nouveau Titre', fontSize: '4xl', alignment: 'center', fontFamily: 'Outfit' };
            case 'Subtitle': return { text: 'Nouveau sous-titre attrayant.', fontSize: 'xl', alignment: 'center', fontFamily: 'Inter' };
            case 'Text': return { text: 'Description détaillée de votre offre.', fontSize: 'base', alignment: 'left', fontFamily: 'Inter' };
            case 'Button': return { label: 'Acheter maintenant', style: 'rounded', icon: '', backgroundColor: '#6366f1', textColor: '#ffffff' };
            case 'Media': return { mediaType: 'image', url: '', aspectRatio: 'video', overlayOpacity: 0, blur: 0 };
            case 'FeatureCard': return { title: 'Nouveau point fort', text: 'Mettez en avant un avantage unique.', icon: 'Star' };
            default: return {};
        }
    };

    const editingBlock = blocks.find(b => b.id === editingBlockId);

    if (editingBlock) {
        return (
            <div className="space-y-4">
                <button onClick={() => setEditingBlockId(null)} className="flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-indigo-600 mb-4 bg-slate-100 px-3 py-1.5 rounded-lg w-fit">
                    <ChevronLeft size={16} /> Retour aux blocs
                </button>
                <div className="border-b border-slate-200 pb-2 mb-4">
                    <h4 className="font-bold text-slate-800">Édition du bloc : {editingBlock.type}</h4>
                </div>

                {/* Common Typography settings for text blocks */}
                {['Heading', 'Subtitle', 'Text'].includes(editingBlock.type) && (
                    <>
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-1">Texte</label>
                            <textarea 
                                value={editingBlock.settings.text || ''} 
                                onChange={(e) => updateBlock(editingBlock.id, { text: e.target.value })}
                                className="w-full px-3 py-2 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 min-h-[80px]"
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1">Police</label>
                                <select 
                                    value={editingBlock.settings.fontFamily || 'Inter'}
                                    onChange={(e) => updateBlock(editingBlock.id, { fontFamily: e.target.value })}
                                    className="w-full p-2 border rounded-lg text-xs outline-none"
                                >
                                    <option value="Outfit">Outfit</option>
                                    <option value="Inter">Inter</option>
                                    <option value="Poppins">Poppins</option>
                                    <option value="Montserrat">Montserrat</option>
                                    <option value="Cairo">Cairo (RTL)</option>
                                    <option value="Tajawal">Tajawal (RTL)</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1">Taille</label>
                                <select 
                                    value={editingBlock.settings.fontSize || 'base'}
                                    onChange={(e) => updateBlock(editingBlock.id, { fontSize: e.target.value })}
                                    className="w-full p-2 border rounded-lg text-xs outline-none"
                                >
                                    <option value="sm">Petit (sm)</option>
                                    <option value="base">Normal (base)</option>
                                    <option value="lg">Grand (lg)</option>
                                    <option value="xl">Très Grand (xl)</option>
                                    <option value="2xl">Titre 2 (2xl)</option>
                                    <option value="4xl">Titre 1 (4xl)</option>
                                    <option value="6xl">Géant (6xl)</option>
                                </select>
                            </div>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1">Couleur du texte</label>
                            <input 
                                type="color" 
                                value={editingBlock.settings.textColor || '#0f172a'}
                                onChange={(e) => updateBlock(editingBlock.id, { textColor: e.target.value })}
                                className="w-full h-8 cursor-pointer rounded"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1">Alignement</label>
                            <div className="flex bg-white rounded-lg border border-slate-200 p-1">
                                <button onClick={() => updateBlock(editingBlock.id, { alignment: 'left' })} className={`flex-1 flex justify-center py-1.5 rounded-md ${editingBlock.settings.alignment === 'left' ? 'bg-indigo-50 text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}><AlignLeft size={16} /></button>
                                <button onClick={() => updateBlock(editingBlock.id, { alignment: 'center' })} className={`flex-1 flex justify-center py-1.5 rounded-md ${editingBlock.settings.alignment === 'center' ? 'bg-indigo-50 text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}><AlignCenter size={16} /></button>
                                <button onClick={() => updateBlock(editingBlock.id, { alignment: 'right' })} className={`flex-1 flex justify-center py-1.5 rounded-md ${editingBlock.settings.alignment === 'right' ? 'bg-indigo-50 text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}><AlignRight size={16} /></button>
                            </div>
                        </div>
                    </>
                )}

                {/* Button Settings */}
                {editingBlock.type === 'Button' && (
                    <>
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-1">Texte du bouton</label>
                            <input 
                                type="text" 
                                value={editingBlock.settings.label || ''} 
                                onChange={(e) => updateBlock(editingBlock.id, { label: e.target.value })}
                                className="w-full px-3 py-2 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1">Arrondi</label>
                                <select 
                                    value={editingBlock.settings.style || 'rounded'}
                                    onChange={(e) => updateBlock(editingBlock.id, { style: e.target.value })}
                                    className="w-full p-2 border rounded-lg text-xs outline-none"
                                >
                                    <option value="sharp">Carré</option>
                                    <option value="rounded">Arrondi</option>
                                    <option value="pill">Pilule</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1">Type de Bouton</label>
                                <select 
                                    value={editingBlock.settings.variant || 'solid'}
                                    onChange={(e) => updateBlock(editingBlock.id, { variant: e.target.value })}
                                    className="w-full p-2 border rounded-lg text-xs outline-none"
                                >
                                    <option value="solid">Couleur Pleine</option>
                                    <option value="outline">Contour (Outline)</option>
                                    <option value="ghost">Transparent (Ghost)</option>
                                    <option value="glow">Néon (Glow)</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1">Icône (Lucide)</label>
                                <input 
                                    type="text" 
                                    value={editingBlock.settings.icon || ''} 
                                    placeholder="ex: ShoppingBag"
                                    onChange={(e) => updateBlock(editingBlock.id, { icon: e.target.value })}
                                    className="w-full p-2 border border-slate-200 rounded-lg outline-none text-xs"
                                />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3 mt-2">
                            <div>
                                <label className="block text-[10px] font-bold text-slate-500 uppercase">Couleur Fond</label>
                                <input type="color" value={editingBlock.settings.backgroundColor || '#6366f1'} onChange={(e) => updateBlock(editingBlock.id, { backgroundColor: e.target.value })} className="w-full h-8 cursor-pointer rounded mt-1" />
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-slate-500 uppercase">Couleur Texte</label>
                                <input type="color" value={editingBlock.settings.textColor || '#ffffff'} onChange={(e) => updateBlock(editingBlock.id, { textColor: e.target.value })} className="w-full h-8 cursor-pointer rounded mt-1" />
                            </div>
                        </div>
                    </>
                )}

                {/* Media Settings */}
                {editingBlock.type === 'Media' && (
                    <>
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-1">Type de média</label>
                            <select 
                                value={editingBlock.settings.mediaType || 'image'}
                                onChange={(e) => updateBlock(editingBlock.id, { mediaType: e.target.value })}
                                className="w-full p-2 border rounded-lg text-sm outline-none"
                            >
                                <option value="image">Image</option>
                                <option value="video">Vidéo (mp4)</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-1">URL (Unsplash / Firebase)</label>
                            <input 
                                type="text" 
                                value={editingBlock.settings.url || ''} 
                                onChange={(e) => updateBlock(editingBlock.id, { url: e.target.value })}
                                placeholder="https://..."
                                className="w-full px-3 py-2 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 text-xs"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-1">Ratio d'aspect</label>
                            <select 
                                value={editingBlock.settings.aspectRatio || 'video'}
                                onChange={(e) => updateBlock(editingBlock.id, { aspectRatio: e.target.value })}
                                className="w-full p-2 border rounded-lg text-sm outline-none"
                            >
                                <option value="auto">Auto</option>
                                <option value="square">Carré (1:1)</option>
                                <option value="video">Paysage (16:9)</option>
                                <option value="vertical">Portrait (4:5)</option>
                            </select>
                        </div>
                        <div className="grid grid-cols-2 gap-3 mt-2">
                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1">Overlay (Noir %)</label>
                                <input type="range" min="0" max="100" value={editingBlock.settings.overlayOpacity || 0} onChange={(e) => updateBlock(editingBlock.id, { overlayOpacity: parseInt(e.target.value) })} className="w-full" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1">Flou (Blur px)</label>
                                <input type="range" min="0" max="20" value={editingBlock.settings.blur || 0} onChange={(e) => updateBlock(editingBlock.id, { blur: parseInt(e.target.value) })} className="w-full" />
                            </div>
                        </div>
                    </>
                )}

                {/* HTML Settings */}
                {editingBlock.type === 'HTML' && (
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1">Code Custom (HTML/CSS)</label>
                        <textarea 
                            value={editingBlock.settings.code || ''} 
                            onChange={(e) => updateBlock(editingBlock.id, { code: e.target.value })}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 min-h-[200px] font-mono text-xs bg-slate-900 text-slate-100"
                            placeholder="<div>Votre HTML ici</div>"
                            spellCheck="false"
                        />
                        <p className="text-[10px] text-amber-600 font-bold mt-1 bg-amber-50 p-2 rounded">
                            ⚠️ Attention: Le code sera exécuté directement. Ne collez que du code de confiance.
                        </p>
                    </div>
                )}

                {/* FeatureCard Settings */}
                {editingBlock.type === 'FeatureCard' && (
                    <>
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-1">Titre de la carte</label>
                            <input 
                                type="text" 
                                value={editingBlock.settings.title || ''} 
                                onChange={(e) => updateBlock(editingBlock.id, { title: e.target.value })}
                                className="w-full px-3 py-2 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 text-sm font-bold"
                            />
                        </div>
                        <div className="mt-3">
                            <label className="block text-sm font-bold text-slate-700 mb-1">Texte / Description</label>
                            <textarea 
                                value={editingBlock.settings.text || ''} 
                                onChange={(e) => updateBlock(editingBlock.id, { text: e.target.value })}
                                className="w-full px-3 py-2 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 min-h-[60px] text-sm"
                            />
                        </div>
                        <div className="mt-3">
                            <label className="block text-sm font-bold text-slate-700 mb-1">Icône (Nom Lucide)</label>
                            <input 
                                type="text" 
                                value={editingBlock.settings.icon || ''} 
                                placeholder="ex: Star, ShieldCheck, Truck"
                                onChange={(e) => updateBlock(editingBlock.id, { icon: e.target.value })}
                                className="w-full px-3 py-2 border border-slate-200 rounded-lg outline-none text-sm"
                            />
                        </div>
                    </>
                )}
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {blocks.length === 0 ? (
                <div className="p-4 bg-slate-50 border border-dashed border-slate-200 rounded-xl text-center text-slate-500 text-xs">
                    Aucun bloc dans cette section.
                </div>
            ) : (
                <div className="bg-slate-50 p-2 rounded-2xl border border-slate-200">
                    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                        <SortableContext items={blocks.map(b => b.id)} strategy={verticalListSortingStrategy}>
                            <div className="flex flex-col">
                                {blocks.map((block) => (
                                    <SortableBlockItem 
                                        key={block.id} 
                                        block={block} 
                                        onEdit={() => setEditingBlockId(block.id)}
                                        onDelete={() => deleteBlock(block.id)}
                                    />
                                ))}
                            </div>
                        </SortableContext>
                    </DndContext>
                </div>
            )}

            <div className="pt-2">
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Ajouter un bloc</h4>
                <div className="grid grid-cols-2 gap-2">
                    <button onClick={() => addBlock('Heading')} className="flex items-center gap-2 p-2 bg-white border border-slate-200 rounded-lg hover:border-indigo-400 hover:text-indigo-600 transition-colors text-xs font-bold text-slate-600"><Type size={14}/> Titre</button>
                    <button onClick={() => addBlock('Subtitle')} className="flex items-center gap-2 p-2 bg-white border border-slate-200 rounded-lg hover:border-indigo-400 hover:text-indigo-600 transition-colors text-xs font-bold text-slate-600"><Type size={14}/> Sous-titre</button>
                    <button onClick={() => addBlock('Text')} className="flex items-center gap-2 p-2 bg-white border border-slate-200 rounded-lg hover:border-indigo-400 hover:text-indigo-600 transition-colors text-xs font-bold text-slate-600"><Type size={14}/> Texte</button>
                    <button onClick={() => addBlock('Button')} className="flex items-center gap-2 p-2 bg-white border border-slate-200 rounded-lg hover:border-indigo-400 hover:text-indigo-600 transition-colors text-xs font-bold text-slate-600"><Link size={14}/> Bouton</button>
                    <button onClick={() => addBlock('Media')} className="flex items-center gap-2 p-2 bg-white border border-slate-200 rounded-lg hover:border-indigo-400 hover:text-indigo-600 transition-colors text-xs font-bold text-slate-600"><ImageIcon size={14}/> Media</button>
                    <button onClick={() => addBlock('HTML')} className="flex items-center gap-2 p-2 bg-white border border-slate-200 rounded-lg hover:border-indigo-400 hover:text-indigo-600 transition-colors text-xs font-bold text-slate-600"><Code size={14}/> Custom HTML</button>
                    <button onClick={() => addBlock('FeatureCard')} className="flex items-center gap-2 p-2 bg-white border border-slate-200 rounded-lg hover:border-indigo-400 hover:text-indigo-600 transition-colors text-xs font-bold text-slate-600"><Layers size={14}/> Carte Avantage</button>
                </div>
            </div>
        </div>
    );
}

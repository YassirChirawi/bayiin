import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Trash2, Edit2, Type, Image as ImageIcon, Link as LinkIcon, Code, Layers } from 'lucide-react';

const getBlockIcon = (type) => {
    switch (type) {
        case 'Heading':
        case 'Subtitle':
        case 'Text': return <Type size={14} />;
        case 'Button': return <LinkIcon size={14} />;
        case 'Media': return <ImageIcon size={14} />;
        case 'HTML': return <Code size={14} />;
        case 'FeatureCard': return <Layers size={14} />;
        default: return <GripVertical size={14} />;
    }
};

export default function SortableBlockItem({ block, onEdit, onDelete }) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging
    } = useSortable({ id: block.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 50 : 1,
    };

    return (
        <div 
            ref={setNodeRef} 
            style={style} 
            className={`flex items-center p-3 mb-2 rounded-xl transition-colors group relative border ${
                isDragging ? 'bg-indigo-50/80 shadow-lg scale-[1.02] border-indigo-200 z-50' : 'bg-white border-slate-200 hover:border-indigo-300'
            }`}
        >
            <div 
                {...attributes} 
                {...listeners}
                className="cursor-grab p-1 text-slate-300 hover:text-indigo-500 active:cursor-grabbing mr-2"
            >
                <GripVertical size={16} />
            </div>
            
            <div className="flex-1 flex flex-col justify-center min-w-0" onClick={onEdit}>
                <div className="flex items-center gap-2 text-sm font-bold text-slate-700 cursor-pointer hover:text-indigo-600">
                    <span className="text-slate-400">{getBlockIcon(block.type)}</span>
                    {block.type}
                </div>
                <div className="text-xs text-slate-400 truncate mt-0.5">
                    {block.settings?.text || block.settings?.title || block.settings?.label || block.settings?.code || "Configuration..."}
                </div>
            </div>
            
            <div className={`flex items-center gap-1 transition-opacity ${isDragging ? 'opacity-0' : 'opacity-100'}`}>
                <button onClick={onEdit} title="Éditer" className="p-1.5 text-indigo-400 hover:bg-indigo-50 rounded"><Edit2 size={14}/></button>
                <button onClick={onDelete} className="p-1.5 text-rose-400 hover:bg-rose-100 rounded ml-1"><Trash2 size={14}/></button>
            </div>
        </div>
    );
}

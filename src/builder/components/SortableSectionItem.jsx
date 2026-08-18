import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, ArrowUp, ArrowDown, Copy, Trash2 } from 'lucide-react';

export default function SortableSectionItem({ 
    section, 
    index, 
    isFirst, 
    isLast,
    isSelected, 
    onSelect, 
    onMoveUp, 
    onMoveDown, 
    onDuplicate, 
    onDelete 
}) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging
    } = useSortable({ id: section.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 50 : 1,
    };

    return (
        <div 
            ref={setNodeRef} 
            style={style} 
            className={`flex items-center p-3 transition-colors group relative ${
                isDragging ? 'bg-indigo-50/80 shadow-lg scale-[1.02] border border-indigo-200 z-50 rounded-xl' : 
                isSelected ? 'bg-indigo-50/30' : 'bg-white hover:bg-slate-50'
            }`}
        >
            <div 
                {...attributes} 
                {...listeners}
                className="cursor-grab p-2 text-slate-300 hover:text-indigo-500 active:cursor-grabbing"
            >
                <GripVertical size={16} />
            </div>
            
            <button 
                onClick={onSelect}
                className="flex-1 text-left px-2 font-bold text-slate-700 hover:text-indigo-600 truncate"
            >
                {section.type} <span className="text-xs font-normal text-slate-400 ml-2 line-clamp-1 inline-block align-bottom">{section.title}</span>
            </button>
            
            <div className={`flex items-center gap-1 transition-opacity ${isDragging ? 'opacity-0' : 'opacity-0 group-hover:opacity-100'}`}>
                <button onClick={onMoveUp} disabled={isFirst} className="p-1.5 text-slate-400 hover:bg-slate-200 rounded disabled:opacity-30"><ArrowUp size={14}/></button>
                <button onClick={onMoveDown} disabled={isLast} className="p-1.5 text-slate-400 hover:bg-slate-200 rounded disabled:opacity-30"><ArrowDown size={14}/></button>
                <button onClick={onDuplicate} title="Dupliquer" className="p-1.5 text-indigo-400 hover:bg-indigo-50 rounded"><Copy size={14}/></button>
                <button onClick={onDelete} className="p-1.5 text-rose-400 hover:bg-rose-100 rounded ml-1"><Trash2 size={14}/></button>
            </div>
        </div>
    );
}

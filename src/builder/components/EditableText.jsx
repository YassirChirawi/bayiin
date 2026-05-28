import React, { useState, useRef, useEffect } from 'react';
import { Edit3 } from 'lucide-react';

export default function EditableText({ 
    value, 
    onChange, 
    as: Component = 'div', 
    className = '', 
    isReadOnly = false,
    placeholder = "Saisissez du texte..."
}) {
    const [isEditing, setIsEditing] = useState(false);
    const [localValue, setLocalValue] = useState(value);
    const inputRef = useRef(null);

    useEffect(() => {
        setLocalValue(value);
    }, [value]);

    useEffect(() => {
        if (isEditing && inputRef.current) {
            inputRef.current.focus();
            // Mettre le curseur à la fin
            const selection = window.getSelection();
            const range = document.createRange();
            range.selectNodeContents(inputRef.current);
            range.collapse(false);
            selection.removeAllRanges();
            selection.addRange(range);
        }
    }, [isEditing]);

    const handleDoubleClick = (e) => {
        if (isReadOnly) return;
        e.stopPropagation();
        setIsEditing(true);
    };

    const handleBlur = () => {
        if (!isEditing) return;
        setIsEditing(false);
        const finalValue = inputRef.current?.innerText || '';
        if (finalValue !== value) {
            onChange(finalValue);
        }
    };

    const handleKeyDown = (e) => {
        // Optionnel : Sauvegarder sur Entrée si ce n'est pas un paragraphe multiligne
        if (e.key === 'Enter' && Component !== 'p') {
            e.preventDefault();
            inputRef.current?.blur();
        }
        if (e.key === 'Escape') {
            setIsEditing(false);
            setLocalValue(value); // revert
        }
    };

    const handleInput = (e) => {
        setLocalValue(e.currentTarget.innerText);
    };

    if (isReadOnly) {
        return <Component className={className}>{value}</Component>;
    }

    return (
        <div 
            className="relative group inline-block w-full"
            onDoubleClick={handleDoubleClick}
        >
            <Component
                ref={inputRef}
                contentEditable={isEditing}
                suppressContentEditableWarning={true}
                onBlur={handleBlur}
                onKeyDown={handleKeyDown}
                onInput={handleInput}
                className={`${className} ${isEditing ? 'outline-none ring-2 ring-indigo-500 ring-offset-4 rounded bg-white/50 cursor-text' : 'cursor-pointer hover:outline-dashed hover:outline-2 hover:outline-indigo-300 hover:outline-offset-4 rounded'}`}
                style={{ 
                    minWidth: '50px', 
                    minHeight: '1em',
                    display: 'inline-block'
                }}
            >
                {isEditing ? localValue : (value || placeholder)}
            </Component>
            
            {!isEditing && (
                <div className="absolute -top-3 -right-3 bg-indigo-600 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none shadow-md z-10 scale-75">
                    <Edit3 size={12} />
                </div>
            )}
        </div>
    );
}

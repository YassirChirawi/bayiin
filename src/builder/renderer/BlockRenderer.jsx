import React from 'react';
import { BuilderRegistry } from '../registry';
import { Paintbrush } from 'lucide-react';

export default function BlockRenderer({ section, theme, onClick, isSelected, isReadOnly, contextData }) {
    const { type, variant, title, subtitle } = section;
    
    // Determine the variant component to render
    const sectionConfig = BuilderRegistry[type];
    let VariantComponent = null;

    if (sectionConfig) {
        const variantName = variant || sectionConfig.defaultVariant;
        VariantComponent = sectionConfig.variants[variantName] || sectionConfig.variants[sectionConfig.defaultVariant];
    }

    // Default Fallback for unregistered sections
    const DefaultFallback = () => (
        <div className="py-16 px-6 bg-slate-50 text-center border-y border-dashed border-slate-300">
            <h2 className="text-2xl font-bold mb-2 text-slate-800">{title || type}</h2>
            <p className="text-slate-500">{subtitle || "Cette section n'a pas encore de rendu configuré."}</p>
        </div>
    );

    const content = VariantComponent ? (
        <VariantComponent section={section} theme={theme} contextData={contextData} />
    ) : (
        <DefaultFallback />
    );

    if (isReadOnly) {
        return content;
    }

    return (
        <div 
            onClick={(e) => { e.stopPropagation(); if (onClick) onClick(); }}
            className={`relative group cursor-pointer transition-all duration-300 ${isSelected ? 'ring-4 ring-indigo-500/50 z-10' : 'hover:ring-2 hover:ring-indigo-300'}`}
        >
            <div className={`absolute inset-0 border-2 pointer-events-none transition-opacity duration-200 ${isSelected ? 'border-indigo-600 opacity-100' : 'border-indigo-500 opacity-0 group-hover:opacity-100'}`}></div>
            
            <div className={`absolute top-4 right-4 bg-indigo-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold shadow-lg flex items-center gap-1 transition-all duration-200 z-20 ${isSelected ? 'opacity-100 scale-100' : 'opacity-0 scale-95 group-hover:opacity-100 group-hover:scale-100'}`}>
                <Paintbrush size={14} />
                {isSelected ? "En cours d'édition" : "Éditer cette section"}
            </div>
            {content}
        </div>
    );
}

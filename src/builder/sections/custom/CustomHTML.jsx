import React from 'react';
import DOMPurify from 'dompurify';

export default function CustomHTML({ section }) {
    const blocks = section.blocks || [];
    const settings = section.settings || {};
    
    const containerStyle = {
        paddingTop: `${settings.paddingTop || 0}px`,
        paddingBottom: `${settings.paddingBottom || 0}px`,
        backgroundColor: settings.backgroundColor || 'transparent',
    };

    const htmlBlocks = blocks.filter(b => b.type === 'HTML');

    if (htmlBlocks.length === 0) {
        return (
            <div className="py-12 text-center text-slate-500 bg-slate-50 border-y border-dashed border-slate-300">
                <p className="text-sm font-bold">Section Custom HTML</p>
                <p className="text-xs">Ajoutez un bloc HTML depuis le panneau de gauche pour insérer votre code.</p>
            </div>
        );
    }

    return (
        <section style={containerStyle}>
            {htmlBlocks.map(block => (
                <div 
                    key={block.id} 
                    dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(block.settings?.code || '') }} 
                />
            ))}
        </section>
    );
}

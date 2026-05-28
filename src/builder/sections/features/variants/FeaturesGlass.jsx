import React from 'react';
import MediaBackground from '../../../components/MediaBackground';
import { getSectionStyle, getAlignmentClass } from '../../../utils/styles';

import EditableText from '../../../components/EditableText';

export default function FeaturesGlass({ section, theme, onUpdate }) {
    const { title, subtitle, content, items = [], settings = {} } = section;
    const alignClass = getAlignmentClass(settings.alignment);
    
    // Assurer qu'on a toujours au moins 3 éléments pour l'UI, et les initialiser s'ils manquent.
    const displayItems = items.length > 0 ? items : [
        { title: "Livraison Express", content: "Partout au Maroc en 24h", emoji: "🚀" },
        { title: "Paiement Sécurisé", content: "Payez à la réception", emoji: "🤝" },
        { title: "Qualité Garantie", content: "Satisfait ou remboursé", emoji: "💎" }
    ];

    const isMedia = settings.backgroundType === 'image' || settings.backgroundType === 'video';
    const textColor = settings.textColor || '#0f172a';

    const updateItem = (index, field, value) => {
        const newItems = [...displayItems];
        newItems[index] = { ...newItems[index], [field]: value };
        onUpdate?.({ items: newItems });
    };

    return (
        <div className={`px-6 ${alignClass} relative overflow-hidden`} style={getSectionStyle(section, theme)}>
            <MediaBackground settings={settings} />
            <div className="max-w-6xl mx-auto relative z-10">
                <EditableText
                    value={title}
                    onChange={(val) => onUpdate?.({ title: val })}
                    as="h2"
                    className="text-3xl md:text-5xl font-black mb-4 drop-shadow-sm"
                    isReadOnly={!onUpdate}
                />
                <EditableText
                    value={subtitle}
                    onChange={(val) => onUpdate?.({ subtitle: val })}
                    as="p"
                    className="text-xl opacity-80 mb-16 drop-shadow-sm"
                    isReadOnly={!onUpdate}
                />
                {content && (
                    <EditableText
                        value={content}
                        onChange={(val) => onUpdate?.({ content: val })}
                        as="p"
                        className="leading-relaxed max-w-3xl mx-auto mb-12 opacity-90"
                        isReadOnly={!onUpdate}
                    />
                )}
                
                <div className="grid md:grid-cols-3 gap-8">
                    {displayItems.map((item, i) => (
                        <div 
                            key={i} 
                            className={`p-10 rounded-3xl backdrop-blur-md shadow-xl hover:-translate-y-2 transition-transform duration-300 ${isMedia ? 'bg-white/10 border border-white/20' : 'bg-white border border-slate-100'}`} 
                            style={{ color: textColor }}
                        >
                            <div className={`w-20 h-20 mx-auto rounded-2xl mb-8 flex items-center justify-center shadow-inner text-4xl ${isMedia ? 'bg-white/20' : 'bg-slate-50'}`}>
                                <EditableText
                                    value={item.emoji || "⭐"}
                                    onChange={(val) => updateItem(i, 'emoji', val)}
                                    as="span"
                                    isReadOnly={!onUpdate}
                                />
                            </div>
                            <EditableText
                                value={item.title}
                                onChange={(val) => updateItem(i, 'title', val)}
                                as="h3"
                                className="font-black text-2xl mb-4 block"
                                isReadOnly={!onUpdate}
                            />
                            <EditableText
                                value={item.content}
                                onChange={(val) => updateItem(i, 'content', val)}
                                as="p"
                                className="opacity-90 leading-relaxed text-lg"
                                isReadOnly={!onUpdate}
                            />
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

import React from 'react';
import { HelpCircle } from 'lucide-react';
import MediaBackground from '../../../components/MediaBackground';
import { getSectionStyle, getAlignmentClass } from '../../../utils/styles';
import EditableText from '../../../components/EditableText';

export default function FAQAccordion({ section, theme, onUpdate }) {
    const { title, subtitle, items = [], settings = {} } = section;
    const alignClass = getAlignmentClass(settings.alignment);
    
    const displayItems = items.length > 0 ? items : [
        { title: "Quels sont les délais de livraison ?", content: "Nous livrons partout au Maroc en 24 à 48 heures ouvrables." },
        { title: "Comment se passe le paiement ?", content: "Vous payez uniquement à la réception de votre commande (Cash on Delivery)." }
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
            <div className="max-w-3xl mx-auto relative z-10">
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
                    className="text-xl opacity-80 mb-12 drop-shadow-sm"
                    isReadOnly={!onUpdate}
                />
                <div className="space-y-6 text-left">
                    {displayItems.map((item, i) => (
                        <div key={i} className={`p-8 rounded-3xl backdrop-blur-md shadow-lg ${isMedia ? 'bg-white/10 border border-white/20' : 'bg-white border border-slate-100'}`} style={{ color: textColor }}>
                            <div className="font-black text-2xl mb-4 flex items-center gap-3">
                                <HelpCircle className="text-indigo-500" />
                                <EditableText
                                    value={item.title}
                                    onChange={(val) => updateItem(i, 'title', val)}
                                    as="h3"
                                    isReadOnly={!onUpdate}
                                />
                            </div>
                            <EditableText
                                value={item.content}
                                onChange={(val) => updateItem(i, 'content', val)}
                                as="p"
                                className="text-lg opacity-80 leading-relaxed ml-9 block"
                                isReadOnly={!onUpdate}
                            />
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

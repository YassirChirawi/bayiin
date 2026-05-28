import React from 'react';
import MediaBackground from '../../../components/MediaBackground';
import { getSectionStyle, getAlignmentClass } from '../../../utils/styles';
import EditableText from '../../../components/EditableText';

export default function TestimonialsGlass({ section, theme, onUpdate }) {
    const { title, subtitle, items = [], settings = {} } = section;
    const alignClass = getAlignmentClass(settings.alignment);
    
    const displayItems = items.length > 0 ? items : [
        { content: "Excellent service et produits de qualité. La livraison a été très rapide !", author: "Fatima Z.", rating: 5 },
        { content: "Le paiement à la livraison m'a rassuré, très satisfait de mon achat.", author: "Amine M.", rating: 5 },
        { content: "Je recommande fortement cette boutique, service client au top.", author: "Sara K.", rating: 4 }
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
            <div className="max-w-7xl mx-auto relative z-10">
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
                <div className="grid md:grid-cols-3 gap-8">
                    {displayItems.map((item, i) => (
                        <div key={i} className={`p-10 rounded-3xl backdrop-blur-md shadow-xl text-left hover:-translate-y-2 transition-transform duration-300 ${isMedia ? 'bg-white/10 border border-white/20' : 'bg-white border border-slate-100'}`} style={{ color: textColor }}>
                            <div className="flex text-amber-400 mb-6 text-2xl tracking-widest drop-shadow-sm">
                                {'★'.repeat(item.rating || 5)}{'☆'.repeat(5 - (item.rating || 5))}
                            </div>
                            <div className="italic mb-8 text-xl opacity-90 leading-relaxed font-serif flex">
                                "<EditableText
                                    value={item.content}
                                    onChange={(val) => updateItem(i, 'content', val)}
                                    as="span"
                                    isReadOnly={!onUpdate}
                                />"
                            </div>
                            <div className="flex items-center gap-4">
                                <div className="w-14 h-14 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center font-bold text-white shadow-lg text-xl">
                                    {(item.author || "C")[0].toUpperCase()}
                                </div>
                                <div>
                                    <EditableText
                                        value={item.author}
                                        onChange={(val) => updateItem(i, 'author', val)}
                                        as="div"
                                        className="font-black text-xl block"
                                        isReadOnly={!onUpdate}
                                    />
                                    <div className="text-sm opacity-70">Client vérifié</div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

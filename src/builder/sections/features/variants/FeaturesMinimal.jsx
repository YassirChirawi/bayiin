import React from 'react';
import MediaBackground from '../../../components/MediaBackground';
import { getSectionStyle, getAlignmentClass } from '../../../utils/styles';
import EditableText from '../../../components/EditableText';
import DynamicIcon from '../../../components/DynamicIcon';

export default function FeaturesMinimal({ section, theme, onUpdate }) {
    const { title, subtitle, items = [], settings = {} } = section;
    const alignClass = getAlignmentClass(settings.alignment);
    
    const displayItems = items.length > 0 ? items : [
        { id: 'item-1', title: "Rapide", content: "Partout au Maroc", icon: { type: 'lucide', value: 'Zap', size: 40 } },
        { id: 'item-2', title: "Sécurisé", content: "Payez à la livraison", icon: { type: 'lucide', value: 'ShieldCheck', size: 40 } },
        { id: 'item-3', title: "Garanti", content: "Satisfait ou remboursé", icon: { type: 'lucide', value: 'CheckCircle', size: 40 } }
    ];

    const updateItem = (index, field, value) => {
        const newItems = [...displayItems];
        newItems[index] = { ...newItems[index], [field]: value };
        onUpdate?.({ items: newItems });
    };

    return (
        <div className={`px-6 ${alignClass} relative overflow-hidden`} style={getSectionStyle(section, theme)}>
            <MediaBackground settings={settings} />
            <div className="max-w-6xl mx-auto relative z-10">
                <div className="mb-16">
                    <EditableText
                        value={title}
                        onChange={(val) => onUpdate?.({ title: val })}
                        as="h2"
                        className="text-3xl md:text-4xl font-bold mb-4 tracking-tight drop-shadow-sm"
                        isReadOnly={!onUpdate}
                    />
                    <EditableText
                        value={subtitle}
                        onChange={(val) => onUpdate?.({ subtitle: val })}
                        as="p"
                        className="text-lg opacity-70 max-w-2xl mx-auto drop-shadow-sm"
                        isReadOnly={!onUpdate}
                    />
                </div>
                
                <div className="flex flex-col md:flex-row gap-12 justify-center items-start border-t border-slate-200/20 pt-16">
                    {displayItems.filter(item => item.isVisible !== false).map((item, i) => (
                        <div key={item.id || i} className="flex-1 flex flex-col items-center text-center relative">
                            {/* Badge */}
                            {item.badge?.enabled && (
                                <div 
                                    className="absolute -top-4 right-1/4 px-3 py-1 rounded-full text-white text-xs font-bold shadow-sm"
                                    style={{ backgroundColor: item.badge.color || '#ef4444' }}
                                >
                                    {item.badge.text}
                                </div>
                            )}

                            {(!item.icon || item.icon.type !== 'none') && (
                                <div className="mb-6 opacity-90 text-indigo-500">
                                    <DynamicIcon 
                                        icon={item.icon || (item.emoji ? { type: 'emoji', value: item.emoji } : { type: 'lucide', value: item.icon, size: 40 })} 
                                        override={{ color: theme.primaryColor }}
                                    />
                                </div>
                            )}

                            <EditableText
                                value={item.title}
                                onChange={(val) => updateItem(i, 'title', val)}
                                as="h3"
                                className="font-bold text-xl mb-3 tracking-wide block"
                                style={item.titleColor ? { color: item.titleColor } : {}}
                                isReadOnly={!onUpdate}
                            />
                            <EditableText
                                value={item.content || item.description}
                                onChange={(val) => updateItem(i, 'content', val)}
                                as="p"
                                className="opacity-70 leading-relaxed text-sm max-w-[250px]"
                                isReadOnly={!onUpdate}
                            />

                            {item.link?.enabled && (
                                <a 
                                    href={item.link.url || '#'} 
                                    target={item.link.target || '_self'}
                                    className="mt-4 font-bold text-sm hover:underline opacity-90"
                                    style={{ color: theme.primaryColor }}
                                    onClick={(e) => !onUpdate && e.preventDefault()}
                                >
                                    {item.link.label || 'Voir plus'}
                                </a>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

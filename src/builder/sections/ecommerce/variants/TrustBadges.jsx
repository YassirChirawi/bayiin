import React from 'react';
import MediaBackground from '../../../components/MediaBackground';
import { getSectionStyle, getAlignmentClass } from '../../../utils/styles';
import EditableText from '../../../components/EditableText';
import DynamicIcon from '../../../components/DynamicIcon';

export default function TrustBadges({ section, theme, onUpdate }) {
    const { title, subtitle, settings = {} } = section;
    const alignClass = getAlignmentClass(settings.alignment);

    const badges = section.items?.length > 0 ? section.items : [
        { id: 'item-1', icon: { type: 'lucide', value: 'ShieldCheck', size: 24 }, title: "Paiement 100% Sécurisé" },
        { id: 'item-2', icon: { type: 'lucide', value: 'Truck', size: 24 }, title: "Livraison Rapide" },
        { id: 'item-3', icon: { type: 'lucide', value: 'Clock', size: 24 }, title: "Retour sous 7 jours" },
        { id: 'item-4', icon: { type: 'lucide', value: 'HeadphonesIcon', size: 24 }, title: "Support Client 7j/7" }
    ];

    const updateItem = (index, field, value) => {
        const newItems = [...badges];
        newItems[index] = { ...newItems[index], [field]: value };
        onUpdate?.({ items: newItems });
    };

    return (
        <div className={`px-6 py-8 relative overflow-hidden ${alignClass}`} style={getSectionStyle(section, theme)}>
            <MediaBackground settings={settings} />
            <div className="max-w-6xl mx-auto relative z-10">
                {(title || subtitle) && (
                    <div className="mb-8">
                        {title && (
                            <EditableText
                                value={title}
                                onChange={(val) => onUpdate?.({ title: val })}
                                as="h2"
                                className="text-2xl font-bold mb-2 drop-shadow-sm"
                                isReadOnly={!onUpdate}
                            />
                        )}
                        {subtitle && (
                            <EditableText
                                value={subtitle}
                                onChange={(val) => onUpdate?.({ subtitle: val })}
                                as="p"
                                className="opacity-80 drop-shadow-sm"
                                isReadOnly={!onUpdate}
                            />
                        )}
                    </div>
                )}
                
                <div className="flex flex-wrap justify-center items-center gap-4 md:gap-8">
                    {badges.filter(b => b.isVisible !== false).map((badge, idx) => (
                        <div key={badge.id || idx} className="flex items-center gap-3 bg-slate-50/80 backdrop-blur-sm border border-slate-200 px-6 py-4 rounded-xl shadow-sm hover:shadow-md transition-shadow relative">
                            {/* Badge corner */}
                            {badge.badge?.enabled && (
                                <div 
                                    className="absolute -top-2 -right-2 px-2 py-0.5 rounded-full text-white text-[10px] font-bold shadow-sm"
                                    style={{ backgroundColor: badge.badge.color || '#ef4444' }}
                                >
                                    {badge.badge.text}
                                </div>
                            )}

                            {(!badge.icon || badge.icon.type !== 'none') && (
                                <DynamicIcon 
                                    icon={badge.icon || { type: 'lucide', value: badge.icon, size: 24 }} 
                                    override={{ color: theme.primaryColor }}
                                />
                            )}
                            
                            <EditableText
                                value={badge.text || badge.title}
                                onChange={(val) => updateItem(idx, 'title', val)}
                                as="span"
                                className="font-bold text-slate-800 text-sm md:text-base whitespace-nowrap"
                                style={badge.titleColor ? { color: badge.titleColor } : {}}
                                isReadOnly={!onUpdate}
                            />
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

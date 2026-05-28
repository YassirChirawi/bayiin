import React from 'react';
import MediaBackground from '../../../components/MediaBackground';
import { getSectionStyle, getAlignmentClass } from '../../../utils/styles';
import EditableText from '../../../components/EditableText';
import DynamicIcon from '../../../components/DynamicIcon';

export default function CODReassurance({ section, theme, onUpdate }) {
    const { title, subtitle, settings = {} } = section;
    const alignClass = getAlignmentClass(settings.alignment);
    
    // Valeurs par défaut si le titre/sous-titre est vide
    const displayTitle = title || "Pourquoi acheter chez nous ?";
    const displaySubtitle = subtitle || "Nous vous garantissons une expérience sans risque.";

    const features = section.items?.length > 0 ? section.items : [
        {
            id: 'item-1',
            icon: { type: 'lucide', value: 'Banknote', color: 'primary', size: 32 },
            title: "Paiement à la livraison",
            desc: "Ne payez rien aujourd'hui. Payez uniquement lorsque vous recevez votre commande.",
            card: { enabled: true, shadow: 'sm', hoverEffect: 'lift' }
        },
        {
            id: 'item-2',
            icon: { type: 'lucide', value: 'Truck', color: 'primary', size: 32 },
            title: "Livraison rapide",
            desc: "Nous expédions votre commande sous 24h partout au Maroc.",
            card: { enabled: true, shadow: 'sm', hoverEffect: 'lift' }
        },
        {
            id: 'item-3',
            icon: { type: 'lucide', value: 'ShieldCheck', color: 'primary', size: 32 },
            title: "Garantie Satisfait",
            desc: "Vérifiez votre colis à la réception. Remplacement immédiat en cas de problème.",
            card: { enabled: true, shadow: 'sm', hoverEffect: 'lift' }
        }
    ];

    const updateItem = (index, field, value) => {
        const newItems = [...features];
        newItems[index] = { ...newItems[index], [field]: value };
        onUpdate?.({ items: newItems });
    };

    // Obtenir le style de la carte
    const getCardStyle = (cardSettings) => {
        if (!cardSettings?.enabled) return 'bg-transparent';
        let classes = 'bg-white/80 backdrop-blur-sm border border-slate-100 rounded-2xl p-6 flex flex-col items-center text-center transition-all duration-300';
        
        if (cardSettings.shadow === 'sm') classes += ' shadow-sm';
        if (cardSettings.shadow === 'md') classes += ' shadow-md';
        if (cardSettings.shadow === 'lg') classes += ' shadow-lg';
        
        if (cardSettings.hoverEffect === 'lift') classes += ' hover:-translate-y-1';
        if (cardSettings.hoverEffect === 'scale') classes += ' hover:scale-105';
        if (cardSettings.hoverEffect === 'glow') classes += ' hover:shadow-indigo-500/20';

        return classes;
    };

    return (
        <div className={`px-6 py-12 relative overflow-hidden ${alignClass}`} style={getSectionStyle(section, theme)}>
            <MediaBackground settings={settings} />
            <div className="max-w-5xl mx-auto relative z-10">
                <div className="mb-12">
                    <EditableText
                        value={displayTitle}
                        onChange={(val) => onUpdate?.({ title: val })}
                        as="h2"
                        className="text-3xl md:text-4xl font-black mb-4 drop-shadow-sm"
                        isReadOnly={!onUpdate}
                    />
                    {displaySubtitle && (
                        <EditableText
                            value={displaySubtitle}
                            onChange={(val) => onUpdate?.({ subtitle: val })}
                            as="p"
                            className="text-lg opacity-80 max-w-2xl mx-auto drop-shadow-sm"
                            isReadOnly={!onUpdate}
                        />
                    )}
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {features.filter(f => f.isVisible !== false).map((feature, idx) => (
                        <div key={feature.id || idx} className={`relative ${getCardStyle(feature.card)}`}>
                            {/* Badge */}
                            {feature.badge?.enabled && (
                                <div 
                                    className="absolute -top-3 right-4 px-3 py-1 rounded-full text-white text-xs font-bold shadow-sm"
                                    style={{ backgroundColor: feature.badge.color || '#ef4444' }}
                                >
                                    {feature.badge.text}
                                </div>
                            )}

                            {/* Icon */}
                            {(!feature.icon || feature.icon.type !== 'none') && (
                                <div className="mb-4 text-emerald-600">
                                    <DynamicIcon 
                                        icon={feature.icon || { type: 'lucide', value: feature.icon, size: 32 }} 
                                        override={{ color: theme.primaryColor }}
                                    />
                                </div>
                            )}

                            {/* Text */}
                            <EditableText
                                value={feature.title}
                                onChange={(val) => updateItem(idx, 'title', val)}
                                as="h3"
                                className="text-xl font-bold text-slate-900 mb-2"
                                style={feature.titleColor ? { color: feature.titleColor } : {}}
                                isReadOnly={!onUpdate}
                            />
                            <EditableText
                                value={feature.desc || feature.description || feature.content}
                                onChange={(val) => updateItem(idx, 'description', val)}
                                as="p"
                                className="text-slate-600 text-sm leading-relaxed"
                                isReadOnly={!onUpdate}
                            />

                            {/* Link */}
                            {feature.link?.enabled && (
                                <a 
                                    href={feature.link.url || '#'} 
                                    target={feature.link.target || '_self'}
                                    className="mt-4 font-bold text-sm hover:underline"
                                    style={{ color: theme.primaryColor }}
                                    onClick={(e) => !onUpdate && e.preventDefault()}
                                >
                                    {feature.link.label || 'En savoir plus'}
                                </a>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

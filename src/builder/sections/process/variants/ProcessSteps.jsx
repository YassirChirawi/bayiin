import React from 'react';
import MediaBackground from '../../../components/MediaBackground';
import { getSectionStyle, getAlignmentClass } from '../../../utils/styles';
import EditableText from '../../../components/EditableText';
import DynamicIcon from '../../../components/DynamicIcon';

export default function ProcessSteps({ section, theme, onUpdate }) {
    const { title, subtitle, settings = {} } = section;
    const alignClass = getAlignmentClass(settings.alignment);
    
    const items = section.items?.length > 0 ? section.items : [
        { id: 'step-1', icon: { type: 'lucide', value: 'ShoppingCart', size: 24, background: { enabled: true, shape: 'circle', color: '#f1f5f9' } }, title: "1. Commandez", description: "Choisissez vos produits et validez votre panier." },
        { id: 'step-2', icon: { type: 'lucide', value: 'PhoneCall', size: 24, background: { enabled: true, shape: 'circle', color: '#f1f5f9' } }, title: "2. Confirmation", description: "Notre équipe vous appelle pour confirmer." },
        { id: 'step-3', icon: { type: 'lucide', value: 'Truck', size: 24, background: { enabled: true, shape: 'circle', color: '#f1f5f9' } }, title: "3. Expédition", description: "Votre commande est expédiée le jour même." },
        { id: 'step-4', icon: { type: 'lucide', value: 'Banknote', size: 24, background: { enabled: true, shape: 'circle', color: '#f1f5f9' } }, title: "4. Réception", description: "Payez en cash à la réception de votre colis." }
    ];

    const updateItem = (index, field, value) => {
        const newItems = [...items];
        newItems[index] = { ...newItems[index], [field]: value };
        onUpdate?.({ items: newItems });
    };

    const visibleItems = items.filter(i => i.isVisible !== false);

    return (
        <div className={`px-6 py-16 relative overflow-hidden ${alignClass}`} style={getSectionStyle(section, theme)}>
            <MediaBackground settings={settings} />
            <div className="max-w-6xl mx-auto relative z-10">
                {(title || subtitle) && (
                    <div className="mb-16">
                        {title && (
                            <EditableText
                                value={title}
                                onChange={(val) => onUpdate?.({ title: val })}
                                as="h2"
                                className="text-3xl md:text-4xl font-bold mb-4 drop-shadow-sm"
                                isReadOnly={!onUpdate}
                            />
                        )}
                        {subtitle && (
                            <EditableText
                                value={subtitle}
                                onChange={(val) => onUpdate?.({ subtitle: val })}
                                as="p"
                                className="text-lg opacity-80 max-w-2xl mx-auto drop-shadow-sm"
                                isReadOnly={!onUpdate}
                            />
                        )}
                    </div>
                )}
                
                <div className="relative">
                    {/* Horizontal Connector Line (Desktop only for horizontal layout) */}
                    <div className="hidden md:block absolute top-6 left-[10%] right-[10%] h-0.5 bg-slate-200 -z-10"></div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-8 md:gap-4 relative z-0">
                        {visibleItems.map((item, idx) => (
                            <div key={item.id || idx} className="flex flex-col items-center text-center relative group">
                                
                                {/* Step Icon */}
                                <div className="mb-6 bg-white relative z-10 p-2">
                                    <DynamicIcon 
                                        icon={item.icon || { type: 'none' }} 
                                        override={{ color: theme.primaryColor }}
                                    />
                                    {/* Number indicator */}
                                    <div 
                                        className="absolute -top-1 -right-1 w-6 h-6 rounded-full text-white text-xs flex items-center justify-center font-bold shadow-sm"
                                        style={{ backgroundColor: theme.primaryColor }}
                                    >
                                        {idx + 1}
                                    </div>
                                </div>
                                
                                {/* Content */}
                                <EditableText
                                    value={item.title}
                                    onChange={(val) => updateItem(idx, 'title', val)}
                                    as="h3"
                                    className="font-bold text-lg mb-2 text-slate-900"
                                    style={item.titleColor ? { color: item.titleColor } : {}}
                                    isReadOnly={!onUpdate}
                                />
                                <EditableText
                                    value={item.description || item.content}
                                    onChange={(val) => updateItem(idx, 'description', val)}
                                    as="p"
                                    className="text-sm text-slate-600 leading-relaxed max-w-[200px]"
                                    isReadOnly={!onUpdate}
                                />
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}

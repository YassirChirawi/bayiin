import React, { useEffect, useState, useRef } from 'react';
import MediaBackground from '../../../components/MediaBackground';
import { getSectionStyle, getAlignmentClass } from '../../../utils/styles';
import EditableText from '../../../components/EditableText';
import DynamicIcon from '../../../components/DynamicIcon';

// Un hook simple pour l'animation des nombres au scroll
const useCountUp = (end, duration = 2000, start = 0) => {
    const [count, setCount] = useState(start);
    const [hasAnimated, setHasAnimated] = useState(false);
    const ref = useRef(null);

    useEffect(() => {
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting && !hasAnimated) {
                    setHasAnimated(true);
                    let startTime = null;
                    const endVal = parseInt(end.replace(/[^0-9]/g, '')) || 0;
                    if (endVal === 0) return;

                    const step = (timestamp) => {
                        if (!startTime) startTime = timestamp;
                        const progress = Math.min((timestamp - startTime) / duration, 1);
                        // Easing easeOutQuart
                        const easeProgress = 1 - Math.pow(1 - progress, 4);
                        setCount(Math.floor(easeProgress * endVal));
                        
                        if (progress < 1) {
                            window.requestAnimationFrame(step);
                        } else {
                            setCount(endVal);
                        }
                    };
                    window.requestAnimationFrame(step);
                }
            },
            { threshold: 0.1 }
        );

        if (ref.current) observer.observe(ref.current);
        return () => observer.disconnect();
    }, [end, duration, hasAnimated]);

    // Reconstruire le string original avec le compteur
    const textPart = end.replace(/[0-9]/g, '');
    const displayValue = hasAnimated ? end.replace(/[0-9]+/, count) : end;

    return { ref, displayValue };
};

const StatItem = ({ item, theme, onUpdate, idx }) => {
    const { ref, displayValue } = useCountUp(item.stat?.value || "0", 2000);
    const isAnimated = item.stat?.animated !== false;

    return (
        <div ref={ref} className="flex flex-col items-center text-center p-6">
            {(!item.icon || item.icon.type !== 'none') && (
                <div className="mb-4 text-indigo-500">
                    <DynamicIcon 
                        icon={item.icon || { type: 'lucide', value: 'Star', size: 32 }} 
                        override={{ color: theme.primaryColor }}
                    />
                </div>
            )}
            
            <EditableText
                value={isAnimated ? displayValue : (item.stat?.value || item.title)}
                onChange={(val) => onUpdate?.(idx, 'stat', { ...item.stat, value: val })}
                as="h3"
                className="text-4xl md:text-5xl font-black mb-2"
                style={item.titleColor ? { color: item.titleColor } : { color: theme.primaryColor }}
                isReadOnly={!onUpdate}
            />
            
            <EditableText
                value={item.stat?.label || item.description || item.content}
                onChange={(val) => onUpdate?.(idx, 'stat', { ...item.stat, label: val })}
                as="p"
                className="text-lg font-medium text-slate-600"
                isReadOnly={!onUpdate}
            />
        </div>
    );
};

export default function StatsCounter({ section, theme, onUpdate }) {
    const { title, subtitle, settings = {} } = section;
    const alignClass = getAlignmentClass(settings.alignment);
    
    const items = section.items?.length > 0 ? section.items : [
        { id: 'stat-1', icon: { type: 'lucide', value: 'Users', size: 32 }, stat: { value: "+5000", label: "Clients satisfaits", animated: true } },
        { id: 'stat-2', icon: { type: 'lucide', value: 'PackageCheck', size: 32 }, stat: { value: "10k+", label: "Commandes livrées", animated: true } },
        { id: 'stat-3', icon: { type: 'lucide', value: 'Star', size: 32 }, stat: { value: "4.9/5", label: "Note moyenne", animated: false } }
    ];

    const updateItem = (index, field, value) => {
        const newItems = [...items];
        newItems[index] = { ...newItems[index], [field]: value };
        onUpdate?.({ items: newItems });
    };

    return (
        <div className={`px-6 py-16 relative overflow-hidden ${alignClass}`} style={getSectionStyle(section, theme)}>
            <MediaBackground settings={settings} />
            <div className="max-w-6xl mx-auto relative z-10">
                {(title || subtitle) && (
                    <div className="mb-12">
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
                
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-8">
                    {items.filter(i => i.isVisible !== false).map((item, idx) => (
                        <StatItem 
                            key={item.id || idx} 
                            item={item} 
                            theme={theme} 
                            onUpdate={updateItem} 
                            idx={idx} 
                        />
                    ))}
                </div>
            </div>
        </div>
    );
}

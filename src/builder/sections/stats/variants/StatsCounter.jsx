import React, { useEffect, useState, useRef } from 'react';
import { motion } from 'framer-motion';
import MediaBackground from '../../../components/MediaBackground';
import { getAlignmentClass } from '../../../utils/styles';
import EditableText from '../../../components/EditableText';
import DynamicIcon from '../../../components/DynamicIcon';
import BlockText from '../../../components/BlockText';
import SectionWrapper from '../../../components/SectionWrapper';

const getAnimationProps = (animationType, index = 0) => {
    switch (animationType) {
        case 'fade': return { initial: { opacity: 0 }, whileInView: { opacity: 1 }, viewport: { once: true }, transition: { duration: 0.5 } };
        case 'slide-up': return { initial: { opacity: 0, y: 30 }, whileInView: { opacity: 1, y: 0 }, viewport: { once: true }, transition: { duration: 0.5 } };
        case 'scale-up': return { initial: { opacity: 0, scale: 0.95 }, whileInView: { opacity: 1, scale: 1 }, viewport: { once: true }, transition: { duration: 0.4 } };
        case 'stagger': return { initial: { opacity: 0, y: 20 }, whileInView: { opacity: 1, y: 0 }, viewport: { once: true }, transition: { duration: 0.4, delay: index * 0.1 } };
        default: return {};
    }
};

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
                    const endVal = parseInt(String(end).replace(/[^0-9]/g, '')) || 0;
                    if (endVal === 0) {
                        setCount(0); // Actually if it's 0 or not parseable, just return
                        return;
                    }

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
    const displayValue = hasAnimated ? String(end).replace(/[0-9]+/, count) : String(end);

    return { ref, displayValue };
};

const StatItem = ({ item, theme, onUpdate, idx, entryAnimation }) => {
    // Legacy support: some items use item.stat, others use title/content directly
    const value = item.stat?.value || item.title || "0";
    const label = item.stat?.label || item.description || item.content || "";
    const isAnimated = item.stat?.animated !== false;

    const { ref, displayValue } = useCountUp(value, 2000);

    return (
        <motion.div 
            ref={ref} 
            {...getAnimationProps(entryAnimation, 2 + idx)}
            className="flex flex-col items-center text-center p-8 bg-white/50 backdrop-blur-sm rounded-3xl border border-slate-100/50 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300 group"
        >
            {(!item.icon || item.icon.type !== 'none') && (
                <div className="mb-6 w-16 h-16 rounded-2xl bg-indigo-50/50 flex items-center justify-center text-indigo-500 group-hover:scale-110 group-hover:rotate-6 transition-transform duration-500">
                    <DynamicIcon 
                        icon={item.icon || { type: 'lucide', value: 'Star', size: 32 }} 
                        override={{ color: theme.primaryColor }}
                    />
                </div>
            )}
            
            <EditableText
                value={isAnimated ? displayValue : value}
                onChange={(val) => onUpdate?.(idx, 'stat', { ...item.stat, value: val })}
                as="h3"
                className="text-4xl md:text-5xl font-black mb-3 drop-shadow-sm tracking-tight"
                style={item.titleColor ? { color: item.titleColor } : { color: theme.primaryColor || '#6366f1' }}
                isReadOnly={!onUpdate}
            />
            
            <EditableText
                value={label}
                onChange={(val) => onUpdate?.(idx, 'stat', { ...item.stat, label: val })}
                as="p"
                className="text-lg font-medium opacity-80"
                isReadOnly={!onUpdate}
            />
        </motion.div>
    );
};

export default function StatsCounter({ section, theme, onUpdate }) {
    const { title, subtitle, blocks = [], settings = {} } = section;
    const alignClass = getAlignmentClass(settings.alignment || 'center');
    
    // Merge blocks and legacy items
    const statBlocks = blocks.filter(b => b.type === 'FeatureCard').map(b => ({
        id: b.id,
        stat: { value: b.settings.title, label: b.settings.text, animated: true },
        icon: b.settings.icon || { type: 'lucide', value: 'CheckCircle', size: 32 }
    }));

    const items = statBlocks.length > 0 ? statBlocks : (section.items?.length > 0 ? section.items : [
        { id: 'stat-1', icon: { type: 'lucide', value: 'Users', size: 32 }, stat: { value: "+5000", label: "Clients satisfaits", animated: true } },
        { id: 'stat-2', icon: { type: 'lucide', value: 'PackageCheck', size: 32 }, stat: { value: "10k+", label: "Commandes livrées", animated: true } },
        { id: 'stat-3', icon: { type: 'lucide', value: 'Star', size: 32 }, stat: { value: "4.9/5", label: "Note moyenne", animated: false } }
    ]);

    const updateItem = (index, field, value) => {
        const newItems = [...items];
        newItems[index] = { ...newItems[index], [field]: value };
        onUpdate?.({ items: newItems });
    };

    // Extract Heading and Subtitle from blocks if they exist
    const headingBlock = blocks.find(b => b.type === 'Heading');
    const subtitleBlock = blocks.find(b => b.type === 'Subtitle');

    return (
        <SectionWrapper settings={settings} className={`relative overflow-hidden ${alignClass}`}>
            <MediaBackground settings={settings} />
            <div className="max-w-6xl mx-auto relative z-10 py-16 px-6">
                {(title || subtitle || headingBlock || subtitleBlock) && (
                    <div className={`mb-16 flex flex-col gap-4 ${alignClass}`}>
                        {headingBlock ? (
                            <BlockText block={headingBlock} theme={theme} animProps={getAnimationProps(settings.entryAnimation, 0)} />
                        ) : (
                            title && (
                                <motion.div {...getAnimationProps(settings.entryAnimation, 0)}>
                                    <EditableText
                                        value={title}
                                        onChange={(val) => onUpdate?.({ title: val })}
                                        as="h2"
                                        className="text-4xl md:text-5xl font-black mb-4 drop-shadow-sm tracking-tight"
                                        isReadOnly={!onUpdate}
                                        style={{ color: settings.textColor || '#0f172a' }}
                                    />
                                </motion.div>
                            )
                        )}
                        {subtitleBlock ? (
                            <BlockText block={subtitleBlock} theme={theme} animProps={getAnimationProps(settings.entryAnimation, 1)} />
                        ) : (
                            subtitle && (
                                <motion.div {...getAnimationProps(settings.entryAnimation, 1)}>
                                    <EditableText
                                        value={subtitle}
                                        onChange={(val) => onUpdate?.({ subtitle: val })}
                                        as="p"
                                        className="text-xl opacity-70 max-w-2xl mx-auto drop-shadow-sm"
                                        isReadOnly={!onUpdate}
                                        style={{ color: settings.textColor || '#475569' }}
                                    />
                                </motion.div>
                            )
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
                            entryAnimation={settings.entryAnimation}
                        />
                    ))}
                </div>
            </div>
        </SectionWrapper>
    );
}

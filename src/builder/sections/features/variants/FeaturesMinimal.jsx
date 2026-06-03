import React from 'react';
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

export default function FeaturesMinimal({ section, theme, onUpdate }) {
    const { title, subtitle, items = [], blocks = [], settings = {} } = section;
    const alignClass = getAlignmentClass(settings.alignment || 'center');
    
    // Merge blocks and legacy items
    const featureBlocks = blocks.filter(b => b.type === 'FeatureCard').map(b => ({
        id: b.id,
        title: b.settings.title,
        content: b.settings.text,
        icon: b.settings.icon || { type: 'lucide', value: 'CheckCircle', size: 40 }
    }));

    const rawItems = featureBlocks.length > 0 ? featureBlocks : items;

    const displayItems = rawItems.length > 0 ? rawItems : [
        { id: 'item-1', title: "Rapide", content: "Partout au Maroc", icon: { type: 'lucide', value: 'Zap', size: 40 } },
        { id: 'item-2', title: "Sécurisé", content: "Payez à la livraison", icon: { type: 'lucide', value: 'ShieldCheck', size: 40 } },
        { id: 'item-3', title: "Garanti", content: "Satisfait ou remboursé", icon: { type: 'lucide', value: 'CheckCircle', size: 40 } }
    ];

    const updateItem = (index, field, value) => {
        const newItems = [...displayItems];
        newItems[index] = { ...newItems[index], [field]: value };
        onUpdate?.({ items: newItems });
    };

    // Extract Heading and Subtitle from blocks if they exist
    const headingBlock = blocks.find(b => b.type === 'Heading');
    const subtitleBlock = blocks.find(b => b.type === 'Subtitle');

    return (
        <SectionWrapper settings={settings} className={`relative overflow-hidden ${alignClass}`}>
            <MediaBackground settings={settings} />
            <div className="max-w-6xl mx-auto px-6 relative z-10 py-12">
                <div className={`mb-16 flex flex-col gap-4 ${alignClass}`}>
                    {headingBlock ? (
                        <BlockText block={headingBlock} theme={theme} animProps={getAnimationProps(settings.entryAnimation, 0)} />
                    ) : (
                        <motion.div {...getAnimationProps(settings.entryAnimation, 0)}>
                            <EditableText
                                value={title}
                                onChange={(val) => onUpdate?.({ title: val })}
                                as="h2"
                                className="text-4xl md:text-5xl font-bold mb-4 tracking-tight drop-shadow-sm"
                                isReadOnly={!onUpdate}
                            />
                        </motion.div>
                    )}

                    {subtitleBlock ? (
                        <BlockText block={subtitleBlock} theme={theme} animProps={getAnimationProps(settings.entryAnimation, 1)} />
                    ) : (
                        <motion.div {...getAnimationProps(settings.entryAnimation, 1)}>
                            <EditableText
                                value={subtitle}
                                onChange={(val) => onUpdate?.({ subtitle: val })}
                                as="p"
                                className="text-xl opacity-70 max-w-2xl mx-auto drop-shadow-sm"
                                isReadOnly={!onUpdate}
                            />
                        </motion.div>
                    )}
                </div>
                
                <div className="flex flex-col md:flex-row gap-12 justify-center items-start border-t border-slate-200/20 pt-16">
                    {displayItems.filter(item => item.isVisible !== false).map((item, i) => (
                        <motion.div 
                            key={item.id || i} 
                            {...getAnimationProps(settings.entryAnimation, 2 + i)}
                            className="flex-1 flex flex-col items-center text-center relative group"
                        >
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
                                <div className="mb-6 opacity-90 text-indigo-500 group-hover:scale-110 transition-transform duration-300">
                                    <DynamicIcon 
                                        icon={item.icon || (item.emoji ? { type: 'emoji', value: item.emoji } : { type: 'lucide', value: 'Zap', size: 40 })} 
                                        override={{ color: theme.primaryColor }}
                                    />
                                </div>
                            )}

                            <EditableText
                                value={item.title}
                                onChange={(val) => updateItem(i, 'title', val)}
                                as="h3"
                                className="font-bold text-2xl mb-3 tracking-wide block"
                                style={item.titleColor ? { color: item.titleColor } : {}}
                                isReadOnly={!onUpdate}
                            />
                            <EditableText
                                value={item.content || item.description}
                                onChange={(val) => updateItem(i, 'content', val)}
                                as="p"
                                className="opacity-70 leading-relaxed text-base max-w-[280px]"
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
                        </motion.div>
                    ))}
                </div>
            </div>
        </SectionWrapper>
    );
}

import React from 'react';
import { motion } from 'framer-motion';
import MediaBackground from '../../../components/MediaBackground';
import { getAlignmentClass } from '../../../utils/styles';
import EditableText from '../../../components/EditableText';
import BlockText from '../../../components/BlockText';
import SectionWrapper from '../../../components/SectionWrapper';

export default function FeaturesGlass({ section, theme, onUpdate }) {
    const { title, subtitle, content, items = [], blocks = [], settings = {} } = section;
    const alignClass = getAlignmentClass(settings.alignment || 'center');
    
    // Merge blocks and legacy items
    const featureBlocks = blocks.filter(b => b.type === 'FeatureCard').map(b => ({
        title: b.settings.title,
        content: b.settings.text,
        emoji: b.settings.icon || "⭐" // Assuming icon might be an emoji or string here, we fallback to emoji style
    }));

    const rawItems = featureBlocks.length > 0 ? featureBlocks : items;

    // Assurer qu'on a toujours au moins 3 éléments pour l'UI
    const displayItems = rawItems.length > 0 ? rawItems : [
        { title: "Livraison Express", content: "Partout au Maroc en 24h", emoji: "🚀" },
        { title: "Paiement Sécurisé", content: "Payez à la réception", emoji: "🤝" },
        { title: "Qualité Garantie", content: "Satisfait ou remboursé", emoji: "💎" }
    ];

    const isMedia = settings.backgroundType === 'image' || settings.backgroundType === 'video';
    const textColor = settings.textColor || '#ffffff';

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
            <div className="max-w-6xl mx-auto relative z-10 py-12 px-6">
                <div className="mb-16 flex flex-col gap-4">
                    {headingBlock ? (
                        <BlockText block={headingBlock} theme={theme} animProps={{ initial: { opacity: 0, y: 20 }, whileInView: { opacity: 1, y: 0 }, viewport: { once: true }, transition: { duration: 0.5 } }} />
                    ) : (
                        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
                            <EditableText
                                value={title}
                                onChange={(val) => onUpdate?.({ title: val })}
                                as="h2"
                                className="text-4xl md:text-5xl font-black mb-4 drop-shadow-lg tracking-tight"
                                isReadOnly={!onUpdate}
                                style={{ color: textColor }}
                            />
                        </motion.div>
                    )}

                    {subtitleBlock ? (
                        <BlockText block={subtitleBlock} theme={theme} animProps={{ initial: { opacity: 0, y: 20 }, whileInView: { opacity: 1, y: 0 }, viewport: { once: true }, transition: { duration: 0.5, delay: 0.1 } }} />
                    ) : (
                        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.1 }}>
                            <EditableText
                                value={subtitle}
                                onChange={(val) => onUpdate?.({ subtitle: val })}
                                as="p"
                                className="text-xl opacity-90 max-w-2xl mx-auto drop-shadow-md"
                                isReadOnly={!onUpdate}
                                style={{ color: textColor }}
                            />
                        </motion.div>
                    )}

                    {content && (
                        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.2 }}>
                            <EditableText
                                value={content}
                                onChange={(val) => onUpdate?.({ content: val })}
                                as="p"
                                className="leading-relaxed max-w-3xl mx-auto mb-12 opacity-80 text-lg drop-shadow-sm"
                                isReadOnly={!onUpdate}
                                style={{ color: textColor }}
                            />
                        </motion.div>
                    )}
                </div>
                
                <div className="grid md:grid-cols-3 gap-8">
                    {displayItems.map((item, i) => (
                        <motion.div 
                            key={i} 
                            initial={{ opacity: 0, y: 40, scale: 0.95 }}
                            whileInView={{ opacity: 1, y: 0, scale: 1 }}
                            viewport={{ once: true, margin: "-50px" }}
                            transition={{ duration: 0.6, delay: i * 0.1 }}
                            className={`p-10 rounded-3xl backdrop-blur-xl shadow-2xl hover:-translate-y-2 hover:shadow-[0_20px_50px_rgba(0,0,0,0.3)] transition-all duration-300 group ${isMedia ? 'bg-white/10 border border-white/20' : 'bg-white/60 border border-slate-200'}`} 
                            style={{ color: textColor }}
                        >
                            <div className={`w-20 h-20 mx-auto rounded-2xl mb-8 flex items-center justify-center shadow-lg text-4xl group-hover:scale-110 transition-transform duration-300 ${isMedia ? 'bg-white/20' : 'bg-white/80 border border-slate-100'}`}>
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
                                className="font-black text-2xl mb-4 block drop-shadow-sm"
                                isReadOnly={!onUpdate}
                            />
                            <EditableText
                                value={item.content}
                                onChange={(val) => updateItem(i, 'content', val)}
                                as="p"
                                className="opacity-90 leading-relaxed text-lg font-medium drop-shadow-sm"
                                isReadOnly={!onUpdate}
                            />
                        </motion.div>
                    ))}
                </div>
            </div>
        </SectionWrapper>
    );
}

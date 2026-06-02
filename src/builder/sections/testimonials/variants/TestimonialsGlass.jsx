import React from 'react';
import { motion } from 'framer-motion';
import { Star } from 'lucide-react';
import MediaBackground from '../../../components/MediaBackground';
import { getAlignmentClass } from '../../../utils/styles';
import EditableText from '../../../components/EditableText';
import BlockText from '../../../components/BlockText';
import SectionWrapper from '../../../components/SectionWrapper';

export default function TestimonialsGlass({ section, theme, onUpdate }) {
    const { title, subtitle, items = [], blocks = [], settings = {} } = section;
    const alignClass = getAlignmentClass(settings.alignment);
    
    // Merge blocks and legacy items
    const testimonialBlocks = blocks.filter(b => b.type === 'TestimonialCard').map(b => ({
        content: b.settings.content,
        author: b.settings.author,
        rating: b.settings.rating || 5
    }));

    const rawItems = testimonialBlocks.length > 0 ? testimonialBlocks : items;

    const displayItems = rawItems.length > 0 ? rawItems : [
        { content: "Excellent service et produits de qualité. La livraison a été très rapide !", author: "Fatima Z.", rating: 5 },
        { content: "Le paiement à la livraison m'a rassuré, très satisfait de mon achat.", author: "Amine M.", rating: 5 },
        { content: "Je recommande fortement cette boutique, service client au top.", author: "Sara K.", rating: 4 }
    ];

    const isMedia = settings.backgroundType === 'image' || settings.backgroundType === 'video';
    const textColor = settings.textColor || '#ffffff'; // Better default for glass

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
            <div className="max-w-7xl mx-auto px-6 relative z-10 py-12">
                <div className="text-center mb-16 flex flex-col items-center gap-4">
                    {headingBlock ? (
                        <BlockText block={headingBlock} theme={theme} animProps={{ initial: { opacity: 0, y: 20 }, whileInView: { opacity: 1, y: 0 }, viewport: { once: true }, transition: { duration: 0.5 } }} />
                    ) : (
                        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
                            <EditableText
                                value={title}
                                onChange={(val) => onUpdate?.({ title: val })}
                                as="h2"
                                className="text-4xl md:text-6xl font-black mb-4 drop-shadow-lg"
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
                                className="text-xl opacity-90 max-w-3xl mx-auto drop-shadow-md"
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
                            transition={{ duration: 0.6, delay: i * 0.15 }}
                            className={`p-10 rounded-3xl backdrop-blur-xl shadow-2xl text-left hover:-translate-y-2 hover:shadow-[0_20px_50px_rgba(0,0,0,0.3)] transition-all duration-300 group ${isMedia ? 'bg-white/10 border border-white/20' : 'bg-white/60 border border-slate-200'}`} 
                            style={{ color: textColor }}
                        >
                            <div className="flex text-amber-400 mb-6 gap-1 relative z-10">
                                {[...Array(5)].map((_, idx) => (
                                    <Star key={idx} size={20} fill={idx < (item.rating || 5) ? "currentColor" : "none"} className={idx < (item.rating || 5) ? "text-amber-400" : "text-white/30"} />
                                ))}
                            </div>
                            <div className="italic mb-8 text-xl opacity-95 leading-relaxed font-serif flex relative z-10">
                                "<EditableText
                                    value={item.content}
                                    onChange={(val) => updateItem(i, 'content', val)}
                                    as="span"
                                    isReadOnly={!onUpdate}
                                />"
                            </div>
                            <div className="flex items-center gap-4 mt-auto relative z-10 border-t border-white/10 pt-6">
                                <div className="w-14 h-14 rounded-full flex items-center justify-center font-bold text-white shadow-lg text-xl" style={{ background: `linear-gradient(135deg, ${theme.primaryColor || '#6366f1'}, #c084fc)` }}>
                                    {(item.author || "C")[0].toUpperCase()}
                                </div>
                                <div>
                                    <div className="font-bold text-lg">{item.author}</div>
                                    <div className="text-xs font-semibold uppercase tracking-wider opacity-75 mt-0.5">Acheteur Vérifié</div>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>
            </div>
        </SectionWrapper>
    );
}

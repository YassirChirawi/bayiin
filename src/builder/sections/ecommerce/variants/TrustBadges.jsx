import React from 'react';
import { motion } from 'framer-motion';
import MediaBackground from '../../../components/MediaBackground';
import { getAlignmentClass } from '../../../utils/styles';
import EditableText from '../../../components/EditableText';
import DynamicIcon from '../../../components/DynamicIcon';
import BlockText from '../../../components/BlockText';
import SectionWrapper from '../../../components/SectionWrapper';

export default function TrustBadges({ section, theme, onUpdate }) {
    const { title, subtitle, blocks = [], settings = {} } = section;
    const alignClass = getAlignmentClass(settings.alignment || 'center');

    // Merge blocks and legacy items
    const badgeBlocks = blocks.filter(b => b.type === 'FeatureCard').map(b => ({
        id: b.id,
        title: b.settings.title,
        text: b.settings.text, // Not typically used in badges, but we keep it
        icon: b.settings.icon || { type: 'lucide', value: 'CheckCircle', size: 24 }
    }));

    const badges = badgeBlocks.length > 0 ? badgeBlocks : (section.items?.length > 0 ? section.items : [
        { id: 'item-1', icon: { type: 'lucide', value: 'ShieldCheck', size: 24 }, title: "Paiement 100% Sécurisé" },
        { id: 'item-2', icon: { type: 'lucide', value: 'Truck', size: 24 }, title: "Livraison Rapide" },
        { id: 'item-3', icon: { type: 'lucide', value: 'Clock', size: 24 }, title: "Retour sous 7 jours" },
        { id: 'item-4', icon: { type: 'lucide', value: 'HeadphonesIcon', size: 24 }, title: "Support Client 7j/7" }
    ]);

    const updateItem = (index, field, value) => {
        const newItems = [...badges];
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
                {(title || subtitle || headingBlock || subtitleBlock) && (
                    <div className="mb-10 flex flex-col gap-2">
                        {headingBlock ? (
                            <BlockText block={headingBlock} theme={theme} animProps={{ initial: { opacity: 0, y: 10 }, whileInView: { opacity: 1, y: 0 }, viewport: { once: true }, transition: { duration: 0.4 } }} />
                        ) : (
                            title && (
                                <motion.div initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
                                    <EditableText
                                        value={title}
                                        onChange={(val) => onUpdate?.({ title: val })}
                                        as="h2"
                                        className="text-2xl font-bold mb-2 drop-shadow-sm tracking-tight"
                                        isReadOnly={!onUpdate}
                                        style={{ color: settings.textColor || '#0f172a' }}
                                    />
                                </motion.div>
                            )
                        )}
                        {subtitleBlock ? (
                            <BlockText block={subtitleBlock} theme={theme} animProps={{ initial: { opacity: 0, y: 10 }, whileInView: { opacity: 1, y: 0 }, viewport: { once: true }, transition: { duration: 0.4, delay: 0.1 } }} />
                        ) : (
                            subtitle && (
                                <motion.div initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.1 }}>
                                    <EditableText
                                        value={subtitle}
                                        onChange={(val) => onUpdate?.({ subtitle: val })}
                                        as="p"
                                        className="opacity-80 drop-shadow-sm"
                                        isReadOnly={!onUpdate}
                                        style={{ color: settings.textColor || '#475569' }}
                                    />
                                </motion.div>
                            )
                        )}
                    </div>
                )}
                
                <div className="flex flex-wrap justify-center items-center gap-4 md:gap-8">
                    {badges.filter(b => b.isVisible !== false).map((badge, idx) => (
                        <motion.div 
                            key={badge.id || idx} 
                            initial={{ opacity: 0, scale: 0.9 }}
                            whileInView={{ opacity: 1, scale: 1 }}
                            viewport={{ once: true, margin: "-20px" }}
                            transition={{ duration: 0.4, delay: idx * 0.1 }}
                            className="flex items-center gap-4 bg-white/80 backdrop-blur-md border border-slate-200/60 px-6 py-4 rounded-2xl shadow-sm hover:shadow-lg hover:-translate-y-1 hover:border-indigo-100 transition-all duration-300 relative group cursor-default"
                        >
                            {/* Decorative background glow on hover */}
                            <div className="absolute inset-0 bg-gradient-to-r from-indigo-50/50 to-white/0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 -z-10"></div>

                            {/* Badge corner */}
                            {badge.badge?.enabled && (
                                <div 
                                    className="absolute -top-2 -right-2 px-2 py-0.5 rounded-full text-white text-[10px] font-bold shadow-sm z-10"
                                    style={{ backgroundColor: badge.badge.color || '#ef4444' }}
                                >
                                    {badge.badge.text}
                                </div>
                            )}

                            {(!badge.icon || badge.icon.type !== 'none') && (
                                <div className="text-emerald-600 group-hover:scale-110 group-hover:rotate-6 transition-transform duration-300">
                                    <DynamicIcon 
                                        icon={badge.icon || { type: 'lucide', value: 'CheckCircle', size: 24 }} 
                                        override={{ color: theme.primaryColor }}
                                    />
                                </div>
                            )}
                            
                            <EditableText
                                value={badge.text || badge.title}
                                onChange={(val) => updateItem(idx, 'title', val)}
                                as="span"
                                className="font-bold text-slate-800 text-sm md:text-base whitespace-nowrap"
                                style={badge.titleColor ? { color: badge.titleColor } : { color: settings.textColor || '#0f172a' }}
                                isReadOnly={!onUpdate}
                            />
                        </motion.div>
                    ))}
                </div>
            </div>
        </SectionWrapper>
    );
}

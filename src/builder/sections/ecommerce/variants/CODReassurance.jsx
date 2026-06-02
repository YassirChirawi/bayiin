import React from 'react';
import { motion } from 'framer-motion';
import MediaBackground from '../../../components/MediaBackground';
import { getAlignmentClass } from '../../../utils/styles';
import EditableText from '../../../components/EditableText';
import DynamicIcon from '../../../components/DynamicIcon';
import BlockText from '../../../components/BlockText';
import SectionWrapper from '../../../components/SectionWrapper';

export default function CODReassurance({ section, theme, onUpdate }) {
    const { title, subtitle, blocks = [], settings = {} } = section;
    const alignClass = getAlignmentClass(settings.alignment || 'center');
    
    // Merge blocks and legacy items
    const featureBlocks = blocks.filter(b => b.type === 'FeatureCard').map(b => ({
        id: b.id,
        title: b.settings.title,
        desc: b.settings.text,
        icon: b.settings.icon || { type: 'lucide', value: 'CheckCircle', size: 32 }
    }));

    // Valeurs par défaut si le titre/sous-titre est vide
    const displayTitle = title || "Pourquoi acheter chez nous ?";
    const displaySubtitle = subtitle || "Nous vous garantissons une expérience sans risque.";

    const features = featureBlocks.length > 0 ? featureBlocks : (section.items?.length > 0 ? section.items : [
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
    ]);

    const updateItem = (index, field, value) => {
        const newItems = [...features];
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
                <div className="mb-16 flex flex-col gap-4">
                    {headingBlock ? (
                        <BlockText block={headingBlock} theme={theme} animProps={{ initial: { opacity: 0, y: 20 }, whileInView: { opacity: 1, y: 0 }, viewport: { once: true }, transition: { duration: 0.5 } }} />
                    ) : (
                        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
                            <EditableText
                                value={displayTitle}
                                onChange={(val) => onUpdate?.({ title: val })}
                                as="h2"
                                className="text-4xl md:text-5xl font-black mb-4 drop-shadow-sm tracking-tight"
                                isReadOnly={!onUpdate}
                                style={{ color: settings.textColor || '#0f172a' }}
                            />
                        </motion.div>
                    )}

                    {subtitleBlock ? (
                        <BlockText block={subtitleBlock} theme={theme} animProps={{ initial: { opacity: 0, y: 20 }, whileInView: { opacity: 1, y: 0 }, viewport: { once: true }, transition: { duration: 0.5, delay: 0.1 } }} />
                    ) : (
                        displaySubtitle && (
                            <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.1 }}>
                                <EditableText
                                    value={displaySubtitle}
                                    onChange={(val) => onUpdate?.({ subtitle: val })}
                                    as="p"
                                    className="text-xl opacity-80 max-w-2xl mx-auto drop-shadow-sm"
                                    isReadOnly={!onUpdate}
                                    style={{ color: settings.textColor || '#475569' }}
                                />
                            </motion.div>
                        )
                    )}
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {features.filter(f => f.isVisible !== false).map((feature, idx) => (
                        <motion.div 
                            key={feature.id || idx} 
                            initial={{ opacity: 0, y: 30 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true, margin: "-50px" }}
                            transition={{ duration: 0.5, delay: idx * 0.1 }}
                            className="bg-white rounded-3xl p-8 flex flex-col items-center text-center shadow-lg border border-slate-100 hover:-translate-y-2 hover:shadow-2xl transition-all duration-300 group relative overflow-hidden"
                        >
                            {/* Decorative background circle */}
                            <div className="absolute top-0 right-0 w-32 h-32 bg-slate-50 rounded-bl-full -z-0 group-hover:scale-150 transition-transform duration-500 opacity-50"></div>

                            {/* Badge */}
                            {feature.badge?.enabled && (
                                <div 
                                    className="absolute top-4 right-4 px-3 py-1 rounded-full text-white text-xs font-bold shadow-sm z-10"
                                    style={{ backgroundColor: feature.badge.color || '#ef4444' }}
                                >
                                    {feature.badge.text}
                                </div>
                            )}

                            {/* Icon */}
                            {(!feature.icon || feature.icon.type !== 'none') && (
                                <div className="mb-6 w-16 h-16 rounded-2xl flex items-center justify-center bg-slate-50 text-emerald-600 shadow-sm border border-slate-100 group-hover:scale-110 group-hover:rotate-3 transition-transform duration-500 relative z-10">
                                    <DynamicIcon 
                                        icon={feature.icon || { type: 'lucide', value: 'CheckCircle', size: 32 }} 
                                        override={{ color: theme.primaryColor }}
                                    />
                                </div>
                            )}

                            {/* Text */}
                            <EditableText
                                value={feature.title}
                                onChange={(val) => updateItem(idx, 'title', val)}
                                as="h3"
                                className="text-2xl font-bold text-slate-900 mb-4 relative z-10"
                                style={feature.titleColor ? { color: feature.titleColor } : { color: settings.textColor || '#0f172a' }}
                                isReadOnly={!onUpdate}
                            />
                            <EditableText
                                value={feature.desc || feature.description || feature.content}
                                onChange={(val) => updateItem(idx, 'description', val)}
                                as="p"
                                className="text-slate-600 text-base leading-relaxed relative z-10"
                                style={{ color: settings.textColor ? `${settings.textColor}cc` : '#475569' }}
                                isReadOnly={!onUpdate}
                            />

                            {/* Link */}
                            {feature.link?.enabled && (
                                <a 
                                    href={feature.link.url || '#'} 
                                    target={feature.link.target || '_self'}
                                    className="mt-6 font-bold text-sm hover:underline relative z-10"
                                    style={{ color: theme.primaryColor }}
                                    onClick={(e) => !onUpdate && e.preventDefault()}
                                >
                                    {feature.link.label || 'En savoir plus'}
                                </a>
                            )}
                        </motion.div>
                    ))}
                </div>
            </div>
        </SectionWrapper>
    );
}

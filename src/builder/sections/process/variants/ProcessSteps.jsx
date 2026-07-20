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

export default function ProcessSteps({ section, theme, onUpdate }) {
    const { title, subtitle, blocks = [], settings = {} } = section;
    const alignClass = getAlignmentClass(settings.alignment || 'center');
    
    // Merge blocks and legacy items
    const stepBlocks = blocks.filter(b => b.type === 'FeatureCard').map(b => ({
        id: b.id,
        title: b.settings.title,
        description: b.settings.text,
        icon: b.settings.icon || { type: 'lucide', value: 'Check', size: 24 }
    }));

    const items = stepBlocks.length > 0 ? stepBlocks : (section.items?.length > 0 ? section.items : [
        { id: 'step-1', icon: { type: 'lucide', value: 'ShoppingCart', size: 24, background: { enabled: true, shape: 'circle', color: '#f1f5f9' } }, title: "1. Commandez", description: "Choisissez vos produits et validez votre panier." },
        { id: 'step-2', icon: { type: 'lucide', value: 'PhoneCall', size: 24, background: { enabled: true, shape: 'circle', color: '#f1f5f9' } }, title: "2. Confirmation", description: "Notre équipe vous appelle pour confirmer." },
        { id: 'step-3', icon: { type: 'lucide', value: 'Truck', size: 24, background: { enabled: true, shape: 'circle', color: '#f1f5f9' } }, title: "3. Expédition", description: "Votre commande est expédiée le jour même." },
        { id: 'step-4', icon: { type: 'lucide', value: 'Banknote', size: 24, background: { enabled: true, shape: 'circle', color: '#f1f5f9' } }, title: "4. Réception", description: "Payez en cash à la réception de votre colis." }
    ]);

    const updateItem = (index, field, value) => {
        const newItems = [...items];
        newItems[index] = { ...newItems[index], [field]: value };
        onUpdate?.({ items: newItems });
    };

    const visibleItems = items.filter(i => i.isVisible !== false);

    // Extract Heading and Subtitle from blocks if they exist
    const headingBlock = blocks.find(b => b.type === 'Heading');
    const subtitleBlock = blocks.find(b => b.type === 'Subtitle');

    return (
        <SectionWrapper settings={settings} className={`relative overflow-hidden ${alignClass}`}>
            <MediaBackground settings={settings} />
            <div className="max-w-6xl mx-auto relative z-10 py-16 px-6">
                <div className={`mb-20 flex flex-col gap-4 ${alignClass}`}>
                    {headingBlock ? (
                        <BlockText block={headingBlock} theme={theme} animProps={getAnimationProps(settings.entryAnimation, 0)} />
                    ) : (
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
                                style={{ color: settings.textColor || '#475569' }}
                            />
                        </motion.div>
                    )}
                </div>
                
                <div className="relative">
                    {/* Horizontal Connector Line (Desktop only for horizontal layout) */}
                    <motion.div 
                        initial={{ scaleX: 0 }}
                        whileInView={{ scaleX: 1 }}
                        viewport={{ once: true, margin: "-100px" }}
                        transition={{ duration: 1.5, ease: "easeInOut" }}
                        className="hidden md:block absolute top-10 left-[10%] right-[10%] h-1 bg-indigo-100 origin-left z-0 rounded-full"
                    />
                    
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-12 md:gap-4 relative z-10">
                        {visibleItems.map((item, idx) => {
                            const anim = getAnimationProps(settings.entryAnimation, 2 + idx);
                            return (
                            <motion.div 
                                key={item.id || idx} 
                                {...anim}
                                className="flex flex-col items-center text-center relative group"
                            >
                                {/* Step Icon */}
                                <div className="mb-8 bg-transparent relative z-10 p-2 transform group-hover:-translate-y-2 transition-transform duration-300">
                                    <div className="w-20 h-20 bg-white rounded-2xl shadow-xl flex items-center justify-center border border-slate-100 group-hover:shadow-2xl group-hover:border-indigo-100 transition-all duration-300">
                                        <DynamicIcon 
                                            icon={item.icon || { type: 'none' }} 
                                            override={{ color: theme.primaryColor }}
                                        />
                                    </div>
                                    {/* Number indicator */}
                                    <div 
                                        className="absolute -top-2 -right-2 w-8 h-8 rounded-full text-white text-sm flex items-center justify-center font-bold shadow-lg ring-4 ring-white"
                                        style={{ backgroundColor: theme.primaryColor || '#6366f1' }}
                                    >
                                        {idx + 1}
                                    </div>
                                </div>
                                
                                {/* Content */}
                                <EditableText
                                    value={item.title}
                                    onChange={(val) => updateItem(idx, 'title', val)}
                                    as="h3"
                                    className="font-bold text-xl mb-3 text-slate-900 group-hover:text-indigo-600 transition-colors duration-300"
                                    style={{ color: settings.textColor || '#0f172a' }}
                                    isReadOnly={!onUpdate}
                                />
                                <EditableText
                                    value={item.description || item.content}
                                    onChange={(val) => updateItem(idx, 'description', val)}
                                    as="p"
                                    className="text-base text-slate-600 leading-relaxed max-w-[220px]"
                                    style={{ color: settings.textColor ? `${settings.textColor}cc` : '#475569' }}
                                    isReadOnly={!onUpdate}
                                />
                            </motion.div>
                        )})}
                    </div>
                </div>
            </div>
        </SectionWrapper>
    );
}

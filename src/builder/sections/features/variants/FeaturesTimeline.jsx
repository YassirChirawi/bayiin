import React from 'react';
import { motion } from 'framer-motion';
import * as LucideIcons from 'lucide-react';
import SectionWrapper from '../../../components/SectionWrapper';
import BlockText from '../../../components/BlockText';
import { getAlignmentClass } from '../../../utils/styles';

const getAnimationProps = (animationType, index = 0) => {
    switch (animationType) {
        case 'fade': return { initial: { opacity: 0 }, whileInView: { opacity: 1 }, viewport: { once: true }, transition: { duration: 0.5 } };
        case 'slide-up': return { initial: { opacity: 0, y: 30 }, whileInView: { opacity: 1, y: 0 }, viewport: { once: true }, transition: { duration: 0.5 } };
        case 'scale-up': return { initial: { opacity: 0, scale: 0.95 }, whileInView: { opacity: 1, scale: 1 }, viewport: { once: true }, transition: { duration: 0.4 } };
        case 'stagger': return { initial: { opacity: 0, y: 20 }, whileInView: { opacity: 1, y: 0 }, viewport: { once: true }, transition: { duration: 0.4, delay: index * 0.1 } };
        default: return {};
    }
};

const DynamicIcon = ({ name, size = 24, className }) => {
    if (!name) return null;
    const IconComponent = LucideIcons[name];
    if (!IconComponent) return null;
    return <IconComponent size={size} className={className} />;
};

export default function FeaturesTimeline({ section, theme }) {
    const { title, subtitle, items = [], blocks = [], settings = {} } = section;
    const alignClass = getAlignmentClass(settings.alignment || 'center');

    const featureBlocks = blocks.filter(b => b.type === 'FeatureCard').map(b => ({
        id: b.id,
        title: b.settings.title,
        content: b.settings.text,
        icon: b.settings.icon || 'Star'
    }));

    const rawItems = featureBlocks.length > 0 ? featureBlocks : items;

    const displayItems = rawItems.length > 0 ? rawItems : [
        { id: 1, title: "Commande passée", content: "Vous validez votre panier en un clic, sans carte bancaire.", icon: "ShoppingCart" },
        { id: 2, title: "Confirmation rapide", content: "Notre équipe vous appelle pour confirmer l'adresse.", icon: "PhoneCall" },
        { id: 3, title: "Expédition en 24h", content: "Votre colis est préparé et expédié le jour même.", icon: "Package" },
        { id: 4, title: "Livraison & Paiement", content: "Vous payez le livreur uniquement à la réception.", icon: "HandCoins" }
    ];

    // Extract Heading and Subtitle from blocks if they exist
    const headingBlock = blocks.find(b => b.type === 'Heading');
    const subtitleBlock = blocks.find(b => b.type === 'Subtitle');

    return (
        <SectionWrapper settings={settings}>
            <div className="container mx-auto px-4 max-w-5xl">
                {/* Headers */}
                <div className={`mb-20 flex flex-col gap-4 ${alignClass}`}>
                    {headingBlock ? (
                        <BlockText block={headingBlock} theme={theme} animProps={getAnimationProps(settings.entryAnimation, 0)} />
                    ) : (
                        title && <motion.h2 {...getAnimationProps(settings.entryAnimation, 0)} className="text-4xl md:text-5xl font-black tracking-tight" style={{ color: settings.textColor || '#0f172a', fontFamily: theme.typography?.heading }}>{title}</motion.h2>
                    )}

                    {subtitleBlock ? (
                        <BlockText block={subtitleBlock} theme={theme} animProps={getAnimationProps(settings.entryAnimation, 1)} />
                    ) : (
                        subtitle && <motion.p {...getAnimationProps(settings.entryAnimation, 1)} className="text-xl opacity-70 max-w-2xl mx-auto" style={{ color: settings.textColor || '#475569', fontFamily: theme.typography?.body }}>{subtitle}</motion.p>
                    )}
                </div>

                {/* Timeline */}
                <div className="relative">
                    {/* Central Line */}
                    <motion.div 
                        initial={{ height: 0 }}
                        whileInView={{ height: '100%' }}
                        viewport={{ once: true }}
                        transition={{ duration: 1.5, ease: "easeInOut" }}
                        className="absolute left-8 md:left-1/2 top-0 w-1 bg-indigo-100 transform md:-translate-x-1/2 rounded-full z-0" 
                    />
                    
                    <div className="space-y-16">
                        {displayItems.map((card, index) => {
                            const isEven = index % 2 === 0;
                            return (
                                <div key={card.id || index} className={`relative flex flex-col md:flex-row items-center ${isEven ? 'md:flex-row-reverse' : ''} group`}>
                                    
                                    {/* Timeline Node */}
                                    <motion.div 
                                        initial={{ scale: 0 }}
                                        whileInView={{ scale: 1 }}
                                        viewport={{ once: true, margin: "-100px" }}
                                        transition={{ duration: 0.5, delay: index * 0.2 }}
                                        className="absolute left-8 md:left-1/2 w-14 h-14 rounded-full border-4 border-white text-white flex items-center justify-center transform -translate-x-1/2 shadow-xl z-10 group-hover:scale-110 transition-transform duration-300" 
                                        style={{ background: `linear-gradient(135deg, ${theme.primaryColor || '#6366f1'}, #818cf8)` }}
                                    >
                                        <span className="font-bold text-xl">{index + 1}</span>
                                    </motion.div>

                                    {/* Empty space for alternating layout */}
                                    <div className="hidden md:block md:w-1/2"></div>

                                    {/* Content Card */}
                                    <motion.div 
                                        {...getAnimationProps(settings.entryAnimation, 2 + index)}
                                        className={`w-full md:w-1/2 pl-24 md:px-16 py-4 ${isEven ? 'md:text-left' : 'md:text-right'}`}
                                    >
                                        <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 group-hover:shadow-2xl group-hover:-translate-y-2 group-hover:border-indigo-100 transition-all duration-500 relative overflow-hidden">
                                            {/* Decorative background circle */}
                                            <div className={`absolute top-0 w-32 h-32 rounded-full blur-3xl opacity-10 transition-all duration-500 ${isEven ? '-left-10' : '-right-10'} group-hover:scale-150`} style={{ backgroundColor: theme.primaryColor || '#6366f1' }}></div>

                                            <div className={`w-14 h-14 rounded-2xl bg-slate-50 border border-slate-100 text-indigo-600 flex items-center justify-center mb-6 shadow-sm transform group-hover:scale-110 group-hover:rotate-6 transition-transform duration-500 relative z-10 ${isEven ? '' : 'md:ml-auto'}`} style={{ color: theme.primaryColor }}>
                                                <DynamicIcon name={card.icon} size={28} />
                                            </div>
                                            <h4 className="text-2xl font-bold mb-3 relative z-10" style={{ color: settings.textColor || '#0f172a', fontFamily: theme.typography?.heading }}>{card.title}</h4>
                                            <p className="opacity-70 leading-relaxed text-base relative z-10" style={{ color: settings.textColor || '#475569', fontFamily: theme.typography?.body }}>{card.content}</p>
                                        </div>
                                    </motion.div>

                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </SectionWrapper>
    );
}

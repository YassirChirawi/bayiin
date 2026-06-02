import React from 'react';
import { motion } from 'framer-motion';
import * as LucideIcons from 'lucide-react';
import SectionWrapper from '../../../components/SectionWrapper';
import BlockText from '../../../components/BlockText';

const DynamicIcon = ({ name, size = 32, className }) => {
    if (!name) return null;
    const IconComponent = LucideIcons[name];
    if (!IconComponent) return null;
    return <IconComponent size={size} className={className} />;
};

export default function FeaturesBento({ section, theme }) {
    const { title, subtitle, items = [], blocks = [], settings = {} } = section;

    const featureBlocks = blocks.filter(b => b.type === 'FeatureCard').map(b => ({
        id: b.id,
        title: b.settings.title,
        content: b.settings.text,
        icon: b.settings.icon || 'Star'
    }));

    const rawItems = featureBlocks.length > 0 ? featureBlocks : items;

    const displayItems = rawItems.length > 0 ? rawItems : [
        { id: 1, title: "Livraison Express", content: "Recevez vos commandes en 24h chrono, partout au Maroc.", icon: "Truck" },
        { id: 2, title: "Paiement Sécurisé", content: "Réglez vos achats en toute confiance à la réception.", icon: "ShieldCheck" },
        { id: 3, title: "Service Client", content: "Une équipe dédiée pour répondre à toutes vos questions.", icon: "Headset" },
        { id: 4, title: "Qualité Garantie", content: "Nos produits sont testés et approuvés pour une satisfaction totale.", icon: "Award" }
    ];

    // Extract Heading and Subtitle from blocks if they exist
    const headingBlock = blocks.find(b => b.type === 'Heading');
    const subtitleBlock = blocks.find(b => b.type === 'Subtitle');

    return (
        <SectionWrapper settings={settings}>
            <div className="container mx-auto px-4 max-w-7xl">
                {/* Headers */}
                <div className="mb-16 flex flex-col gap-4 text-center items-center">
                    {headingBlock ? (
                        <BlockText block={headingBlock} theme={theme} animProps={{ initial: { opacity: 0, y: 20 }, whileInView: { opacity: 1, y: 0 }, viewport: { once: true }, transition: { duration: 0.5 } }} />
                    ) : (
                        title && <motion.h2 initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-4xl md:text-5xl font-black tracking-tight" style={{ color: settings.textColor || '#0f172a', fontFamily: theme.typography?.heading }}>{title}</motion.h2>
                    )}

                    {subtitleBlock ? (
                        <BlockText block={subtitleBlock} theme={theme} animProps={{ initial: { opacity: 0, y: 20 }, whileInView: { opacity: 1, y: 0 }, viewport: { once: true }, transition: { duration: 0.5, delay: 0.1 } }} />
                    ) : (
                        subtitle && <motion.p initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.1 }} className="text-xl opacity-70 max-w-2xl mx-auto" style={{ color: settings.textColor || '#475569', fontFamily: theme.typography?.body }}>{subtitle}</motion.p>
                    )}
                </div>

                {/* Bento Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 auto-rows-[280px]">
                    {displayItems.map((card, index) => {
                        // Assign bento span classes based on index to create an asymmetric look
                        let spanClass = "col-span-1 row-span-1";
                        if (index === 0) spanClass = "md:col-span-2 md:row-span-2"; // Large main card
                        else if (index === 3) spanClass = "md:col-span-2 row-span-1"; // Wide card

                        return (
                            <motion.div 
                                key={card.id || index} 
                                initial={{ opacity: 0, scale: 0.95, y: 30 }} 
                                whileInView={{ opacity: 1, scale: 1, y: 0 }} 
                                viewport={{ once: true, margin: "-50px" }} 
                                transition={{ duration: 0.5, delay: index * 0.1 }}
                                className={`relative overflow-hidden rounded-3xl p-8 flex flex-col justify-between group bg-white border border-slate-100 hover:shadow-2xl hover:border-indigo-100 transition-all duration-500 hover:-translate-y-1 ${spanClass}`}
                            >
                                {/* Decorative subtle background gradient */}
                                <div className={`absolute top-0 right-0 w-64 h-64 rounded-full blur-3xl transition-colors duration-700 -mr-16 -mt-16 ${index === 0 ? 'bg-indigo-500/10 group-hover:bg-indigo-500/20' : 'bg-slate-100/50 group-hover:bg-indigo-500/5'}`}></div>

                                <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-6 shadow-md transform group-hover:scale-110 group-hover:rotate-3 transition-transform duration-500 ${index === 0 ? 'bg-indigo-600 text-white' : 'bg-slate-50 text-indigo-600 border border-slate-100'}`} style={index === 0 ? { backgroundColor: theme.primaryColor } : { color: theme.primaryColor }}>
                                    <DynamicIcon name={card.icon} size={32} />
                                </div>
                                <div className="relative z-10 mt-auto">
                                    <h4 className={`font-bold mb-3 ${index === 0 ? 'text-3xl md:text-4xl' : 'text-2xl'}`} style={{ color: settings.textColor || '#0f172a', fontFamily: theme.typography?.heading }}>{card.title}</h4>
                                    <p className={`opacity-70 leading-relaxed ${index === 0 ? 'text-lg max-w-lg' : 'text-base max-w-sm'}`} style={{ color: settings.textColor || '#475569', fontFamily: theme.typography?.body }}>{card.content}</p>
                                </div>
                            </motion.div>
                        );
                    })}
                </div>
            </div>
        </SectionWrapper>
    );
}

import React from 'react';
import { motion } from 'framer-motion';
import { Star } from 'lucide-react';
import SectionWrapper from '../../../components/SectionWrapper';
import BlockText from '../../../components/BlockText';

const getAnimationProps = (animationType, index = 0) => {
    switch (animationType) {
        case 'fade': return { initial: { opacity: 0 }, whileInView: { opacity: 1 }, viewport: { once: true }, transition: { duration: 0.5 } };
        case 'slide-up': return { initial: { opacity: 0, y: 30 }, whileInView: { opacity: 1, y: 0 }, viewport: { once: true }, transition: { duration: 0.5 } };
        case 'scale-up': return { initial: { opacity: 0, scale: 0.95 }, whileInView: { opacity: 1, scale: 1 }, viewport: { once: true }, transition: { duration: 0.4 } };
        case 'stagger': return { initial: { opacity: 0, y: 20 }, whileInView: { opacity: 1, y: 0 }, viewport: { once: true }, transition: { duration: 0.4, delay: index * 0.1 } };
        default: return {};
    }
};

export default function TestimonialsMasonry({ section, theme }) {
    const { title, subtitle, items = [], blocks = [], settings = {} } = section;
    const alignClass = settings.alignment === 'left' ? 'text-left items-start' : settings.alignment === 'right' ? 'text-right items-end' : 'text-center items-center';
    const cardClass = settings.boxStyle === 'boxed' ? 'bg-slate-50 border border-slate-200 shadow-none' : 'bg-white shadow-sm hover:shadow-2xl border border-slate-100';

    // Merge blocks and legacy items
    const testimonialBlocks = blocks.filter(b => b.type === 'TestimonialCard').map(b => ({
        content: b.settings.content,
        author: b.settings.author,
        rating: b.settings.rating || 5
    }));

    const rawItems = testimonialBlocks.length > 0 ? testimonialBlocks : items;

    const displayItems = rawItems.length > 0 ? rawItems : [
        { content: "Excellent service et produits de qualité. La livraison a été très rapide !", author: "Fatima Z.", rating: 5 },
        { content: "J'ai hésité au début, mais le paiement à la livraison m'a rassuré. Au final, je suis très satisfait de mon achat. Le produit correspond exactement à la description et le livreur était très professionnel.", author: "Amine M.", rating: 5 },
        { content: "Je recommande fortement cette boutique, service client au top.", author: "Sara K.", rating: 4 },
        { content: "La qualité est incroyable pour le prix. Je reviendrai acheter très bientôt.", author: "Yassir C.", rating: 5 },
        { content: "Superbe expérience ! Le service client a répondu à toutes mes questions en un temps record.", author: "Leïla B.", rating: 5 },
        { content: "Très bon site, facile à utiliser. La livraison a pris un jour de plus que prévu, mais la qualité du produit compense largement cette petite attente.", author: "Karim D.", rating: 4 }
    ];

    // Extract Heading and Subtitle from blocks if they exist
    const headingBlock = blocks.find(b => b.type === 'Heading');
    const subtitleBlock = blocks.find(b => b.type === 'Subtitle');

    return (
        <SectionWrapper settings={settings}>
            <div className="container mx-auto px-4 py-8">
                {/* Headers */}
                <div className={`mb-16 flex flex-col gap-4 ${alignClass}`}>
                    {headingBlock ? (
                        <BlockText block={headingBlock} theme={theme} animProps={getAnimationProps(settings.entryAnimation, 0)} />
                    ) : (
                        title && <motion.h2 {...getAnimationProps(settings.entryAnimation, 0)} className="text-4xl md:text-5xl font-black tracking-tight" style={{ color: settings.textColor || '#0f172a', fontFamily: theme.typography?.heading }}>{title}</motion.h2>
                    )}

                    {subtitleBlock ? (
                        <BlockText block={subtitleBlock} theme={theme} animProps={getAnimationProps(settings.entryAnimation, 1)} />
                    ) : (
                        subtitle && <motion.p {...getAnimationProps(settings.entryAnimation, 1)} className="text-lg opacity-70 max-w-2xl" style={{ color: settings.textColor || '#475569', fontFamily: theme.typography?.body }}>{subtitle}</motion.p>
                    )}
                </div>

                {/* Masonry Grid */}
                <div className="columns-1 md:columns-2 lg:columns-3 gap-8 space-y-8 max-w-7xl mx-auto">
                    {displayItems.map((item, index) => {
                        const anim = getAnimationProps(settings.entryAnimation, 2 + index);
                        return (
                        <motion.div 
                            key={index}
                            {...anim}
                            className="break-inside-avoid"
                        >
                            <div className={`rounded-3xl p-8 transition-all duration-300 flex flex-col relative overflow-hidden group hover:-translate-y-1 ${cardClass}`}>
                                {/* Quote Icon Decorative */}
                                <div className="absolute -top-4 -right-2 text-9xl font-serif text-slate-50 group-hover:text-indigo-50 transition-colors select-none z-0">"</div>
                                
                                <div className="flex text-amber-400 mb-6 gap-1 relative z-10">
                                    {[...Array(5)].map((_, idx) => (
                                        <Star key={idx} size={18} fill={idx < (item.rating || 5) ? "currentColor" : "none"} className={idx < (item.rating || 5) ? "text-amber-400" : "text-slate-200"} />
                                    ))}
                                </div>
                                <p className="italic text-lg font-medium text-slate-700 leading-relaxed mb-8 relative z-10">
                                    "{item.content}"
                                </p>
                                <div className="flex items-center gap-4 mt-auto pt-6 border-t border-slate-50 relative z-10">
                                    <div className="w-12 h-12 rounded-full flex items-center justify-center font-bold text-white shadow-inner" style={{ background: `linear-gradient(135deg, ${theme.primaryColor || '#6366f1'}, #818cf8)` }}>
                                        {(item.author || "C")[0].toUpperCase()}
                                    </div>
                                    <div>
                                        <div className="font-bold text-slate-900 text-lg">{item.author}</div>
                                        <div className="text-xs font-semibold text-emerald-500 uppercase tracking-wider mt-0.5">Acheteur Vérifié</div>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    )})}
                </div>
            </div>
        </SectionWrapper>
    );
}

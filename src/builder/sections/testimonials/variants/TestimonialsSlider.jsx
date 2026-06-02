import React, { useRef } from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, Star } from 'lucide-react';
import SectionWrapper from '../../../components/SectionWrapper';
import BlockText from '../../../components/BlockText';

export default function TestimonialsSlider({ section, theme }) {
    const { title, subtitle, items = [], blocks = [], settings = {} } = section;
    const scrollContainerRef = useRef(null);

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
        { content: "Je recommande fortement cette boutique, service client au top.", author: "Sara K.", rating: 4 },
        { content: "Qualité exceptionnelle et emballage soigné. Merci BayIIn !", author: "Yassir C.", rating: 5 }
    ];

    const scroll = (direction) => {
        if (scrollContainerRef.current) {
            const scrollAmount = direction === 'left' ? -400 : 400;
            scrollContainerRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
        }
    };

    // Extract Heading and Subtitle from blocks if they exist
    const headingBlock = blocks.find(b => b.type === 'Heading');
    const subtitleBlock = blocks.find(b => b.type === 'Subtitle');

    return (
        <SectionWrapper settings={settings} className="overflow-hidden">
            <div className="container mx-auto px-4">
                {/* Headers */}
                <div className="text-center mb-16 flex flex-col items-center gap-4">
                    {headingBlock ? (
                        <BlockText block={headingBlock} theme={theme} animProps={{ initial: { opacity: 0, y: 20 }, whileInView: { opacity: 1, y: 0 }, viewport: { once: true }, transition: { duration: 0.5 } }} />
                    ) : (
                        title && <motion.h2 initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-4xl md:text-5xl font-black tracking-tight" style={{ color: settings.textColor || '#0f172a', fontFamily: theme.typography?.heading }}>{title}</motion.h2>
                    )}

                    {subtitleBlock ? (
                        <BlockText block={subtitleBlock} theme={theme} animProps={{ initial: { opacity: 0, y: 20 }, whileInView: { opacity: 1, y: 0 }, viewport: { once: true }, transition: { duration: 0.5, delay: 0.1 } }} />
                    ) : (
                        subtitle && <motion.p initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.1 }} className="text-lg opacity-70 max-w-2xl" style={{ color: settings.textColor || '#475569', fontFamily: theme.typography?.body }}>{subtitle}</motion.p>
                    )}
                </div>

                <div className="relative group max-w-7xl mx-auto">
                    {/* Navigation Buttons */}
                    <button 
                        onClick={() => scroll('left')} 
                        className="absolute left-0 top-1/2 -translate-y-1/2 -ml-4 md:-ml-6 z-10 w-14 h-14 bg-white/90 backdrop-blur rounded-full shadow-xl border border-slate-100 flex items-center justify-center text-slate-600 hover:text-indigo-600 hover:scale-110 active:scale-95 opacity-0 group-hover:opacity-100 transition-all"
                    >
                        <ChevronLeft size={28} />
                    </button>

                    <button 
                        onClick={() => scroll('right')} 
                        className="absolute right-0 top-1/2 -translate-y-1/2 -mr-4 md:-mr-6 z-10 w-14 h-14 bg-white/90 backdrop-blur rounded-full shadow-xl border border-slate-100 flex items-center justify-center text-slate-600 hover:text-indigo-600 hover:scale-110 active:scale-95 opacity-0 group-hover:opacity-100 transition-all"
                    >
                        <ChevronRight size={28} />
                    </button>

                    {/* Slider Container */}
                    <div 
                        ref={scrollContainerRef}
                        className="flex overflow-x-auto snap-x snap-mandatory gap-6 pb-12 pt-4 px-4 -mx-4 hide-scrollbar scroll-smooth"
                        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                    >
                        {displayItems.map((item, i) => (
                            <motion.div 
                                key={i} 
                                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                                whileInView={{ opacity: 1, scale: 1, y: 0 }}
                                viewport={{ once: true, margin: "-50px" }}
                                transition={{ duration: 0.5, delay: i * 0.1 }}
                                className="snap-center shrink-0 w-[85vw] md:w-[420px] bg-white rounded-3xl p-8 shadow-md border border-slate-100 flex flex-col justify-between hover:shadow-2xl transition-all duration-300 hover:-translate-y-2"
                            >
                                <div>
                                    <div className="flex text-amber-400 mb-6 gap-1">
                                        {[...Array(5)].map((_, idx) => (
                                            <Star key={idx} size={20} fill={idx < (item.rating || 5) ? "currentColor" : "none"} className={idx < (item.rating || 5) ? "text-amber-400" : "text-slate-200"} />
                                        ))}
                                    </div>
                                    <p className="text-lg text-slate-700 leading-relaxed mb-8 font-medium">
                                        "{item.content}"
                                    </p>
                                </div>
                                <div className="flex items-center gap-4 mt-auto pt-6 border-t border-slate-50">
                                    <div className="w-12 h-12 rounded-full flex items-center justify-center font-bold text-white shadow-inner" style={{ background: `linear-gradient(135deg, ${theme.primaryColor || '#6366f1'}, #818cf8)` }}>
                                        {(item.author || "C")[0].toUpperCase()}
                                    </div>
                                    <div>
                                        <div className="font-bold text-slate-900 text-lg">{item.author}</div>
                                        <div className="text-xs font-semibold text-emerald-500 uppercase tracking-wider mt-0.5">Acheteur Vérifié</div>
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </div>
        </SectionWrapper>
    );
}

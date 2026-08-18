import React, { useRef } from 'react';
import { motion } from 'framer-motion';
import { ShoppingBag, ChevronLeft, ChevronRight } from 'lucide-react';
import MediaBackground from '../../../components/MediaBackground';
import { getAlignmentClass, getButtonStyle } from '../../../utils/styles';
import EditableText from '../../../components/EditableText';
import BlockText from '../../../components/BlockText';
import BlockButton from '../../../components/BlockButton';
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

export default function ProductCarousel({ section, theme, contextData, onUpdate }) {
    const { title, subtitle, ctaText, blocks = [], settings = {} } = section;
    const alignClass = getAlignmentClass(settings.alignment || 'left');
    const btnClass = `px-8 py-4 text-white font-bold text-lg hover:scale-105 transition-transform shadow-xl inline-block mt-8 ${getButtonStyle(theme.buttonStyle)}`;
    const scrollRef = useRef(null);

    // Extract Heading, Subtitle, Button from blocks if they exist
    const headingBlock = blocks.find(b => b.type === 'Heading');
    const subtitleBlock = blocks.find(b => b.type === 'Subtitle');
    const buttonBlock = blocks.find(b => b.type === 'Button');

    const scroll = (direction) => {
        if (scrollRef.current) {
            const { current } = scrollRef;
            const scrollAmount = current.offsetWidth * 0.8;
            current.scrollBy({ left: direction === 'left' ? -scrollAmount : scrollAmount, behavior: 'smooth' });
        }
    };

    const products = (contextData?.products && contextData.products.length > 0) ? contextData.products : [1, 2, 3, 4, 5, 6];

    return (
        <SectionWrapper settings={settings} className={`relative overflow-hidden`}>
            <div className={`max-w-[1400px] mx-auto px-6 relative z-10 py-12 ${alignClass}`}>
                <div className="mb-12 md:mb-16 flex flex-col md:flex-row md:items-end justify-between gap-6">
                    <div className={`max-w-3xl flex flex-col gap-4 ${alignClass}`}>
                        {headingBlock ? (
                            <BlockText block={headingBlock} theme={theme} animProps={getAnimationProps(settings.entryAnimation, 0)} />
                        ) : (
                            <motion.div {...getAnimationProps(settings.entryAnimation, 0)}>
                                <EditableText
                                    value={title}
                                    onChange={(val) => onUpdate?.({ title: val })}
                                    as="h2"
                                    className="text-3xl md:text-5xl font-black mb-4 drop-shadow-sm"
                                    isReadOnly={!onUpdate}
                                />
                            </motion.div>
                        )}
                        
                        {subtitleBlock ? (
                            <BlockText block={subtitleBlock} theme={theme} animProps={getAnimationProps(settings.entryAnimation, 1)} />
                        ) : (
                            subtitle && (
                                <motion.div {...getAnimationProps(settings.entryAnimation, 1)}>
                                    <EditableText
                                        value={subtitle}
                                        onChange={(val) => onUpdate?.({ subtitle: val })}
                                        as="p"
                                        className="text-lg md:text-xl opacity-80 drop-shadow-sm"
                                        isReadOnly={!onUpdate}
                                    />
                                </motion.div>
                            )
                        )}
                    </div>
                    <div className="flex gap-2 shrink-0">
                        <button onClick={() => scroll('left')} className="w-12 h-12 rounded-full bg-white text-slate-900 flex items-center justify-center shadow-lg hover:bg-slate-50 transition-colors border border-slate-100">
                            <ChevronLeft size={24} />
                        </button>
                        <button onClick={() => scroll('right')} className="w-12 h-12 rounded-full bg-white text-slate-900 flex items-center justify-center shadow-lg hover:bg-slate-50 transition-colors border border-slate-100">
                            <ChevronRight size={24} />
                        </button>
                    </div>
                </div>

                {/* Carousel Container */}
                <div className="relative -mx-6 px-6 pb-12">
                    <div 
                        ref={scrollRef}
                        className="flex overflow-x-auto gap-4 md:gap-8 snap-x snap-mandatory hide-scrollbar pb-8"
                        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                    >
                        {products.map((p, idx) => {
                            const isPlaceholder = typeof p === 'number';
                            const product = isPlaceholder ? { id: `placeholder-${idx}`, name: `Produit Tendance ${p}`, price: 199 + (p * 50) } : p;
                            const anim = getAnimationProps(settings.entryAnimation, 2 + idx);
                            return (
                                <motion.div 
                                    key={product.id} 
                                    {...anim}
                                    onClick={() => contextData?.onProductClick && !isPlaceholder ? contextData.onProductClick(product) : null}
                                    className={`snap-start shrink-0 w-[280px] md:w-[320px] bg-white rounded-3xl overflow-hidden shadow-lg hover:shadow-2xl hover:-translate-y-2 transition-all duration-300 group flex flex-col ${contextData?.onProductClick && !isPlaceholder ? 'cursor-pointer' : ''}`}
                                >
                                    <div className="aspect-square bg-slate-100 flex items-center justify-center relative overflow-hidden">
                                        {product.photoUrl ? (
                                            <img src={product.photoUrl} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                                        ) : (
                                            <ShoppingBag size={48} className="text-slate-300 group-hover:scale-110 transition-transform duration-500" />
                                        )}
                                        {/* Overlay & Quick Add */}
                                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end justify-center p-4">
                                            <span className="bg-white text-slate-900 text-sm font-bold py-2 px-6 rounded-full transform translate-y-4 group-hover:translate-y-0 transition-transform duration-300">
                                                Voir les détails
                                            </span>
                                        </div>
                                    </div>
                                    <div className="p-6 text-left flex-1 flex flex-col justify-between bg-white relative z-10">
                                        <div>
                                            <h3 className="font-bold text-slate-900 mb-2 text-lg line-clamp-2">{product.name}</h3>
                                        </div>
                                        <div className="mt-2 flex items-center justify-between">
                                            <p className="font-black text-xl" style={{ color: theme.primaryColor }}>{parseFloat(product.price).toFixed(0)} MAD</p>
                                        </div>
                                    </div>
                                </motion.div>
                            );
                        })}
                    </div>
                </div>

                <div className="mt-16 flex justify-center w-full">
                    {buttonBlock ? (
                        <BlockButton block={buttonBlock} theme={theme} animProps={getAnimationProps(settings.entryAnimation, 2 + products.length)} />
                    ) : (
                        ctaText && (
                            <motion.button 
                                {...getAnimationProps(settings.entryAnimation, 2 + products.length)}
                                className={btnClass} 
                                style={{ backgroundColor: theme.primaryColor }}
                            >
                                <EditableText
                                    value={ctaText}
                                    onChange={(val) => onUpdate?.({ ctaText: val })}
                                    as="span"
                                    isReadOnly={!onUpdate}
                                />
                            </motion.button>
                        )
                    )}
                </div>
            </div>
            {/* Inject custom css for hiding scrollbar just for this component if needed */}
            <style dangerouslySetInnerHTML={{__html: `
                .hide-scrollbar::-webkit-scrollbar { display: none; }
            `}} />
        </SectionWrapper>
    );
}

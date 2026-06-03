import React from 'react';
import { motion } from 'framer-motion';
import { Search } from 'lucide-react';
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

export default function HeroMarketplace({ section, theme }) {
    const blocks = section.blocks || [];
    const settings = section.settings || {};

    const headings = blocks.filter(b => ['Heading', 'Subtitle', 'Text'].includes(b.type));
    const mediaBlock = blocks.find(b => b.type === 'Media');

    return (
        <SectionWrapper settings={settings} className="relative w-full overflow-hidden">
            {mediaBlock && mediaBlock.settings.url && (
                <div className="absolute inset-0 z-0">
                    <img src={mediaBlock.settings.url} alt="" className="w-full h-full object-cover" style={{ filter: `blur(${mediaBlock.settings.blur || 0}px)` }} />
                    <div className="absolute inset-0" style={{ backgroundColor: `rgba(0,0,0,${(mediaBlock.settings.overlayOpacity || 10) / 100})` }}></div>
                </div>
            )}
            
            <div className="relative z-10 container mx-auto px-4 py-20 md:py-32 flex flex-col items-center justify-center text-center">
                {headings.map((block, index) => {
                    const style = { color: block.settings.textColor || settings.textColor || '#000000', fontFamily: block.settings.fontFamily || theme.typography?.heading };
                    
                    if (block.type === 'Heading') {
                        return (
                            <motion.h1 
                                key={block.id} 
                                {...getAnimationProps(settings.entryAnimation, index)}
                                className={`font-black tracking-tight leading-tight mb-4 ${block.settings.fontSize ? `text-${block.settings.fontSize}` : 'text-4xl md:text-6xl'}`}
                                style={style}
                            >
                                {block.settings.text}
                            </motion.h1>
                        );
                    }
                    if (block.type === 'Subtitle') {
                        return (
                            <motion.h2 
                                key={block.id} 
                                {...getAnimationProps(settings.entryAnimation, index)}
                                className={`font-medium opacity-90 mb-6 ${block.settings.fontSize ? `text-${block.settings.fontSize}` : 'text-xl md:text-2xl'}`}
                                style={style}
                            >
                                {block.settings.text}
                            </motion.h2>
                        );
                    }
                    return null;
                })}

                {/* Marketplace Search Bar */}
                <motion.div 
                    {...getAnimationProps(settings.entryAnimation, headings.length + 1)}
                    className="w-full max-w-2xl mt-8 relative"
                >
                    <div className="flex items-center bg-white rounded-full p-2 shadow-2xl overflow-hidden border border-slate-100">
                        <div className="px-4 text-slate-400">
                            <Search size={24} />
                        </div>
                        <input 
                            type="text" 
                            placeholder="Rechercher des produits, des marques, des catégories..." 
                            className="flex-1 bg-transparent outline-none text-slate-700 placeholder-slate-400 h-12"
                        />
                        <button 
                            className="px-8 h-12 rounded-full font-bold text-white transition-colors hover:opacity-90 whitespace-nowrap"
                            style={{ backgroundColor: theme.primaryColor || '#000000' }}
                        >
                            Rechercher
                        </button>
                    </div>
                    {/* Quick Links */}
                    <div className="flex gap-4 justify-center mt-6 flex-wrap">
                        {['Électronique', 'Mode', 'Maison', 'Beauté'].map((tag, i) => (
                            <span key={i} className="px-4 py-1.5 rounded-full bg-white/80 backdrop-blur-md text-sm font-medium text-slate-700 shadow-sm cursor-pointer hover:bg-white transition-colors border border-white/20">
                                {tag}
                            </span>
                        ))}
                    </div>
                </motion.div>
            </div>
        </SectionWrapper>
    );
}

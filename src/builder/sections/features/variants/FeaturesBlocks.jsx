import React from 'react';
import { motion } from 'framer-motion';
import * as LucideIcons from 'lucide-react';
import SectionWrapper from '../../../components/SectionWrapper';

const DynamicIcon = ({ name, size = 40, className }) => {
    if (!name) return null;
    const IconComponent = LucideIcons[name];
    if (!IconComponent) return null;
    return <IconComponent size={size} className={className} />;
};

const getAnimationProps = (animationType, index = 0) => {
    switch (animationType) {
        case 'fade': return { initial: { opacity: 0 }, whileInView: { opacity: 1 }, viewport: { once: true }, transition: { duration: 0.5 } };
        case 'slide-up': return { initial: { opacity: 0, y: 30 }, whileInView: { opacity: 1, y: 0 }, viewport: { once: true }, transition: { duration: 0.5 } };
        case 'scale-up': return { initial: { opacity: 0, scale: 0.95 }, whileInView: { opacity: 1, scale: 1 }, viewport: { once: true }, transition: { duration: 0.4 } };
        case 'stagger': return { initial: { opacity: 0, y: 20 }, whileInView: { opacity: 1, y: 0 }, viewport: { once: true }, transition: { duration: 0.4, delay: index * 0.1 } };
        default: return {};
    }
};

export default function FeaturesBlocks({ section, theme }) {
    const blocks = section.blocks || [];
    const settings = section.settings || {};

    const headings = blocks.filter(b => ['Heading', 'Subtitle', 'Text'].includes(b.type));
    const featureCards = blocks.filter(b => b.type === 'FeatureCard');
    const buttons = blocks.filter(b => b.type === 'Button');

    // Layout configuration
    const colsClass = featureCards.length <= 3 ? 'md:grid-cols-3' : 'md:grid-cols-4';
    const alignClass = settings.alignment === 'left' ? 'text-left items-start' : settings.alignment === 'right' ? 'text-right items-end' : 'text-center items-center';

    return (
        <SectionWrapper settings={settings}>
            <div className={`container mx-auto px-4 flex flex-col ${alignClass}`}>
                
                {/* Headers */}
                {headings.length > 0 && (
                    <div className={`max-w-3xl mb-12 flex flex-col gap-4 w-full ${alignClass}`}>
                        {headings.map((block, index) => {
                            const anim = getAnimationProps(settings.entryAnimation, index);
                            const style = { color: block.settings.textColor || settings.textColor, fontFamily: block.settings.fontFamily || theme.typography?.heading };
                            if (block.type === 'Heading') return <motion.h2 key={block.id} {...anim} className={`font-black leading-tight ${block.settings.fontSize ? `text-${block.settings.fontSize}` : 'text-4xl'}`} style={style}>{block.settings.text}</motion.h2>;
                            if (block.type === 'Subtitle') return <motion.h3 key={block.id} {...anim} className={`font-bold opacity-90 ${block.settings.fontSize ? `text-${block.settings.fontSize}` : 'text-xl'}`} style={style}>{block.settings.text}</motion.h3>;
                            return <motion.p key={block.id} {...anim} className={`opacity-80 ${block.settings.fontSize ? `text-${block.settings.fontSize}` : 'text-base'}`} style={{...style, fontFamily: block.settings.fontFamily || theme.typography?.body}}>{block.settings.text}</motion.p>;
                        })}
                    </div>
                )}

                {/* Grid */}
                {featureCards.length > 0 && (
                    <div className={`grid grid-cols-1 sm:grid-cols-2 ${colsClass} gap-8 w-full`}>
                        {featureCards.map((card, index) => {
                            const anim = getAnimationProps(settings.entryAnimation, headings.length + index);
                            return (
                                <motion.div 
                                    key={card.id} 
                                    {...anim}
                                    className={`flex flex-col gap-4 p-6 rounded-2xl transition-all duration-300 hover:-translate-y-2 hover:shadow-xl ${settings.boxStyle === 'boxed' ? 'bg-slate-50 border border-slate-100' : 'bg-white shadow-sm'}`}
                                >
                                    <div className="w-16 h-16 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600 mb-2">
                                        <DynamicIcon name={card.settings.icon} size={32} />
                                    </div>
                                    <h4 className="text-xl font-bold" style={{ color: settings.textColor || '#0f172a', fontFamily: theme.typography?.heading }}>{card.settings.title}</h4>
                                    <p className="opacity-75 leading-relaxed" style={{ color: settings.textColor || '#475569', fontFamily: theme.typography?.body }}>{card.settings.text}</p>
                                </motion.div>
                            );
                        })}
                    </div>
                )}

                {/* Buttons */}
                {buttons.length > 0 && (
                    <div className="mt-12 flex flex-wrap gap-4 justify-center">
                        {buttons.map((btn, index) => {
                            const anim = getAnimationProps(settings.entryAnimation, headings.length + featureCards.length + index);
                            return (
                                <motion.div key={btn.id} {...anim}>
                                    <button 
                                        className={`flex items-center gap-2 px-8 py-4 font-bold transition-transform hover:scale-105 ${btn.settings.style === 'pill' ? 'rounded-full' : btn.settings.style === 'sharp' ? 'rounded-none' : 'rounded-xl'}`}
                                        style={{ backgroundColor: btn.settings.backgroundColor || theme.primaryColor, color: btn.settings.textColor || '#ffffff' }}
                                    >
                                        <DynamicIcon name={btn.settings.icon} size={20} />
                                        {btn.settings.label}
                                    </button>
                                </motion.div>
                            );
                        })}
                    </div>
                )}
                
            </div>
        </SectionWrapper>
    );
}

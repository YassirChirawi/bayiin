import React from 'react';
import { motion } from 'framer-motion';
import * as LucideIcons from 'lucide-react';
import SectionWrapper from '../../../components/SectionWrapper';

const DynamicIcon = ({ name, size = 20, className }) => {
    if (!name) return null;
    const IconComponent = LucideIcons[name];
    if (!IconComponent) return null;
    return <IconComponent size={size} className={className} />;
};

export default function HeroProductFocus({ section, theme }) {
    const blocks = section.blocks || [];
    const settings = section.settings || {};

    const mediaBlock = blocks.find(b => b.type === 'Media');
    const textBlocks = blocks.filter(b => b.id !== mediaBlock?.id);

    return (
        <SectionWrapper settings={settings} className="relative overflow-hidden">
            <div className="container mx-auto px-4 py-16 md:py-24 flex flex-col-reverse md:flex-row items-center gap-12">
                
                {/* Text Side */}
                <div className="w-full md:w-1/2 flex flex-col gap-6 items-start text-left z-10">
                    {textBlocks.map((block, index) => {
                        const style = { color: block.settings.textColor || settings.textColor || '#000000', fontFamily: block.settings.fontFamily || theme.typography?.heading };
                        
                        if (block.type === 'Heading') {
                            return (
                                <motion.h1 
                                    key={block.id} 
                                    initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.6, delay: index * 0.1 }}
                                    className={`font-black tracking-tight leading-none ${block.settings.fontSize ? `text-${block.settings.fontSize}` : 'text-5xl md:text-7xl lg:text-[5rem]'}`}
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
                                    initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.6, delay: index * 0.1 }}
                                    className={`font-medium opacity-90 uppercase tracking-widest text-indigo-600 ${block.settings.fontSize ? `text-${block.settings.fontSize}` : 'text-sm md:text-base'}`}
                                    style={{ ...style, color: block.settings.textColor || theme.primaryColor }}
                                >
                                    {block.settings.text}
                                </motion.h2>
                            );
                        }
                        if (block.type === 'Text') {
                            return (
                                <motion.p 
                                    key={block.id} 
                                    initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.6, delay: index * 0.1 }}
                                    className={`opacity-70 leading-relaxed max-w-md ${block.settings.fontSize ? `text-${block.settings.fontSize}` : 'text-lg'}`}
                                    style={{ ...style, fontFamily: block.settings.fontFamily || theme.typography?.body }}
                                >
                                    {block.settings.text}
                                </motion.p>
                            );
                        }
                        if (block.type === 'Button') {
                            return (
                                <motion.div 
                                    key={block.id} 
                                    initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.4 }}
                                    className="pt-4 flex gap-4"
                                >
                                    <button 
                                        className={`flex items-center gap-2 px-8 py-4 font-bold transition-all hover:scale-105 active:scale-95 shadow-lg ${block.settings.style === 'pill' ? 'rounded-full' : block.settings.style === 'sharp' ? 'rounded-none' : 'rounded-xl'}`}
                                        style={{ backgroundColor: block.settings.backgroundColor || theme.primaryColor, color: block.settings.textColor || '#ffffff' }}
                                    >
                                        <DynamicIcon name={block.settings.icon} size={20} />
                                        {block.settings.label}
                                    </button>
                                </motion.div>
                            );
                        }
                        return null;
                    })}
                </div>

                {/* Product Image Side */}
                <div className="w-full md:w-1/2 relative flex justify-center items-center min-h-[400px]">
                    {/* Background Circle */}
                    <motion.div 
                        initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ duration: 0.8, type: "spring" }}
                        className="absolute w-[120%] aspect-square rounded-full z-0 opacity-20"
                        style={{ backgroundColor: theme.primaryColor || '#6366f1', right: '-20%', top: '-10%' }}
                    />
                    
                    {mediaBlock && mediaBlock.settings.url && (
                        <motion.img 
                            initial={{ opacity: 0, y: 50, rotate: -5 }} animate={{ opacity: 1, y: 0, rotate: 0 }} transition={{ duration: 0.8, delay: 0.2 }}
                            src={mediaBlock.settings.url} 
                            alt="" 
                            className="relative z-10 w-full max-w-md object-contain drop-shadow-2xl hover:scale-105 transition-transform duration-500"
                        />
                    )}
                </div>

            </div>
        </SectionWrapper>
    );
}

import React from 'react';
import { motion } from 'framer-motion';
import * as LucideIcons from 'lucide-react';
import BlockButton from '../../../components/BlockButton';

const DynamicIcon = ({ name, size = 20, className }) => {
    if (!name) return null;
    const IconComponent = LucideIcons[name];
    if (!IconComponent) return null;
    return <IconComponent size={size} className={className} />;
};

const getAnimationProps = (animationType, index = 0) => {
    switch (animationType) {
        case 'fade': return { initial: { opacity: 0 }, whileInView: { opacity: 1 }, viewport: { once: true }, transition: { duration: 0.8, ease: "easeOut" } };
        case 'slide-up': return { initial: { opacity: 0, y: 50 }, whileInView: { opacity: 1, y: 0 }, viewport: { once: true }, transition: { duration: 0.8, ease: "easeOut" } };
        case 'scale-up': return { initial: { opacity: 0, scale: 0.9 }, whileInView: { opacity: 1, scale: 1 }, viewport: { once: true }, transition: { duration: 0.7, ease: "easeOut" } };
        case 'stagger': return { initial: { opacity: 0, y: 30 }, whileInView: { opacity: 1, y: 0 }, viewport: { once: true }, transition: { duration: 0.6, delay: index * 0.2, ease: "easeOut" } };
        default: return {};
    }
};

export default function HeroVideoFullScreen({ section, theme }) {
    const blocks = section.blocks || [];
    const settings = section.settings || {};
    
    // Find media for background
    const backgroundBlock = blocks.find(b => b.type === 'Media');
    const contentBlocks = blocks.filter(b => b.id !== backgroundBlock?.id);

    return (
        <section className="relative w-full min-h-[80vh] flex items-center justify-center overflow-hidden">
            {/* Background Layer */}
            <div className="absolute inset-0 z-0 bg-slate-900">
                {backgroundBlock?.settings?.url ? (
                    backgroundBlock.settings.mediaType === 'video' ? (
                        <video src={backgroundBlock.settings.url} autoPlay loop muted playsInline className="w-full h-full object-cover opacity-80" style={{ filter: `blur(${backgroundBlock.settings.blur || 0}px)` }} />
                    ) : (
                        <img src={backgroundBlock.settings.url} alt="" className="w-full h-full object-cover opacity-80" style={{ filter: `blur(${backgroundBlock.settings.blur || 0}px)` }} />
                    )
                ) : (
                    <div className="w-full h-full bg-slate-800" />
                )}
                {/* Dark overlay for readability */}
                <div className="absolute inset-0 bg-black" style={{ opacity: (backgroundBlock?.settings?.overlayOpacity || 50) / 100 }}></div>
            </div>

            {/* Content Layer */}
            <div className="relative z-10 container mx-auto px-6 py-24 flex flex-col items-center text-center max-w-4xl">
                {contentBlocks.map((block, index) => {
                    const animProps = getAnimationProps(settings.entryAnimation, index);
                    // For fullscreen video, we force text to white unless specified otherwise
                    const blockStyle = {
                        color: block.settings.textColor || '#ffffff',
                        fontFamily: `'${block.settings.fontFamily || theme.typography?.body}', sans-serif`
                    };

                    switch (block.type) {
                        case 'Heading':
                            return (
                                <motion.h1 key={block.id} {...animProps} className={`font-black tracking-tight leading-[1.1] mb-6 drop-shadow-lg ${block.settings.fontSize ? `text-${block.settings.fontSize}` : 'text-5xl md:text-7xl'}`} style={blockStyle}>
                                    {block.settings.text}
                                </motion.h1>
                            );
                        
                        case 'Subtitle':
                            return (
                                <motion.h2 key={block.id} {...animProps} className={`font-medium opacity-90 mb-6 drop-shadow-md ${block.settings.fontSize ? `text-${block.settings.fontSize}` : 'text-2xl md:text-3xl'}`} style={blockStyle}>
                                    {block.settings.text}
                                </motion.h2>
                            );
                        
                        case 'Text':
                            return (
                                <motion.p key={block.id} {...animProps} className={`opacity-80 mb-8 max-w-2xl drop-shadow ${block.settings.fontSize ? `text-${block.settings.fontSize}` : 'text-lg md:text-xl'}`} style={blockStyle}>
                                    {block.settings.text}
                                </motion.p>
                            );

                        case 'Button':
                            return (
                                <BlockButton 
                                    key={block.id} 
                                    block={block} 
                                    theme={theme} 
                                    animProps={animProps} 
                                />
                            );

                        default:
                            return null;
                    }
                })}
            </div>
        </section>
    );
}

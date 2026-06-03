import React from 'react';
import { motion } from 'framer-motion';
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

export default function HeroSplit({ section, theme, onUpdate }) {
    const { title, subtitle, ctaText, settings = {}, blocks = [] } = section;
    const imgPos = settings.imagePosition || 'right'; // Left or right
    
    // Background Media Processing
    const backgroundBlock = blocks.find(b => b.type === 'Media');
    const contentBlocks = blocks.filter(b => b.id !== backgroundBlock?.id);
    const hasBlocks = contentBlocks.length > 0;

    const mediaUrl = backgroundBlock?.settings?.url || settings.backgroundUrl || settings.imageUrl || 'https://images.unsplash.com/photo-1515378960530-7c0da622941f?q=80&w=2070';
    const isVideo = backgroundBlock?.settings?.mediaType === 'video' || settings.backgroundType === 'video';

    // Override section style to force background color (no background image on the wrapper)
    const overrideSettings = { ...settings, backgroundType: 'color', backgroundUrl: null, backgroundImage: null };

    return (
        <SectionWrapper settings={overrideSettings} className="relative overflow-hidden">
            <div className={`max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center gap-16 lg:gap-24 ${imgPos === 'left' ? 'md:flex-row-reverse' : ''}`}>
                <div className="w-full md:w-1/2 flex flex-col items-start text-left relative z-10">
                    {hasBlocks ? (
                        <div className="flex flex-col gap-6 w-full">
                            {contentBlocks.map((block, index) => {
                                const animProps = getAnimationProps(settings.entryAnimation, index);

                                if (block.type === 'Button') {
                                    return <BlockButton key={block.id} block={block} theme={theme} animProps={animProps} />;
                                }
                                
                                return <BlockText key={block.id} block={block} theme={theme} animProps={animProps} />;
                            })}
                        </div>
                    ) : (
                        /* Legacy Render */
                        <motion.div 
                            {...getAnimationProps(settings.entryAnimation, 0)}
                            className="flex flex-col items-start"
                        >
                            <EditableText
                                value={title}
                                onChange={(val) => onUpdate?.({ title: val })}
                                as="h1"
                                className="text-4xl md:text-6xl font-black mb-6 leading-tight tracking-tight drop-shadow-sm"
                                isReadOnly={!onUpdate}
                            />
                            <EditableText
                                value={subtitle}
                                onChange={(val) => onUpdate?.({ subtitle: val })}
                                as="p"
                                className="text-lg md:text-xl opacity-80 mb-10 drop-shadow-sm"
                                isReadOnly={!onUpdate}
                            />
                            {ctaText && (
                                <button className="px-8 py-4 rounded-xl text-white font-bold text-lg hover:-translate-y-1 hover:shadow-lg transition-all" style={{ backgroundColor: theme.primaryColor }}>
                                    <EditableText
                                        value={ctaText}
                                        onChange={(val) => onUpdate?.({ ctaText: val })}
                                        as="span"
                                        isReadOnly={!onUpdate}
                                    />
                                </button>
                            )}
                        </motion.div>
                    )}
                </div>
                
                <motion.div 
                    {...getAnimationProps(settings.entryAnimation, 1)}
                    className="w-full md:w-1/2 aspect-square md:aspect-[4/5] rounded-3xl overflow-hidden shadow-2xl relative z-10"
                >
                    {isVideo ? (
                        <video autoPlay loop muted playsInline className="w-full h-full object-cover">
                            <source src={mediaUrl} type="video/mp4" />
                        </video>
                    ) : (
                        <img src={mediaUrl} alt={title || "Hero Image"} className="w-full h-full object-cover hover:scale-105 transition-transform duration-700" />
                    )}
                </motion.div>
            </div>
        </SectionWrapper>
    );
}

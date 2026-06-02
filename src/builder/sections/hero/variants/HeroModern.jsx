import React from 'react';
import { motion } from 'framer-motion';
import MediaBackground from '../../../components/MediaBackground';
import { getAlignmentClass } from '../../../utils/styles';
import EditableText from '../../../components/EditableText';
import BlockText from '../../../components/BlockText';
import BlockButton from '../../../components/BlockButton';
import SectionWrapper from '../../../components/SectionWrapper';

export default function HeroModern({ section, theme, onUpdate }) {
    const { title, subtitle, ctaText, settings = {}, blocks = [] } = section;
    const alignClass = getAlignmentClass(settings.alignment || 'center');
    
    // Background Media Processing
    const backgroundBlock = blocks.find(b => b.type === 'Media' && b.settings?.aspectRatio === 'video');
    const contentBlocks = blocks.filter(b => b.id !== backgroundBlock?.id);

    const hasBlocks = contentBlocks.length > 0;

    return (
        <SectionWrapper settings={settings} className={`flex flex-col justify-center min-h-[600px] ${alignClass} relative overflow-hidden`}>
            {/* Background */}
            {backgroundBlock && backgroundBlock.settings.url ? (
                <>
                    <div className="absolute inset-0 z-0">
                        {backgroundBlock.settings.mediaType === 'video' ? (
                            <video src={backgroundBlock.settings.url} autoPlay loop muted playsInline className="w-full h-full object-cover" style={{ filter: `blur(${backgroundBlock.settings.blur || 0}px)` }} />
                        ) : (
                            <img src={backgroundBlock.settings.url} alt="" className="w-full h-full object-cover" style={{ filter: `blur(${backgroundBlock.settings.blur || 0}px)` }} />
                        )}
                    </div>
                    <div className="absolute inset-0 z-0" style={{ backgroundColor: `rgba(0,0,0,${(backgroundBlock.settings.overlayOpacity || 30) / 100})` }}></div>
                </>
            ) : (
                <MediaBackground settings={settings} />
            )}

            <div className="relative z-10 max-w-5xl mx-auto px-6 w-full">
                {hasBlocks ? (
                    <div className="flex flex-col gap-6">
                        {contentBlocks.map((block, index) => {
                            const animProps = {
                                initial: { opacity: 0, y: 30 },
                                whileInView: { opacity: 1, y: 0 },
                                viewport: { once: true },
                                transition: { duration: 0.6, delay: index * 0.15 }
                            };

                            if (block.type === 'Button') {
                                return <BlockButton key={block.id} block={block} theme={theme} animProps={animProps} />;
                            }
                            
                            return <BlockText key={block.id} block={block} theme={theme} animProps={animProps} />;
                        })}
                    </div>
                ) : (
                    /* Legacy Render */
                    <motion.div 
                        initial={{ opacity: 0, y: 40 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.8 }}
                    >
                        <EditableText
                            value={title}
                            onChange={(val) => onUpdate?.({ title: val })}
                            as="h1"
                            className="text-4xl md:text-7xl font-black mb-6 leading-tight tracking-tight drop-shadow-lg"
                            isReadOnly={!onUpdate}
                        />
                        <EditableText
                            value={subtitle}
                            onChange={(val) => onUpdate?.({ subtitle: val })}
                            as="p"
                            className="text-lg md:text-2xl opacity-90 mb-10 max-w-3xl mx-auto drop-shadow-md"
                            isReadOnly={!onUpdate}
                        />
                        {ctaText && (
                            <button className="px-8 py-4 rounded-xl text-white font-bold text-lg hover:scale-105 transition-transform shadow-xl" style={{ backgroundColor: theme.primaryColor }}>
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
        </SectionWrapper>
    );
}

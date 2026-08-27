import React from 'react';
import { motion } from 'framer-motion';
import * as LucideIcons from 'lucide-react';
import DOMPurify from 'dompurify';
import SectionWrapper from '../../../components/SectionWrapper';
import BlockButton from '../../../components/BlockButton';

const getAnimationProps = (animationType, index = 0) => {
    switch (animationType) {
        case 'fade': return { initial: { opacity: 0 }, whileInView: { opacity: 1 }, viewport: { once: true }, transition: { duration: 0.6 } };
        case 'slide-up': return { initial: { opacity: 0, y: 50 }, whileInView: { opacity: 1, y: 0 }, viewport: { once: true }, transition: { duration: 0.6 } };
        case 'scale-up': return { initial: { opacity: 0, scale: 0.9 }, whileInView: { opacity: 1, scale: 1 }, viewport: { once: true }, transition: { duration: 0.5 } };
        case 'stagger': return { initial: { opacity: 0, y: 20 }, whileInView: { opacity: 1, y: 0 }, viewport: { once: true }, transition: { duration: 0.5, delay: index * 0.15 } };
        default: return {};
    }
};

const getAlignmentClass = (alignment) => {
    if (alignment === 'left') return 'text-left items-start';
    if (alignment === 'right') return 'text-right items-end';
    return 'text-center items-center mx-auto';
};

const getButtonStyleClass = (style) => {
    if (style === 'sharp') return 'rounded-none';
    if (style === 'pill') return 'rounded-full';
    return 'rounded-xl';
};

const DynamicIcon = ({ name, size = 20, className }) => {
    if (!name) return null;
    const IconComponent = LucideIcons[name];
    if (!IconComponent) return null;
    return <IconComponent size={size} className={className} />;
};

export default function HeroBlocks({ section, theme }) {
    const blocks = section.blocks || [];
    const settings = section.settings || {};
    
    // Background Media Processing
    const backgroundBlock = blocks.find(b => b.type === 'Media' && b.settings?.aspectRatio === 'video');
    const contentBlocks = blocks.filter(b => b.id !== backgroundBlock?.id);

    return (
        <SectionWrapper settings={settings} className="flex flex-col justify-center min-h-[500px]">
            {backgroundBlock && backgroundBlock.settings.url && (
                <>
                    <div className="absolute inset-0 z-0">
                        {backgroundBlock.settings.mediaType === 'video' ? (
                            <video src={backgroundBlock.settings.url} autoPlay loop muted playsInline className="w-full h-full object-cover" style={{ filter: `blur(${backgroundBlock.settings.blur || 0}px)` }} />
                        ) : (
                            <img src={backgroundBlock.settings.url} alt="" className="w-full h-full object-cover" style={{ filter: `blur(${backgroundBlock.settings.blur || 0}px)` }} />
                        )}
                    </div>
                    <div className="absolute inset-0 z-0" style={{ backgroundColor: `rgba(0,0,0,${(backgroundBlock.settings.overlayOpacity || 0) / 100})` }}></div>
                </>
            )}

            <div className="container mx-auto px-4 relative z-10">
                <div className={`flex flex-col gap-6 max-w-4xl ${getAlignmentClass(contentBlocks[0]?.settings?.alignment || 'center')}`}>
                    {contentBlocks.map((block, index) => {
                        const animProps = getAnimationProps(settings.entryAnimation, index);
                        const blockStyle = {
                            color: block.settings.textColor,
                            fontFamily: `'${block.settings.fontFamily || theme.typography?.body}', sans-serif`
                        };

                        switch (block.type) {
                            case 'Heading':
                                return (
                                    <motion.h1 key={block.id} {...animProps} className={`font-black tracking-tight leading-tight w-full ${block.settings.fontSize ? `text-${block.settings.fontSize}` : 'text-5xl md:text-6xl'}`} style={blockStyle}>
                                        {block.settings.text}
                                    </motion.h1>
                                );
                            
                            case 'Subtitle':
                                return (
                                    <motion.h2 key={block.id} {...animProps} className={`font-medium opacity-90 w-full ${block.settings.fontSize ? `text-${block.settings.fontSize}` : 'text-xl md:text-2xl'}`} style={blockStyle}>
                                        {block.settings.text}
                                    </motion.h2>
                                );
                            
                            case 'Text':
                                return (
                                    <motion.p key={block.id} {...animProps} className={`opacity-80 w-full ${block.settings.fontSize ? `text-${block.settings.fontSize}` : 'text-base'}`} style={blockStyle}>
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

                            case 'Media':
                                return (
                                    <motion.div key={block.id} {...animProps} className="w-full mt-8">
                                        {block.settings.url && (
                                            <div className={`overflow-hidden rounded-2xl shadow-2xl ${block.settings.aspectRatio === 'square' ? 'aspect-square max-w-md mx-auto' : 'aspect-video'}`}>
                                                {block.settings.mediaType === 'video' ? (
                                                    <video src={block.settings.url} autoPlay loop muted playsInline className="w-full h-full object-cover" />
                                                ) : (
                                                    <img src={block.settings.url} alt="" className="w-full h-full object-cover" />
                                                )}
                                            </div>
                                        )}
                                    </motion.div>
                                );

                            // Comme pour 'HTML' ci-dessous, l'éditeur proposait
                            // addBlock('FeatureCard') sans qu'aucun rendu n'existe : le bloc
                            // était ajoutable puis invisible sur la vitrine. Les réglages
                            // fournis par getDefaultSettingsForType sont { title, text, icon }.
                            case 'FeatureCard':
                                return (
                                    <motion.div
                                        key={block.id}
                                        {...animProps}
                                        className="w-full flex items-start gap-4 rounded-2xl border p-5 backdrop-blur-sm"
                                        style={{
                                            borderColor: `${theme.primaryColor}33`,
                                            backgroundColor: `${theme.primaryColor}0d`,
                                        }}
                                    >
                                        {block.settings.icon && (
                                            <div
                                                className="flex-shrink-0 flex h-11 w-11 items-center justify-center rounded-xl"
                                                style={{ backgroundColor: `${theme.primaryColor}1f`, color: theme.primaryColor }}
                                            >
                                                <DynamicIcon name={block.settings.icon} size={22} />
                                            </div>
                                        )}
                                        <div className="min-w-0 text-left">
                                            {block.settings.title && (
                                                <h3 className="font-bold text-lg leading-snug" style={blockStyle}>
                                                    {block.settings.title}
                                                </h3>
                                            )}
                                            {block.settings.text && (
                                                <p className="mt-1 text-sm opacity-80" style={blockStyle}>
                                                    {block.settings.text}
                                                </p>
                                            )}
                                        </div>
                                    </motion.div>
                                );

                            // L'étiquette manquait : l'éditeur propose un bloc HTML
                            // (addBlock('HTML') dans SectionBlocksManager) mais le rendu
                            // tombait sur `default: return null` — le bloc était invisible.
                            case 'HTML':
                                return (
                                    <motion.div key={block.id} {...animProps} className="w-full" dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(block.settings.code || '') }} />
                                );

                            default:
                                return null;
                        }
                    })}
                </div>
            </div>
        </SectionWrapper>
    );
}

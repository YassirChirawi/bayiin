import React from 'react';
import { motion } from 'framer-motion';
import * as LucideIcons from 'lucide-react';
import SectionWrapper from '../../../components/SectionWrapper';
import BlockButton from '../../../components/BlockButton';

const DynamicIcon = ({ name, size = 20, className }) => {
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

export default function ImageTextBlocks({ section, theme }) {
    const blocks = section.blocks || [];
    const settings = section.settings || {};

    const mediaBlock = blocks.find(b => b.type === 'Media');
    const textBlocks = blocks.filter(b => b.id !== mediaBlock?.id);

    // Layout options
    const layout = settings.alignment || 'left'; // left means media left, right means media right
    const alignClass = layout === 'right' ? 'md:flex-row-reverse' : 'md:flex-row';
    const textAlignClass = settings.textAlign === 'center' ? 'text-center items-center' : settings.textAlign === 'right' ? 'text-right items-end' : 'text-left items-start';

    return (
        <SectionWrapper settings={settings}>
            <div className={`container mx-auto px-4 flex flex-col ${alignClass} items-center gap-12`}>
                
                {/* Media Side */}
                {mediaBlock && mediaBlock.settings.url && (
                    <motion.div 
                        {...getAnimationProps(settings.entryAnimation, 0)}
                        className={`w-full md:w-1/2 overflow-hidden rounded-2xl shadow-xl relative ${mediaBlock.settings.aspectRatio === 'square' ? 'aspect-square' : mediaBlock.settings.aspectRatio === 'vertical' ? 'aspect-[4/5]' : 'aspect-video'}`}
                    >
                        {mediaBlock.settings.mediaType === 'video' ? (
                            <video src={mediaBlock.settings.url} autoPlay loop muted playsInline className="w-full h-full object-cover" style={{ filter: `blur(${mediaBlock.settings.blur || 0}px)` }} />
                        ) : (
                            <img src={mediaBlock.settings.url} alt="" className="w-full h-full object-cover" style={{ filter: `blur(${mediaBlock.settings.blur || 0}px)` }} />
                        )}
                        <div className="absolute inset-0" style={{ backgroundColor: `rgba(0,0,0,${(mediaBlock.settings.overlayOpacity || 0) / 100})` }}></div>
                    </motion.div>
                )}

                {/* Text Side */}
                {textBlocks.length > 0 && (
                    <div className={`w-full ${mediaBlock ? 'md:w-1/2' : ''} flex flex-col gap-6 ${textAlignClass}`}>
                        {textBlocks.map((block, index) => {
                            const anim = getAnimationProps(settings.entryAnimation, index + 1);
                            const style = { color: block.settings.textColor || settings.textColor, fontFamily: block.settings.fontFamily || theme.typography?.heading };
                            
                            switch (block.type) {
                                case 'Heading':
                                    return <motion.h2 key={block.id} {...anim} className={`font-black leading-tight ${block.settings.fontSize ? `text-${block.settings.fontSize}` : 'text-4xl lg:text-5xl'}`} style={style}>{block.settings.text}</motion.h2>;
                                
                                case 'Subtitle':
                                    return <motion.h3 key={block.id} {...anim} className={`font-bold opacity-90 ${block.settings.fontSize ? `text-${block.settings.fontSize}` : 'text-xl'}`} style={style}>{block.settings.text}</motion.h3>;
                                
                                case 'Text':
                                    return <motion.p key={block.id} {...anim} className={`opacity-80 leading-relaxed ${block.settings.fontSize ? `text-${block.settings.fontSize}` : 'text-base lg:text-lg'}`} style={{...style, fontFamily: block.settings.fontFamily || theme.typography?.body}}>{block.settings.text}</motion.p>;
                                
                                case 'Button':
                                    return (
                                        <BlockButton 
                                            key={block.id} 
                                            block={block} 
                                            theme={theme} 
                                            animProps={anim} 
                                        />
                                    );
                                
                                case 'FeatureCard':
                                    return (
                                        <motion.div key={block.id} {...anim} className="flex items-start gap-4 mt-2">
                                            <div className="w-12 h-12 shrink-0 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
                                                <DynamicIcon name={block.settings.icon} size={24} />
                                            </div>
                                            <div className="flex flex-col text-left">
                                                <h4 className="font-bold text-lg" style={{ color: settings.textColor || '#0f172a', fontFamily: theme.typography?.heading }}>{block.settings.title}</h4>
                                                <p className="text-sm opacity-75 leading-relaxed" style={{ color: settings.textColor || '#475569', fontFamily: theme.typography?.body }}>{block.settings.text}</p>
                                            </div>
                                        </motion.div>
                                    );

                                case 'HTML':
                                    return <motion.div key={block.id} {...anim} dangerouslySetInnerHTML={{ __html: block.settings.code }} />;

                                default:
                                    return null;
                            }
                        })}
                    </div>
                )}
            </div>
        </SectionWrapper>
    );
}

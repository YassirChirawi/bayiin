import React from 'react';
import { motion } from 'framer-motion';
import { Image as ImageIcon } from 'lucide-react';
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

export default function ImageTextStandard({ section, theme, onUpdate }) {
    const { title, subtitle, content, ctaText, blocks = [], settings = {} } = section;
    const alignClass = getAlignmentClass(settings.alignment || 'left');
    const imgPos = settings.imagePosition || 'left';

    // Extract blocks if they exist
    const headingBlock = blocks.find(b => b.type === 'Heading');
    const subtitleBlock = blocks.find(b => b.type === 'Subtitle');
    const contentBlock = blocks.find(b => b.type === 'Text');
    const buttonBlock = blocks.find(b => b.type === 'Button');

    return (
        <SectionWrapper settings={settings} className={`relative overflow-hidden ${alignClass}`}>
            <MediaBackground settings={settings} />
            <div className={`max-w-7xl mx-auto relative z-10 flex flex-col md:flex-row gap-16 items-center py-16 px-6 ${imgPos === 'right' ? 'md:flex-row-reverse' : ''}`}>
                <motion.div 
                    {...getAnimationProps(settings.entryAnimation, 0)}
                    className="w-full md:w-1/2 aspect-[4/3] md:h-[600px] bg-slate-200 rounded-3xl overflow-hidden shadow-2xl relative group"
                >
                    {settings.imageUrl ? (
                        <img src={settings.imageUrl} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                    ) : (
                        <div className="w-full h-full bg-gradient-to-br from-slate-200 to-slate-300 flex items-center justify-center">
                            <ImageIcon size={64} className="text-slate-400 group-hover:scale-110 transition-transform duration-500" />
                        </div>
                    )}
                </motion.div>
                
                <motion.div 
                    {...getAnimationProps(settings.entryAnimation, 1)}
                    className={`w-full md:w-1/2 flex flex-col gap-6 ${alignClass}`}
                >
                    {headingBlock ? (
                        <BlockText block={headingBlock} theme={theme} animProps={getAnimationProps(settings.entryAnimation, 2)} />
                    ) : (
                        <motion.div {...getAnimationProps(settings.entryAnimation, 2)}>
                            <EditableText
                                value={title}
                                onChange={(val) => onUpdate?.({ title: val })}
                                as="h2"
                                className="text-4xl md:text-6xl font-black leading-tight drop-shadow-sm tracking-tight"
                                isReadOnly={!onUpdate}
                                style={{ color: settings.textColor || '#0f172a' }}
                            />
                        </motion.div>
                    )}
                    
                    {subtitleBlock ? (
                        <BlockText block={subtitleBlock} theme={theme} animProps={getAnimationProps(settings.entryAnimation, 3)} />
                    ) : (
                        subtitle && (
                            <motion.div {...getAnimationProps(settings.entryAnimation, 3)}>
                                <EditableText
                                    value={subtitle}
                                    onChange={(val) => onUpdate?.({ subtitle: val })}
                                    as="p"
                                    className="text-xl md:text-2xl font-medium opacity-80 drop-shadow-sm"
                                    isReadOnly={!onUpdate}
                                    style={{ color: settings.textColor || '#475569' }}
                                />
                            </motion.div>
                        )
                    )}

                    {contentBlock ? (
                        <BlockText block={contentBlock} theme={theme} animProps={getAnimationProps(settings.entryAnimation, 4)} />
                    ) : (
                        content && (
                            <motion.div {...getAnimationProps(settings.entryAnimation, 4)}>
                                <EditableText
                                    value={content}
                                    onChange={(val) => onUpdate?.({ content: val })}
                                    as="p"
                                    className="text-lg leading-relaxed opacity-90 drop-shadow-sm"
                                    isReadOnly={!onUpdate}
                                    style={{ color: settings.textColor ? `${settings.textColor}e6` : '#334155' }}
                                />
                            </motion.div>
                        )
                    )}

                    <div className="pt-4">
                        {buttonBlock ? (
                            <BlockButton block={buttonBlock} theme={theme} animProps={getAnimationProps(settings.entryAnimation, 5)} />
                        ) : (
                            ctaText && (
                                <motion.button 
                                    {...getAnimationProps(settings.entryAnimation, 5)}
                                    className={`px-8 py-4 text-white font-bold text-lg hover:-translate-y-1 hover:shadow-2xl transition-all duration-300 shadow-xl inline-block ${getButtonStyle(theme.buttonStyle)}`} 
                                    style={{ backgroundColor: theme.primaryColor || '#6366f1' }}
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
                </motion.div>
            </div>
        </SectionWrapper>
    );
}

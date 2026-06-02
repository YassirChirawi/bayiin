import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { AlertCircle } from 'lucide-react';
import MediaBackground from '../../../components/MediaBackground';
import { getAlignmentClass, getButtonStyle } from '../../../utils/styles';
import EditableText from '../../../components/EditableText';
import BlockText from '../../../components/BlockText';
import BlockButton from '../../../components/BlockButton';
import SectionWrapper from '../../../components/SectionWrapper';

export default function CountdownTimer({ section, theme, onUpdate }) {
    const { title, subtitle, ctaText, blocks = [], settings = {} } = section;
    const alignClass = getAlignmentClass(settings.alignment || 'center');

    // Fallback display values
    const displayTitle = title || "Offre limitée !";
    const displaySubtitle = subtitle || "Profitez de la livraison gratuite avant la fin du compteur.";
    
    // Timer state
    const [timeLeft, setTimeLeft] = useState({ hours: 12, minutes: 34, seconds: 56 });
    
    useEffect(() => {
        // Dummy countdown effect for visual presentation
        const timer = setInterval(() => {
            setTimeLeft(prev => {
                let { hours, minutes, seconds } = prev;
                if (seconds > 0) {
                    seconds -= 1;
                } else {
                    seconds = 59;
                    if (minutes > 0) {
                        minutes -= 1;
                    } else {
                        minutes = 59;
                        if (hours > 0) hours -= 1;
                    }
                }
                return { hours, minutes, seconds };
            });
        }, 1000);
        return () => clearInterval(timer);
    }, []);

    const formatNum = (num) => num.toString().padStart(2, '0');

    // Extract blocks if they exist
    const headingBlock = blocks.find(b => b.type === 'Heading');
    const subtitleBlock = blocks.find(b => b.type === 'Subtitle');
    const buttonBlock = blocks.find(b => b.type === 'Button');

    return (
        <SectionWrapper settings={settings} className={`relative overflow-hidden ${alignClass}`}>
            <MediaBackground settings={settings} />
            <motion.div 
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5 }}
                className="max-w-5xl mx-auto relative z-10 flex flex-col lg:flex-row items-center justify-between gap-10 bg-white/80 backdrop-blur-xl p-8 md:p-12 rounded-3xl border border-white/40 shadow-2xl my-8 mx-4 md:mx-auto"
            >
                <div className="flex-1 text-center lg:text-left flex flex-col gap-2">
                    <div className="flex items-center justify-center lg:justify-start gap-2 mb-2 text-rose-500 font-bold">
                        <AlertCircle size={20} className="animate-pulse" />
                        <span className="uppercase tracking-wider text-sm">Se termine bientôt</span>
                    </div>
                    
                    {headingBlock ? (
                        <BlockText block={headingBlock} theme={theme} />
                    ) : (
                        <EditableText
                            value={displayTitle}
                            onChange={(val) => onUpdate?.({ title: val })}
                            as="h2"
                            className="text-3xl md:text-5xl font-black mb-2 drop-shadow-sm leading-tight tracking-tight"
                            isReadOnly={!onUpdate}
                            style={{ color: settings.textColor || '#0f172a' }}
                        />
                    )}
                    
                    {subtitleBlock ? (
                        <BlockText block={subtitleBlock} theme={theme} />
                    ) : (
                        displaySubtitle && (
                            <EditableText
                                value={displaySubtitle}
                                onChange={(val) => onUpdate?.({ subtitle: val })}
                                as="p"
                                className="text-lg md:text-xl opacity-80 drop-shadow-sm max-w-xl mx-auto lg:mx-0"
                                isReadOnly={!onUpdate}
                                style={{ color: settings.textColor || '#475569' }}
                            />
                        )
                    )}
                </div>
                
                <div className="flex flex-col items-center">
                    <div className="flex items-center gap-2 md:gap-4 bg-white/50 p-4 rounded-2xl shadow-inner border border-slate-100/50 mb-6 backdrop-blur-sm">
                        <div className="flex flex-col items-center">
                            <div className="w-16 h-16 md:w-20 md:h-20 bg-slate-900 text-white rounded-xl flex items-center justify-center text-3xl md:text-4xl font-black shadow-lg shadow-black/20">
                                {formatNum(timeLeft.hours)}
                            </div>
                            <span className="text-xs font-bold uppercase mt-3 opacity-70 tracking-widest text-slate-700">Heures</span>
                        </div>
                        <div className="text-2xl md:text-4xl font-black text-slate-900 opacity-20 mb-6">:</div>
                        <div className="flex flex-col items-center">
                            <div className="w-16 h-16 md:w-20 md:h-20 bg-slate-900 text-white rounded-xl flex items-center justify-center text-3xl md:text-4xl font-black shadow-lg shadow-black/20">
                                {formatNum(timeLeft.minutes)}
                            </div>
                            <span className="text-xs font-bold uppercase mt-3 opacity-70 tracking-widest text-slate-700">Min</span>
                        </div>
                        <div className="text-2xl md:text-4xl font-black text-slate-900 opacity-20 mb-6">:</div>
                        <div className="flex flex-col items-center">
                            <div className="w-16 h-16 md:w-20 md:h-20 bg-rose-500 text-white rounded-xl flex items-center justify-center text-3xl md:text-4xl font-black shadow-lg shadow-rose-500/20 animate-pulse">
                                {formatNum(timeLeft.seconds)}
                            </div>
                            <span className="text-xs font-bold uppercase mt-3 opacity-70 tracking-widest text-slate-700">Sec</span>
                        </div>
                    </div>
                    
                    {buttonBlock ? (
                        <BlockButton block={buttonBlock} theme={theme} className="w-full" />
                    ) : (
                        ctaText && (
                            <button className={`w-full px-8 py-4 text-white font-bold text-lg hover:-translate-y-1 hover:shadow-2xl transition-all duration-300 shadow-xl rounded-xl ${getButtonStyle(theme.buttonStyle)}`} style={{ backgroundColor: theme.primaryColor || '#6366f1' }}>
                                <EditableText
                                    value={ctaText}
                                    onChange={(val) => onUpdate?.({ ctaText: val })}
                                    as="span"
                                    isReadOnly={!onUpdate}
                                />
                            </button>
                        )
                    )}
                </div>

            </motion.div>
        </SectionWrapper>
    );
}

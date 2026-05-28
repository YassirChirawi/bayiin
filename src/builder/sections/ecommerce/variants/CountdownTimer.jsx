import React, { useState, useEffect } from 'react';
import { Timer, AlertCircle } from 'lucide-react';
import MediaBackground from '../../../components/MediaBackground';
import { getSectionStyle, getAlignmentClass, getButtonStyle } from '../../../utils/styles';
import EditableText from '../../../components/EditableText';

export default function CountdownTimer({ section, theme, onUpdate }) {
    const { title, subtitle, ctaText, settings = {} } = section;
    const alignClass = getAlignmentClass(settings.alignment);
    const btnClass = `px-8 py-3 text-white font-bold text-base md:text-lg hover:scale-105 transition-transform shadow-xl mt-6 inline-block ${getButtonStyle(theme.buttonStyle)}`;

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

    return (
        <div className={`px-6 py-8 relative overflow-hidden ${alignClass}`} style={getSectionStyle(section, theme)}>
            <MediaBackground settings={settings} />
            <div className="max-w-4xl mx-auto relative z-10 flex flex-col md:flex-row items-center justify-between gap-8 bg-white/10 backdrop-blur-md p-6 md:p-8 rounded-3xl border border-white/20 shadow-xl">
                
                <div className="flex-1 text-center md:text-left">
                    <div className="flex items-center justify-center md:justify-start gap-2 mb-2 text-rose-500 font-bold">
                        <AlertCircle size={20} className="animate-pulse" />
                        <span className="uppercase tracking-wider text-sm">Se termine bientôt</span>
                    </div>
                    <EditableText
                        value={displayTitle}
                        onChange={(val) => onUpdate?.({ title: val })}
                        as="h2"
                        className="text-2xl md:text-4xl font-black mb-2 drop-shadow-sm leading-tight"
                        isReadOnly={!onUpdate}
                    />
                    {displaySubtitle && (
                        <EditableText
                            value={displaySubtitle}
                            onChange={(val) => onUpdate?.({ subtitle: val })}
                            as="p"
                            className="text-base md:text-lg opacity-90 drop-shadow-sm"
                            isReadOnly={!onUpdate}
                        />
                    )}
                </div>
                
                <div className="flex flex-col items-center">
                    <div className="flex items-center gap-3 md:gap-4">
                        <div className="flex flex-col items-center">
                            <div className="w-16 h-16 md:w-20 md:h-20 bg-slate-900 text-white rounded-2xl flex items-center justify-center text-2xl md:text-4xl font-black shadow-inner shadow-black/50">
                                {formatNum(timeLeft.hours)}
                            </div>
                            <span className="text-xs font-bold uppercase mt-2 opacity-80 tracking-wider">Heures</span>
                        </div>
                        <div className="text-2xl md:text-4xl font-black text-slate-900 opacity-50 mb-6">:</div>
                        <div className="flex flex-col items-center">
                            <div className="w-16 h-16 md:w-20 md:h-20 bg-slate-900 text-white rounded-2xl flex items-center justify-center text-2xl md:text-4xl font-black shadow-inner shadow-black/50">
                                {formatNum(timeLeft.minutes)}
                            </div>
                            <span className="text-xs font-bold uppercase mt-2 opacity-80 tracking-wider">Min</span>
                        </div>
                        <div className="text-2xl md:text-4xl font-black text-slate-900 opacity-50 mb-6">:</div>
                        <div className="flex flex-col items-center">
                            <div className="w-16 h-16 md:w-20 md:h-20 bg-slate-900 text-white rounded-2xl flex items-center justify-center text-2xl md:text-4xl font-black shadow-inner shadow-black/50">
                                {formatNum(timeLeft.seconds)}
                            </div>
                            <span className="text-xs font-bold uppercase mt-2 opacity-80 tracking-wider">Sec</span>
                        </div>
                    </div>
                    
                    {ctaText && (
                        <button className={btnClass} style={{ backgroundColor: theme.primaryColor }}>
                            <EditableText
                                value={ctaText}
                                onChange={(val) => onUpdate?.({ ctaText: val })}
                                as="span"
                                isReadOnly={!onUpdate}
                            />
                        </button>
                    )}
                </div>

            </div>
        </div>
    );
}

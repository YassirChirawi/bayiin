import React from 'react';
import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';

export default function StoreHero({ title, subtitle, primaryColor, backgroundType, backgroundMediaUrl, animationStyle }) {
    
    const getAnimationProps = () => {
        if (animationStyle === 'slide') return { initial: { opacity: 0, y: 40 }, animate: { opacity: 1, y: 0 } };
        if (animationStyle === 'spring') return { initial: { opacity: 0, scale: 0.8 }, animate: { opacity: 1, scale: 1 }, transition: { type: 'spring', bounce: 0.5 } };
        if (animationStyle === 'none') return { initial: { opacity: 1, y: 0 }, animate: { opacity: 1, y: 0 } };
        // fade (default)
        return { initial: { opacity: 0, y: 10 }, animate: { opacity: 1, y: 0 } };
    };

    const isMedia = backgroundType === 'image' || backgroundType === 'video';
    const textColor = isMedia ? 'text-white' : 'text-gray-900';
    const subtitleColor = isMedia ? 'text-slate-200' : 'text-gray-600';

    return (
        <section className={`relative overflow-hidden ${!isMedia ? 'bg-slate-50' : 'bg-slate-900'} py-20 sm:py-32 flex flex-col items-center justify-center text-center px-4 min-h-[500px]`}>
            {/* Background Media */}
            {backgroundType === 'image' && backgroundMediaUrl && (
                <div className="absolute inset-0 z-0">
                    <img src={backgroundMediaUrl} alt="Background" className="w-full h-full object-cover opacity-60" />
                    <div className="absolute inset-0 bg-slate-900/40 mix-blend-multiply" />
                </div>
            )}
            
            {backgroundType === 'video' && backgroundMediaUrl && (
                <div className="absolute inset-0 z-0">
                    <video src={backgroundMediaUrl} autoPlay loop muted playsInline className="w-full h-full object-cover opacity-60" />
                    <div className="absolute inset-0 bg-slate-900/40 mix-blend-multiply" />
                </div>
            )}

            {/* Background Decorations (Color only) */}
            {!isMedia && (
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-3xl h-[400px] opacity-20 pointer-events-none blur-[100px] rounded-full"
                     style={{ backgroundColor: primaryColor || '#4f46e5' }} />
            )}

            <motion.div 
                {...getAnimationProps()}
                transition={{ duration: 0.6, ...getAnimationProps().transition }}
                className="relative z-10 max-w-4xl mx-auto space-y-8"
            >
                <h1 className={`text-4xl md:text-6xl font-black ${textColor} tracking-tight leading-tight`}>
                    {title || 'Votre Titre Accrocheur Ici'}
                </h1>
                
                <p className={`text-lg md:text-xl ${subtitleColor} max-w-2xl mx-auto font-medium`}>
                    {subtitle || 'Un sous-titre clair et orienté conversion pour inciter vos clients à passer commande.'}
                </p>

                <div className="flex items-center justify-center pt-4">
                    <button 
                        className="inline-flex items-center gap-2 px-8 py-4 rounded-full text-white font-bold text-lg hover:shadow-lg hover:-translate-y-1 transition-all duration-300"
                        style={{ backgroundColor: primaryColor || '#4f46e5', boxShadow: `0 10px 25px -5px ${primaryColor}40` }}
                    >
                        Acheter maintenant <ArrowRight size={20} />
                    </button>
                </div>
            </motion.div>
        </section>
    );
}

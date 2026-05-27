import React from 'react';
import { getSectionStyle, getButtonStyle } from '../../../utils/styles';

export default function HeroSplit({ section, theme }) {
    const { title, subtitle, ctaText, settings = {} } = section;
    const btnClass = `px-8 py-4 text-white font-bold text-lg hover:scale-105 transition-transform shadow-xl ${getButtonStyle(theme.buttonStyle)}`;
    const imgPos = settings.imagePosition || 'right'; // Left or right
    
    // For HeroSplit, the background is split. We don't use the default MediaBackground on the whole section.
    // The image/video is forced to the side.
    const mediaUrl = settings.backgroundUrl || settings.imageUrl || 'https://images.unsplash.com/photo-1515378960530-7c0da622941f?q=80&w=2070';
    const isVideo = settings.backgroundType === 'video';

    // Override section style to force background color (no background image on the wrapper)
    const overrideSettings = { ...settings, backgroundType: 'color', backgroundUrl: null, backgroundImage: null };

    return (
        <div className="relative overflow-hidden" style={getSectionStyle({ ...section, settings: overrideSettings }, theme)}>
            <div className={`max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center gap-16 ${imgPos === 'left' ? 'md:flex-row-reverse' : ''}`}>
                <div className="w-full md:w-1/2 flex flex-col items-start text-left relative z-10">
                    <h1 className="text-4xl md:text-6xl font-black mb-6 leading-tight tracking-tight drop-shadow-sm">
                        {title}
                    </h1>
                    <p className="text-lg md:text-xl opacity-80 mb-10 drop-shadow-sm">
                        {subtitle}
                    </p>
                    {ctaText && (
                        <button className={btnClass} style={{ backgroundColor: theme.primaryColor }}>
                            {ctaText}
                        </button>
                    )}
                </div>
                
                <div className="w-full md:w-1/2 aspect-square md:aspect-[4/5] rounded-3xl overflow-hidden shadow-2xl relative z-10">
                    {isVideo ? (
                        <video autoPlay loop muted playsInline className="w-full h-full object-cover">
                            <source src={mediaUrl} type="video/mp4" />
                        </video>
                    ) : (
                        <img src={mediaUrl} alt={title} className="w-full h-full object-cover hover:scale-105 transition-transform duration-700" />
                    )}
                </div>
            </div>
        </div>
    );
}

import React from 'react';
import MediaBackground from '../../../components/MediaBackground';
import { getSectionStyle, getAlignmentClass, getButtonStyle } from '../../../utils/styles';

export default function HeroModern({ section, theme }) {
    const { title, subtitle, ctaText, settings = {} } = section;
    const alignClass = getAlignmentClass(settings.alignment);
    const btnClass = `px-8 py-4 text-white font-bold text-lg hover:scale-105 transition-transform shadow-xl ${getButtonStyle(theme.buttonStyle)}`;

    return (
        <div className={`px-6 ${alignClass} relative overflow-hidden`} style={getSectionStyle(section, theme)}>
            <MediaBackground settings={settings} />
            <div className="relative z-10 max-w-5xl mx-auto">
                <h1 className="text-4xl md:text-7xl font-black mb-6 leading-tight tracking-tight drop-shadow-lg">
                    {title}
                </h1>
                <p className="text-lg md:text-2xl opacity-90 mb-10 max-w-3xl mx-auto drop-shadow-md">
                    {subtitle}
                </p>
                {ctaText && (
                    <button className={btnClass} style={{ backgroundColor: theme.primaryColor }}>
                        {ctaText}
                    </button>
                )}
            </div>
        </div>
    );
}

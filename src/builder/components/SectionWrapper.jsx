import React from 'react';

const getGradientStyle = (gradientType, color1 = '#ffffff', color2 = '#f8fafc') => {
    switch(gradientType) {
        case 'linear-to-b': return `linear-gradient(to bottom, ${color1}, ${color2})`;
        case 'linear-to-r': return `linear-gradient(to right, ${color1}, ${color2})`;
        case 'linear-to-br': return `linear-gradient(to bottom right, ${color1}, ${color2})`;
        case 'radial': return `radial-gradient(circle, ${color1}, ${color2})`;
        default: return undefined; // No gradient
    }
};

const getBorderRadiusClass = (radius) => {
    switch(radius) {
        case 'rounded': return 'rounded-2xl';
        case 'rounded-lg': return 'rounded-3xl';
        case 'pill': return 'rounded-[3rem]';
        default: return 'rounded-none';
    }
};

const getShadowClass = (shadow) => {
    switch(shadow) {
        case 'sm': return 'shadow-sm';
        case 'md': return 'shadow-md';
        case 'lg': return 'shadow-xl';
        case 'glow': return 'shadow-[0_0_40px_-10px_rgba(0,0,0,0.15)]';
        default: return 'shadow-none';
    }
};

export default function SectionWrapper({ settings, children, className = '' }) {
    const isBoxed = settings.boxStyle && settings.boxStyle !== 'none';
    
    // Background handling
    const bgStyle = settings.backgroundGradient 
        ? { backgroundImage: getGradientStyle(settings.backgroundGradient, settings.backgroundColor, settings.gradientColor2) }
        : { backgroundColor: settings.backgroundColor || '#ffffff' };

    const paddingStyle = {
        paddingTop: `${settings.paddingTop || 64}px`,
        paddingBottom: `${settings.paddingBottom || 64}px`
    };

    const wrapperStyle = isBoxed ? undefined : { ...bgStyle, ...paddingStyle };
    const boxStyleConfig = isBoxed ? { ...bgStyle, ...paddingStyle } : undefined;

    return (
        <section className={`relative w-full ${className}`} style={wrapperStyle}>
            {/* Top Divider */}
            {settings.dividerTop && settings.dividerTop !== 'none' && (
                <div className="absolute top-0 left-0 w-full overflow-hidden leading-[0] transform rotate-180 z-0">
                    <svg data-name="Layer 1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 120" preserveAspectRatio="none" className="relative block w-[calc(100%+1.3px)] h-[50px] md:h-[100px]">
                        {settings.dividerTop === 'wave' && (
                            <path d="M321.39,56.44c58-10.79,114.16-30.13,172-41.86,82.39-16.72,168.19-17.73,250.45-.39C823.78,31,906.67,72,985.66,92.83c70.05,18.48,146.53,26.09,214.34,3V0H0V27.35A600.21,600.21,0,0,0,321.39,56.44Z" fill={settings.dividerTopColor || "#ffffff"}></path>
                        )}
                        {settings.dividerTop === 'slant' && (
                            <path d="M1200 120L0 16.48V0h1200v120z" fill={settings.dividerTopColor || "#ffffff"}></path>
                        )}
                    </svg>
                </div>
            )}

            {isBoxed ? (
                <div className="container mx-auto px-4 relative z-10 py-8">
                    <div className={`w-full overflow-hidden ${getBorderRadiusClass(settings.borderRadius)} ${getShadowClass(settings.shadow)}`} style={boxStyleConfig}>
                        {children}
                    </div>
                </div>
            ) : (
                <div className="relative z-10 w-full">
                    {children}
                </div>
            )}

            {/* Bottom Divider */}
            {settings.dividerBottom && settings.dividerBottom !== 'none' && (
                <div className="absolute bottom-0 left-0 w-full overflow-hidden leading-[0] z-0">
                    <svg data-name="Layer 1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 120" preserveAspectRatio="none" className="relative block w-[calc(100%+1.3px)] h-[50px] md:h-[100px]">
                        {settings.dividerBottom === 'wave' && (
                            <path d="M321.39,56.44c58-10.79,114.16-30.13,172-41.86,82.39-16.72,168.19-17.73,250.45-.39C823.78,31,906.67,72,985.66,92.83c70.05,18.48,146.53,26.09,214.34,3V0H0V27.35A600.21,600.21,0,0,0,321.39,56.44Z" fill={settings.dividerBottomColor || "#ffffff"}></path>
                        )}
                        {settings.dividerBottom === 'slant' && (
                            <path d="M1200 120L0 16.48V0h1200v120z" fill={settings.dividerBottomColor || "#ffffff"}></path>
                        )}
                    </svg>
                </div>
            )}
        </section>
    );
}

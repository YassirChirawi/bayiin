export const getButtonStyle = (style) => {
    switch(style) {
        case 'pill': return 'rounded-full';
        case 'sharp': return 'rounded-none';
        case 'rounded': default: return 'rounded-xl';
    }
};

export const getSectionStyle = (section, theme) => {
    const { type, settings = {} } = section;
    const isImage = settings.backgroundType === 'image';
    const isVideo = settings.backgroundType === 'video';
    const bgUrl = settings.backgroundUrl;

    const bgColor = (!isImage && !isVideo) && settings.backgroundColor 
        ? settings.backgroundColor 
        : (type === 'Hero' ? `${theme.primaryColor}10` : '#ffffff');

    // Default padding values depending on the block type
    const defaultPt = type === 'Hero' ? 128 : 80;
    const defaultPb = type === 'Hero' ? 128 : 80;

    // Handle string/number (old format) or object (new multi-breakpoint format)
    const pt = typeof settings.paddingTop === 'object' && settings.paddingTop !== null
        ? settings.paddingTop
        : { desktop: settings.paddingTop ?? defaultPt, tablet: settings.paddingTop ?? defaultPt, mobile: settings.paddingTop ?? defaultPt };

    const pb = typeof settings.paddingBottom === 'object' && settings.paddingBottom !== null
        ? settings.paddingBottom
        : { desktop: settings.paddingBottom ?? defaultPb, tablet: settings.paddingBottom ?? defaultPb, mobile: settings.paddingBottom ?? defaultPb };

    return {
        backgroundColor: (isImage || isVideo) ? 'transparent' : bgColor,
        backgroundImage: isImage && bgUrl ? `url(${bgUrl})` : 'none',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        color: settings.textColor || '#0f172a',
        position: 'relative',
        
        // Inject CSS variables for responsive padding
        '--pt-desktop': `${pt.desktop}px`,
        '--pt-tablet': `${pt.tablet}px`,
        '--pt-mobile': `${pt.mobile}px`,
        
        '--pb-desktop': `${pb.desktop}px`,
        '--pb-tablet': `${pb.tablet}px`,
        '--pb-mobile': `${pb.mobile}px`,
    };
};

export const getAlignmentClass = (alignment) => {
    if (alignment === 'left') return 'text-left';
    if (alignment === 'right') return 'text-right';
    return 'text-center'; // default
};

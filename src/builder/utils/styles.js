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

    const pt = settings.paddingTop !== undefined ? settings.paddingTop : (type === 'Hero' ? 128 : 80);
    const pb = settings.paddingBottom !== undefined ? settings.paddingBottom : (type === 'Hero' ? 128 : 80);

    return {
        backgroundColor: (isImage || isVideo) ? 'transparent' : bgColor,
        backgroundImage: isImage && bgUrl ? `url(${bgUrl})` : 'none',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        color: settings.textColor || '#0f172a',
        position: 'relative',
        paddingTop: `${pt}px`,
        paddingBottom: `${pb}px`
    };
};

export const getAlignmentClass = (alignment) => {
    if (alignment === 'left') return 'text-left';
    if (alignment === 'right') return 'text-right';
    return 'text-center'; // default
};

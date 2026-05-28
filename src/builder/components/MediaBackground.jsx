import React from 'react';

export default function MediaBackground({ settings }) {
    const isVideo = settings.backgroundType === 'video';
    const isImage = settings.backgroundType === 'image';
    const bgUrl = settings.backgroundUrl;
    
    // Default to 40% if image/video, 0 otherwise
    const overlayOpacity = settings.overlayOpacity !== undefined ? settings.overlayOpacity : (isImage || isVideo ? 40 : 0);
    const filterBlur = settings.filterBlur || 0;

    if (!isVideo && !isImage) return null;

    return (
        <>
            {isVideo && bgUrl && (
                <video autoPlay loop muted playsInline className="absolute inset-0 w-full h-full object-cover z-0">
                    <source src={bgUrl} type="video/mp4" />
                </video>
            )}
            <div 
                className="absolute inset-0 bg-black z-0 pointer-events-none" 
                style={{ 
                    opacity: overlayOpacity / 100,
                    backdropFilter: filterBlur > 0 ? `blur(${filterBlur}px)` : 'none'
                }}
            ></div>
        </>
    );
}

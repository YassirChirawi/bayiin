import React from 'react';
import { motion } from 'framer-motion';
import DOMPurify from 'dompurify';

export default function BlockText({ block, theme, animProps, className = '', style = {} }) {
    const combinedStyle = {
        color: block.settings.textColor,
        fontFamily: block.settings.fontFamily ? `'${block.settings.fontFamily}', sans-serif` : undefined,
        ...style
    };

    switch (block.type) {
        case 'Heading':
            return (
                <motion.h1 
                    {...animProps} 
                    className={`font-black tracking-tight leading-tight w-full ${block.settings.fontSize ? `text-${block.settings.fontSize}` : 'text-4xl md:text-6xl'} ${className}`} 
                    style={combinedStyle}
                >
                    {block.settings.text}
                </motion.h1>
            );
        
        case 'Subtitle':
            return (
                <motion.h2 
                    {...animProps} 
                    className={`font-medium opacity-90 w-full ${block.settings.fontSize ? `text-${block.settings.fontSize}` : 'text-xl md:text-2xl'} ${className}`} 
                    style={combinedStyle}
                >
                    {block.settings.text}
                </motion.h2>
            );
        
        case 'Text':
            return (
                <motion.p 
                    {...animProps} 
                    className={`opacity-80 w-full leading-relaxed ${block.settings.fontSize ? `text-${block.settings.fontSize}` : 'text-base'} ${className}`} 
                    style={combinedStyle}
                >
                    {block.settings.text}
                </motion.p>
            );

        case 'HTML':
            return (
                <motion.div 
                    {...animProps} 
                    className={`w-full ${className}`} 
                    dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(block.settings.code || '') }} 
                />
            );

        default:
            return null;
    }
}

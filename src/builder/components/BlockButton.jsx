import React from 'react';
import { motion } from 'framer-motion';
import * as LucideIcons from 'lucide-react';
import { useCart } from '../../context/CartContext';

const DynamicIcon = ({ name, size = 20, className }) => {
    if (!name) return null;
    const IconComponent = LucideIcons[name];
    if (!IconComponent) return null;
    return <IconComponent size={size} className={className} />;
};

const getButtonStyleClass = (style) => {
    if (style === 'sharp') return 'rounded-none';
    if (style === 'pill') return 'rounded-full';
    return 'rounded-xl';
};

const getButtonVariantStyle = (variant, blockSettings, theme) => {
    const baseColor = blockSettings.backgroundColor || theme?.primaryColor || '#4f46e5';
    const textColor = blockSettings.textColor || '#ffffff';

    switch (variant) {
        case 'outline':
            return {
                backgroundColor: 'transparent',
                color: baseColor,
                border: `2px solid ${baseColor}`,
            };
        case 'ghost':
            return {
                backgroundColor: 'transparent',
                color: baseColor,
            };
        case 'glow':
            return {
                backgroundColor: baseColor,
                color: textColor,
                boxShadow: `0 0 15px ${baseColor}80, 0 0 30px ${baseColor}40`,
            };
        case 'solid':
        default:
            return {
                backgroundColor: baseColor,
                color: textColor,
            };
    }
};

export default function BlockButton({ block, theme, animProps, onClick }) {
    const variantStyle = getButtonVariantStyle(block.settings.variant, block.settings, theme);
    const { addToCart, openCartDrawer } = useCart();
    
    const handleClick = (e) => {
        const label = block.settings.label?.toLowerCase() || '';
        if (label.includes('commander') || label.includes('acheter') || label.includes('panier')) {
            addToCart({
                id: 'demo-product-' + Math.random().toString(36).substr(2, 9),
                name: 'Produit Démo Premium',
                price: 249,
                quantity: 1,
                image: 'https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=200&q=80'
            });
            openCartDrawer();
        }
        if (onClick) onClick(e);
    };

    return (
        <motion.div {...animProps} className="pt-4 w-full">
            <button 
                onClick={handleClick}
                className={`flex items-center justify-center gap-2 px-8 py-4 font-bold transition-all hover:scale-105 active:scale-95 w-full md:w-auto ${getButtonStyleClass(block.settings.style)}`}
                style={variantStyle}
            >
                <DynamicIcon name={block.settings.icon} size={20} />
                {block.settings.label}
            </button>
        </motion.div>
    );
}

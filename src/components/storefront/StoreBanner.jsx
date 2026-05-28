import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function StoreBanner({ text, enabled, primaryColor }) {
    return (
        <AnimatePresence>
            {enabled && text && (
                <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="w-full text-white text-center py-2 px-4 text-sm font-medium tracking-wide"
                    style={{ backgroundColor: primaryColor || '#4f46e5' }}
                >
                    {text}
                </motion.div>
            )}
        </AnimatePresence>
    );
}

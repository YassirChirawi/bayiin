import React from 'react';
import { Sparkles, Lock } from 'lucide-react';
import { motion } from 'framer-motion';
import { useTenant } from '../context/TenantContext';

export default function ProFeatureGuard({ children, title }) {
    const { store } = useTenant();

    // Bypass for testers
    if (store?.testerMode) {
        return <>{children}</>;
    }

    return (
        <div className="relative">
            {/* PRO Banner */}
            <motion.div 
                initial={{ y: -20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                className="mb-6 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl p-4 text-white shadow-lg shadow-indigo-200 flex flex-col sm:flex-row items-center justify-between gap-4"
            >
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-white/20 rounded-lg">
                        <Sparkles className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <h3 className="font-bold text-sm sm:text-base">🚀 Mode Aperçu {title ? `— ${title}` : ''}</h3>
                        <p className="text-xs text-white/80">Cette fonctionnalité est réservée aux comptes PRO. Vous explorez actuellement la version démo.</p>
                    </div>
                </div>
                <button className="px-4 py-2 bg-white text-indigo-600 text-xs font-bold rounded-xl shadow-sm hover:bg-indigo-50 transition-colors whitespace-nowrap">
                    Passer au plan PRO
                </button>
            </motion.div>

            {/* Content with subtle restriction overlay if needed, or just the content */}
            <div className="relative group">
                {children}
            </div>
        </div>
    );
}

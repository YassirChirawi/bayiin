import { motion, AnimatePresence } from "framer-motion";
import { Link } from "react-router-dom";
import { ArrowRight, Sparkles } from "lucide-react";
import { useState, useEffect } from "react";
import { useLanguage } from "../../context/LanguageContext";

export default function FloatingCTA() {
    const { t } = useLanguage();
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        const handleScroll = () => {
            // Show CTA after scrolling past the hero section (~600px)
            if (window.scrollY > 600) {
                setIsVisible(true);
            } else {
                setIsVisible(false);
            }
        };

        window.addEventListener("scroll", handleScroll);
        return () => window.removeEventListener("scroll", handleScroll);
    }, []);

    return (
        <AnimatePresence>
            {isVisible && (
                <motion.div
                    initial={{ y: 100, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: 100, opacity: 0 }}
                    transition={{ type: "spring", stiffness: 260, damping: 20 }}
                    className="fixed bottom-6 left-0 right-0 z-50 flex justify-center px-4 pointer-events-none"
                >
                    <div className="bg-slate-900/80 backdrop-blur-xl border border-white/10 p-2 pl-6 rounded-full shadow-2xl flex items-center gap-6 pointer-events-auto max-w-2xl w-full sm:w-auto">
                        <div className="hidden sm:block text-white">
                            <div className="text-sm font-bold flex items-center gap-2">
                                <Sparkles className="w-4 h-4 text-amber-400" /> 
                                {t('hero_cta_start') || "Prêt à scaler votre business ?"}
                            </div>
                            <div className="text-xs text-slate-400">1 mois d'essai gratuit • Sans CB</div>
                        </div>
                        <div className="flex-1 sm:flex-none flex gap-2 w-full">
                            <Link 
                                to="/signup" 
                                className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white px-6 py-3 rounded-full font-bold transition-all shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40"
                            >
                                Créer ma boutique <ArrowRight className="w-4 h-4" />
                            </Link>
                        </div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}

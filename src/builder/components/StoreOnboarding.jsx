import React from 'react';
import { motion } from 'framer-motion';
import { Wand2, LayoutTemplate, PenTool } from 'lucide-react';

export default function StoreOnboarding({ onGenerateAI, onOpenTemplates, onStartFromScratch, isGenerating }) {
    return (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-slate-50 overflow-hidden">
            <div className="absolute top-0 inset-x-0 h-64 bg-gradient-to-b from-indigo-100/50 to-transparent"></div>
            
            <div className="relative z-10 max-w-4xl w-full mx-6 px-4">
                <div className="text-center mb-12">
                    <h1 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tight mb-4">
                        Créons votre vitrine de rêve. ✨
                    </h1>
                    <p className="text-lg text-slate-600 max-w-2xl mx-auto">
                        Ne vous bloquez pas devant une page blanche. Choisissez votre point de départ préféré pour construire une boutique qui convertit.
                    </p>
                </div>

                <div className="grid md:grid-cols-3 gap-6">
                    {/* Option IA */}
                    <motion.div 
                        whileHover={{ y: -5 }}
                        className="bg-white rounded-3xl p-6 shadow-xl shadow-indigo-900/5 border border-indigo-100 flex flex-col h-full cursor-pointer group"
                        onClick={isGenerating ? undefined : onGenerateAI}
                    >
                        <div className="w-14 h-14 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                            <Wand2 size={28} />
                        </div>
                        <h3 className="text-xl font-bold text-slate-900 mb-3">La Magie de l'IA (Beya3)</h3>
                        <p className="text-slate-500 mb-8 flex-1 text-sm">
                            Notre IA génère instantanément une structure complète (bannières, textes, grille) adaptée à votre nom de boutique.
                        </p>
                        <button disabled={isGenerating} className="w-full py-3 bg-indigo-600 text-white rounded-xl font-bold group-hover:bg-indigo-700 transition-colors disabled:opacity-50">
                            {isGenerating ? "Génération..." : "Générer en 1 clic"}
                        </button>
                    </motion.div>

                    {/* Option Template */}
                    <motion.div 
                        whileHover={{ y: -5 }}
                        className="bg-white rounded-3xl p-6 shadow-xl shadow-slate-900/5 border border-slate-200 flex flex-col h-full cursor-pointer group"
                        onClick={onOpenTemplates}
                    >
                        <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                            <LayoutTemplate size={28} />
                        </div>
                        <h3 className="text-xl font-bold text-slate-900 mb-3">Galerie de Modèles</h3>
                        <p className="text-slate-500 mb-8 flex-1 text-sm">
                            Parcourez nos modèles pré-conçus optimisés pour la conversion et importez celui qui vous plaît.
                        </p>
                        <button className="w-full py-3 bg-emerald-50 text-emerald-700 rounded-xl font-bold group-hover:bg-emerald-100 transition-colors">
                            Parcourir les thèmes
                        </button>
                    </motion.div>

                    {/* Option Zéro */}
                    <motion.div 
                        whileHover={{ y: -5 }}
                        className="bg-white rounded-3xl p-6 shadow-xl shadow-slate-900/5 border border-slate-200 flex flex-col h-full cursor-pointer group"
                        onClick={onStartFromScratch}
                    >
                        <div className="w-14 h-14 bg-slate-50 text-slate-600 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                            <PenTool size={28} />
                        </div>
                        <h3 className="text-xl font-bold text-slate-900 mb-3">Commencer de Zéro</h3>
                        <p className="text-slate-500 mb-8 flex-1 text-sm">
                            Un canevas vierge pour les esprits créatifs. Nous vous guiderons pas à pas pour construire la page parfaite.
                        </p>
                        <button className="w-full py-3 bg-slate-50 text-slate-700 border border-slate-200 rounded-xl font-bold group-hover:bg-slate-100 transition-colors">
                            Je gère moi-même
                        </button>
                    </motion.div>
                </div>
            </div>
        </div>
    );
}

import { useState, useEffect } from 'react';
import { generateStockForecast } from '../services/aiService';
import { Sparkles, TrendingUp, AlertTriangle, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function ForecastingWidget({ products, orders }) {
    const [forecast, setForecast] = useState([]);
    const [loading, setLoading] = useState(false);

    const handleRunForecast = async () => {
        if (!products || products.length === 0) return;
        setLoading(true);
        const results = await generateStockForecast(products, orders);
        setForecast(results);
        setLoading(false);
    };

    // Removed auto-run to save Gemini Free API quota
    // useEffect(() => {
    //     if (products && products.length > 0 && forecast.length === 0) {
    //         handleRunForecast();
    //     }
    // }, [products]);

    return (
        <div className="bg-white rounded-3xl border border-gray-100 shadow-xl overflow-hidden flex flex-col h-full min-h-[400px]">
            <div className="p-6 border-b border-gray-50 flex items-center justify-between bg-gradient-to-r from-indigo-50/50 to-white">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-100">
                        <Sparkles className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <h2 className="text-lg font-black text-gray-900 tracking-tight">IA Prévisions</h2>
                        <p className="text-[10px] text-indigo-600 font-bold uppercase tracking-widest">Analyse de Rupture</p>
                    </div>
                </div>
                <button
                    onClick={handleRunForecast}
                    disabled={loading}
                    title="Actualiser les prévisions"
                    className="p-2 hover:bg-white rounded-xl transition-all shadow-sm border border-gray-100 disabled:opacity-50 group hover:scale-110"
                >
                    <TrendingUp className={`w-4 h-4 text-indigo-600 ${loading ? 'animate-pulse' : 'group-hover:rotate-12 transition-transform'}`} />
                </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-4 custom-scrollbar">
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-20 gap-4">
                        <div className="relative">
                            <motion.div
                                animate={{ rotate: 360 }}
                                transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
                                className="w-14 h-14 border-4 border-indigo-50 border-t-indigo-600 rounded-full shadow-inner"
                            />
                            <Sparkles className="w-4 h-4 text-indigo-400 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-pulse" />
                        </div>
                        <p className="text-xs font-black text-gray-300 uppercase tracking-widest animate-pulse">L'IA calcule le Run Rate...</p>
                    </div>
                ) : forecast.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 text-center">
                        <div className="w-16 h-16 bg-indigo-50 rounded-full flex items-center justify-center mb-4">
                            <AlertTriangle className="w-8 h-8 text-indigo-300" />
                        </div>
                        <p className="text-sm text-gray-500 font-bold px-6 leading-relaxed">
                            L'IA est en veille pour économiser les ressources.
                        </p>
                        <p className="text-xs text-gray-400 mt-2 px-6">
                            Cliquez sur le bouton ci-dessous pour analyser vos historiques et prédire les ruptures de stock.
                        </p>
                        <button onClick={handleRunForecast} className="mt-5 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-md transition-all flex items-center gap-2">
                            <Sparkles className="w-4 h-4" /> Lancer l'analyse (AI)
                        </button>
                    </div>
                ) : (
                    <AnimatePresence>
                        {forecast.map((f, i) => (
                            <motion.div
                                key={f.sku + i}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: i * 0.08 }}
                                className={`p-4 rounded-2xl border ${f.urgency === 'Haut' ? 'bg-rose-50/40 border-rose-100 shadow-sm shadow-rose-100/50' : 'bg-amber-50/40 border-amber-100 shadow-sm shadow-amber-100/50'}`}
                            >
                                <div className="flex justify-between items-center mb-2.5">
                                    <div className="flex items-center gap-2">
                                        <div className={`w-2 h-2 rounded-full ${f.urgency === 'Haut' ? 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.6)]' : 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.6)]'}`} />
                                        <span className="font-black text-xs text-gray-900 tracking-tight">{f.sku}</span>
                                    </div>
                                    <span className={`text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest ${f.urgency === 'Haut' ? 'bg-rose-600 text-white' : 'bg-amber-600 text-white'}`}>
                                        {f.urgency}
                                    </span>
                                </div>
                                <p className="text-[11px] text-gray-600 font-semibold leading-relaxed mb-3 italic opacity-90">
                                    “ {f.rationale} ”
                                </p>
                                <div className="flex items-center justify-between border-t border-gray-200/40 pt-2.5">
                                    <div className="text-[9px] text-gray-400 uppercase font-black tracking-tight">Réappro. suggéré</div>
                                    <div className="flex items-center gap-1.5 font-black text-indigo-700 text-xs">
                                        +{f.suggestedQuantity} unités
                                        <ArrowRight className="w-3 h-3" />
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </AnimatePresence>
                )}
            </div>

            <div className="p-4 bg-gray-50/30 border-t border-gray-100">
                <div className="flex items-center gap-2 justify-center">
                    <div className="w-1.5 h-1.5 rounded-full bg-indigo-200" />
                    <p className="text-[9px] text-gray-400 font-bold uppercase tracking-tight">
                        AI Model: Llama 3.1 (Groq)
                    </p>
                    <div className="w-1.5 h-1.5 rounded-full bg-indigo-200" />
                </div>
            </div>
        </div>
    );
}


import { useState, useEffect, useMemo } from 'react';
import { Sparkles, AlertTriangle, Ghost, TrendingDown, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';
import { detectFinancialLeaks } from '../services/aiService';
import { Link } from 'react-router-dom';

export default function Beya3Insights({ orders, storeStats }) {
    const [leaks, setLeaks] = useState(null);

    useEffect(() => {
        if (orders && orders.length > 0) {
            // Suppose an average CAC of 50 DH for leak detection 
            const result = detectFinancialLeaks(orders, 50);
            setLeaks(result);
        }
    }, [orders]);

    const returnRateAlert = useMemo(() => {
        if (!storeStats || !storeStats.statusCounts || !storeStats.totals) return null;
        const sCounts = storeStats.statusCounts;
        const returnCount = sCounts['retour'] || 0;
        const totalCount = storeStats.totals.count || 1;
        const rate = (returnCount / totalCount) * 100;
        
        // Custom rule: Alert if return rate > 15% and we have at least 5 returns
        if (rate > 15 && returnCount >= 5) {
            return `Alerte de trafic : Le taux de retour global a dépassé le seuil de sécurité (${rate.toFixed(1)}%). Nous vous conseillons de réévaluer le ciblage de vos publicités Meta ou de vérifier la qualité de la livraison avec votre transporteur.`;
        }
        return null;
    }, [storeStats]);

    const hasAlerts = (leaks?.hasLeaks || returnRateAlert);

    if (!hasAlerts) {
        return null; // Don't show anything if perfect
    }

    return (
        <motion.div 
            initial={{ opacity: 0, y: -20, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ type: 'spring', stiffness: 200, damping: 20 }}
            className="mb-8 bg-gradient-to-r from-rose-50 to-orange-50 border border-rose-200 rounded-2xl p-6 shadow-sm relative overflow-hidden"
        >
            <div className="absolute -top-12 -right-12 text-rose-100 opacity-50 rotate-12 pointer-events-none">
                <Sparkles className="w-64 h-64" />
            </div>

            <div className="relative z-10">
                <div className="flex items-center gap-3 mb-5">
                    <div className="bg-rose-500 rounded-xl p-2.5 shadow-lg shadow-rose-200">
                        <Sparkles className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-rose-900 tracking-tight">Beya3 Insights — Interventions Requises</h2>
                        <p className="text-sm text-rose-700 font-medium">L'IA a détecté des anomalies financières dans vos flux récents.</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {leaks?.ghostOrders?.length > 0 && (
                        <div className="bg-white/80 backdrop-blur-sm p-4 rounded-xl border border-rose-100 placeholder-opacity-50 hover:shadow-md transition-all group">
                            <div className="flex items-center gap-2 mb-2 text-rose-800 font-black tracking-tight text-sm">
                                <Ghost className="w-5 h-5" /> Commandes Fantômes ({leaks.ghostOrders.length})
                            </div>
                            <p className="text-xs text-rose-600 mb-3 font-medium">Livrées depuis +15 jours mais non encaissées.</p>
                            <div className="space-y-1.5 mb-3">
                                {leaks.ghostOrders.slice(0,3).map(o => (
                                    <div key={o.id} className="text-xs flex justify-between items-center bg-white p-1.5 rounded-lg border border-gray-50">
                                        <span className="font-mono text-gray-500 font-bold text-[10px]">#{o.reference}</span>
                                        <span className="font-bold text-rose-700">{o.amount.toFixed(2)} DH</span>
                                    </div>
                                ))}
                                {leaks.ghostOrders.length > 3 && (
                                    <div className="text-center text-[10px] text-rose-400 font-bold tracking-widest uppercase mt-2">
                                        + {leaks.ghostOrders.length - 3} autres
                                    </div>
                                )}
                            </div>
                            <Link to="/finances" className="text-[11px] font-bold text-rose-600 hover:text-rose-800 flex items-center justify-end gap-1 uppercase tracking-wider">
                                Réconcilier <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
                            </Link>
                        </div>
                    )}

                    {leaks?.negativeMargins?.length > 0 && (
                        <div className="bg-white/80 backdrop-blur-sm p-4 rounded-xl border border-rose-100 hover:shadow-md transition-all group">
                            <div className="flex items-center gap-2 mb-2 text-rose-800 font-black tracking-tight text-sm">
                                <TrendingDown className="w-5 h-5" /> Marges Négatives ({leaks.negativeMargins.length})
                            </div>
                            <p className="text-xs text-rose-600 mb-3 font-medium">Le coût global d'acquisition et livraison dépasse le prix payé.</p>
                            <div className="space-y-1.5 mb-3">
                                {leaks.negativeMargins.slice(0,3).map(o => (
                                    <div key={o.id} className="text-xs flex justify-between items-center bg-white p-1.5 rounded-lg border border-gray-50">
                                        <span className="font-mono text-gray-500 font-bold text-[10px]">#{o.reference}</span>
                                        <span className="font-bold text-rose-700 uppercase bg-rose-50 px-1.5 py-0.5 rounded">Perte: {o.loss} DH</span>
                                    </div>
                                ))}
                            </div>
                            <Link to="/orders" className="text-[11px] font-bold text-rose-600 hover:text-rose-800 flex items-center justify-end gap-1 uppercase tracking-wider">
                                Voir les coûts <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
                            </Link>
                        </div>
                    )}

                    {returnRateAlert && (
                        <div className="bg-white/80 backdrop-blur-sm p-4 rounded-xl border border-rose-100 md:col-span-2 lg:col-span-1 flex flex-col justify-between">
                            <div>
                                <div className="flex items-center gap-2 mb-2 text-rose-800 font-black tracking-tight text-sm">
                                    <AlertTriangle className="w-5 h-5" /> Taux de Retour Élevé
                                </div>
                                <p className="text-xs font-semibold text-rose-700 leading-relaxed text-justify mb-3">
                                    {returnRateAlert}
                                </p>
                            </div>
                            <Link to="/analytics" className="text-[11px] font-bold text-rose-600 hover:text-rose-800 flex items-center gap-1 uppercase tracking-wider bg-rose-50 px-3 py-2 rounded-lg justify-center transition-colors">
                                Analyser par ville <ArrowRight className="w-3 h-3" />
                            </Link>
                        </div>
                    )}
                </div>
            </div>
        </motion.div>
    );
}

import { useMemo } from 'react';
import { getAtRiskProducts } from '../utils/stockPrediction';
import { Sparkles, AlertTriangle, ArrowRight, Package } from 'lucide-react';
import { motion } from 'framer-motion';

export default function LocalPredictionWidget({ products, orders }) {
    const atRisk = useMemo(() => {
        return getAtRiskProducts(products || [], orders || []);
    }, [products, orders]);

    if (!products?.length || !orders?.length) return null;

    return (
        <div className="bg-white rounded-3xl border border-gray-100 shadow-xl overflow-hidden flex flex-col h-full">
            <div className="p-6 border-b border-gray-50 bg-gradient-to-r from-amber-50/30 to-white">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-amber-500 flex items-center justify-center shadow-lg shadow-amber-100">
                        <Sparkles className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <h2 className="text-lg font-black text-gray-900 tracking-tight">Beya3 Predict</h2>
                        <p className="text-[10px] text-amber-600 font-bold uppercase tracking-widest">Algorithme Run Rate</p>
                    </div>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-4 max-h-[400px]">
                {atRisk.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-10 text-center">
                        <div className="w-12 h-12 bg-emerald-50 rounded-full flex items-center justify-center mb-3">
                            <Package className="w-6 h-6 text-emerald-400" />
                        </div>
                        <p className="text-sm text-gray-500 font-bold px-4">
                            Aucune rupture prévue dans les 7 prochains jours.
                        </p>
                        <p className="text-xs text-gray-400 mt-1">
                            Vos stocks sont stables selon le rythme actuel des ventes.
                        </p>
                    </div>
                ) : (
                    atRisk.slice(0, 5).map(({ product, prediction }, i) => (
                        <motion.div
                            key={product.id}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: i * 0.1 }}
                            className={`p-4 rounded-2xl border ${prediction.isCritical ? 'bg-red-50/40 border-red-100' : 'bg-amber-50/40 border-amber-100'}`}
                        >
                            <div className="flex justify-between items-start mb-2">
                                <div className="min-w-0">
                                    <h3 className="font-bold text-sm text-gray-900 truncate">{product.name}</h3>
                                    <p className="text-[10px] text-gray-500">Stock actuel : <span className="font-bold">{product.stock}</span></p>
                                </div>
                                <div className={`text-[10px] font-black px-2 py-0.5 rounded-full uppercase ${prediction.isCritical ? 'bg-red-600 text-white' : 'bg-amber-600 text-white'}`}>
                                    {prediction.daysLeft === 0 ? 'RUPTURE' : `${prediction.daysLeft} JOURS`}
                                </div>
                            </div>
                            
                            <div className="flex items-center gap-2 mb-3">
                                <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                                    <div 
                                        className={`h-full rounded-full ${prediction.isCritical ? 'bg-red-500' : 'bg-amber-500'}`}
                                        style={{ width: `${Math.max(10, (prediction.daysLeft / 7) * 100)}%` }}
                                    />
                                </div>
                                <span className="text-[10px] font-bold text-gray-400">{prediction.dailyRate}/j</span>
                            </div>

                            <div className="flex items-center justify-between border-t border-gray-200/40 pt-2">
                                <div className="text-[9px] text-gray-400 uppercase font-black">Besoin (30j)</div>
                                <div className="flex items-center gap-1 font-black text-indigo-700 text-xs">
                                    +{prediction.recommendedOrder} unités
                                    <ArrowRight className="w-3 h-3" />
                                </div>
                            </div>
                        </motion.div>
                    ))
                )}
            </div>

            <div className="p-4 bg-gray-50/30 border-t border-gray-100">
                <p className="text-[9px] text-gray-400 font-bold uppercase tracking-tight text-center">
                    Basé sur les 30 derniers jours d'activité
                </p>
            </div>
        </div>
    );
}

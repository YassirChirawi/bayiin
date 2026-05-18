import { useState, useEffect, useMemo } from 'react';
import { getAtRiskProducts } from '../utils/stockPrediction';
import { Sparkles, X, AlertTriangle, ArrowRight, Package, TrendingDown, ShoppingCart } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLanguage } from '../context/LanguageContext';
import { useNavigate } from 'react-router-dom';

export default function StockOptimizerModal({ isOpen, onClose, products, orders }) {
    const { t } = useLanguage();
    const navigate = useNavigate();

    const atRisk = useMemo(() => {
        return getAtRiskProducts(products || [], orders || []);
    }, [products, orders]);

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-50 overflow-y-auto">
                <div className="flex min-h-screen items-center justify-center p-4 text-center sm:p-0">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
                        onClick={onClose}
                    />

                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        className="relative transform overflow-hidden rounded-2xl bg-white text-left shadow-xl transition-all sm:my-8 w-full sm:max-w-2xl border border-rose-100"
                    >
                        <div className="bg-gradient-to-r from-rose-500 to-pink-600 px-6 py-4 flex items-center justify-between shadow-sm">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center border border-white/30 shadow-inner">
                                    <Sparkles className="h-5 w-5 text-yellow-300" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-white tracking-tight">Beya3 AI Stock Optimizer</h3>
                                    <p className="text-xs font-medium text-rose-100">Analyse de vélocité et prédiction de rupture</p>
                                </div>
                            </div>
                            <button
                                onClick={onClose}
                                className="rounded-full p-2 text-white/80 hover:bg-white/10 hover:text-white focus:outline-none transition-colors"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <div className="bg-slate-50 p-6 max-h-[60vh] overflow-y-auto">
                            {atRisk.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-12 text-center bg-white rounded-xl shadow-sm border border-emerald-100">
                                    <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mb-4">
                                        <Package className="w-8 h-8 text-emerald-500" />
                                    </div>
                                    <h3 className="text-lg font-bold text-emerald-900 mb-2">
                                        Votre catalogue est en pleine forme !
                                    </h3>
                                    <p className="text-sm text-emerald-700 max-w-sm">
                                        Aucun de vos produits n'est actuellement menacé de rupture de stock selon l'algorithme de prédiction Beya3.
                                    </p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4 flex items-start gap-3">
                                        <div className="bg-indigo-100 p-2 rounded-lg">
                                            <TrendingDown className="w-5 h-5 text-indigo-700" />
                                        </div>
                                        <div>
                                            <h4 className="text-sm font-bold text-indigo-900">Aperçu Stratégique</h4>
                                            <p className="text-xs text-indigo-800 mt-1">
                                                Beya3 a identifié <span className="font-black">{atRisk.length} produit(s)</span> avec un risque de rupture imminent basé sur les ventes des 30 derniers jours. 
                                                Il est recommandé de réapprovisionner ces références pour éviter une perte de chiffre d'affaires.
                                            </p>
                                        </div>
                                    </div>

                                    {atRisk.map(({ product, prediction }, i) => (
                                        <motion.div
                                            key={product.id}
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: i * 0.1 }}
                                            className={`p-5 rounded-xl border shadow-sm flex flex-col sm:flex-row gap-4 items-center justify-between ${
                                                prediction.isCritical ? 'bg-red-50 border-red-200' : 'bg-amber-50 border-amber-200'
                                            }`}
                                        >
                                            <div className="flex items-center gap-4 w-full sm:w-auto flex-1">
                                                <div className={`w-12 h-12 rounded-lg flex items-center justify-center shadow-sm ${
                                                    prediction.isCritical ? 'bg-red-100 text-red-600' : 'bg-amber-100 text-amber-600'
                                                }`}>
                                                    <AlertTriangle className="w-6 h-6" />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2">
                                                        <h4 className="font-bold text-gray-900 truncate text-sm">{product.name}</h4>
                                                        <span className={`text-[10px] font-black px-2 py-0.5 rounded-full uppercase ${
                                                            prediction.isCritical ? 'bg-red-600 text-white' : 'bg-amber-500 text-white'
                                                        }`}>
                                                            {prediction.daysLeft === 0 ? 'RUPTURE' : `${prediction.daysLeft} Jours`}
                                                        </span>
                                                    </div>
                                                    <div className="flex items-center gap-4 mt-2">
                                                        <p className="text-xs text-gray-600">Stock: <span className="font-bold">{product.stock}</span></p>
                                                        <p className="text-xs text-gray-600">Vélocité: <span className="font-bold">{prediction.dailyRate}/j</span></p>
                                                    </div>
                                                    
                                                    {/* Progress bar */}
                                                    <div className="mt-3 h-1.5 w-full bg-white rounded-full overflow-hidden border border-gray-200/50">
                                                        <div 
                                                            className={`h-full ${prediction.isCritical ? 'bg-red-500' : 'bg-amber-500'}`}
                                                            style={{ width: `${Math.max(5, (prediction.daysLeft / 7) * 100)}%` }}
                                                        />
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="flex flex-col items-center sm:items-end w-full sm:w-auto gap-2 border-t sm:border-t-0 sm:border-l border-gray-200/50 pt-3 sm:pt-0 sm:pl-4">
                                                <div className="text-center sm:text-right">
                                                    <p className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">Restock Recommandé</p>
                                                    <p className="text-lg font-black text-indigo-700">+{prediction.recommendedOrder}</p>
                                                </div>
                                            </div>
                                        </motion.div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="bg-white px-6 py-4 border-t border-gray-100 flex flex-col sm:flex-row justify-between items-center gap-4">
                            <p className="text-xs text-gray-400 font-medium">
                                Les prévisions sont calculées automatiquement en temps réel.
                            </p>
                            <div className="flex gap-3 w-full sm:w-auto">
                                <button
                                    onClick={onClose}
                                    className="flex-1 sm:flex-none px-4 py-2 border border-gray-300 rounded-lg shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none transition-colors"
                                >
                                    Fermer
                                </button>
                                {atRisk.length > 0 && (
                                    <button
                                        onClick={() => {
                                            onClose();
                                            navigate('/purchases');
                                        }}
                                        className="flex-1 sm:flex-none px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none transition-colors flex items-center justify-center gap-2"
                                    >
                                        <ShoppingCart className="w-4 h-4" /> Commander le stock
                                    </button>
                                )}
                            </div>
                        </div>
                    </motion.div>
                </div>
            </div>
        </AnimatePresence>
    );
}

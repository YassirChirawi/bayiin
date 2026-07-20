import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Truck, AlertTriangle, CheckCircle, Clock, DollarSign, ChevronDown, ChevronUp, Check } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import toast from 'react-hot-toast';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useTenant } from '../../context/TenantContext';

const ALERT_THRESHOLD_DAYS = 7;

/**
 * CODReconciliation — Dashboard de rapprochement Cash-On-Delivery
 * 
 * Affiche :
 * - KPIs : Argent en transit, Dû par livreurs, Encaissé
 * - Tableau par livreur/transporteur avec montants et alertes de retard
 * - Actions de marquage "reçu" (paymentStatus: 'remitted')
 */
export default function CODReconciliation({ orders = [] }) {
    const { t } = useLanguage();
    const { store } = useTenant();
    const [expandedDriver, setExpandedDriver] = useState(null);
    const [markingIds, setMarkingIds] = useState(new Set());

    // Filter delivered but unremitted orders (COD orders awaiting payment collection)
    const codData = useMemo(() => {
        const delivered = orders.filter(o => 
            o.status === 'livré' && 
            !o.deleted
        );

        const inTransit = orders.filter(o => 
            ['livraison', 'ramassage'].includes(o.status) && 
            !o.deleted
        );

        const remitted = delivered.filter(o => o.paymentStatus === 'remitted' || o.isPaid);
        const unremitted = delivered.filter(o => o.paymentStatus !== 'remitted' && !o.isPaid);

        // Group unremitted by driver/carrier
        const byDriver = {};
        unremitted.forEach(order => {
            const driverKey = order.driverName || order.carrierName || order.carrier || 'Non assigné';
            if (!byDriver[driverKey]) {
                byDriver[driverKey] = {
                    name: driverKey,
                    orders: [],
                    totalAmount: 0,
                    oldestDeliveryDate: null,
                    daysOverdue: 0,
                };
            }
            const orderAmount = (parseFloat(order.price) || 0) * (parseInt(order.quantity) || 1);
            byDriver[driverKey].orders.push(order);
            byDriver[driverKey].totalAmount += orderAmount;

            // Track oldest delivery
            const deliveryDate = order.deliveredAt || order.updatedAt || order.date;
            if (deliveryDate) {
                const dDate = new Date(deliveryDate);
                if (!byDriver[driverKey].oldestDeliveryDate || dDate < byDriver[driverKey].oldestDeliveryDate) {
                    byDriver[driverKey].oldestDeliveryDate = dDate;
                }
            }
        });

        // Calculate days overdue for each driver
        const now = new Date();
        Object.values(byDriver).forEach(driver => {
            if (driver.oldestDeliveryDate) {
                driver.daysOverdue = Math.floor((now - driver.oldestDeliveryDate) / (1000 * 60 * 60 * 24));
            }
        });

        // Sort by amount descending
        const driverList = Object.values(byDriver).sort((a, b) => b.totalAmount - a.totalAmount);

        // KPI totals
        const totalInTransit = inTransit.reduce((sum, o) => sum + (parseFloat(o.price) || 0) * (parseInt(o.quantity) || 1), 0);
        const totalUnremitted = unremitted.reduce((sum, o) => sum + (parseFloat(o.price) || 0) * (parseInt(o.quantity) || 1), 0);
        const totalRemitted = remitted.reduce((sum, o) => sum + (parseFloat(o.price) || 0) * (parseInt(o.quantity) || 1), 0);

        return {
            totalInTransit,
            totalUnremitted,
            totalRemitted,
            inTransitCount: inTransit.length,
            unremittedCount: unremitted.length,
            remittedCount: remitted.length,
            driverList,
            alertCount: driverList.filter(d => d.daysOverdue >= ALERT_THRESHOLD_DAYS).length,
        };
    }, [orders]);

    // Mark orders as remitted
    const markAsRemitted = async (orderIds) => {
        if (!store?.id) return;
        setMarkingIds(prev => new Set([...prev, ...orderIds]));
        
        try {
            const promises = orderIds.map(id => {
                const orderRef = doc(db, "orders", id);
                return updateDoc(orderRef, {
                    paymentStatus: 'remitted',
                    isPaid: true,
                    remittedAt: new Date().toISOString(),
                    _updatedBy: 'cod_reconciliation'
                });
            });
            await Promise.all(promises);
            toast.success(`${orderIds.length} commande(s) marquée(s) comme reçue(s) ✅`);
        } catch (err) {
            console.error('Failed to mark as remitted:', err);
            toast.error('Erreur lors de la mise à jour');
        } finally {
            setMarkingIds(prev => {
                const next = new Set(prev);
                orderIds.forEach(id => next.delete(id));
                return next;
            });
        }
    };

    const currency = store?.currency || 'MAD';

    return (
        <div className="space-y-6">
            {/* KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* In Transit */}
                <motion.div 
                    initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                    className="bg-gradient-to-br from-blue-50 to-white border border-blue-100 rounded-xl p-5 shadow-sm"
                >
                    <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                            <Truck className="w-5 h-5 text-blue-600" />
                        </div>
                        <span className="text-sm font-medium text-blue-700">En Transit</span>
                    </div>
                    <p className="text-2xl font-black text-gray-900">{codData.totalInTransit.toLocaleString('fr-FR')} <span className="text-sm font-normal text-gray-500">{currency}</span></p>
                    <p className="text-xs text-blue-600 mt-1">{codData.inTransitCount} commande(s) en livraison</p>
                </motion.div>

                {/* Unremitted (Due by drivers) */}
                <motion.div 
                    initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
                    className={`bg-gradient-to-br ${codData.alertCount > 0 ? 'from-red-50 to-white border-red-200' : 'from-amber-50 to-white border-amber-100'} border rounded-xl p-5 shadow-sm`}
                >
                    <div className="flex items-center gap-3 mb-3">
                        <div className={`w-10 h-10 rounded-lg ${codData.alertCount > 0 ? 'bg-red-100' : 'bg-amber-100'} flex items-center justify-center`}>
                            <Clock className={`w-5 h-5 ${codData.alertCount > 0 ? 'text-red-600' : 'text-amber-600'}`} />
                        </div>
                        <div className="flex items-center gap-2">
                            <span className={`text-sm font-medium ${codData.alertCount > 0 ? 'text-red-700' : 'text-amber-700'}`}>
                                Dû par Livreurs
                            </span>
                            {codData.alertCount > 0 && (
                                <span className="px-1.5 py-0.5 rounded-full bg-red-500 text-white text-[10px] font-bold animate-pulse">
                                    {codData.alertCount} alerte{codData.alertCount > 1 ? 's' : ''}
                                </span>
                            )}
                        </div>
                    </div>
                    <p className="text-2xl font-black text-gray-900">{codData.totalUnremitted.toLocaleString('fr-FR')} <span className="text-sm font-normal text-gray-500">{currency}</span></p>
                    <p className={`text-xs mt-1 ${codData.alertCount > 0 ? 'text-red-600' : 'text-amber-600'}`}>
                        {codData.unremittedCount} commande(s) livrées non encaissées
                    </p>
                </motion.div>

                {/* Remitted */}
                <motion.div 
                    initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
                    className="bg-gradient-to-br from-green-50 to-white border border-green-100 rounded-xl p-5 shadow-sm"
                >
                    <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                            <CheckCircle className="w-5 h-5 text-green-600" />
                        </div>
                        <span className="text-sm font-medium text-green-700">Encaissé</span>
                    </div>
                    <p className="text-2xl font-black text-gray-900">{codData.totalRemitted.toLocaleString('fr-FR')} <span className="text-sm font-normal text-gray-500">{currency}</span></p>
                    <p className="text-xs text-green-600 mt-1">{codData.remittedCount} commande(s) payée(s)</p>
                </motion.div>
            </div>

            {/* Driver Breakdown Table */}
            {codData.driverList.length > 0 ? (
                <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                    <div className="px-5 py-4 border-b border-gray-50 flex items-center justify-between">
                        <h3 className="text-sm font-bold text-gray-800 flex items-center gap-2">
                            <DollarSign className="w-4 h-4 text-indigo-500" />
                            Détail par Livreur / Transporteur
                        </h3>
                        <span className="text-xs text-gray-400">{codData.driverList.length} livreur(s)</span>
                    </div>

                    <div className="divide-y divide-gray-50">
                        {codData.driverList.map((driver) => {
                            const isExpanded = expandedDriver === driver.name;
                            const isOverdue = driver.daysOverdue >= ALERT_THRESHOLD_DAYS;

                            return (
                                <div key={driver.name}>
                                    {/* Driver Row */}
                                    <button
                                        onClick={() => setExpandedDriver(isExpanded ? null : driver.name)}
                                        className={`w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors ${isOverdue ? 'bg-red-50/50' : ''}`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${isOverdue ? 'bg-red-100 text-red-700' : 'bg-indigo-100 text-indigo-700'}`}>
                                                {driver.name.charAt(0).toUpperCase()}
                                            </div>
                                            <div className="text-left">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-semibold text-sm text-gray-900">{driver.name}</span>
                                                    {isOverdue && (
                                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-100 text-red-700 text-[10px] font-bold">
                                                            <AlertTriangle className="w-3 h-3" />
                                                            {driver.daysOverdue}j de retard
                                                        </span>
                                                    )}
                                                </div>
                                                <span className="text-xs text-gray-500">{driver.orders.length} commande(s)</span>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <span className={`text-lg font-bold ${isOverdue ? 'text-red-700' : 'text-gray-900'}`}>
                                                {driver.totalAmount.toLocaleString('fr-FR')} {currency}
                                            </span>
                                            {isExpanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                                        </div>
                                    </button>

                                    {/* Expanded Orders */}
                                    <AnimatePresence>
                                        {isExpanded && (
                                            <motion.div
                                                initial={{ opacity: 0, height: 0 }}
                                                animate={{ opacity: 1, height: 'auto' }}
                                                exit={{ opacity: 0, height: 0 }}
                                                className="bg-gray-50 border-t border-gray-100"
                                            >
                                                <div className="px-5 py-3">
                                                    {/* Bulk action */}
                                                    <div className="flex justify-end mb-3">
                                                        <button
                                                            onClick={() => markAsRemitted(driver.orders.map(o => o.id))}
                                                            className="flex items-center gap-1.5 px-3 py-1.5 bg-green-500 hover:bg-green-600 text-white text-xs font-bold rounded-lg transition-colors shadow-sm"
                                                        >
                                                            <Check className="w-3.5 h-3.5" />
                                                            Tout marquer comme reçu
                                                        </button>
                                                    </div>

                                                    {/* Individual orders */}
                                                    <div className="space-y-2">
                                                        {driver.orders.map(order => {
                                                            const amount = (parseFloat(order.price) || 0) * (parseInt(order.quantity) || 1);
                                                            const isMarking = markingIds.has(order.id);
                                                            return (
                                                                <div key={order.id} className="flex items-center justify-between bg-white rounded-lg px-4 py-2.5 border border-gray-100">
                                                                    <div>
                                                                        <span className="text-sm font-medium text-gray-800">
                                                                            {order.reference || order.id?.slice(0, 8)}
                                                                        </span>
                                                                        <span className="text-xs text-gray-500 ml-2">
                                                                            {order.clientName} — {order.clientCity || ''}
                                                                        </span>
                                                                        <span className="text-xs text-gray-400 ml-2">{order.date}</span>
                                                                    </div>
                                                                    <div className="flex items-center gap-3">
                                                                        <span className="text-sm font-bold text-gray-900">{amount.toFixed(0)} {currency}</span>
                                                                        <button
                                                                            onClick={() => markAsRemitted([order.id])}
                                                                            disabled={isMarking}
                                                                            className="flex items-center gap-1 px-2.5 py-1 bg-green-50 hover:bg-green-100 border border-green-200 rounded-lg text-xs font-medium text-green-700 transition-colors disabled:opacity-50"
                                                                        >
                                                                            {isMarking ? (
                                                                                <span className="w-3 h-3 border-2 border-green-400 border-t-transparent rounded-full animate-spin" />
                                                                            ) : (
                                                                                <Check className="w-3 h-3" />
                                                                            )}
                                                                            Reçu
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>
                            );
                        })}
                    </div>
                </div>
            ) : (
                <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-8 text-center">
                    <CheckCircle className="w-12 h-12 text-green-400 mx-auto mb-3" />
                    <p className="text-sm font-medium text-gray-600">Aucun paiement en attente</p>
                    <p className="text-xs text-gray-400 mt-1">Tous les livreurs ont remis les fonds collectés. 🎉</p>
                </div>
            )}
        </div>
    );
}

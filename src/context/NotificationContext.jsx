import { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { collection, query, where, getDocs, orderBy, limit, doc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useStoreData } from '../hooks/useStoreData';
import { detectFinancialLeaks } from '../services/aiService';
import { getSenditInvoices } from '../lib/sendit';
import { useTenant } from './TenantContext';
import { useAuth } from './AuthContext';
import { usePushNotifications } from '../hooks/usePushNotifications';

const NotificationContext = createContext();

export const useNotifications = () => {
    return useContext(NotificationContext);
};

export const NotificationProvider = ({ children }) => {
    const { store, franchiseStores } = useTenant();
    const { user } = useAuth();
    const [alerts, setAlerts] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [loading, setLoading] = useState(false);
    
    // FCM Push Notifications
    const { token: fcmToken, permissionStatus: fcmPermission, requestPermission: requestFcmPermission } = usePushNotifications();

    // Fetch Orders for Audit (Last 30 days)
    // We fetch a lightweight version or just rely on existing hooks if possible, 
    // but here we might need a dedicated fetch to ensure coverage.
    // Optimization: Audit runs only on mount or manual trigger to save reads.

    const runAudit = async () => {
        if (!user) return;
        // Proceed if we have a single store context OR if we are handling a franchise
        if (!store?.id && (!franchiseStores || franchiseStores.length === 0)) return;
        
        setLoading(true);
        const newAlerts = [];

        try {
            // 1. Financial Leaks (Ghost Orders & Margins) - Store Context
            if (store?.id) {
                const thirtyDaysAgo = new Date();
                thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

                const ordersRef = collection(db, "orders");
                const qOrders = query(
                    ordersRef,
                    where("storeId", "==", store.id),
                    where("date", ">=", thirtyDaysAgo.toISOString().split('T')[0]),
                    limit(200)
                );

                const ordersSnap = await getDocs(qOrders);
                const orders = ordersSnap.docs.map(d => ({ id: d.id, ...d.data() }));

                const leaks = detectFinancialLeaks(orders, 0);

                if (leaks.ghostOrders.length > 0) {
                    newAlerts.push({
                        id: 'ghost_orders',
                        type: 'critical',
                        title: 'Commandes Fantômes 👻',
                        message: `${leaks.ghostOrders.length} commandes livrées non payées (>15j).`,
                        link: '/finances',
                        details: leaks.ghostOrders.map(o => o.reference).join(', ')
                    });
                }

                if (leaks.negativeMargins.length > 0) {
                    newAlerts.push({
                        id: 'negative_margins',
                        type: 'warning',
                        title: 'Marge Négative 💸',
                        message: `${leaks.negativeMargins.length} commandes à perte détectées.`,
                        link: '/finances'
                    });
                }
            }

            // --- 2. Franchise High-Return Alerts --- //
            if (franchiseStores && franchiseStores.length > 0) {
                for (const fStore of franchiseStores) {
                    try {
                        const salesDoc = await getDoc(doc(db, 'stores', fStore.id, 'stats', 'sales'));
                        if (salesDoc.exists()) {
                            const stats = salesDoc.data();
                            const ordersCount = stats.totals?.count || 0;
                            const returnsCount = stats.statusCounts?.retour || 0;
                            
                            // Only trigger on stores with meaningful volume >= 10
                            if (ordersCount >= 10) {
                                const rate = (returnsCount / ordersCount) * 100;
                                // Alert if return rate >= 25%
                                if (rate >= 25) {
                                    newAlerts.push({
                                        id: `high_return_${fStore.id}`,
                                        type: 'critical',
                                        title: 'Alerte Franchise 🚨',
                                        message: `Le magasin ${fStore.name || fStore.id} a un taux de retour critique (${rate.toFixed(1)}%).`,
                                        link: '/dashboard'
                                    });
                                }
                            }
                        }
                    } catch (e) {
                         console.error("Failed to check franchise store stats:", e);
                    }
                }
            }

            // 3. Unpaid Invoices (Sendit)
            if (store?.id && store.senditPublicKey) {
                // Mock check or real check if lightweight
                // implementation depends on Sendit API speed
                // For now, let's assume we check "Pending" invoices from recent sync
                // Or just a generic reminder if we haven't checked int
            }

            // 3. Low Stock Alert (lightweight — only fetches products with low/no stock)
            if (store?.id) {
                try {
                    const lowStockSnap = await getDocs(
                        query(
                            collection(db, 'products'),
                            where('storeId', '==', store.id),
                            where('stock', '<=', 3),
                            limit(50)
                        )
                    );
                    const outOfStock = lowStockSnap.docs.filter(d => (d.data().stock || 0) <= 0);
                    const criticalLow = lowStockSnap.docs.filter(d => {
                        const s = d.data().stock || 0;
                        return s > 0 && s <= 3;
                    });

                    if (outOfStock.length > 0) {
                        newAlerts.push({
                            id: 'out_of_stock',
                            type: 'critical',
                            title: 'Rupture de stock 📦',
                            message: `${outOfStock.length} produit(s) en rupture de stock.`,
                            link: '/products',
                            details: outOfStock.map(d => d.data().name).slice(0, 5).join(', ')
                        });
                    }
                    if (criticalLow.length > 0) {
                        newAlerts.push({
                            id: 'low_stock',
                            type: 'warning',
                            title: 'Stock critique ⚠️',
                            message: `${criticalLow.length} produit(s) avec stock ≤ 3 unités.`,
                            link: '/products',
                            details: criticalLow.map(d => `${d.data().name} (${d.data().stock})`).slice(0, 5).join(', ')
                        });
                    }
                } catch (e) {
                    console.warn('Low stock check failed:', e);
                }
            }

        } catch (err) {
            console.error("Notification Audit Error:", err);
        } finally {
            setAlerts(newAlerts);
            setUnreadCount(newAlerts.length);
            setLoading(false);
        }
    };

    // Auto-run audit on mount (once per session/reload)
    useEffect(() => {
        runAudit();
    }, [store?.id, user?.uid]);

    const value = {
        alerts,
        unreadCount,
        loading,
        refreshAlerts: runAudit,
        dismissAlert: (id) => {
            setAlerts(prev => prev.filter(a => a.id !== id));
            setUnreadCount(prev => Math.max(0, prev - 1));
        },
        fcmToken,
        fcmPermission,
        requestFcmPermission
    };

    return (
        <NotificationContext.Provider value={value}>
            {children}
        </NotificationContext.Provider>
    );
};

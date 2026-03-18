import { useEffect, useState, useMemo } from 'react';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useTenant } from '../context/TenantContext';

/**
 * useFranchiseData — Aggregates data across all stores of a franchise.
 * Only functional when user is a franchise_admin (isFranchiseAdmin = true).
 *
 * Returns:
 *  - kpis: { totalRevenue, totalOrders, totalCustomers, avgReturnRate, revByStore[] }
 *  - storeStats: per-store KPIs loaded from stores/<id>/stats/sales
 *  - topProducts: top 10 products by quantity sold cross-stores
 *  - trend7d: last-7-days revenue (all stores combined), shape: [{ date, revenue }]
 *  - loading / error
 */
export function useFranchiseData(dateFilter = 'all') {
    const { franchiseStores, isFranchiseAdmin } = useTenant();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [storeStats, setStoreStats] = useState([]);
    const [topProducts, setTopProducts] = useState([]);

    const storeIds = useMemo(() => franchiseStores.map(s => s.id), [franchiseStores]);

    // Lift fetchAll out so it can be exposed
    const fetchAll = async () => {
        if (!isFranchiseAdmin || storeIds.length === 0) {
            setStoreStats([]);
            setTopProducts([]);
            setLoading(false);
            return;
        }

        setLoading(true);
        let cancelled = false;

        try {
            // ── 1. Load pre-aggregated stats for each store (stores/<id>/stats/sales) ──
            const statsPromises = franchiseStores.map(async (store) => {
                try {
                    const statsDoc = await getDoc(doc(db, 'stores', store.id, 'stats', 'sales'));
                    return {
                        storeId: store.id,
                        storeName: store.name || store.id,
                        stats: statsDoc.exists() ? statsDoc.data() : {
                            totals: { revenue: 0, count: 0 },
                            daily: {},
                            statusCounts: {}
                        }
                    };
                } catch {
                    return { storeId: store.id, storeName: store.name || store.id, stats: null };
                }
            });
            const results = await Promise.all(statsPromises);
            if (!cancelled) setStoreStats(results);

            // ── 2. Top products cross-stores (Firestore `in` query, max 30 stores) ──
            if (storeIds.length > 0) {
                const chunks = chunkArray(storeIds, 30); // Firestore `in` limit
                const productMap = new Map(); // productId → { name, qty, storeCount }

                let limitDate = null;
                if (dateFilter !== 'all') {
                     limitDate = new Date();
                     limitDate.setDate(limitDate.getDate() - (dateFilter === '7d' ? 7 : 30));
                }

                for (const chunk of chunks) {
                    let constraints = [
                        where('storeId', 'in', chunk),
                        where('status', '==', 'livré')
                    ];
                    if (limitDate) {
                        constraints.push(where('createdAt', '>=', limitDate));
                    }
                    
                    const ordersQuery = query(collection(db, 'orders'), ...constraints);
                    const ordersSnap = await getDocs(ordersQuery);
                    ordersSnap.docs.forEach(d => {
                        const order = d.data();
                        const productName = order.productName || order.product || 'Produit inconnu';
                        const qty = Number(order.quantity) || 1;
                        const key = productName.toLowerCase();
                        if (productMap.has(key)) {
                            productMap.get(key).qty += qty;
                            productMap.get(key).stores.add(order.storeId);
                        } else {
                            productMap.set(key, { name: productName, qty, stores: new Set([order.storeId]) });
                        }
                    });
                }

                const sorted = [...productMap.values()]
                    .sort((a, b) => b.qty - a.qty)
                    .slice(0, 10)
                    .map(p => ({ ...p, storeCount: p.stores.size, stores: undefined }));

                if (!cancelled) setTopProducts(sorted);
            }

        } catch (err) {
            console.error('useFranchiseData error:', err);
            setError(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAll();
    }, [isFranchiseAdmin, storeIds.join(','), franchiseStores, dateFilter]);

    // ── Derive consolidated KPIs from storeStats ──
    const kpis = useMemo(() => {
        if (!storeStats.length) return null;

        let totalRevenue = 0;
        let totalOrders = 0;
        
        let globalOrders = 0;
        let globalReturns = 0;
        
        const revByStore = [];

        // 7-day trend aggregated
        const trendMap = {};
        for (let i = 6; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            trendMap[d.toISOString().split('T')[0]] = 0;
        }

        let limitStr = null;
        if (dateFilter !== 'all') {
            const d = new Date();
            d.setDate(d.getDate() - (dateFilter === '7d' ? 7 : 30));
            limitStr = d.toISOString().split('T')[0];
        }

        storeStats.forEach(({ storeName, stats }) => {
            if (!stats) return;

            globalOrders += stats.totals?.count ?? 0;
            globalReturns += stats.statusCounts?.retour ?? 0;
            
            let storeRevenue = 0;
            let storeOrders = 0;

            if (dateFilter === 'all') {
                storeRevenue = stats.totals?.deliveredRevenue ?? stats.totals?.revenue ?? 0;
                storeOrders = stats.totals?.count ?? 0;
            } else {
                if (stats.daily) {
                    Object.entries(stats.daily).forEach(([dateKey, dailyData]) => {
                        if (dateKey >= limitStr) {
                            storeRevenue += dailyData.revenue ?? dailyData.deliveredRevenue ?? 0;
                            storeOrders += dailyData.count ?? 0;
                        }
                    });
                }
            }

            totalRevenue += storeRevenue;
            totalOrders += storeOrders;

            revByStore.push({ name: storeName, revenue: storeRevenue, orders: storeOrders });

            // Accumulate daily trend
            Object.keys(trendMap).forEach(dateKey => {
                trendMap[dateKey] += stats.daily?.[dateKey]?.revenue ?? 0;
            });
        });

        // Use global rate since accurate filtered return counts are not available in daily aggregations
        const returnRate = globalOrders > 0 ? ((globalReturns / globalOrders) * 100).toFixed(1) : '0.0';
        const trend7d = Object.entries(trendMap).map(([date, revenue]) => ({
            date: new Date(date).toLocaleDateString('fr-FR', { month: 'short', day: 'numeric' }),
            revenue
        }));

        return { totalRevenue, totalOrders, returnRate, revByStore, trend7d };
    }, [storeStats]);

    return { kpis, storeStats, topProducts, loading, error, refreshData: fetchAll };
}

// ── Helper ──
function chunkArray(arr, size) {
    const chunks = [];
    for (let i = 0; i < arr.length; i += size) chunks.push(arr.slice(i, i + size));
    return chunks;
}

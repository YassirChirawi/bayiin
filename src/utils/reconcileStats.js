import { collection, getDocs, query, where, doc, writeBatch, increment } from "firebase/firestore";

/**
 * Recalculates all statistics for a store by reading all orders.
 * This fixes any drift caused by missed webhooks or concurrent edits.
 * 
 * @param {Firestore} db 
 * @param {string} storeId 
 * @returns {Promise<Object>} The calculated stats
 */
export const reconcileStoreStats = async (db, storeId) => {
    try {
        const ordersRef = collection(db, "orders");
        const q = query(ordersRef, where("storeId", "==", storeId));
        const snapshot = await getDocs(q);

        console.log(`Reconciling stats for ${storeId}. Found ${snapshot.size} orders.`);

        const stats = {
            totals: {
                revenue: 0,
                count: 0,
                realizedRevenue: 0,
                realizedCOGS: 0,
                realizedDeliveryCost: 0,
                deliveredRevenue: 0 // Specific tracked metric
            },
            statusCounts: {},
            daily: {} // date -> { revenue, count }
        };

        snapshot.forEach(doc => {
            const order = doc.data();
            const orderVal = (parseFloat(order.price) || 0) * (parseInt(order.quantity) || 1);
            const orderCost = (parseFloat(order.costPrice) || 0) * (parseInt(order.quantity) || 1);
            const deliveryCost = parseFloat(order.realDeliveryCost) || 0;
            const dateKey = order.date ? order.date.split('T')[0] : 'unknown';

            // 1. Totals
            stats.totals.revenue += orderVal;
            stats.totals.count += 1;

            if (order.isPaid) {
                stats.totals.realizedRevenue += orderVal;
                stats.totals.realizedCOGS += orderCost;
                stats.totals.realizedDeliveryCost += deliveryCost;
            }

            if (order.status === 'livré') {
                stats.totals.deliveredRevenue += orderVal;
            }

            // 2. Status Counts
            const status = order.status || 'unknown';
            stats.statusCounts[status] = (stats.statusCounts[status] || 0) + 1;

            // 3. Daily Stats (Based on Order Date - Creation Volume)
            if (!stats.daily[dateKey]) {
                stats.daily[dateKey] = { revenue: 0, count: 0 };
            }
            stats.daily[dateKey].revenue += orderVal;
            stats.daily[dateKey].count += 1;
        });

        // Write to Firestore
        const statsRef = doc(db, "stores", storeId, "stats", "sales");
        const batch = writeBatch(db);
        batch.set(statsRef, stats);
        await batch.commit();

        return stats;
    } catch (error) {
        console.error("Reconciliation failed:", error);
        throw error;
    }
};

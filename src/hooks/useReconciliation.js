import { useState } from "react";
import { collection, query, where, getDocs, doc, updateDoc } from "firebase/firestore";
import { db } from "../lib/firebase";
import { reconcileStoreStats } from "../utils/reconcileStats";
import { toast } from "react-hot-toast";
import { useLanguage } from "../context/LanguageContext";

export const useReconciliation = (storeId) => {
    const { t } = useLanguage();
    const [isRecalculating, setIsRecalculating] = useState(false);

    const runReconciliation = async (options = { updateCustomers: true, forceReload: false }) => {
        if (!storeId || isRecalculating) return;

        setIsRecalculating(true);
        const toastId = toast.loading(t('recalculate_sync') + "...");

        try {
            // 1. Reconcile Store Sales Stats (Global Revenue, Status Counts, etc.)
            await reconcileStoreStats(db, storeId);

            // 2. Update Customer Stats (Order counts, Total spent)
            if (options.updateCustomers) {
                const ordersRef = collection(db, "orders");
                const q = query(ordersRef, where("storeId", "==", storeId));
                const snapshot = await getDocs(q);
                const orders = snapshot.docs.map(d => d.data());
                const customerStats = {};

                orders.forEach(order => {
                    if (!order.customerId) return;
                    if (!customerStats[order.customerId]) {
                        customerStats[order.customerId] = { count: 0, spent: 0, dates: [] };
                    }
                    const amount = (parseFloat(order.price) || 0) * (parseInt(order.quantity) || 1);
                    customerStats[order.customerId].count += 1;
                    customerStats[order.customerId].spent += amount;
                    if (order.date) customerStats[order.customerId].dates.push(order.date);
                });

                const updates = Object.entries(customerStats).map(async ([custId, stats]) => {
                    const custRef = doc(db, "customers", custId);
                    const lastOrderDate = stats.dates.sort().pop() || new Date().toISOString().split('T')[0];
                    return updateDoc(custRef, {
                        orderCount: stats.count,
                        totalSpent: stats.spent,
                        lastOrderDate: lastOrderDate
                    });
                });

                await Promise.all(updates);
            }

            toast.success(t('msg_dashboard_updated') || "Sync Complete", { id: toastId });

            if (options.forceReload) {
                window.location.reload();
            }
        } catch (error) {
            console.error("Manual Reconciliation Error:", error);
            toast.error(t('err_sync_failed') || "Sync Failed", { id: toastId });
        } finally {
            setIsRecalculating(false);
        }
    };

    return { runReconciliation, isRecalculating };
};

import { useState } from "react";
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
            // Reconcile Store Sales Stats & Customer Stats entirely via the Backend Cloud Function
            await reconcileStoreStats(db, storeId);

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

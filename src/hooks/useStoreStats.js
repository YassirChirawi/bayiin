import { useEffect, useState } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useTenant } from '../context/TenantContext';

export function useStoreStats() {
    const { store } = useTenant();
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (!store?.id) {
            setStats(null);
            setLoading(false);
            return;
        }

        setLoading(true);
        // Subscribe to the 'sales' document in the 'stats' subcollection
        const statsRef = doc(db, 'stores', store.id, 'stats', 'sales');

        const unsubscribe = onSnapshot(statsRef,
            (docSnapshot) => {
                if (docSnapshot.exists()) {
                    console.log("Stats update:", docSnapshot.data());
                    setStats(docSnapshot.data());
                } else {
                    // Initialize structure if missing
                    setStats({
                        totals: { revenue: 0, count: 0 },
                        daily: {},
                        statusCounts: {}
                    });
                }
                setLoading(false);
            },
            (err) => {
                console.error("Error fetching store stats:", err);
                setError(err);
                setLoading(false);
            }
        );

        return () => unsubscribe();
    }, [store?.id]);

    return { stats, loading, error };
}

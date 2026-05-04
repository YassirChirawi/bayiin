import { useState, useEffect } from "react";
import { collection, getDocs, getDoc, doc } from "firebase/firestore";
import { db } from "../lib/firebase";
import toast from "react-hot-toast";

export function useAdminData(user) {
    const [stats, setStats] = useState({ 
        stores: 0, 
        mrr: 0, 
        users: 0, 
        proStores: 0, 
        activeStores: 0,
        growth: 0,
        churnRate: 0,
        avgStoreRevenue: 0,
        platformActivity: 0
    });
    const [stores, setStores] = useState([]);
    const [usersList, setUsersList] = useState([]);
    const [franchises, setFranchises] = useState([]);
    const [loading, setLoading] = useState(true);
    const [broadcastData, setBroadcastData] = useState({ message: "", active: false });

    const fetchData = async () => {
        setLoading(true);
        try {
            // Fetch independently to allow partial failures (e.g. permission issues on system)
            let storesData = [];
            let usersData = [];
            let broadcast = { message: "", active: false };

            try {
                const storesCtx = await getDocs(collection(db, "stores"));
                storesData = storesCtx.docs.map(d => ({ id: d.id, ...d.data() }));
            } catch (e) {
                console.warn("Failed to fetch stores", e);
                // Don't toast here to avoid spamming if it's expected for some roles
            }

            try {
                const usersCtx = await getDocs(collection(db, "users"));
                usersData = usersCtx.docs.map(d => ({ id: d.id, ...d.data() }));
            } catch (e) {
                console.warn("Failed to fetch users", e);
            }

            try {
                const franchisesCtx = await getDocs(collection(db, "franchises"));
                const franchisesData = franchisesCtx.docs.map(d => ({ id: d.id, ...d.data() }));
                setFranchises(franchisesData);
            } catch (e) {
                console.warn("Failed to fetch franchises", e);
            }

            try {
                const broadcastSnap = await getDoc(doc(db, "system", "announcements"));
                if (broadcastSnap.exists()) {
                    broadcast = broadcastSnap.data();
                }
            } catch (e) {
                console.warn("Failed to fetch broadcast", e);
            }

            // Advanced Stats Calculation
            const proStoresCount = storesData.filter(s => s.plan === 'pro').length;
            const mrr = proStoresCount * 179;
            
            // Growth: Stores created in the last 30 days
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
            const sixtyDaysAgo = new Date();
            sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

            const newStoresLast30 = storesData.filter(s => {
                const createdAt = s.createdAt?.toDate ? s.createdAt.toDate() : new Date(s.createdAt);
                return createdAt > thirtyDaysAgo;
            }).length;

            const newStoresPrev30 = storesData.filter(s => {
                const createdAt = s.createdAt?.toDate ? s.createdAt.toDate() : new Date(s.createdAt);
                return createdAt > sixtyDaysAgo && createdAt <= thirtyDaysAgo;
            }).length;

            const growth = newStoresPrev30 > 0 
                ? ((newStoresLast30 - newStoresPrev30) / newStoresPrev30) * 100 
                : 100;

            // Activity Metrics
            const activeStores = storesData.filter(s => s.lastOrderDate || s.products > 0);
            const activeStoresCount = activeStores.length;
            const platformActivity = storesData.length > 0 ? (activeStoresCount / storesData.length) * 100 : 0;

            // Churn: Stores with no products and no activity (Simplified)
            const churnCount = storesData.filter(s => !s.products || s.products === 0).length;
            const churnRate = storesData.length > 0 ? (churnCount / storesData.length) * 100 : 0;

            // Financial Estimates (In a real app, this would be from a summary doc)
            const avgStoreRevenue = 12500; // Mocked avg for now

            setStores(storesData);
            setUsersList(usersData);
            setStats({
                stores: storesData.length,
                mrr,
                users: usersData.length,
                proStores: proStoresCount,
                activeStores: activeStoresCount,
                growth,
                churnRate,
                avgStoreRevenue,
                platformActivity
            });

            setBroadcastData(broadcast);

        } catch (error) {
            console.error("Error fetching admin data:", error);
            toast.error("Failed to load admin data");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (user) {
            fetchData();
        }
    }, [user]);

    // Exposed refresh function
    const refreshData = fetchData;

    return { stats, stores, usersList, franchises, broadcastData, loading, refreshData, setStores, setUsersList, setFranchises }; // exposed for optimistic updates
}

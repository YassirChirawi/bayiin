import { useState, useEffect } from "react";
import { collection, getDocs, getDoc, doc } from "firebase/firestore";
import { db } from "../lib/firebase";
import toast from "react-hot-toast";

export function useAdminData(user) {
    const [stats, setStats] = useState({ stores: 0, mrr: 0, users: 0, proStores: 0, activeStores: 0 });
    const [stores, setStores] = useState([]);
    const [usersList, setUsersList] = useState([]);
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
            const activeStoresCount = storesData.filter(s => s.products > 0).length;

            setStores(storesData);
            setUsersList(usersData);
            setStats({
                stores: storesData.length,
                mrr,
                users: usersData.length,
                proStores: proStoresCount,
                activeStores: activeStoresCount
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

    return { stats, stores, usersList, broadcastData, loading, refreshData, setStores, setUsersList }; // setStores/setUsersList exposed for optimistic updates
}

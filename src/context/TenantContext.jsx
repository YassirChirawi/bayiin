/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { useAuth } from "./AuthContext";
import { db } from "../lib/firebase";
import { doc, getDoc, collection, query, where, getDocs } from "firebase/firestore";

const TenantContext = createContext({});

export const useTenant = () => useContext(TenantContext);

export const TenantProvider = ({ children }) => {
    const { user } = useAuth();
    const [store, setStore] = useState(null);       // Currently active store
    const [stores, setStores] = useState([]);        // All available stores (owned/staff)
    const [loading, setLoading] = useState(true);

    // --- Franchise state ---
    const [isFranchiseAdmin, setIsFranchiseAdmin] = useState(false);
    const [franchise, setFranchise] = useState(null);          // Franchise doc data
    const [franchiseStores, setFranchiseStores] = useState([]); // All stores in the franchise

    const loadStores = useCallback(async () => {
        setLoading(true);
        if (!user) {
            setStore(null);
            setStores([]);
            setIsFranchiseAdmin(false);
            setFranchise(null);
            setFranchiseStores([]);
            setLoading(false);
            return;
        }

        try {
            const availableStores = [];
            const storeIds = new Set();

            // 1. Fetch user document to check role
            let userData = null;
            try {
                const userDoc = await getDoc(doc(db, "users", user.uid));
                if (userDoc.exists()) userData = userDoc.data();
            } catch (_) {
                console.error("User document load failed");
            }

            // 2. Fetch Owned Stores
            const ownedQuery = query(collection(db, "stores"), where("ownerId", "==", user.uid));
            const ownedSnapshot = await getDocs(ownedQuery);
            ownedSnapshot.forEach(d => {
                if (!storeIds.has(d.id)) {
                    availableStores.push({ id: d.id, ...d.data(), role: 'owner' });
                    storeIds.add(d.id);
                }
            });

            // 3. Fetch Invited Stores (Staff)
            const invitedQuery = query(collection(db, "allowed_users"), where("email", "==", user.email));
            const invitedSnapshot = await getDocs(invitedQuery);
            const invitePromises = invitedSnapshot.docs.map(async (inviteDoc) => {
                const inviteData = inviteDoc.data();
                if (inviteData.storeId && !storeIds.has(inviteData.storeId)) {
                    try {
                        const storeDoc = await getDoc(doc(db, "stores", inviteData.storeId));
                        if (storeDoc.exists()) {
                            return { id: storeDoc.id, ...storeDoc.data(), role: inviteData.role || 'staff' };
                        }
                    } catch (err) {
                        console.error("Failed to load invited store", inviteData.storeId, err);
                    }
                }
                return null;
            });
            const invitedStores = (await Promise.all(invitePromises)).filter(Boolean);
            invitedStores.forEach(s => {
                if (!storeIds.has(s.id)) {
                    availableStores.push(s);
                    storeIds.add(s.id);
                }
            });

            setStores(availableStores);

            // 4. Select Active Store (Priority: localStorage -> first)
            if (availableStores.length > 0) {
                let lastStoreId = null;
                try {
                    lastStoreId = localStorage.getItem('lastStoreId');
                } catch (e) {
                    console.warn("localStorage is not available", e);
                }
                const foundLast = availableStores.find(s => s.id === lastStoreId);
                const activeStore = foundLast || availableStores[0];
                setStore(activeStore);
                if (!foundLast) {
                    try {
                        localStorage.setItem('lastStoreId', activeStore.id);
                    } catch (e) {
                        console.warn("Silent localStorage failure:", e);
                    }
                }
            } else {
                setStore(null);
            }

            // 5. Franchise Admin — load all franchise stores
            if (userData?.role === 'franchise_admin' && userData?.franchiseId) {
                setIsFranchiseAdmin(true);

                // Load franchise document
                try {
                    const franchiseDoc = await getDoc(doc(db, "franchises", userData.franchiseId));
                    if (franchiseDoc.exists()) setFranchise({ id: franchiseDoc.id, ...franchiseDoc.data() });
                } catch (err) {
                    console.error("Franchise load failed:", err);
                }

                // Load all stores beloning to this franchise
                const fStoresQuery = query(
                    collection(db, "stores"),
                    where("franchiseId", "==", userData.franchiseId)
                );
                const fStoresSnap = await getDocs(fStoresQuery);
                const fStores = fStoresSnap.docs.map(d => ({ id: d.id, ...d.data() }));
                setFranchiseStores(fStores);
            } else {
                setIsFranchiseAdmin(false);
                setFranchise(null);
                setFranchiseStores([]);
            }

        } catch (error) {
            console.error("Error loading stores:", error);
        } finally {
            setLoading(false);
        }
    }, [user]);

    useEffect(() => {
        loadStores();
    }, [loadStores]);

    const switchStore = (storeId) => {
        const target = stores.find(s => s.id === storeId);
        if (target) {
            setStore(target);
            try {
                localStorage.setItem('lastStoreId', target.id);
            } catch (e) {
                console.warn("localStorage switch failed:", e);
            }
        }
    };

    const isStoreActive = (s) => {
        if (!s) return false;
        // Pro plan is always active unless explicitly cancelled/expired
        if (s.plan === 'pro') {
            if (s.subscriptionStatus === 'canceled' || s.subscriptionStatus === 'expired') return false;
            // Grace period : 7 jours après expiration Stripe
            if (s.subscriptionStatus === 'past_due' && s.currentPeriodEnd) {
                const expiredAt = new Date(s.currentPeriodEnd * 1000);
                const gracePeriodEnd = new Date(expiredAt.getTime() + 7 * 24 * 60 * 60 * 1000);
                return new Date() < gracePeriodEnd;
            }
            return true; // active, or no subscriptionStatus (promo code, manual activation)
        }
        
        return s.plan === 'free' || !s.plan; 
    };

    const active = isStoreActive(store);
    const isGracePeriod = store?.subscriptionStatus === 'past_due' && active;
    const isSubscriptionExpired = store && !active;

    return (
        <TenantContext.Provider value={{
            store, setStore, stores, loading, switchStore, refreshStores: loadStores,
            isSubscriptionExpired,
            isGracePeriod,
            isStoreActive: active,
            // Franchise
            isFranchiseAdmin, franchise, franchiseStores,
        }}>
            {children}
        </TenantContext.Provider>
    );
};

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
                // Add a 5s timeout to prevent hanging if Firestore is unreachable
                const fetchPromise = getDoc(doc(db, "users", user.uid));
                const timeoutPromise = new Promise((_, reject) => 
                    setTimeout(() => reject(new Error("Firestore timeout")), 10000)
                );
                
                const userDoc = await Promise.race([fetchPromise, timeoutPromise]);
                if (userDoc.exists()) userData = userDoc.data();
            } catch (err) {
                console.error("User profile fetch failed or timed out:", err);
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

    // Essai gratuit : 1 mois (30 jours) à compter de la création du store. Doit rester aligné
    // avec TrialAlert et le billing serveur (trial_days: 30).
    const TRIAL_DAYS = 30;
    const toDate = (val) => {
        if (!val) return null;
        if (typeof val?.toDate === 'function') return val.toDate(); // Firestore Timestamp
        if (val instanceof Date) return val;
        const d = new Date(val);
        return isNaN(d.getTime()) ? null : d;
    };

    const isStoreActive = (s) => {
        if (!s) return false;
        // Testeurs / bêta : accès total (jamais bloqués par le paywall).
        if (s.testerMode) return true;

        // Abonnement payant : actif sauf annulé/expiré ; past_due tolère 7 j de grâce.
        if (s.plan === 'pro' || s.plan === 'starter' || s.plan === 'unlimited') {
            if (s.subscriptionStatus === 'canceled' || s.subscriptionStatus === 'expired') return false;
            if (s.subscriptionStatus === 'past_due' && s.currentPeriodEnd) {
                const gracePeriodEnd = new Date(s.currentPeriodEnd * 1000 + 7 * 24 * 60 * 60 * 1000);
                return new Date() < gracePeriodEnd;
            }
            return true;
        }

        // Activation promo / manuelle → accès total.
        if (s.subscriptionStatus === 'active_promo') return true;

        // Sinon (plan free / essai) : accès UNIQUEMENT pendant la fenêtre d'essai de 30 jours.
        const created = toDate(s.createdAt);
        if (!created) return true; // pas de date de création → ne pas bloquer (sécurité)
        const trialEnd = new Date(created.getTime() + TRIAL_DAYS * 24 * 60 * 60 * 1000);
        return new Date() < trialEnd;
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

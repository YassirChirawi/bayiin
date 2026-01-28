import { createContext, useContext, useState, useEffect } from "react";
import { useAuth } from "./AuthContext";
import { db } from "../lib/firebase";
import { doc, getDoc, collection, query, where, getDocs } from "firebase/firestore";

const TenantContext = createContext({});

export const useTenant = () => useContext(TenantContext);

export const TenantProvider = ({ children }) => {
    const { user } = useAuth();
    const [store, setStore] = useState(null); // Currently active store
    const [stores, setStores] = useState([]); // All available stores
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function loadStores() {
            setLoading(true);
            if (!user) {
                setStore(null);
                setStores([]);
                setLoading(false);
                return;
            }

            try {
                const availableStores = [];
                const storeIds = new Set(); // Prevent duplicates

                // 1. Fetch Owned Stores
                const ownedQuery = query(collection(db, "stores"), where("ownerId", "==", user.uid));
                const ownedSnapshot = await getDocs(ownedQuery);

                ownedSnapshot.forEach(doc => {
                    if (!storeIds.has(doc.id)) {
                        availableStores.push({ id: doc.id, ...doc.data(), role: 'owner' });
                        storeIds.add(doc.id);
                    }
                });

                // 2. Fetch Invited Stores (Staff)
                const invitedQuery = query(collection(db, "allowed_users"), where("email", "==", user.email));
                const invitedSnapshot = await getDocs(invitedQuery);

                // Process invites in parallel
                const invitePromises = invitedSnapshot.docs.map(async (inviteDoc) => {
                    const inviteData = inviteDoc.data();
                    if (inviteData.storeId && !storeIds.has(inviteData.storeId)) {
                        try {
                            const storeDoc = await getDoc(doc(db, "stores", inviteData.storeId));
                            if (storeDoc.exists()) {
                                return {
                                    id: storeDoc.id,
                                    ...storeDoc.data(),
                                    role: inviteData.role || 'staff'
                                };
                            }
                        } catch (err) {
                            console.error("Failed to load invited store", inviteData.storeId, err);
                        }
                    }
                    return null;
                });

                const invitedStores = (await Promise.all(invitePromises)).filter(s => s !== null);

                // Add unique invited stores
                invitedStores.forEach(s => {
                    if (!storeIds.has(s.id)) {
                        availableStores.push(s);
                        storeIds.add(s.id);
                    }
                });

                setStores(availableStores);

                // 3. Select Active Store
                // Priority: Last Selected (LocalStorage) -> First Available
                if (availableStores.length > 0) {
                    const lastStoreId = localStorage.getItem('lastStoreId');
                    const foundLast = availableStores.find(s => s.id === lastStoreId);

                    if (foundLast) {
                        setStore(foundLast);
                    } else {
                        // Default to first
                        setStore(availableStores[0]);
                        localStorage.setItem('lastStoreId', availableStores[0].id);
                    }
                } else {
                    setStore(null);
                }

            } catch (error) {
                console.error("Error loading stores:", error);
            } finally {
                setLoading(false);
            }
        }

        loadStores();
    }, [user]);

    // Function to switch store
    const switchStore = (storeId) => {
        const target = stores.find(s => s.id === storeId);
        if (target) {
            console.log("Switching to store:", target.name);
            setStore(target);
            localStorage.setItem('lastStoreId', target.id);
            // Optional: Reload window to clear strict cached queries if necessary, 
            // but Context should trigger re-renders naturally.
        }
    };

    return (
        <TenantContext.Provider value={{ store, stores, loading, switchStore }}>
            {children}
        </TenantContext.Provider>
    );
};

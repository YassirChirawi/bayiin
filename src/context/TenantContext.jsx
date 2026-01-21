import { createContext, useContext, useState, useEffect } from "react";
import { useAuth } from "./AuthContext";
import { db } from "../lib/firebase";
import { doc, getDoc, collection, query, where, getDocs, updateDoc } from "firebase/firestore";

const TenantContext = createContext({});

export const useTenant = () => useContext(TenantContext);

export const TenantProvider = ({ children }) => {
    const { user } = useAuth();
    const [store, setStore] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function loadStore() {
            if (!user) {
                setStore(null);
                setLoading(false);
                return;
            }

            try {
                // Fetch user profile to get storeId
                const userDocRef = doc(db, "users", user.uid);
                const userDoc = await getDoc(userDocRef);

                let targetStoreId = null;
                let userRole = 'owner';

                if (userDoc.exists()) {
                    const userData = userDoc.data();
                    if (userData.storeId) {
                        targetStoreId = userData.storeId;
                    }
                }

                // If not an owner, check if they are an invited team member
                if (!targetStoreId) {
                    const q = query(collection(db, "allowed_users"), where("email", "==", user.email));
                    const snapshot = await getDocs(q);
                    if (!snapshot.empty) {
                        const permissionDoc = snapshot.docs[0].data();
                        targetStoreId = permissionDoc.storeId;
                        userRole = permissionDoc.role || 'staff';

                        // SYNC: Update the user's profile so standard rules work
                        // We do this silently
                        try {
                            await updateDoc(userDocRef, { storeId: targetStoreId });
                        } catch (err) {
                            console.warn("Failed to sync storeId to user profile", err);
                        }
                    }
                }

                if (targetStoreId) {
                    const storeDoc = await getDoc(doc(db, "stores", targetStoreId));
                    if (storeDoc.exists()) {
                        setStore({ id: storeDoc.id, ...storeDoc.data(), role: userRole });
                    }
                } else {
                    setStore(null);
                }
            } catch (error) {
                console.error("Error loading store:", error);
            } finally {
                setLoading(false);
            }
        }

        loadStore();
    }, [user]);

    return (
        <TenantContext.Provider value={{ store, loading, setStore }}>
            {children}
        </TenantContext.Provider>
    );
};

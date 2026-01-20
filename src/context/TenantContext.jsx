import { createContext, useContext, useState, useEffect } from "react";
import { useAuth } from "./AuthContext";
import { db } from "../lib/firebase";
import { doc, getDoc } from "firebase/firestore";

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
                const userDoc = await getDoc(doc(db, "users", user.uid));
                if (userDoc.exists()) {
                    const userData = userDoc.data();
                    if (userData.storeId) {
                        const storeDoc = await getDoc(doc(db, "stores", userData.storeId));
                        if (storeDoc.exists()) {
                            setStore({ id: storeDoc.id, ...storeDoc.data() });
                        }
                    }
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

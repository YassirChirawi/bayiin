import { useCallback } from 'react';
import { db } from '../lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';
import { useTenant } from '../context/TenantContext';

export const useAudit = () => {
    const { user } = useAuth();
    const { store } = useTenant();

    const logAction = useCallback(async (action, details, metadata = {}) => {
        if (!store?.id || !user) return;

        try {
            await addDoc(collection(db, "stores", store.id, "audit_logs"), {
                action,     // e.g., "Order Created"
                details,    // e.g., "Order #123 created"
                metadata,   // e.g., { orderId: 123 }
                user: {
                    uid: user.uid,
                    email: user.email,
                    name: user.displayName || user.email.split('@')[0]
                },
                timestamp: serverTimestamp()
            });
        } catch (error) {
            console.error("Failed to log action:", error);
            // Don't crash the app if logging fails
        }
    }, [store?.id, user]);

    return { logAction };
};

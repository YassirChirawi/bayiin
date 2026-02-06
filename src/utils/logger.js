import { collection, addDoc, serverTimestamp } from "firebase/firestore";

/**
 * Logs an activity to the store's audit_logs collection.
 * 
 * @param {object} db - Firebase Firestore instance
 * @param {string} storeId - The ID of the store
 * @param {object} user - The user performing the action { uid, email, displayName, role }
 * @param {string} action - Short code for the action (e.g., 'ORDER_UPDATE', 'PRODUCT_DELETE')
 * @param {string} details - Human-readable description
 * @param {object} metadata - Optional additional data (e.g., { orderId: '123', oldStatus: 'pending' })
 */
export const logActivity = async (db, storeId, user, action, details, metadata = {}) => {
    if (!db || !storeId) {
        console.warn("Logger: Missing db or storeId", { db, storeId });
        return;
    }

    try {
        await addDoc(collection(db, "stores", storeId, "audit_logs"), {
            action,
            details,
            metadata,
            userId: user?.uid || 'system',
            user: {
                name: user?.displayName || user?.name || 'Unknown',
                email: user?.email || 'N/A',
                role: user?.role || 'N/A'
            },
            timestamp: serverTimestamp()
        });
    } catch (error) {
        // Logging should not break the app flow
        console.error("Logger: Failed to log activity", error);
    }
};

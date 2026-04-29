import { db } from './firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

/**
 * Logs a business action to the store's audit trail.
 * @param {string} storeId - The ID of the store.
 * @param {object} entry - The audit entry { action, from, to, orderId, userId }.
 */
export async function logAudit(storeId, entry) {
    if (!storeId) return;
    
    try {
        await addDoc(collection(db, `stores/${storeId}/audit_logs`), {
            ...entry,
            timestamp: serverTimestamp()
        });
    } catch (error) {
        console.error("Audit Logging Error:", error);
    }
}

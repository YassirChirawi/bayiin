import { db } from './firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

/**
 * Logs a stock movement for audit purposes.
 * @param {string} storeId - The ID of the store.
 * @param {Object} movement - { productId, variantId, warehouseId, delta, reason, userId, orderId }
 */
export async function logStockMovement(storeId, movement) {
    if (!storeId || !movement.productId) return;
    
    try {
        await addDoc(collection(db, `stores/${storeId}/stock_logs`), {
            ...movement,
            timestamp: serverTimestamp()
        });
    } catch (error) {
        console.error("Stock Audit Logging Error:", error);
    }
}

/**
 * offlineQueue.js
 * Robust offline queue system using IndexedDB.
 * Handles order creation during network outages and syncs when online.
 */

const DB_NAME = 'BayIInOfflineDB';
const DB_VERSION = 1;
const STORE_NAME = 'pending_orders';

/**
 * Open or initialize the IndexedDB
 */
const openDB = () => {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
            }
        };

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
};

/**
 * Add an order to the offline queue
 * @param {object} orderData - The order data to be synced
 */
export async function queueOrder(orderData) {
    try {
        const db = await openDB();
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        
        const item = {
            data: orderData,
            timestamp: new Date().toISOString(),
            retryCount: 0,
            status: 'pending'
        };

        return new Promise((resolve, reject) => {
            const request = store.add(item);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    } catch (error) {
        console.error('Failed to queue order offline:', error);
        // Fallback to localStorage if IndexedDB fails
        const legacyQueue = JSON.parse(localStorage.getItem('offline_orders_fallback') || '[]');
        legacyQueue.push(orderData);
        localStorage.setItem('offline_orders_fallback', JSON.stringify(legacyQueue));
    }
}

/**
 * Get all pending orders from the queue
 */
export async function getPendingOrders() {
    try {
        const db = await openDB();
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        
        return new Promise((resolve, reject) => {
            const request = store.getAll();
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    } catch (error) {
        return [];
    }
}

/**
 * Remove an order from the queue after successful sync
 */
export async function dequeueOrder(id) {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    return new Promise((resolve, reject) => {
        const request = store.delete(id);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
}

/**
 * Synchronize all pending orders
 * @param {Function} syncFn - The function that sends the order to the server (Firestore)
 */
export async function syncPendingOrders(syncFn) {
    if (!navigator.onLine) return { synced: 0, total: 0 };

    const pending = await getPendingOrders();
    if (pending.length === 0) return { synced: 0, total: 0 };

    let successCount = 0;
    for (const item of pending) {
        try {
            await syncFn(item.data);
            await dequeueOrder(item.id);
            successCount++;
        } catch (error) {
            console.error('Failed to sync offline order:', error);
            // Optionally increment retryCount here
        }
    }

    return { synced: successCount, total: pending.length };
}

/**
 * Get the count of pending orders
 */
export async function getPendingCount() {
    const pending = await getPendingOrders();
    return pending.length;
}

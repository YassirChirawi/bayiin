import { getFunctions, httpsCallable } from "firebase/functions";

/**
 * Recalculates all statistics for a store by invoking a backend Cloud Function.
 * This fixes any drift caused by missed webhooks or concurrent edits,
 * without downloading thousands of documents to the client.
 * 
 * @param {Firestore} db (not used anymore, kept for backwards compatibility)
 * @param {string} storeId 
 * @returns {Promise<Object>} The status of the operation
 */
export const reconcileStoreStats = async (db, storeId) => {
    try {
        const functions = getFunctions();
        const manualReconciliation = httpsCallable(functions, 'manualReconciliation');
        
        console.log(`Calling backend reconciliation for ${storeId}...`);
        const result = await manualReconciliation({ storeId });
        
        return result.data;
    } catch (error) {
        console.error("Reconciliation failed:", error);
        throw error;
    }
};

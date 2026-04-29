import { db } from './firebase';
import { collection, addDoc, query, where, getDocs, serverTimestamp, orderBy } from 'firebase/firestore';

/**
 * Adds a refund document to the store's refunds collection.
 */
export const addRefund = async (storeId, { orderId, amount, reason, date }) => {
    if (!storeId) throw new Error("Store ID is required");
    
    const refundData = {
        orderId,
        amount: parseFloat(amount) || 0,
        reason: reason || "Remboursement client",
        date: date || new Date().toISOString().split('T')[0],
        createdAt: serverTimestamp(),
        storeId
    };

    const docRef = await addDoc(collection(db, "refunds"), refundData);
    return docRef.id;
};

/**
 * Fetches refunds for a specific store and optional month.
 * @param {string} storeId 
 * @param {string} month - Format YYYY-MM
 */
export const getRefunds = async (storeId, month = null) => {
    if (!storeId) return [];

    let q = query(
        collection(db, "refunds"),
        where("storeId", "==", storeId),
        orderBy("date", "desc")
    );

    if (month) {
        // Simple string prefix match for YYYY-MM
        q = query(
            collection(db, "refunds"),
            where("storeId", "==", storeId),
            where("date", ">=", `${month}-01`),
            where("date", "<=", `${month}-31`),
            orderBy("date", "desc")
        );
    }

    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

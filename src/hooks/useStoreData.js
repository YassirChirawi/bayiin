import { useEffect, useState } from 'react';
import { collection, query, where, onSnapshot, addDoc, doc, deleteDoc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useTenant } from '../context/TenantContext';

export function useStoreData(collectionName) {
    const { store } = useTenant();
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (!store?.id) {
            setData([]);
            setLoading(false);
            return;
        }

        setLoading(true);
        // Create a query against the collection, filtered by storeId
        const q = query(
            collection(db, collectionName),
            where("storeId", "==", store.id)
        );

        // Subscribe to real-time updates
        const unsubscribe = onSnapshot(q,
            (snapshot) => {
                const docs = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));
                setData(docs);
                setLoading(false);
            },
            (err) => {
                console.error("Error fetching store data:", err);
                setError(err);
                setLoading(false);
            }
        );

        return () => unsubscribe();
    }, [store, collectionName]);

    // Helper function to add a document with the current storeId automatically attached
    const addStoreItem = async (itemData) => {
        if (!store?.id) throw new Error("No active store found");
        return addDoc(collection(db, collectionName), {
            ...itemData,
            storeId: store.id,
            createdAt: new Date()
        });
    };

    // Helper to soft delete an item
    const deleteStoreItem = async (itemId) => {
        return updateDoc(doc(db, collectionName, itemId), {
            deleted: true,
            deletedAt: new Date()
        });
    };

    // Helper to restore an item
    const restoreStoreItem = async (itemId) => {
        return updateDoc(doc(db, collectionName, itemId), {
            deleted: false,
            deletedAt: null
        });
    };

    // Helper to permanently delete an item
    const permanentDeleteStoreItem = async (itemId) => {
        return deleteDoc(doc(db, collectionName, itemId));
    };

    // Helper to update an item
    const updateStoreItem = async (itemId, updates) => {
        return updateDoc(doc(db, collectionName, itemId), updates);
    };

    return {
        data,
        loading,
        error,
        addStoreItem,
        deleteStoreItem,
        restoreStoreItem,
        permanentDeleteStoreItem,
        updateStoreItem
    };
}

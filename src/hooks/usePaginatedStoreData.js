import { useState, useEffect, useCallback } from 'react';
import {
    collection,
    query,
    where,
    orderBy,
    limit,
    startAfter,
    getDocs,
    addDoc,
    doc,
    updateDoc,
    deleteDoc
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useTenant } from '../context/TenantContext';

export function usePaginatedStoreData(collectionName, pageSize = 20, initialConstraints = []) {
    const { store } = useTenant();
    const [data, setData] = useState([]);
    const [lastDoc, setLastDoc] = useState(null);
    const [loading, setLoading] = useState(false);
    const [loadingMore, setLoadingMore] = useState(false);
    const [hasMore, setHasMore] = useState(true);
    const [error, setError] = useState(null);

    // Initial Load
    const loadData = useCallback(async (isRefresh = false) => {
        if (!store?.id) return;

        setLoading(true);
        setError(null);
        try {
            // Base Constraints: Store ID + optional initial constraints (e.g. orderBy date)
            const constraints = [
                where("storeId", "==", store.id),
                ...initialConstraints,
                limit(pageSize)
            ];

            const q = query(collection(db, collectionName), ...constraints);
            const snapshot = await getDocs(q);

            const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setData(docs);
            setLastDoc(snapshot.docs[snapshot.docs.length - 1]);
            setHasMore(snapshot.docs.length === pageSize);
        } catch (err) {
            console.error(`Error fetching ${collectionName}:`, err);
            setError(err);
        } finally {
            setLoading(false);
        }
    }, [store?.id, collectionName, pageSize, JSON.stringify(initialConstraints)]);

    // Load More
    const loadMore = useCallback(async () => {
        if (!store?.id || !lastDoc || !hasMore || loadingMore) return;

        setLoadingMore(true);
        try {
            const constraints = [
                where("storeId", "==", store.id),
                ...initialConstraints,
                startAfter(lastDoc),
                limit(pageSize)
            ];

            const q = query(collection(db, collectionName), ...constraints);
            const snapshot = await getDocs(q);

            const newDocs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

            setData(prev => [...prev, ...newDocs]);
            setLastDoc(snapshot.docs[snapshot.docs.length - 1]);
            setHasMore(snapshot.docs.length === pageSize);
        } catch (err) {
            console.error(`Error loading more ${collectionName}:`, err);
            setError(err);
        } finally {
            setLoadingMore(false);
        }
    }, [store?.id, collectionName, pageSize, lastDoc, hasMore, loadingMore, JSON.stringify(initialConstraints)]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    // CRUD Ops (Similar to useStoreData, but need to update local state manually since no real-time listener?)
    // Note: Hybrid approach. Real-time is expensive for lists. We use Manual Fetch for lists.
    // So we must manually update local 'data' state on add/update/delete.

    const addStoreItem = async (itemData) => {
        if (!store?.id) throw new Error("No active store");
        const docRef = await addDoc(collection(db, collectionName), {
            ...itemData,
            storeId: store.id,
            createdAt: new Date()
        });
        // Prepend to list
        const newItem = { id: docRef.id, ...itemData, storeId: store.id, createdAt: new Date() };
        setData(prev => [newItem, ...prev]);
        return docRef;
    };

    const updateStoreItem = async (id, updates) => {
        await updateDoc(doc(db, collectionName, id), updates);
        setData(prev => prev.map(item => item.id === id ? { ...item, ...updates } : item));
    };

    const deleteStoreItem = async (id) => { // Soft Delete
        await updateDoc(doc(db, collectionName, id), { deleted: true });
        // Assuming we filter out deleted items in the UI or fetch?
        // If fetch includes deleted items (usually not), we update state.
        // If we want to remove from view:
        setData(prev => prev.map(item => item.id === id ? { ...item, deleted: true } : item));
    };

    const restoreStoreItem = async (id) => {
        await updateDoc(doc(db, collectionName, id), { deleted: false });
        setData(prev => prev.map(item => item.id === id ? { ...item, deleted: false } : item));
    };

    const permanentDeleteStoreItem = async (id) => {
        await deleteDoc(doc(db, collectionName, id));
        setData(prev => prev.filter(item => item.id !== id));
    };

    return {
        data,
        loading,
        loadingMore,
        hasMore,
        error,
        loadMore,
        refresh: loadData,
        addStoreItem,
        updateStoreItem,
        deleteStoreItem,
        restoreStoreItem,
        permanentDeleteStoreItem
    };
}

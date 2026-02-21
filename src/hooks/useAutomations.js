import { useState, useCallback, useEffect } from 'react';
import { collection, doc, addDoc, updateDoc, deleteDoc, query, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useTenant } from '../context/TenantContext';
import { toast } from 'react-hot-toast';

export const useAutomations = () => {
    const [automations, setAutomations] = useState([]);
    const [loading, setLoading] = useState(true);
    const { store } = useTenant();

    useEffect(() => {
        if (!store?.id) {
            setAutomations([]);
            setLoading(false);
            return;
        }

        const automationsRef = collection(db, `stores/${store.id}/automations`);
        const q = query(automationsRef);

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const autosData = [];
            snapshot.forEach((doc) => {
                autosData.push({ id: doc.id, ...doc.data() });
            });
            // Sort by creation date descending
            autosData.sort((a, b) => {
                const dateA = a.createdAt?.toMillis() || 0;
                const dateB = b.createdAt?.toMillis() || 0;
                return dateB - dateA;
            });

            setAutomations(autosData);
            setLoading(false);
        }, (error) => {
            console.error("Error fetching automations:", error);
            // If missing permissions for reading automations, just assume empty list rather than fail completely
            if (error.code === 'permission-denied') {
                setAutomations([]);
            } else {
                toast.error("Erreur lors du chargement des automatisations.");
            }
            setLoading(false);
        });

        return () => unsubscribe();
    }, [store?.id]);

    const addAutomation = useCallback(async (automationData) => {
        if (!store?.id) return null;
        try {
            const automationsRef = collection(db, `stores/${store.id}/automations`);
            const docRef = await addDoc(automationsRef, {
                ...automationData,
                status: 'active', // default
                lastRun: null,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp()
            });
            toast.success('Automatisation créée avec succès.');
            return docRef.id;
        } catch (error) {
            console.error("Error adding automation:", error);
            toast.error("Erreur lors de la création.");
            throw error;
        }
    }, [store?.id]);

    const updateAutomation = useCallback(async (id, automationData) => {
        if (!store?.id) return;
        try {
            const autoRef = doc(db, `stores/${store.id}/automations`, id);
            await updateDoc(autoRef, {
                ...automationData,
                updatedAt: serverTimestamp()
            });
            toast.success('Automatisation mise à jour.');
        } catch (error) {
            console.error("Error updating automation:", error);
            toast.error("Erreur lors de la mise à jour.");
            throw error;
        }
    }, [store?.id]);

    const toggleAutomationStatus = useCallback(async (id, currentStatus) => {
        const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
        await updateAutomation(id, { status: newStatus });
    }, [updateAutomation]);

    const deleteAutomation = useCallback(async (id) => {
        if (!store?.id) return;
        try {
            const autoRef = doc(db, `stores/${store.id}/automations`, id);
            await deleteDoc(autoRef);
            toast.success('Automatisation supprimée.');
        } catch (error) {
            console.error("Error deleting automation:", error);
            toast.error("Erreur lors de la suppression.");
            throw error;
        }
    }, [store?.id]);

    return {
        automations,
        loading,
        addAutomation,
        updateAutomation,
        toggleAutomationStatus,
        deleteAutomation
    };
};

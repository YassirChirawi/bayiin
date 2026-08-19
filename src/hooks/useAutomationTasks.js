import { useState, useEffect, useCallback } from 'react';
import { collection, doc, query, onSnapshot, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useTenant } from '../context/TenantContext';
import { toast } from 'react-hot-toast';

/**
 * useAutomationTasks (BAY-105) — boîte de réception des tâches produites par le moteur
 * d'automatisation SERVEUR : messages WhatsApp à envoyer (whatsapp_tasks) et colis à expédier
 * (pending_shipments). Le serveur ne peut pas envoyer un WhatsApp libre (contrainte Meta) ni
 * appeler le transporteur, il dépose donc des tâches actionnables ici pour le marchand.
 *
 * Les docs sont écrits par le backend (Admin SDK) ; le client ne fait que LIRE et marquer traité.
 */
export const useAutomationTasks = () => {
    const [whatsappTasks, setWhatsappTasks] = useState([]);
    const [shipmentTasks, setShipmentTasks] = useState([]);
    const [loading, setLoading] = useState(true);
    const { store } = useTenant();

    useEffect(() => {
        if (!store?.id) {
            setWhatsappTasks([]);
            setShipmentTasks([]);
            setLoading(false);
            return;
        }
        setLoading(true);

        // On filtre/trie côté client (volumes faibles) pour éviter un index composite status+createdAt.
        const pendingSorted = (snapshot) => {
            const rows = [];
            snapshot.forEach((d) => rows.push({ id: d.id, ...d.data() }));
            return rows
                .filter((r) => (r.status || 'pending') === 'pending')
                .sort((a, b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0));
        };

        const onErr = (label) => (error) => {
            if (error.code !== 'permission-denied') console.error(`Error fetching ${label}:`, error);
            setLoading(false);
        };

        const unsubW = onSnapshot(query(collection(db, `stores/${store.id}/whatsapp_tasks`)),
            (snap) => { setWhatsappTasks(pendingSorted(snap)); setLoading(false); }, onErr('whatsapp_tasks'));
        const unsubS = onSnapshot(query(collection(db, `stores/${store.id}/pending_shipments`)),
            (snap) => { setShipmentTasks(pendingSorted(snap)); setLoading(false); }, onErr('pending_shipments'));

        return () => { unsubW(); unsubS(); };
    }, [store]);

    const markWhatsappDone = useCallback(async (taskId) => {
        if (!store?.id) return;
        try {
            await updateDoc(doc(db, `stores/${store.id}/whatsapp_tasks`, taskId), {
                status: 'done', doneAt: serverTimestamp(),
            });
        } catch (e) {
            console.error('markWhatsappDone', e);
            toast.error("Impossible de marquer la tâche traitée.");
        }
    }, [store]);

    const markShipmentDone = useCallback(async (taskId) => {
        if (!store?.id) return;
        try {
            await updateDoc(doc(db, `stores/${store.id}/pending_shipments`, taskId), {
                status: 'done', doneAt: serverTimestamp(),
            });
        } catch (e) {
            console.error('markShipmentDone', e);
            toast.error("Impossible de marquer la tâche traitée.");
        }
    }, [store]);

    return {
        whatsappTasks,
        shipmentTasks,
        pendingCount: whatsappTasks.length + shipmentTasks.length,
        loading,
        markWhatsappDone,
        markShipmentDone,
    };
};

import { useState } from 'react';
import { db } from '../lib/firebase';
import { doc, writeBatch, query, collection, where, getDocs, limit, increment } from 'firebase/firestore';
import { toast } from 'react-hot-toast';
import { PAYMENT_STATUS } from '../utils/constants';
import { isValidTransition, canMarkPaid, PAYMENT_BLOCKED_STATUSES } from '../utils/orderStateMachine';

export function useOrderBulkActions(orders, storeId, user, {
    deleteStoreItem,
    restoreStoreItem,
    permanentDeleteStoreItem,
    logActivity,
    openConfirmation
}) {
    const [selectedOrders, setSelectedOrders] = useState([]);

    // Toggle Select All
    const handleSelectAll = (filteredOrders) => {
        if (selectedOrders.length === filteredOrders.length) {
            setSelectedOrders([]);
        } else {
            setSelectedOrders(filteredOrders.map(o => o.id));
        }
    };

    // Toggle Single Selection
    const handleSelectOne = (id) => {
        setSelectedOrders(prev =>
            prev.includes(id)
                ? prev.filter(oid => oid !== id)
                : [...prev, id]
        );
    };

    // Bulk Delete/Trash
    const handleBulkDelete = async (showTrash, t) => {
        const message = showTrash
            ? t('confirm_bulk_delete_perm', { count: selectedOrders.length })
            : t('confirm_bulk_trash', { count: selectedOrders.length });

        openConfirmation({
            title: showTrash ? "Suppression Définitive" : "Corbeille",
            message: message,
            isDestructive: true,
            onConfirm: async () => {
                await Promise.all(selectedOrders.map(id => showTrash ? permanentDeleteStoreItem(id) : deleteStoreItem(id)));
                setSelectedOrders([]);
                toast.success(showTrash ? t('msg_orders_deleted_perm') : t('msg_orders_moved_trash'));
            }
        });
    };

    // Bulk Restore
    const handleBulkRestore = async (t) => {
        openConfirmation({
            title: "Restaurer",
            message: t('confirm_bulk_restore', { count: selectedOrders.length }),
            onConfirm: async () => {
                await Promise.all(selectedOrders.map(id => restoreStoreItem(id)));
                setSelectedOrders([]);
                toast.success(t('msg_orders_restored'));
            }
        });
    };

    // Bulk Paid
    const handleBulkPaid = async (t) => {
        openConfirmation({
            title: "Marquer comme Payé",
            message: t('confirm_bulk_pay', { count: selectedOrders.length }),
            onConfirm: async () => {
                try {
                    const batch = writeBatch(db);
                    selectedOrders.forEach(id => {
                        const order = orders.find(o => o.id === id);
                        // Intégrité paiement : ignorer déjà payées ET commandes non encaissables.
                        if (!order || order.isPaid || !canMarkPaid(order)) return;
                        const orderRef = doc(db, "orders", id);
                        batch.update(orderRef, { isPaid: true });
                    });

                    await batch.commit();
                    setSelectedOrders([]);
                    toast.success(t('msg_orders_marked_paid'));
                } catch (err) {
                    console.error("Error bulk paying:", err);
                    toast.error("Failed to update payment status");
                }
            }
        });
    };

    // Bulk Remitted (COD)
    const handleBulkRemitted = async () => {
        openConfirmation({
            title: "Marquer comme Encaissé (COD)",
            message: `Marquer ${selectedOrders.length} commandes comme encaissées (fonds reçus du livreur) ?`,
            onConfirm: async () => {
                try {
                    const batch = writeBatch(db);
                    selectedOrders.forEach(id => {
                        const order = orders.find(o => o.id === id);
                        // Ne pas encaisser les commandes non encaissables (annulé/retour/sans réponse/
                        // panier) — sinon revenu réalisé & remis gonflés.
                        if (!order || !canMarkPaid(order)) return;
                        const orderRef = doc(db, "orders", id);
                        batch.update(orderRef, {
                            paymentStatus: PAYMENT_STATUS.REMITTED,
                            isPaid: true
                        });
                    });
                    await batch.commit();
                    setSelectedOrders([]);
                    toast.success("Commandes marquées comme encaissées !");
                } catch (err) {
                    console.error("Error bulk remitting:", err);
                    toast.error("Échec de la mise à jour.");
                }
            }
        });
    };

    // Bulk Status Change
    const handleBulkStatus = async (status, t) => {
        openConfirmation({
            title: "Changer Statut",
            message: t('confirm_bulk_status', { count: selectedOrders.length, status }),
            onConfirm: async () => {
                try {
                    const batch = writeBatch(db);
                    let skippedCount = 0;

                    selectedOrders.forEach(id => {
                        const order = orders.find(o => o.id === id);
                        if (!order) return;

                        // --- STATE MACHINE VALIDATION (BUG-02 fix) ---
                        if (order.status !== status && !isValidTransition(order.status, status)) {
                            skippedCount++;
                            return; // Skip invalid transition
                        }

                        const orderRef = doc(db, "orders", id);
                        const updates = { status };

                        // Intégrité paiement : passer à un statut non encaissable (annulé/retour/
                        // retour en cours/sans réponse/panier) réinitialise isPaid.
                        if (PAYMENT_BLOCKED_STATUSES.includes(status) && order.isPaid) {
                            updates.isPaid = false;
                        }
                        if (status === 'livré' && !order.isPaid) {
                            updates.isPaid = true;
                        }

                        batch.update(orderRef, updates);
                        
                        // Note: Global Store Stats and Driver Stats are now handled centrally 
                        // by onOrderWrite in functions/index.js. We don't update them here.
                    });

                    await batch.commit();
                    setSelectedOrders([]);
                    
                    if (skippedCount > 0) {
                        toast.success(t('msg_orders_status_updated', { status }) + ` (${skippedCount} ignorée(s) — transition invalide)`);
                    } else {
                        toast.success(t('msg_orders_status_updated', { status }));
                    }
                } catch (err) {
                    console.error("Error updating statuses:", err);
                    toast.error("Failed to update orders.");
                }
            }
        });
    };

    // Internal Delivery Pickup
    const handleInternalPickup = async (token, setIsPickupLoading, setIsInternalPickupModalOpen, setInternalDriverToken) => {
        if (!token) {
            toast.error("Veuillez entrer un ID livreur.");
            return;
        }

        setIsPickupLoading(true);
        try {
            // Find driver by token to get their doc ID and update stats
            const driversQ = query(
                collection(db, "drivers"),
                where("storeId", "==", storeId),
                where("livreurToken", "==", token),
                limit(1)
            );
            const driverSnap = await getDocs(driversQ);
            let driverIdSource = null;

            const batch = writeBatch(db);

            if (!driverSnap.empty) {
                const driverDoc = driverSnap.docs[0];
                driverIdSource = driverDoc.id;
                batch.update(driverDoc.ref, {
                    "stats.totalAssigned": increment(selectedOrders.length)
                });
            }

            selectedOrders.forEach(id => {
                const orderRef = doc(db, "orders", id);
                batch.update(orderRef, {
                    status: 'ramassage',
                    livreurToken: token,
                    driverId: driverIdSource, // Link driverId for stats in DeliveryApp
                    [`statusHistory.ramassage`]: new Date().toISOString()
                });
            });

            await batch.commit();
            setSelectedOrders([]);
            setIsInternalPickupModalOpen(false);
            setInternalDriverToken("");
            toast.success(`Assigné au livreur: ${token}`);
            logActivity(db, storeId, user, 'INTERNAL_DELIVERY_ASSIGNED', `Assigned ${selectedOrders.length} orders to ${token}`);
        } catch (error) {
            console.error("Assign error", error);
            toast.error("Erreur d'assignation.");
        } finally {
            setIsPickupLoading(false);
        }
    };

    return {
        selectedOrders,
        setSelectedOrders,
        handleSelectAll,
        handleSelectOne,
        handleBulkDelete,
        handleBulkRestore,
        handleBulkPaid,
        handleBulkRemitted,
        handleBulkStatus,
        handleInternalPickup
    };
}

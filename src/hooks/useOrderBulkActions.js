import { useState } from 'react';
import { db } from '../lib/firebase';
import { doc, writeBatch, query, collection, where, getDocs, limit, increment } from 'firebase/firestore';
import { toast } from 'react-hot-toast';
import { PAYMENT_STATUS } from '../utils/constants';

const INACTIVE_STATUSES = ['retour', 'annulé'];

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
                        if (!order || order.isPaid) return;
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

                    const statsRef = doc(db, "stores", storeId, "stats", "sales");
                    const globalStatsUpdates = {};

                    selectedOrders.forEach(id => {
                        const order = orders.find(o => o.id === id);
                        if (!order) return;

                        const orderRef = doc(db, "orders", id);
                        const updates = { status };

                        // Financial Logic matching Orders.jsx refactor
                        if (INACTIVE_STATUSES.includes(status) && order.isPaid) {
                            updates.isPaid = false;
                        }
                        if (status === 'livré' && !order.isPaid) {
                            updates.isPaid = true;
                        }

                        batch.update(orderRef, updates);

                        // Global Stats Logic
                        if (order.status !== status) {
                            globalStatsUpdates[`statusCounts.${order.status || 'reçu'}`] = increment(-1);
                            globalStatsUpdates[`statusCounts.${status}`] = increment(1);

                            if (status === 'livré' && order.status !== 'livré') {
                                globalStatsUpdates["totals.deliveredRevenue"] = increment(parseFloat(order.price) || 0);
                                globalStatsUpdates["totals.deliveredCount"] = increment(1);
                                if (order.driverId) {
                                    batch.update(doc(db, "drivers", order.driverId), {
                                        "stats.totalDelivered": increment(1),
                                        "stats.totalCOD": increment(parseFloat(order.price) || 0)
                                    });
                                }
                            } else if (order.status === 'livré' && status !== 'livré') {
                                globalStatsUpdates["totals.deliveredRevenue"] = increment(-(parseFloat(order.price) || 0));
                                globalStatsUpdates["totals.deliveredCount"] = increment(-1);
                                if (order.driverId) {
                                    batch.update(doc(db, "drivers", order.driverId), {
                                        "stats.totalDelivered": increment(-1),
                                        "stats.totalCOD": increment(-(parseFloat(order.price) || 0))
                                    });
                                }
                            }
                        }
                    });

                    if (Object.keys(globalStatsUpdates).length > 0) {
                        batch.update(statsRef, globalStatsUpdates);
                    }

                    await batch.commit();
                    setSelectedOrders([]);
                    toast.success(t('msg_orders_status_updated', { status }));
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

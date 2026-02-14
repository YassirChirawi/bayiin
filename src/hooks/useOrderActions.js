import { useState } from 'react';
import { db } from '../lib/firebase';
import { runTransaction, doc, serverTimestamp, increment } from 'firebase/firestore';
import { ORDER_STATUS } from '../utils/constants';
import { useTenant } from '../context/TenantContext';
import { authenticateOlivraison, createOlivraisonPackage } from '../lib/olivraison';
import { authenticateSendit, createSenditPackage } from '../lib/sendit';
import { logActivity } from '../utils/logger'; // NEW
import { useAuth } from '../context/AuthContext'; // NEW

export const useOrderActions = () => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const { store } = useTenant();
    const { user } = useAuth();

    // Helpers to determine if stock should be adjusted
    const shouldRestock = (oldStatus, newStatus) => {
        const isCancelledOrReturned = [ORDER_STATUS.CANCELLED, ORDER_STATUS.RETURNED, ORDER_STATUS.NO_ANSWER].includes(newStatus);
        const wasActive = ![ORDER_STATUS.CANCELLED, ORDER_STATUS.RETURNED, ORDER_STATUS.NO_ANSWER].includes(oldStatus);
        return wasActive && isCancelledOrReturned;
    };

    const shouldDeductStock = (oldStatus, newStatus) => {
        const wasCancelledOrReturned = [ORDER_STATUS.CANCELLED, ORDER_STATUS.RETURNED, ORDER_STATUS.NO_ANSWER].includes(oldStatus);
        const isActive = ![ORDER_STATUS.CANCELLED, ORDER_STATUS.RETURNED, ORDER_STATUS.NO_ANSWER].includes(newStatus);
        return wasCancelledOrReturned && isActive;
    };

    const createOrder = async (orderData) => {
        setLoading(true);
        setError(null);
        try {
            await runTransaction(db, async (transaction) => {
                // 1. Create Order (Stock handled by Cloud Functions)
                const newOrderRef = doc(db, "orders", crypto.randomUUID());
                transaction.set(newOrderRef, {
                    ...orderData,
                    createdAt: serverTimestamp(),
                    status: ORDER_STATUS.RECEIVED,
                    isPaid: false,
                    paymentMethod: 'cod' // Default
                });
            });
            setLoading(false);
            return true;
        } catch (err) {
            console.error("Transaction Error:", err);
            setError(err.message);
            setLoading(false);
            return false;
        }
    };

    const updateOrder = async (orderId, oldData, newData) => {
        setLoading(true);
        setError(null);
        try {
            await runTransaction(db, async (transaction) => {
                const orderRef = doc(db, "orders", orderId);
                let customerDoc = null;
                const customerRef = newData.customerId ? doc(db, "customers", newData.customerId) : null;

                // 0. Pre-fetch Customer if needed (READ BEFORE WRITE)
                if (customerRef) {
                    customerDoc = await transaction.get(customerRef);
                }

                // 1. Stock Adjustments - MOVED TO CLOUD FUNCTIONS


                // 2. Update Order
                transaction.update(orderRef, {
                    ...newData,
                    updatedAt: serverTimestamp()
                });

                // 3. Update Customer Profile if linked
                if (customerDoc && customerDoc.exists()) {
                    transaction.update(customerRef, {
                        name: newData.clientName,
                        phone: newData.clientPhone,
                        address: newData.clientAddress,
                        city: newData.clientCity,
                        updatedAt: serverTimestamp()
                    });
                }
            });
            setLoading(false);
            return true;
        } catch (err) {
            console.error("Update Error:", err);
            setError(err.message);
            setLoading(false);
            return false;
        }
    };


    const sendToOlivraison = async (order) => {
        setLoading(true);
        setError(null);
        try {
            if (!store.olivraisonApiKey || !store.olivraisonSecretKey) {
                throw new Error("O-Livraison API keys not configured in Settings.");
            }

            // 1. Authenticate
            const token = await authenticateOlivraison(store.olivraisonApiKey, store.olivraisonSecretKey);

            // 2. Create Package
            const result = await createOlivraisonPackage(token, order, store);

            // 3. Update Order with Tracking Info
            await runTransaction(db, async (transaction) => {
                const orderRef = doc(db, "orders", order.id);
                transaction.update(orderRef, {
                    carrier: 'olivraison',
                    trackingId: result.trackingID || 'PENDING',
                    carrierStatus: result.status || 'CREATED',
                    status: 'livraison', // Auto-move to Shipping status
                    updatedAt: serverTimestamp()
                });
            });

            setLoading(false);
            return result;
        } catch (err) {
            console.error("O-Livraison Error:", err);
            setError(err.message);
            setLoading(false);
            throw err;
        }
    };

    const sendToSendit = async (order) => {
        setLoading(true);
        setError(null);
        try {
            if (!store.senditPublicKey || !store.senditSecretKey) {
                throw new Error("Sendit API keys not configured in Settings.");
            }

            // 1. Authenticate (Benefit from caching inside senditService)
            const token = await authenticateSendit(store.senditPublicKey, store.senditSecretKey);

            // 2. Create Package
            const result = await createSenditPackage(token, order, store);

            // 3. Update Order with Tracking Info
            await runTransaction(db, async (transaction) => {
                const orderRef = doc(db, "orders", order.id);
                transaction.update(orderRef, {
                    carrier: 'sendit',
                    trackingId: result.code || 'PENDING',
                    carrierStatus: result.status || 'PENDING',
                    labelUrl: result.label_url || "",
                    status: 'livraison', // Auto-move to Shipping status
                    updatedAt: serverTimestamp()
                });
            });

            setLoading(false);
            return result;
        } catch (err) {
            console.error("Sendit Error:", err);
            setError(err.message);
            setLoading(false);
            throw err;
        }
    };

    return { createOrder, updateOrder, sendToOlivraison, sendToSendit, loading, error };
};

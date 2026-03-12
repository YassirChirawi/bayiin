import { useState } from 'react';
import { db } from '../lib/firebase';
import { runTransaction, doc, serverTimestamp, increment, collection, query, where, getDocs, limit } from 'firebase/firestore';
import { ORDER_STATUS } from '../utils/constants';
import { useTenant } from '../context/TenantContext';
import { authenticateOlivraison, createOlivraisonPackage } from '../lib/olivraison';
import { authenticateSendit, createSenditPackage } from '../lib/sendit';
import { logActivity } from '../utils/logger'; // NEW
import { useAuth } from '../context/AuthContext'; // NEW
import { runAutomations } from '../utils/automationEngine'; // NEW

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
        const wasCancelledOrReturned = [ORDER_STATUS.CANCELLED, ORDER_STATUS.RETURNED, ORDER_STATUS.NO_ANSWER, 'pending_catalog'].includes(oldStatus);
        const isActive = ![ORDER_STATUS.CANCELLED, ORDER_STATUS.RETURNED, ORDER_STATUS.NO_ANSWER, 'pending_catalog'].includes(newStatus);
        return wasCancelledOrReturned && isActive;
    };

    const createOrder = async (orderData) => {
        setLoading(true);
        setError(null);
        try {
            await runTransaction(db, async (transaction) => {
                // 1. Handle Customer (Find by phone OR Create)
                let customerId = orderData.customerId;
                if (!customerId && orderData.clientPhone) {
                    const customersQ = query(
                        collection(db, "customers"),
                        where("storeId", "==", store.id),
                        where("phone", "==", orderData.clientPhone),
                        limit(1)
                    );
                    const customerSnap = await getDocs(customersQ);

                    if (!customerSnap.empty) {
                        customerId = customerSnap.docs[0].id;
                        // Update existing customer stats
                        transaction.update(doc(db, "customers", customerId), {
                            lastOrderDate: new Date().toISOString().split('T')[0],
                            totalSpent: increment(parseFloat(orderData.price) || 0),
                            orderCount: increment(1),
                            updatedAt: serverTimestamp()
                        });
                    } else if (orderData.clientName) {
                        // Create new customer
                        const newCustomerRef = doc(collection(db, "customers"));
                        customerId = newCustomerRef.id;
                        transaction.set(newCustomerRef, {
                            storeId: store.id,
                            name: orderData.clientName,
                            phone: orderData.clientPhone,
                            address: orderData.clientAddress || "",
                            city: orderData.clientCity || "",
                            totalSpent: parseFloat(orderData.price) || 0,
                            orderCount: 1,
                            firstOrderDate: new Date().toISOString().split('T')[0],
                            lastOrderDate: new Date().toISOString().split('T')[0],
                            createdAt: serverTimestamp(),
                            updatedAt: serverTimestamp()
                        });
                    }
                }

                // 2. Handle Stock Deduction
                const deductStockForProduct = async (articleId, variantId, quantity) => {
                    const productRef = doc(db, "products", articleId);
                    const productSnap = await transaction.get(productRef);

                    if (productSnap.exists()) {
                        const product = productSnap.data();
                        const qty = parseInt(quantity) || 1;

                        if (product.isVariable && variantId) {
                            const newVariants = (product.variants || []).map(v => {
                                if (v.id === variantId) {
                                    return { ...v, stock: (parseInt(v.stock) || 0) - qty };
                                }
                                return v;
                            });
                            transaction.update(productRef, {
                                variants: newVariants,
                                stock: increment(-qty)
                            });
                        } else {
                            let stockUpdates = { stock: increment(-qty) };

                            // FEFO logic for batches
                            if (product.inventoryBatches && product.inventoryBatches.length > 0) {
                                // Important: We clone the array to avoid mutating the original directly in place before updating
                                // Then sort by expiryDate ascending (oldest first)
                                let updatedBatches = [...product.inventoryBatches].sort((a, b) => new Date(a.expiryDate || 0) - new Date(b.expiryDate || 0));
                                let remainingQty = qty;

                                for (let i = 0; i < updatedBatches.length && remainingQty > 0; i++) {
                                    let batch = updatedBatches[i];
                                    let batchQty = parseInt(batch.quantity) || 0;

                                    if (batchQty > 0) {
                                        let deductAmount = Math.min(batchQty, remainingQty);
                                        batch.quantity = batchQty - deductAmount;
                                        remainingQty -= deductAmount;
                                    }
                                }
                                stockUpdates.inventoryBatches = updatedBatches;
                            }

                            transaction.update(productRef, stockUpdates);
                        }
                    }
                };

                if (orderData.articleId) {
                    await deductStockForProduct(orderData.articleId, orderData.variantId, orderData.quantity);
                } else if (orderData.products && Array.isArray(orderData.products)) {
                    for (const item of orderData.products) {
                        await deductStockForProduct(item.id, item.variantId, item.quantity);
                    }
                }

                // 3. Create Order
                const newOrderRef = doc(db, "orders", crypto.randomUUID());
                transaction.set(newOrderRef, {
                    ...orderData,
                    customerId: customerId || null,
                    createdAt: serverTimestamp(),
                    status: ORDER_STATUS.RECEIVED,
                    isPaid: false,
                    paymentMethod: 'cod'
                });
            });
            // Fire automation AFTER successful transaction
            runAutomations('order_created', { ...orderData, status: ORDER_STATUS.RECEIVED }, store).catch(console.error);
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

                // 1. Stock Adjustments
                const adjustStock = async (articleId, variantId, quantity, isRestock) => {
                    const productRef = doc(db, "products", articleId);
                    const productSnap = await transaction.get(productRef);
                    const qty = parseInt(quantity) || 1;
                    const change = isRestock ? qty : -qty;

                    if (productSnap.exists()) {
                        const product = productSnap.data();
                        if (product.isVariable && variantId) {
                            const newVariants = (product.variants || []).map(v => {
                                if (v.id === variantId) {
                                    return { ...v, stock: (parseInt(v.stock) || 0) + change };
                                }
                                return v;
                            });
                            transaction.update(productRef, { variants: newVariants, stock: increment(change) });
                        } else {
                            let stockUpdates = { stock: increment(change) };

                            if (product.inventoryBatches && product.inventoryBatches.length > 0) {
                                let updatedBatches = [...product.inventoryBatches];

                                if (change > 0) {
                                    // Restocking: add to the newest batch (highest expiry date)
                                    updatedBatches.sort((a, b) => new Date(b.expiryDate || 0) - new Date(a.expiryDate || 0));
                                    updatedBatches[0].quantity = (parseInt(updatedBatches[0].quantity) || 0) + change;
                                } else if (change < 0) {
                                    // Deducting (FEFO)
                                    let remainingQty = Math.abs(change);
                                    updatedBatches.sort((a, b) => new Date(a.expiryDate || 0) - new Date(b.expiryDate || 0));
                                    for (let i = 0; i < updatedBatches.length && remainingQty > 0; i++) {
                                        let batch = updatedBatches[i];
                                        let batchQty = parseInt(batch.quantity) || 0;
                                        if (batchQty > 0) {
                                            let deductAmount = Math.min(batchQty, remainingQty);
                                            batch.quantity = batchQty - deductAmount;
                                            remainingQty -= deductAmount;
                                        }
                                    }
                                }
                                stockUpdates.inventoryBatches = updatedBatches;
                            }

                            transaction.update(productRef, stockUpdates);
                        }
                    }
                };

                const restock = shouldRestock(oldData.status, newData.status);
                const deduct = shouldDeductStock(oldData.status, newData.status);

                if (restock || deduct) {
                    if (newData.articleId) {
                        await adjustStock(newData.articleId, newData.variantId, newData.quantity, restock);
                    } else if (newData.products) {
                        for (const item of newData.products) {
                            await adjustStock(item.id, item.variantId, item.quantity, restock);
                        }
                    }
                } else if (oldData.articleId !== newData.articleId) {
                    // Product changed (Admin Modal case)
                    if (oldData.articleId) await adjustStock(oldData.articleId, oldData.variantId, oldData.quantity, true);
                    if (newData.articleId) await adjustStock(newData.articleId, newData.variantId, newData.quantity, false);
                }

                // 2. Update Order
                transaction.update(orderRef, {
                    ...newData,
                    updatedAt: serverTimestamp()
                });

                // 3. Update Customer Profile OR CREATE if phone changed/added
                if (customerRef && customerDoc && customerDoc.exists()) {
                    transaction.update(customerRef, {
                        name: newData.clientName,
                        phone: newData.clientPhone,
                        address: newData.clientAddress,
                        city: newData.clientCity,
                        updatedAt: serverTimestamp()
                    });
                } else if (!newData.customerId && newData.clientPhone) {
                    // Try to find by phone again or create (identical to createOrder logic but shorter)
                    const customersQ = query(
                        collection(db, "customers"),
                        where("storeId", "==", store.id),
                        where("phone", "==", newData.clientPhone),
                        limit(1)
                    );
                    const customerSnap = await getDocs(customersQ);
                    if (!customerSnap.empty) {
                        const foundId = customerSnap.docs[0].id;
                        transaction.update(orderRef, { customerId: foundId });
                        transaction.update(doc(db, "customers", foundId), {
                            name: newData.clientName,
                            address: newData.clientAddress,
                            city: newData.clientCity,
                            updatedAt: serverTimestamp()
                        });
                    } else if (newData.clientName) {
                        const newCustRef = doc(collection(db, "customers"));
                        transaction.set(newCustRef, {
                            storeId: store.id,
                            name: newData.clientName,
                            phone: newData.clientPhone,
                            address: newData.clientAddress || "",
                            city: newData.clientCity || "",
                            totalSpent: parseFloat(newData.price) || 0,
                            orderCount: 1,
                            firstOrderDate: new Date().toISOString().split('T')[0],
                            lastOrderDate: new Date().toISOString().split('T')[0],
                            createdAt: serverTimestamp(),
                            updatedAt: serverTimestamp()
                        });
                        transaction.update(orderRef, { customerId: newCustRef.id });
                    }
                }

                // 4. Update Global Store Stats
                const statsRef = doc(db, "stores", store.id, "stats", "sales");
                const statsUpdates = {};
                if (oldData.status !== newData.status) {
                    statsUpdates[`statusCounts.${oldData.status || 'reçu'}`] = increment(-1);
                    statsUpdates[`statusCounts.${newData.status}`] = increment(1);

                    // Specific logic for realized revenue
                    if (newData.status === 'livré' && oldData.status !== 'livré') {
                        statsUpdates["totals.deliveredRevenue"] = increment(parseFloat(newData.price) || 0);
                        statsUpdates["totals.deliveredCount"] = increment(1);
                    } else if (oldData.status === 'livré' && newData.status !== 'livré') {
                        statsUpdates["totals.deliveredRevenue"] = increment(-(parseFloat(oldData.price) || 0));
                        statsUpdates["totals.deliveredCount"] = increment(-1);
                    }
                }
                if (Object.keys(statsUpdates).length > 0) {
                    transaction.update(statsRef, statsUpdates);
                }
            });

            // If status changed, trigger automation
            if (oldData.status !== newData.status) {
                runAutomations('order_updated', { ...newData, id: orderId }, store).catch(console.error);
            }

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

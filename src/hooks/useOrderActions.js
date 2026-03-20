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
import { useAudit } from './useAudit'; // NEW

export const useOrderActions = () => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const { store } = useTenant();
    const { user } = useAuth();
    const { logAction } = useAudit();

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
            // Non-transactional reads FIRST
            let customerId = orderData.customerId;
            let existingCustomerId = null;
            if (!customerId && orderData.clientPhone) {
                const customersQ = query(
                    collection(db, "customers"),
                    where("storeId", "==", store.id),
                    where("phone", "==", orderData.clientPhone),
                    limit(1)
                );
                const customerSnap = await getDocs(customersQ);
                if (!customerSnap.empty) {
                    existingCustomerId = customerSnap.docs[0].id;
                }
            }

            // Products to process
            const itemsToProcess = [];
            if (orderData.articleId) {
                itemsToProcess.push({ id: orderData.articleId, variantId: orderData.variantId, quantity: orderData.quantity });
            } else if (orderData.products && Array.isArray(orderData.products)) {
                for (const item of orderData.products) {
                    itemsToProcess.push({ id: item.id, variantId: item.variantId, quantity: item.quantity });
                }
            }

            await runTransaction(db, async (transaction) => {
                // --- 1. READ PHASE ---
                const productDocs = {};
                for (const item of itemsToProcess) {
                    if (!productDocs[item.id]) {
                        productDocs[item.id] = await transaction.get(doc(db, "products", item.id));
                    }
                }

                // --- 2. WRITE PHASE ---
                let finalCustomerId = customerId || existingCustomerId;
                
                // Write Customer
                if (existingCustomerId) {
                    transaction.update(doc(db, "customers", existingCustomerId), {
                        lastOrderDate: new Date().toISOString().split('T')[0],
                        totalSpent: increment(parseFloat(orderData.price) || 0),
                        orderCount: increment(1),
                        updatedAt: serverTimestamp()
                    });
                } else if (orderData.clientName && !finalCustomerId) {
                    const newCustomerRef = doc(collection(db, "customers"));
                    finalCustomerId = newCustomerRef.id;
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

                // Write Products
                for (const item of itemsToProcess) {
                    const snap = productDocs[item.id];
                    if (snap && snap.exists()) {
                        const productRef = doc(db, "products", item.id);
                        const product = snap.data();
                        const qty = parseInt(item.quantity) || 1;

                        if (product.isVariable && item.variantId) {
                            const newVariants = (product.variants || []).map(v => {
                                if (v.id === item.variantId) {
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

                            if (product.inventoryBatches && product.inventoryBatches.length > 0) {
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
                }

                // Write Order
                const newOrderRef = doc(db, "orders", crypto.randomUUID());
                transaction.set(newOrderRef, {
                    ...orderData,
                    customerId: finalCustomerId || null,
                    createdAt: serverTimestamp(),
                    status: ORDER_STATUS.RECEIVED,
                    isPaid: false,
                    paymentMethod: 'cod',
                    _stockManagedByClient: true
                });
            });

            logAction('ORDER_CREATE', `Created order for ${orderData.clientName || 'Unknown'}`, {
                orderId: orderData.id || 'N/A',
                price: orderData.price,
                status: ORDER_STATUS.RECEIVED
            });

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
            // Non-transactional reads FIRST
            let existingCustomerId = null;
            if (!newData.customerId && newData.clientPhone) {
                const customersQ = query(
                    collection(db, "customers"),
                    where("storeId", "==", store.id),
                    where("phone", "==", newData.clientPhone),
                    limit(1)
                );
                const customerSnap = await getDocs(customersQ);
                if (!customerSnap.empty) {
                    existingCustomerId = customerSnap.docs[0].id;
                }
            }

            const restock = shouldRestock(oldData.status, newData.status);
            const deduct = shouldDeductStock(oldData.status, newData.status);
            
            // Build list of stock adjustments needed
            const adjustments = []; // { id, variantId, change }
            if (restock || deduct) {
                const isRestock = restock;
                if (newData.articleId) {
                    adjustments.push({ id: newData.articleId, variantId: newData.variantId, quantity: newData.quantity, isRestock });
                } else if (newData.products) {
                    for (const item of newData.products) {
                        adjustments.push({ id: item.id, variantId: item.variantId, quantity: item.quantity, isRestock });
                    }
                }
            } else if (oldData.articleId !== newData.articleId && oldData.articleId && newData.articleId) {
                // Product changed
                adjustments.push({ id: oldData.articleId, variantId: oldData.variantId, quantity: oldData.quantity, isRestock: true });
                adjustments.push({ id: newData.articleId, variantId: newData.variantId, quantity: newData.quantity, isRestock: false });
            }

            await runTransaction(db, async (transaction) => {
                const orderRef = doc(db, "orders", orderId);
                let customerDoc = null;
                const customerRef = newData.customerId ? doc(db, "customers", newData.customerId) : null;

                // --- 1. READ PHASE ---
                if (customerRef) {
                    customerDoc = await transaction.get(customerRef);
                }

                // Read all involved products
                const productDocs = {};
                for (const adj of adjustments) {
                    if (!productDocs[adj.id]) {
                        productDocs[adj.id] = await transaction.get(doc(db, "products", adj.id));
                    }
                }

                // --- 2. WRITE PHASE ---
                
                // Stock Adjustments
                for (const adj of adjustments) {
                    const snap = productDocs[adj.id];
                    if (snap && snap.exists()) {
                        const productRef = doc(db, "products", adj.id);
                        const product = snap.data();
                        const qty = parseInt(adj.quantity) || 1;
                        const change = adj.isRestock ? qty : -qty;

                        if (product.isVariable && adj.variantId) {
                            const newVariants = (product.variants || []).map(v => {
                                if (v.id === adj.variantId) {
                                    return { ...v, stock: (parseInt(v.stock) || 0) + change };
                                }
                                return v;
                            });
                            // Transactionally process updates safely grouping them by ref
                            // As multiple adjustments to the same product might overwrite variants,
                            // Ideally, this should be grouped by product if the same product is in multiple adjustments.
                            // But for normal simple orders (like single product changes), this is fine.
                            transaction.update(productRef, { variants: newVariants, stock: increment(change) });
                        } else {
                            let stockUpdates = { stock: increment(change) };

                            if (product.inventoryBatches && product.inventoryBatches.length > 0) {
                                let updatedBatches = [...product.inventoryBatches];

                                if (change > 0) {
                                    updatedBatches.sort((a, b) => new Date(b.expiryDate || 0) - new Date(a.expiryDate || 0));
                                    updatedBatches[0].quantity = (parseInt(updatedBatches[0].quantity) || 0) + change;
                                } else if (change < 0) {
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
                }

                // Update Customer Profile OR CREATE
                let finalCustomerId = newData.customerId;
                if (customerRef && customerDoc && customerDoc.exists()) {
                    transaction.update(customerRef, {
                        name: newData.clientName,
                        phone: newData.clientPhone,
                        address: newData.clientAddress,
                        city: newData.clientCity,
                        updatedAt: serverTimestamp()
                    });
                } else if (!newData.customerId && existingCustomerId) {
                    finalCustomerId = existingCustomerId;
                    transaction.update(doc(db, "customers", existingCustomerId), {
                        name: newData.clientName,
                        address: newData.clientAddress,
                        city: newData.clientCity,
                        updatedAt: serverTimestamp()
                    });
                } else if (!newData.customerId && newData.clientName) {
                    const newCustRef = doc(collection(db, "customers"));
                    finalCustomerId = newCustRef.id;
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
                }

                // Update Order
                transaction.update(orderRef, {
                    ...newData,
                    customerId: finalCustomerId || null,
                    updatedAt: serverTimestamp(),
                    _stockManagedByClient: true
                });

                // Update Global Store Stats
                const statsRef = doc(db, "stores", store.id, "stats", "sales");
                const statsUpdates = {};
                if (oldData.status !== newData.status) {
                    statsUpdates[`statusCounts.${oldData.status || 'reçu'}`] = increment(-1);
                    statsUpdates[`statusCounts.${newData.status}`] = increment(1);

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

            if (oldData.status !== newData.status) {
                logAction('ORDER_STATUS_UPDATE', `Changed status from ${oldData.status} to ${newData.status}`, {
                    orderId,
                    oldStatus: oldData.status,
                    newStatus: newData.status
                });
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

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
                                    const vWStocks = { ...(v.warehouseStocks || {}) };
                                    if (orderData.warehouseId) {
                                        vWStocks[orderData.warehouseId] = (vWStocks[orderData.warehouseId] || 0) - qty;
                                    }
                                    return { ...v, stock: (parseInt(v.stock) || 0) - qty, warehouseStocks: vWStocks };
                                }
                                return v;
                            });
                            const pUpdates = {
                                variants: newVariants,
                                stock: increment(-qty)
                            };
                            if (orderData.warehouseId) {
                                pUpdates[`warehouseStocks.${orderData.warehouseId}`] = increment(-qty);
                            }
                            transaction.update(productRef, pUpdates);
                        } else {
                            let stockUpdates = { stock: increment(-qty) };
                            if (orderData.warehouseId) {
                                stockUpdates[`warehouseStocks.${orderData.warehouseId}`] = increment(-qty);
                            }

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

                        // --- BUNDLE STOCK DEDUCTION (Épique 3) ---
                        if (product.isBundle && product.bundleItems) {
                            for (const component of product.bundleItems) {
                                const compRef = doc(db, "products", component.productId);
                                const compSnap = await transaction.get(compRef); // Fetching in write phase (allowed if no reads after this)
                                if (compSnap.exists()) {
                                    const compData = compSnap.data();
                                    const totalDeduct = qty * (parseInt(component.qty) || 1);
                                                                        // Apply deduction to component (supporting simple or batches)
                                    let compUpdates = { stock: increment(-totalDeduct) };
                                    if (orderData.warehouseId) {
                                        compUpdates[`warehouseStocks.${orderData.warehouseId}`] = increment(-totalDeduct);
                                    }
                                    if (compData.inventoryBatches && compData.inventoryBatches.length > 0) {
                                        let compUpdatedBatches = [...compData.inventoryBatches].sort((a, b) => new Date(a.expiryDate || 0) - new Date(b.expiryDate || 0));
                                        let remainingQty = totalDeduct;
                                        for (let i = 0; i < compUpdatedBatches.length && remainingQty > 0; i++) {
                                            let b = compUpdatedBatches[i];
                                            let bQty = parseInt(b.quantity) || 0;
                                            if (bQty > 0) {
                                                let deductAmount = Math.min(bQty, remainingQty);
                                                b.quantity = bQty - deductAmount;
                                                remainingQty -= deductAmount;
                                            }
                                        }
                                        compUpdates.inventoryBatches = compUpdatedBatches;
                                    }
                                    transaction.update(compRef, compUpdates);
                                }
                            }
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

                // Update Store Stats (statusCounts)
                const statsRef = doc(db, "stores", store.id, "stats", "sales");
                transaction.update(statsRef, {
                    [`statusCounts.${ORDER_STATUS.RECEIVED}`]: increment(1)
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
            
            // Build list of stock net changes needed
            const netChanges = {}; // { productId_variantId: { id, variantId, netChange } }

            const addChange = (id, variantId, amount) => {
                if (!id) return;
                const key = variantId ? `${id}_${variantId}` : id;
                if (!netChanges[key]) netChanges[key] = { id, variantId, netChange: 0 };
                netChanges[key].netChange += amount;
            };

            const getItems = (data) => {
                let items = [];
                if (data.products && data.products.length > 0) items = [...data.products];
                else if (data.articleId) items.push({ id: data.articleId, variantId: data.variantId, quantity: data.quantity });
                return items;
            };
            if (restock) {
                // Order cancelled -> Add back everything
                getItems(oldData).forEach(item => addChange(item.id, item.variantId, parseInt(item.quantity) || 1));
            } else if (deduct) {
                // Order reactivated -> Deduct everything
                getItems(newData).forEach(item => addChange(item.id, item.variantId, -(parseInt(item.quantity) || 1)));
            } else if (![ORDER_STATUS.CANCELLED, ORDER_STATUS.RETURNED, ORDER_STATUS.NO_ANSWER, 'pending_catalog'].includes(oldData.status)) {
                // Order remained Active. Diff the items.
                // Restock old items
                getItems(oldData).forEach(item => addChange(item.id, item.variantId, parseInt(item.quantity) || 1));
                // Deduct new items
                getItems(newData).forEach(item => addChange(item.id, item.variantId, -(parseInt(item.quantity) || 1)));
            }

            const finalAdjustments = Object.values(netChanges).filter(adj => adj.netChange !== 0);

            // Group by Product ID because a product might have multiple variant changes
            const groupedByProduct = {};
            finalAdjustments.forEach(adj => {
                if (!groupedByProduct[adj.id]) groupedByProduct[adj.id] = [];
                groupedByProduct[adj.id].push(adj);
            });

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
                for (const productId of Object.keys(groupedByProduct)) {
                    if (!productDocs[productId]) {
                        productDocs[productId] = await transaction.get(doc(db, "products", productId));
                    }
                }

                // --- 2. WRITE PHASE ---
                
                // Stock Adjustments
                for (const [productId, productAdjs] of Object.entries(groupedByProduct)) {
                    const snap = productDocs[productId];
                    if (snap && snap.exists()) {
                        const productRef = doc(db, "products", productId);
                        const product = snap.data();
                        
                        let totalStockChange = 0;
                        let newVariants = product.variants ? [...product.variants] : [];
                        let updatedBatches = product.inventoryBatches ? [...product.inventoryBatches] : [];
                        let stockUpdates = {};

                        for (const adj of productAdjs) {
                            totalStockChange += adj.netChange;

                            if (product.isVariable && adj.variantId) {
                                newVariants = newVariants.map(v => {
                                    if (v.id === adj.variantId) {
                                        const vWStocks = { ...(v.warehouseStocks || {}) };
                                        if (newData.warehouseId) {
                                            vWStocks[newData.warehouseId] = (vWStocks[newData.warehouseId] || 0) + adj.netChange;
                                        }
                                        return { ...v, stock: (parseInt(v.stock) || 0) + adj.netChange, warehouseStocks: vWStocks };
                                    }
                                    return v;
                                });
                            } else { // Not variable or no variantId
                                let change = adj.netChange;
                                if (updatedBatches.length > 0) {
                                    if (change > 0) {
                                        // Restock to the oldest batch (simplest approach for restock)
                                        updatedBatches.sort((a, b) => new Date(b.expiryDate || 0) - new Date(a.expiryDate || 0));
                                        updatedBatches[0].quantity = (parseInt(updatedBatches[0].quantity) || 0) + change;
                                    } else if (change < 0) {
                                        // Deduct from FEFO
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
                                }
                            }
                        }

                        if (product.isVariable) {
                            stockUpdates = { variants: newVariants, stock: increment(totalStockChange) };
                            if (newData.warehouseId) {
                                stockUpdates[`warehouseStocks.${newData.warehouseId}`] = increment(totalStockChange);
                            }
                        } else {
                            stockUpdates = { stock: increment(totalStockChange) };
                            if (newData.warehouseId) {
                                stockUpdates[`warehouseStocks.${newData.warehouseId}`] = increment(totalStockChange);
                            }
                            if (updatedBatches.length > 0) stockUpdates.inventoryBatches = updatedBatches;
                        }

                        transaction.update(productRef, stockUpdates);

                        // --- BUNDLE STOCK SYNC (Épique 3) ---
                        if (product.isBundle && product.bundleItems) {
                            for (const component of product.bundleItems) {
                                const compRef = doc(db, "products", component.productId);
                                // For updateOrder, we might not have pre-fetched all components in productDocs
                                const compSnap = productDocs[component.productId] || await transaction.get(compRef);
                                if (compSnap.exists()) {
                                    const compData = compSnap.data();
                                    // totalStockChange is the net change for the bundle product itself
                                    const netCompChange = totalStockChange * (parseInt(component.qty) || 1);
                                    let compUpdates = { stock: increment(netCompChange) };
                                    if (newData.warehouseId) {
                                        compUpdates[`warehouseStocks.${newData.warehouseId}`] = increment(netCompChange);
                                    }

                                    // Handle batches for component
                                    if (compData.inventoryBatches && compData.inventoryBatches.length > 0) {
                                        let compUpdatedBatches = [...compData.inventoryBatches];
                                        if (netCompChange > 0) {
                                            compUpdatedBatches.sort((a, b) => new Date(b.expiryDate || 0) - new Date(a.expiryDate || 0));
                                            compUpdatedBatches[0].quantity = (parseInt(compUpdatedBatches[0].quantity) || 0) + netCompChange;
                                        } else if (netCompChange < 0) {
                                            let remainingQty = Math.abs(netCompChange);
                                            compUpdatedBatches.sort((a, b) => new Date(a.expiryDate || 0) - new Date(b.expiryDate || 0));
                                            for (let i = 0; i < compUpdatedBatches.length && remainingQty > 0; i++) {
                                                let b = compUpdatedBatches[i];
                                                let bQty = parseInt(b.quantity) || 0;
                                                if (bQty > 0) {
                                                    let deduct = Math.min(bQty, remainingQty);
                                                    b.quantity = bQty - deduct;
                                                    remainingQty -= deduct;
                                                }
                                            }
                                        }
                                        compUpdates.inventoryBatches = compUpdatedBatches;
                                    }
                                    transaction.update(compRef, compUpdates);
                                }
                            }
                        }
                    }
                }

                // Update Customer Profile OR CREATE — with lifecycle-aware totalSpent
                let finalCustomerId = newData.customerId;

                if (customerRef && customerDoc && customerDoc.exists()) {
                    const customerUpdates = {
                        name: newData.clientName,
                        phone: newData.clientPhone,
                        address: newData.clientAddress,
                        city: newData.clientCity,
                        updatedAt: serverTimestamp()
                    };

                    if (restock) {
                        // Commande annulée/retournée → retirer le montant et le comptage
                        customerUpdates.totalSpent = increment(-(parseFloat(oldData.price) || 0));
                        customerUpdates.orderCount = increment(-1);
                    } else if (deduct) {
                        // Commande réactivée → remettre le montant et le comptage
                        customerUpdates.totalSpent = increment(parseFloat(newData.price) || 0);
                        customerUpdates.orderCount = increment(1);
                    } else {
                        // Commande toujours active — ajuster le delta de prix si modifié
                        const priceDelta = (parseFloat(newData.price) || 0) - (parseFloat(oldData.price) || 0);
                        if (priceDelta !== 0) {
                            customerUpdates.totalSpent = increment(priceDelta);
                        }
                    }

                    transaction.update(customerRef, customerUpdates);
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

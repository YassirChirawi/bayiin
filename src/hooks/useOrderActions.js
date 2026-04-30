import { useState } from 'react';
import { db } from '../lib/firebase';
import { runTransaction, doc, getDoc, serverTimestamp, increment, collection, query, where, getDocs, limit } from 'firebase/firestore';
import { ORDER_STATUS } from '../utils/constants';
import { useTenant } from '../context/TenantContext';
import { authenticateOlivraison, createOlivraisonPackage } from '../lib/olivraison';
import { authenticateSendit, createSenditPackage } from '../lib/sendit';
import { logActivity } from '../utils/logger'; // NEW
import { useAuth } from '../context/AuthContext'; // NEW
import { runAutomations } from '../utils/automationEngine'; // NEW
import { useAudit } from './useAudit'; // NEW
import { shouldRestock, shouldDeductStock, calculateStockDeltas } from '../utils/orderLogic'; // PURE LOGIC
import { logAudit } from '../lib/audit';
import { logStockMovement } from '../lib/stockAudit';
import { isValidTransition } from '../utils/orderStateMachine';
import { toast } from 'react-hot-toast';
export const useOrderActions = () => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const { store } = useTenant();
    const { user } = useAuth();
    const { logAction } = useAudit();

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

            const newOrderRef = doc(db, "orders", crypto.randomUUID());

            await runTransaction(db, async (transaction) => {
                // === 1. READ PHASE (ALL reads MUST happen before ANY writes) ===
                
                // Read product docs
                const productDocs = {};
                for (const item of itemsToProcess) {
                    if (!productDocs[item.id]) {
                        productDocs[item.id] = await transaction.get(doc(db, "products", item.id));
                    }
                }

                // Read bundle component docs (if any product is a bundle)
                const bundleComponentDocs = {};
                for (const item of itemsToProcess) {
                    const snap = productDocs[item.id];
                    if (snap && snap.exists()) {
                        const product = snap.data();
                        if (product.isBundle && product.bundleItems) {
                            for (const component of product.bundleItems) {
                                if (!bundleComponentDocs[component.productId] && !productDocs[component.productId]) {
                                    bundleComponentDocs[component.productId] = await transaction.get(doc(db, "products", component.productId));
                                }
                            }
                        }
                    }
                }

                // Read stats doc for sequential numbers
                const statsRef = doc(db, "stores", store.id, "stats", "sales");
                const statsSnap = await transaction.get(statsRef);
                const currentStats = statsSnap.exists() ? statsSnap.data() : {};
                const nextOrderNumber = (parseInt(currentStats.lastOrderNumber) || 1000) + 1;
                const nextCustomerNumber = (parseInt(currentStats.lastCustomerNumber) || 5000) + 1;

                // === 2. WRITE PHASE (No more reads after this point) ===
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
                        customerNumber: nextCustomerNumber, // NEW UNIQUE ID
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
                    // Increment customer number in stats
                    transaction.set(statsRef, { lastCustomerNumber: nextCustomerNumber }, { merge: true });
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
                                const compSnap = bundleComponentDocs[component.productId] || productDocs[component.productId];
                                if (compSnap && compSnap.exists()) {
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

                // --- AUTOMATED FINANCIALS ---
                const price = parseFloat(orderData.price) || 0;
                // Try to get costPrice from the first product if not provided
                let costPrice = parseFloat(orderData.costPrice) || 0;
                if (costPrice === 0 && itemsToProcess.length > 0) {
                    const firstProdSnap = productDocs[itemsToProcess[0].id];
                    if (firstProdSnap && firstProdSnap.exists()) {
                        costPrice = parseFloat(firstProdSnap.data().costPrice) || 0;
                    }
                }
                const qty = parseInt(orderData.quantity) || 1;
                const totalCost = costPrice * qty;
                const totalRevenue = price * qty;
                const profit = totalRevenue - totalCost;

                // Write Order
                transaction.set(newOrderRef, {
                    ...orderData,
                    orderNumber: nextOrderNumber,
                    profit: profit,
                    costPrice: costPrice, // Preserve the cost price at time of purchase
                    customerId: finalCustomerId || null,
                    createdAt: serverTimestamp(),
                    status: ORDER_STATUS.RECEIVED,
                    isPaid: false,
                    paymentMethod: 'cod',
                    _stockManagedByClient: true
                });

                // Update Store Stats (statusCounts + lastOrderNumber)
                transaction.set(statsRef, {
                    [`statusCounts.${ORDER_STATUS.RECEIVED}`]: increment(1),
                    lastOrderNumber: nextOrderNumber
                }, { merge: true });
            });

            logAction('ORDER_CREATE', `Created order for ${orderData.clientName || 'Unknown'}`, {
                orderId: orderData.id || 'N/A',
                price: orderData.price,
                status: ORDER_STATUS.RECEIVED
            });

            runAutomations('order_created', { ...orderData, status: ORDER_STATUS.RECEIVED }, store).catch(console.error);
            
            // --- STOCK AUDIT LOG ---
            itemsToProcess.forEach(item => {
                logStockMovement(store.id, {
                    productId: item.id,
                    variantId: item.variantId || null,
                    warehouseId: orderData.warehouseId || 'default',
                    delta: -(parseInt(item.quantity) || 1),
                    reason: 'ORDER_CREATE',
                    orderId: newOrderRef.id,
                    userId: user?.uid || 'system'
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
            const groupedByProduct = calculateStockDeltas(oldData, newData);

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

                // Pre-fetch bundle component docs
                const bundleComponentDocs = {};
                for (const productId of Object.keys(groupedByProduct)) {
                    const snap = productDocs[productId];
                    if (snap && snap.exists()) {
                        const product = snap.data();
                        if (product.isBundle && product.bundleItems) {
                            for (const component of product.bundleItems) {
                                if (!bundleComponentDocs[component.productId] && !productDocs[component.productId]) {
                                    bundleComponentDocs[component.productId] = await transaction.get(doc(db, "products", component.productId));
                                }
                            }
                        }
                    }
                }

                // Read stats doc for sequential numbers
                const statsRef = doc(db, "stores", store.id, "stats", "sales");
                const statsSnap = await transaction.get(statsRef);
                const currentStats = statsSnap.exists() ? statsSnap.data() : {};
                const nextCustomerNumber = (parseInt(currentStats.lastCustomerNumber) || 5000) + 1;

                // --- 2. WRITE PHASE (No more reads after this point) ---
                
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
                                        if (adj.warehouseId) {
                                            vWStocks[adj.warehouseId] = (vWStocks[adj.warehouseId] || 0) + adj.netChange;
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
                            // Apply net warehouse changes for variable product (grouped)
                            // Actually, for variable products, warehouse stocks are inside the variants array.
                            // But we might also track a global warehouse stock for the parent product for some reason?
                            // Usually not, but if so, we'd need to loop over adjs.
                            // For simplicity, let's just use the current order warehouse for the parent if needed.
                            if (newData.warehouseId && totalStockChange !== 0) {
                                // This is tricky because totalStockChange might be across multiple warehouses if switched.
                                // But parent stock is usually the sum of all.
                                stockUpdates[`warehouseStocks.${newData.warehouseId}`] = increment(totalStockChange);
                            }
                        } else {
                            stockUpdates = { stock: increment(totalStockChange) };
                            // Apply warehouse adjustments for simple product
                            for (const adj of productAdjs) {
                                if (adj.warehouseId) {
                                    stockUpdates[`warehouseStocks.${adj.warehouseId}`] = increment(adj.netChange);
                                }
                            }
                            if (updatedBatches.length > 0) stockUpdates.inventoryBatches = updatedBatches;
                        }

                        transaction.update(productRef, stockUpdates);

                        // --- BUNDLE STOCK SYNC (Épique 3) ---
                        if (product.isBundle && product.bundleItems) {
                            for (const component of product.bundleItems) {
                                const compRef = doc(db, "products", component.productId);
                                const compSnap = productDocs[component.productId] || bundleComponentDocs[component.productId];
                                if (compSnap && compSnap.exists()) {
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
                        customerNumber: nextCustomerNumber,
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
                    // Increment customer number in stats
                    transaction.set(statsRef, { lastCustomerNumber: nextCustomerNumber }, { merge: true });
                }

                // Update Order
                transaction.update(orderRef, {
                    ...newData,
                    customerId: finalCustomerId || null,
                    updatedAt: serverTimestamp(),
                    _stockManagedByClient: true
                });

                // Update Global Store Stats
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
                    transaction.set(statsRef, statsUpdates, { merge: true });
                }

                // --- DRIVER STATS AUTOMATION ---
                if (oldData.driverId && oldData.status !== newData.status) {
                    const driverRef = doc(db, "drivers", oldData.driverId);
                    const driverUpdates = {};

                    // Handle Delivery -> Delivered
                    if (newData.status === 'livré' && oldData.status !== 'livré') {
                        driverUpdates["stats.totalDelivered"] = increment(1);
                        driverUpdates["stats.totalCOD"] = increment(parseFloat(newData.price) || 0);
                    } 
                    // Handle move AWAY from Delivered
                    else if (oldData.status === 'livré' && newData.status !== 'livré') {
                        driverUpdates["stats.totalDelivered"] = increment(-1);
                        driverUpdates["stats.totalCOD"] = increment(-(parseFloat(oldData.price) || 0));
                    }

                    // Handle Returns
                    if (newData.status === 'retour' && oldData.status !== 'retour') {
                        driverUpdates["stats.totalReturned"] = increment(1);
                    } else if (oldData.status === 'retour' && newData.status !== 'retour') {
                        driverUpdates["stats.totalReturned"] = increment(-1);
                    }

                    if (Object.keys(driverUpdates).length > 0) {
                        transaction.update(driverRef, driverUpdates);
                    }
                }
            });

            if (oldData.status !== newData.status) {
                logAction('ORDER_STATUS_UPDATE', `Changed status from ${oldData.status} to ${newData.status}`, {
                    orderId,
                    oldStatus: oldData.status,
                    newStatus: newData.status
                });

                // --- AUDIT TRAIL (Règle 3) ---
                logAudit(store.id, {
                    action: 'STATUS_CHANGE',
                    from: oldData.status,
                    to: newData.status,
                    orderId: orderId,
                    userId: user?.uid || 'system'
                });

                runAutomations('order_updated', { ...newData, id: orderId }, store).catch(console.error);

                // --- STOCK AUDIT LOG ---
                for (const [productId, productAdjs] of Object.entries(groupedByProduct)) {
                    for (const adj of productAdjs) {
                        logStockMovement(store.id, {
                            productId,
                            variantId: adj.variantId || null,
                            warehouseId: adj.warehouseId || 'default',
                            delta: adj.netChange,
                            reason: 'ORDER_UPDATE',
                            orderId,
                            userId: user?.uid || 'system'
                        });
                    }
                }
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
            // Load secrets
            const configDoc = await getDoc(doc(db, "stores", store.id, "private", "config"));
            const secrets = configDoc.exists() ? configDoc.data() : {};

            if (!secrets.olivraisonApiKey || !secrets.olivraisonSecretKey) {
                throw new Error("O-Livraison API keys not configured in Settings.");
            }

            // 1. Authenticate
            const token = await authenticateOlivraison(secrets.olivraisonApiKey, secrets.olivraisonSecretKey);

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
            // Load secrets
            const configDoc = await getDoc(doc(db, "stores", store.id, "private", "config"));
            const secrets = configDoc.exists() ? configDoc.data() : {};

            if (!secrets.senditPublicKey || !secrets.senditSecretKey) {
                throw new Error("Sendit API keys not configured in Settings.");
            }

            // 1. Authenticate (Benefit from caching inside senditService)
            const token = await authenticateSendit(secrets.senditPublicKey, secrets.senditSecretKey);

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

    const updateOrderStatus = async (orderId, newStatus) => {
        setLoading(true);
        setError(null);
        try {
            const orderRef = doc(db, "orders", orderId);
            const orderSnap = await getDoc(orderRef);
            if (!orderSnap.exists()) throw new Error("Order not found");
            const oldData = { id: orderSnap.id, ...orderSnap.data() };
            const oldStatus = oldData.status || 'reçu';

            // --- STATE MACHINE VALIDATION ---
            if (!isValidTransition(oldStatus, newStatus)) {
                toast.error(`Transition invalide : ${oldStatus} → ${newStatus}`);
                setLoading(false);
                return false;
            }
            
            // --- IDEMPOTENCE (Règle 1) ---
            if (oldData.status === newStatus) {
                setLoading(false);
                return true; 
            }

            const newData = { ...oldData, status: newStatus };
            return await updateOrder(orderId, oldData, newData);
        } catch (err) {
            console.error("Update Status Error:", err);
            setError(err.message);
            setLoading(false);
            return false;
        }
    };

    return { createOrder, updateOrder, updateOrderStatus, sendToOlivraison, sendToSendit, loading, error };
};

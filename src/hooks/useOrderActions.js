import { useState } from 'react';
import { db } from '../lib/firebase';
import { runTransaction, doc, getDoc, serverTimestamp, increment, collection, query, where, getDocs, limit } from 'firebase/firestore';
import { ORDER_STATUS } from '../utils/constants';
import { useTenant } from '../context/TenantContext';
import { authenticateOlivraison, createOlivraisonPackage } from '../lib/olivraison';
import { authenticateSendit, createSenditPackage } from '../lib/sendit';
import { authenticateCathedis, createCathedisDelivery } from '../lib/cathedis';
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

    // Empêche l'envoi transporteur quand l'état n'autorise pas → 'livraison' (ex. 'reçu', 'livré').
    // Sinon on crée un colis chez le transporteur PUIS l'update Firestore status:'livraison' est
    // rejeté par les règles (transition invalide) → colis fantôme + commande incohérente.
    const assertCanShip = (order) => {
        const target = ORDER_STATUS.SHIPPING; // 'livraison'
        if (order?.status && order.status !== target && !isValidTransition(order.status, target)) {
            const msg = `Impossible d'expédier : « ${order.status} → livraison » non autorisé. Confirmez la commande d'abord.`;
            toast.error(msg);
            throw new Error(msg);
        }
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

            // Products to process (For logging and costPrice)
            const itemsToProcess = [];
            if (orderData.articleId) {
                itemsToProcess.push({ id: orderData.articleId, variantId: orderData.variantId, quantity: orderData.quantity });
            } else if (orderData.products && Array.isArray(orderData.products)) {
                for (const item of orderData.products) {
                    itemsToProcess.push({ id: item.id, variantId: item.variantId, quantity: item.quantity });
                }
            }

            // Fetch costPrice if not provided
            let costPrice = parseFloat(orderData.costPrice) || 0;
            if (costPrice === 0 && itemsToProcess.length > 0) {
                try {
                    const prodSnap = await getDoc(doc(db, "products", itemsToProcess[0].id));
                    if (prodSnap.exists()) {
                        costPrice = parseFloat(prodSnap.data().costPrice) || 0;
                    }
                } catch (e) {
                    console.warn("Failed to fetch product costPrice", e);
                }
            }

            const newOrderRef = doc(db, "orders", crypto.randomUUID());

            await runTransaction(db, async (transaction) => {
                // === 1. READ PHASE ===
                const statsRef = doc(db, "stores", store.id, "stats", "sales");
                const statsSnap = await transaction.get(statsRef);
                const currentStats = statsSnap.exists() ? statsSnap.data() : {};
                const nextOrderNumber = (parseInt(currentStats.lastOrderNumber) || 1000) + 1;
                const nextCustomerNumber = (parseInt(currentStats.lastCustomerNumber) || 5000) + 1;

                // Contrôle de disponibilité — stock négatif impossible (pas de backorder).
                // Lectures AVANT toute écriture (contrainte des transactions Firestore).
                const productSnaps = {};
                for (const item of itemsToProcess) {
                    if (item.id && !productSnaps[item.id]) {
                        productSnaps[item.id] = await transaction.get(doc(db, "products", item.id));
                    }
                }
                for (const item of itemsToProcess) {
                    const snap = productSnaps[item.id];
                    if (!snap || !snap.exists()) continue;
                    const p = snap.data();
                    const qty = parseInt(item.quantity) || 1;
                    let available;
                    if (item.variantId && Array.isArray(p.variants)) {
                        available = parseInt(p.variants.find(x => x.id === item.variantId)?.stock) || 0;
                    } else {
                        available = parseInt(p.stock) || 0;
                    }
                    if (available < qty) {
                        throw new Error(`Stock insuffisant pour « ${p.name || 'ce produit'} » : ${available} en stock, ${qty} demandé(s).`);
                    }
                }

                // === 2. WRITE PHASE ===
                let finalCustomerId = customerId || existingCustomerId;
                
                // Write Customer
                if (existingCustomerId) {
                    transaction.update(doc(db, "customers", existingCustomerId), {
                        lastOrderDate: new Date().toISOString().split('T')[0],
                        // BUG-03 FIX: totalSpent is now ONLY managed by onOrderWrite Cloud Function
                        // when order transitions to 'livré'. Removed duplicate increment here.
                        orderCount: increment(1),
                        updatedAt: serverTimestamp()
                    });
                } else if (orderData.clientName && !finalCustomerId) {
                    const newCustomerRef = doc(collection(db, "customers"));
                    finalCustomerId = newCustomerRef.id;
                    transaction.set(newCustomerRef, {
                        storeId: store.id,
                        customerNumber: nextCustomerNumber,
                        name: orderData.clientName,
                        phone: orderData.clientPhone,
                        address: orderData.clientAddress || "",
                        city: orderData.clientCity || "",
                        totalSpent: 0, // BUG-03 FIX: starts at 0, incremented by Cloud Function on 'livré'
                        orderCount: 1,
                        firstOrderDate: new Date().toISOString().split('T')[0],
                        lastOrderDate: new Date().toISOString().split('T')[0],
                        createdAt: serverTimestamp(),
                        updatedAt: serverTimestamp()
                    });
                    transaction.set(statsRef, { lastCustomerNumber: nextCustomerNumber }, { merge: true });
                }

                // Financials
                const price = parseFloat(orderData.price) || 0;
                const qty = parseInt(orderData.quantity) || 1;
                const profit = (price * qty) - (costPrice * qty);

                // Write Order (No _stockManagedByClient flag anymore, backend handles it)
                transaction.set(newOrderRef, {
                    ...orderData,
                    orderNumber: nextOrderNumber,
                    profit: profit,
                    costPrice: costPrice,
                    customerId: finalCustomerId || null,
                    createdAt: serverTimestamp(),
                    status: ORDER_STATUS.RECEIVED,
                    isPaid: false,
                    paymentMethod: 'cod'
                });

                // Update Store Stats
                // (Note: onOrderWrite will NOT increment statusCounts.reçu for newly created orders if they already have a status,
                // wait, actually onOrderWrite DOES increment it for creates. So we must NOT double-increment here!)
                transaction.set(statsRef, {
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
            if (/stock insuffisant/i.test(err.message || '')) toast.error(err.message);
            setLoading(false);
            return false;
        }
    };

    const updateOrder = async (orderId, oldData, newData) => {
        setLoading(true);
        setError(null);
        try {
            // --- STATE MACHINE VALIDATION (defense-in-depth) ---
            if (oldData.status !== newData.status && !isValidTransition(oldData.status, newData.status)) {
                toast.error(`Transition invalide : ${oldData.status} → ${newData.status}`);
                setLoading(false);
                return false;
            }
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

                // Read stats doc for sequential numbers (only needed for new customer creation)
                const statsRef = doc(db, "stores", store.id, "stats", "sales");
                const statsSnap = await transaction.get(statsRef);
                const currentStats = statsSnap.exists() ? statsSnap.data() : {};
                const nextCustomerNumber = (parseInt(currentStats.lastCustomerNumber) || 5000) + 1;

                // --- 2. WRITE PHASE ---
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
                        totalSpent: 0, // BUG-03: incremented by Cloud Function onOrderWrite on 'livré'
                        orderCount: 1,
                        firstOrderDate: new Date().toISOString().split('T')[0],
                        lastOrderDate: new Date().toISOString().split('T')[0],
                        createdAt: serverTimestamp(),
                        updatedAt: serverTimestamp()
                    });
                    transaction.set(statsRef, { lastCustomerNumber: nextCustomerNumber }, { merge: true });
                }

                // Update Order (No _stockManagedByClient flag anymore)
                transaction.update(orderRef, {
                    ...newData,
                    customerId: finalCustomerId || null,
                    updatedAt: serverTimestamp()
                });

                // Note: Global Store Stats and Driver Stats are now handled centrally by onOrderWrite 
                // in functions/index.js. We don't update them here to prevent double-counting.
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
            assertCanShip(order);
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
            assertCanShip(order);
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

    const sendToCathedis = async (order) => {
        setLoading(true);
        setError(null);
        try {
            assertCanShip(order);
            const configDoc = await getDoc(doc(db, "stores", store.id, "private", "config"));
            const secrets = configDoc.exists() ? configDoc.data() : {};

            if (!secrets.cathedisUsername || !secrets.cathedisPassword) {
                throw new Error("Cathedis API credentials not configured in Settings.");
            }

            const jsessionid = await authenticateCathedis(secrets.cathedisUsername, secrets.cathedisPassword);
            const result = await createCathedisDelivery(jsessionid, order, store);

            await runTransaction(db, async (transaction) => {
                const orderRef = doc(db, "orders", order.id);
                transaction.update(orderRef, {
                    carrier: 'cathedis',
                    trackingId: String(result.id) || 'PENDING',
                    carrierStatus: result.deliveryStatus || 'CREATED',
                    status: 'livraison',
                    updatedAt: serverTimestamp()
                });
            });

            setLoading(false);
            return result;
        } catch (err) {
            console.error("Cathedis Error:", err);
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

    return { createOrder, updateOrder, updateOrderStatus, sendToOlivraison, sendToSendit, sendToCathedis, loading, error };
};

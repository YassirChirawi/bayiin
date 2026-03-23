const functions = require('firebase-functions');
const { onDocumentWritten } = require("firebase-functions/v2/firestore");
const { initializeApp } = require('firebase-admin/app');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');
const { getAuth } = require('firebase-admin/auth');

// Initialize Stripe with Secret Key (set via .env)
const stripeKey = process.env.STRIPE_SECRET_KEY || (functions.config().stripe && functions.config().stripe.secret) || 'sk_test_placeholder';
const stripe = require('stripe')(stripeKey);
const WooService = require('./wooService');

initializeApp();
// Connect to the named database used by the frontend
const db = getFirestore('comsaas');

/**
 * Custom Claims Sync
 * Whenever a user document is written, sync their role to Firebase Auth JWT claims.
 * This allows Firestore rules to use request.auth.token.role (JWT-based, no document lookup).
 *
 * Supported roles: 'super_admin', 'franchise_admin', 'owner', 'staff'
 */
exports.onUserWrite = onDocumentWritten({
    document: "users/{userId}",
    database: "comsaas",
}, async (event) => {
    const after = event.data?.after;
    if (!after?.exists) return; // User deleted — don't revoke (handled separately if needed)

    const userData = after.data();
    const userId = event.params.userId;
    const role = userData?.role || null;
    const franchiseId = userData?.franchiseId || null;

    try {
        await getAuth().setCustomUserClaims(userId, {
            role,
            ...(franchiseId ? { franchiseId } : {})
        });
        console.log(`[CustomClaims] Synced role="${role}" for user ${userId}`);
    } catch (err) {
        console.error(`[CustomClaims] Failed to set claims for user ${userId}:`, err);
    }
});

/**
 * Callable function for super_admins to set another user's role.
 * Frontend: const setRole = httpsCallable(functions, 'setUserRole');
 *           await setRole({ targetUid: '...', role: 'franchise_admin', franchiseId: '...' });
 */
exports.setUserRole = functions.https.onCall(async (data, context) => {
    // Verify caller is super_admin via JWT claim (not document lookup)
    if (!context.auth || context.auth.token.role !== 'super_admin') {
        throw new functions.https.HttpsError('permission-denied', 'Only super admins can set user roles.');
    }

    const { targetUid, role, franchiseId } = data;
    if (!targetUid || !role) {
        throw new functions.https.HttpsError('invalid-argument', 'targetUid and role are required.');
    }

    const allowedRoles = ['super_admin', 'franchise_admin', 'owner', 'staff'];
    if (!allowedRoles.includes(role)) {
        throw new functions.https.HttpsError('invalid-argument', `Invalid role. Must be one of: ${allowedRoles.join(', ')}`);
    }

    try {
        // Update Firestore document (this will trigger onUserWrite to sync claims)
        await db.collection('users').doc(targetUid).update({
            role,
            ...(franchiseId ? { franchiseId } : {})
        });
        return { success: true, message: `Role "${role}" assigned to user ${targetUid}` };
    } catch (err) {
        console.error(`[setUserRole] Error:`, err);
        throw new functions.https.HttpsError('internal', 'Failed to set user role.');
    }
});


/**
 * Stripe Webhook Handler
 */
exports.stripeWebhook = functions.https.onRequest(async (req, res) => {
    const sig = req.headers['stripe-signature'];
    const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET || (functions.config().stripe && functions.config().stripe.webhook_secret);

    let event;

    try {
        if (!endpointSecret) {
            console.error('Stripe webhook secret not configured. Set STRIPE_WEBHOOK_SECRET env var.');
            return res.status(500).send('Webhook secret not configured');
        }
        event = stripe.webhooks.constructEvent(req.rawBody, sig, endpointSecret);
    } catch (err) {
        console.error(`Webhook Error: ${err.message}`);
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    if (event.type === 'checkout.session.completed') {
        const session = event.data.object;
        const storeId = session.client_reference_id;

        if (storeId) {
            try {
                await db.collection('stores').doc(storeId).update({
                    subscriptionStatus: 'active',
                    plan: session.amount_total === 7900 ? 'starter' : 'pro',
                    lastPaymentDate: FieldValue.serverTimestamp(),
                    stripeCustomerId: session.customer,
                    stripeSubscriptionId: session.subscription
                });
            } catch (error) {
                console.error('Error updating Firestore:', error);
            }
        }
    }

    res.json({ received: true });
});

/**
 * WooCommerce Webhook Handler
 * URL: .../handleWooCommerceOrder?storeId=STORE_ID
 */
exports.handleWooCommerceOrder = functions.https.onRequest(async (req, res) => {
    const storeId = req.query.storeId;
    if (!storeId) {
        console.error("WooCommerce Webhook: Missing storeId in query params");
        return res.status(400).send("Missing storeId");
    }

    // 1. Get Store Config
    const storeDoc = await db.collection('stores').doc(storeId).get();
    if (!storeDoc.exists) {
        return res.status(404).send("Store not found");
    }
    const storeData = storeDoc.data();

    // 2. Verify Signature
    const wooService = new WooService(
        process.env.WOOCOMMERCE_URL || storeData.wooUrl,
        process.env.WOOCOMMERCE_CONSUMER_KEY || storeData.wooConsumerKey,
        process.env.WOOCOMMERCE_CONSUMER_SECRET || storeData.wooConsumerSecret,
        process.env.WOOCOMMERCE_WEBHOOK_SECRET || storeData.wooWebhookSecret
    );

    const signature = req.headers['x-wc-webhook-signature'];
    if (!wooService.verifySignature(req.rawBody, signature)) {
        console.error("WooCommerce Webhook: Invalid Signature");
        return res.status(401).send("Invalid Signature");
    }

    const orderData = req.body;
    console.log(`WooCommerce Order Received: ${orderData.id} for Store: ${storeId}`);

    try {
        await db.runTransaction(async (transaction) => {
            const batch = db.batch(); // We'll use this for stock updates as well or just transaction
            
            // A. Map Items & Deduct Stock
            const items = orderData.line_items || [];
            const mappedProducts = [];

            for (const item of items) {
                const sku = item.sku;
                if (!sku) continue;

                // Find product in BayIIn by SKU
                const productsSnap = await db.collection('products')
                    .where('storeId', '==', storeId)
                    .where('sku', '==', sku)
                    .limit(1)
                    .get();

                if (!productsSnap.empty) {
                    const productDoc = productsSnap.docs[0];
                    const product = productDoc.data();
                    const qty = parseInt(item.quantity) || 1;

                    // FEFO Stock Deduction
                    let stockUpdates = { stock: FieldValue.increment(-qty) };
                    if (product.inventoryBatches && product.inventoryBatches.length > 0) {
                        let updatedBatches = [...product.inventoryBatches].sort((a, b) => new Date(a.expiryDate || 0) - new Date(b.expiryDate || 0));
                        let remainingQty = qty;

                        for (let i = 0; i < updatedBatches.length && remainingQty > 0; i++) {
                            let b = updatedBatches[i];
                            let bQty = parseInt(b.quantity) || 0;
                            if (bQty > 0) {
                                let deductAmount = Math.min(bQty, remainingQty);
                                b.quantity = bQty - deductAmount;
                                remainingQty -= deductAmount;
                            }
                        }
                        stockUpdates.inventoryBatches = updatedBatches;
                    }
                    
                    transaction.update(productDoc.ref, stockUpdates);
                    
                    mappedProducts.push({
                        id: productDoc.id,
                        name: product.name,
                        quantity: qty,
                        price: parseFloat(item.price) || 0
                    });
                }
            }

            // B. Create Order in BayIIn
            const newOrderRef = db.collection('orders').doc(`WOO-${orderData.id}`);
            const billing = orderData.billing || {};
            
            transaction.set(newOrderRef, {
                storeId: storeId,
                orderNumber: `WOO-${orderData.number || orderData.id}`,
                clientName: `${billing.first_name || ''} ${billing.last_name || ''}`.trim() || 'WooCommerce Client',
                clientPhone: billing.phone || "",
                clientAddress: `${billing.address_1 || ''} ${billing.address_2 || ''}`.trim(),
                clientCity: billing.city || "",
                price: parseFloat(orderData.total) || 0,
                status: 'reçu', // "À confirmer"
                createdAt: FieldValue.serverTimestamp(),
                source: 'WooCommerce',
                externalId: orderData.id,
                products: mappedProducts,
                isPaid: orderData.status === 'processing' || orderData.status === 'completed',
                paymentMethod: orderData.payment_method || 'cod',
                _stockManagedByClient: true // Stock already deducted above — prevents double deduction in onOrderWrite
            });
        });

        res.status(200).send("OK");
    } catch (error) {
        console.error("WooCommerce Order Processing Error:", error);
        res.status(500).send("Internal Error");
    }
});

/**
 * AGGREGATION HANDLERS
 * Efficiently track Revenue and Order Counts without downloading all docs.
 */

// Helper to calculate order value
const getOrderValue = (order) => (parseFloat(order.price) || 0) * (parseInt(order.quantity) || 1);
const getDateKey = (dateString) => dateString || new Date().toISOString().split('T')[0];

exports.onOrderWrite = onDocumentWritten({
    document: "orders/{orderId}",
    database: "comsaas",
    region: "us-central1",
}, async (event) => {
    console.log("onOrderWrite triggered", event.params.orderId);

    // v2 change object is in event.data
    const change = event.data;
    if (!change) return; // Should not happen on write?

    const before = change.before.exists ? change.before.data() : null;
    const after = change.after.exists ? change.after.data() : null;

    // Get storeId from either (should be same)
    const storeId = after ? after.storeId : before.storeId;
    console.log("StoreId:", storeId);

    if (!storeId) {
        console.error("No storeId found in order");
        return null;
    }

    const statsRef = db.collection('stores').doc(storeId).collection('stats').doc('sales');

    const batch = db.batch();

    // Logic for Incremental Updates
    // We track:
    // 1. Total Revenue (totals.revenue)
    // 2. Total Count (totals.count)
    // 3. Daily Revenue (daily.YYYY-MM-DD.revenue)
    // 4. Daily Count (daily.YYYY-MM-DD.count)
    // 5. Status Counts (statusCounts.{status})
    // 6. [NEW] Realized Revenue (totals.realizedRevenue) - Only 'livré'
    // 7. [NEW] Realized COGS (totals.realizedCOGS) - Only 'livré'

    // Helpers
    // Realized Revenue = Cash Collected (isPaid is true)
    const isRealized = (order) => order && order.isPaid === true;
    const getCostValue = (order) => (parseFloat(order.costPrice) || 0) * (parseInt(order.quantity) || 1);
    const getDeliveryCost = (order) => parseFloat(order.realDeliveryCost) || 0;
    // const getDateKey = (dateString) => dateString || new Date().toISOString().split('T')[0]; // Already defined above

    // Deltas
    let revenueDelta = 0;
    let countDelta = 0;
    let realizedRevDelta = 0;
    let realizedCostDelta = 0;
    let realizedDeliveryCostDelta = 0;

    // Status Deltas
    let oldStatus = before ? before.status : null;
    let newStatus = after ? after.status : null;

    // Date needed for Daily Stats
    let oldDate = before ? getDateKey(before.date) : null;
    let newDate = after ? getDateKey(after.date) : null;

    if (!before && after) {
        // CREATE
        revenueDelta = getOrderValue(after);
        countDelta = 1;
        if (isRealized(after)) {
            realizedRevDelta = getOrderValue(after);
            realizedCostDelta = getCostValue(after);
            realizedDeliveryCostDelta = getDeliveryCost(after);
        }
    } else if (before && !after) {
        // DELETE
        revenueDelta = -getOrderValue(before);
        countDelta = -1;
        if (isRealized(before)) {
            realizedRevDelta = -getOrderValue(before);
            realizedCostDelta = -getCostValue(before);
            realizedDeliveryCostDelta = -getDeliveryCost(before);
        }
    } else {
        // UPDATE
        const newVal = getOrderValue(after);
        const oldVal = getOrderValue(before);
        const newCost = getCostValue(after);
        const oldCost = getCostValue(before);
        // Delivery Cost might change too
        const newDelivery = getDeliveryCost(after);
        const oldDelivery = getDeliveryCost(before);

        revenueDelta = newVal - oldVal;
        countDelta = 0;

        // Realized Logic
        const wasRealized = isRealized(before);
        const nowRealized = isRealized(after);

        if (nowRealized && !wasRealized) {
            // Became Realized
            realizedRevDelta = newVal;
            realizedCostDelta = newCost;
            realizedDeliveryCostDelta = newDelivery;
        } else if (!nowRealized && wasRealized) {
            // No longer Realized
            realizedRevDelta = -oldVal;
            realizedCostDelta = -oldCost;
            realizedDeliveryCostDelta = -oldDelivery;
        } else if (nowRealized && wasRealized) {
            // Stayed Realized (but maybe price/qty/cost/delivery changed)
            realizedRevDelta = newVal - oldVal;
            realizedCostDelta = newCost - oldCost;
            realizedDeliveryCostDelta = newDelivery - oldDelivery;
        }
    }

    // Prepare Updates
    const updates = {};

    // 1. Totals
    if (revenueDelta !== 0) updates['totals.revenue'] = FieldValue.increment(revenueDelta);
    if (countDelta !== 0) updates['totals.count'] = FieldValue.increment(countDelta);

    // [NEW] Realized Totals
    if (realizedRevDelta !== 0) updates['totals.realizedRevenue'] = FieldValue.increment(realizedRevDelta);
    if (realizedCostDelta !== 0) updates['totals.realizedCOGS'] = FieldValue.increment(realizedCostDelta);
    if (realizedDeliveryCostDelta !== 0) updates['totals.realizedDeliveryCost'] = FieldValue.increment(realizedDeliveryCostDelta);

    // 2. Daily Stats
    if (before && after && oldDate !== newDate) {
        // Date changed!
        const oldVal = getOrderValue(before);
        const newVal = getOrderValue(after);
        updates[`daily.${oldDate}.revenue`] = FieldValue.increment(-oldVal);
        updates[`daily.${oldDate}.count`] = FieldValue.increment(-1);
        updates[`daily.${newDate}.revenue`] = FieldValue.increment(newVal);
        updates[`daily.${newDate}.count`] = FieldValue.increment(1);
    } else {
        // Date same (or Create/Delete)
        const targetDate = newDate || oldDate;
        if (targetDate) {
            if (revenueDelta !== 0) updates[`daily.${targetDate}.revenue`] = FieldValue.increment(revenueDelta);
            if (countDelta !== 0) updates[`daily.${targetDate}.count`] = FieldValue.increment(countDelta);
        }
    }

    // 3. Status Counts
    if (oldStatus !== newStatus) {
        if (oldStatus) updates[`statusCounts.${oldStatus}`] = FieldValue.increment(-1);
        if (newStatus) updates[`statusCounts.${newStatus}`] = FieldValue.increment(1);
    } else if (!before && newStatus) {
        // Create
        updates[`statusCounts.${newStatus}`] = FieldValue.increment(1);
    } else if (before && !newStatus) {
        // Delete
        updates[`statusCounts.${oldStatus}`] = FieldValue.increment(-1);
    }

    // 4. STOCK MANAGEMENT
    // Skip if stock was already managed by the client-side hook (useOrderActions).
    // Orders created/updated from the BayIIn dashboard set _stockManagedByClient = true.
    // Server-sourced orders (WooCommerce, public catalog) do NOT set this flag,
    // so they rely entirely on this Cloud Function for stock deduction.
    const skipStock = (after?._stockManagedByClient === true) || (before?._stockManagedByClient === true);

    if (!skipStock) {
        const oldProductId = before?.articleId;
        const newProductId = after?.articleId;

        const getActiveQty = (o) => {
            if (!o) return 0;
            // Inactive statuses do not consume stock
            // NOTE: 'retour en cours' still consumes stock (driver is returning to store, not yet restocked)
            // Stock is only released once the driver confirms drop-off and the status becomes 'retour'
            if (['retour', 'annulé'].includes(o.status)) return 0;
            return parseInt(o.quantity) || 0;
        };

        const updateStock = (prodId, delta) => {
            if (delta === 0) return;
            const ref = db.collection('products').doc(prodId);
            batch.update(ref, { stock: FieldValue.increment(delta) });
        };

        if (oldProductId === newProductId && oldProductId) {
            // Same Product: Calculate net change
            const oldQty = getActiveQty(before);
            const newQty = getActiveQty(after);
            updateStock(oldProductId, oldQty - newQty);
        } else {
            // Product Changed (or Create/Delete)
            if (oldProductId) {
                // Restock old product (as if order deleted for that product)
                updateStock(oldProductId, getActiveQty(before));
            }
            if (newProductId) {
                // Destock new product (as if order created for that product)
                updateStock(newProductId, -getActiveQty(after));
            }
        }
    } else {
        console.log(`onOrderWrite: Skipping stock update for order (managed by client).`);
    }

    // Execute Update
    console.log("Updates:", JSON.stringify(updates));
    const statsPromise = statsRef.set(updates, { merge: true });

    // Commit batch for Stock (and any other potential batch ops)
    const batchPromise = batch.commit();

    // 5. CUSTOMER totalSpent SYNC
    // When an order transitions to 'livré', increment customer totalSpent by order value.
    // When an order leaves 'livré' (cancelled, returned), decrement it.
    const DELIVERED_STATUS = 'livré';
    const customerId = after?.customerId || before?.customerId;
    let customerSpentPromise = Promise.resolve();

    if (customerId) {
        const wasDelivered = oldStatus === DELIVERED_STATUS;
        const isDelivered = newStatus === DELIVERED_STATUS;
        const orderValue = getOrderValue(after || before);

        if (!wasDelivered && isDelivered) {
            // Transition TO delivered: increment totalSpent
            customerSpentPromise = db.collection('customers').doc(customerId).update({
                totalSpent: FieldValue.increment(orderValue),
                lastOrderDate: (after?.date) || new Date().toISOString().split('T')[0]
            }).catch(e => console.warn('Customer totalSpent update failed:', e.message));
        } else if (wasDelivered && !isDelivered && before && after) {
            // Transition AWAY from delivered: decrement totalSpent
            customerSpentPromise = db.collection('customers').doc(customerId).update({
                totalSpent: FieldValue.increment(-getOrderValue(before))
            }).catch(e => console.warn('Customer totalSpent decrement failed:', e.message));
        }
    }

    return Promise.all([statsPromise, batchPromise, customerSpentPromise]);
});

/**
 * Sendit Webhook Handler
 * Updates order status based on Sendit events.
 * 
 * URL to Register: https://us-central1-YOUR-PROJECT-ID.cloudfunctions.net/senditWebhook
 */
exports.senditWebhook = functions.https.onRequest(async (req, res) => {
    // Sendit sends JSON body: { code, status, tracking_code, data }
    const { code, status } = req.body;

    console.log("Sendit Webhook Received:", JSON.stringify(req.body));

    if (!code || !status) {
        return res.status(400).send("Payload invalide");
    }

    try {
        // Find order by trackingId (code)
        const ordersRef = db.collection('orders');
        const snapshot = await ordersRef.where('trackingId', '==', code).get();

        if (snapshot.empty) {
            console.log(`No order found for tracking code: ${code}`);
            // Always return 200 OK to prevent retries for invalid tracking codes
            return res.status(200).send("OK (Order not found)");
        }

        const batch = db.batch();
        let updatedCount = 0;

        // Status Mapping Logic
        // Normalizes incoming status to our internal system status
        const mapSenditStatus = (senditStatus) => {
            if (!senditStatus) return null;
            const normalized = senditStatus.toUpperCase();

            // Map: Sendit Status -> App Status (from constants.js: 'livré', 'retour', 'livraison', 'pas de réponse', 'reporté')
            const statusMap = {
                // Success
                'DELIVERED': 'livré',
                'LIVRE': 'livré',
                'LIVRÉ': 'livré',

                // Failure / Returns
                'CANCELED': 'retour',
                'ANNULE': 'retour',
                'ANNULÉ': 'retour',
                'REFUSE': 'retour',
                'REFUSÉ': 'retour',
                'REJECTED': 'retour',

                // In Progress
                'DELIVERING': 'livraison',
                'EN COURS DE LIVRAISON': 'livraison',
                'DISTRIBUTED': 'livraison',
                'DISTRIBUÉ': 'livraison',
                'EN_LIVRAISON': 'livraison',

                // Issues / Postponed
                'UNREACHABLE': 'pas de réponse',
                'INJOIGNABLE': 'pas de réponse',
                'POSTPONED': 'reporté',
                'REPORTE': 'reporté',
                'REPORTÉ': 'reporté',

                // Initial / Pickup (use 'livraison' as carrier has package)
                'PICKED_UP': 'livraison',
                'RAMASSE': 'livraison',
                'RAMASSÉ': 'livraison',
                'WAREHOUSE': 'livraison',
                'ENTREPÔT': 'livraison',
                'TRANSIT': 'livraison',
                'CREATED': 'confirmed' // Or keep current status if just created
            };
            return statusMap[normalized] || null;
        };

        const newInternalStatus = mapSenditStatus(status);

        snapshot.forEach(doc => {
            const order = doc.data();
            const orderRef = db.collection('orders').doc(doc.id);

            // Update Logic
            const updates = {
                carrierStatus: status, // Keep raw carrier status for reference
                lastCarrierUpdate: FieldValue.serverTimestamp()
            };

            // Only update internal status if mapping exists and it's different
            if (newInternalStatus && order.status !== newInternalStatus) {
                updates.status = newInternalStatus;

                // Optional: Auto-pay logic helper
                // if (newInternalStatus === 'livré' && !order.isPaid) {
                //    updates.isPaid = true; 
                // }
            }

            // Only perform update if something changed (idempotence check handled by Firestore logic somewhat, but good practice)
            if (order.carrierStatus !== status || (newInternalStatus && order.status !== newInternalStatus)) {
                batch.update(orderRef, updates);
                updatedCount++;
            }
        });

        if (updatedCount > 0) {
            await batch.commit();
            console.log(`Updated ${updatedCount} orders for tracking code ${code}`);
        } else {
            console.log(`No updates needed for tracking code ${code}`);
        }

        res.status(200).send({ success: true, updated: updatedCount });

    } catch (error) {
        console.error("Error processing Sendit webhook:", error);
        // Return 500 only for server errors on our side
        res.status(500).send("Internal Server Error");
    }
});

/**
 * O-Livraison Webhook Handler
 * Updates order status based on O-Livraison events.
 * 
 * URL to Register in O-Livraison Dashboard: 
 * https://us-central1-YOUR-PROJECT-ID.cloudfunctions.net/olivraisonWebhook
 */
exports.olivraisonWebhook = functions.https.onRequest(async (req, res) => {
    // Webhooks might be GET (ping) or POST
    if (req.method !== 'POST') {
        return res.status(200).send("O-Livraison Webhook endpoint is active. Awaiting POST.");
    }

    console.log("O-Livraison Webhook Received Payload:", JSON.stringify(req.body));

    // Support various formats O-Livraison might use
    const payload = req.body;
    const status = payload.status || payload.Status || payload.etat || payload.state;
    const tracking = payload.trackingNumber || payload.tracking_id || payload.code || payload.id || payload.trackingId || payload.package_id;

    if (!tracking || !status) {
        console.warn("Invalid O-Livraison Payload, missing tracking or status.");
        // Always return 200 so they don't retry a bad payload infinitely
        return res.status(200).send({ success: false, reason: "Missing tracking or status fields" });
    }

    try {
        // Find order by trackingId
        const ordersRef = db.collection('orders');
        const snapshot = await ordersRef.where('trackingId', '==', String(tracking)).get();

        if (snapshot.empty) {
            console.log(`No order found in BayIIn for O-Livraison tracking code: ${tracking}`);
            return res.status(200).send({ success: true, warning: 'Order not found in ERP' });
        }

        const batch = db.batch();
        let updatedCount = 0;

        // O-Livraison Status Mapping to Interne BayIIn
        const mapOLivraisonStatus = (os) => {
            const normalized = String(os).toUpperCase().trim();

            const statusMap = {
                // Success
                'LIVRÉ': 'livré',
                'LIVRE': 'livré',
                'DELIVERED': 'livré',

                // Failure / Returns
                'RETOURNÉ': 'retour',
                'RETOURNE': 'retour',
                'REFUSÉ': 'retour',
                'REFUSE': 'retour',
                'ANNULÉ': 'annulé',
                'ANNULE': 'annulé',
                'CANCELED': 'annulé',

                // In Progress
                'EN COURS': 'livraison',
                'EN COURS DE LIVRAISON': 'livraison',
                'EXPÉDIÉ': 'livraison',
                'EXPEDIE': 'livraison',
                'OUT FOR DELIVERY': 'livraison',
                'EN ROUTE': 'livraison',

                // Pickup
                'RAMASSÉ': 'ramassage',
                'RAMASSE': 'ramassage',
                'PICKED_UP': 'ramassage',
                'NOUVEAU': 'confirmed',
                'CONFIRMÉ': 'confirmed',
                'CONFIRME': 'confirmed',

                // Issues
                'PAS DE RÉPONSE': 'pas de réponse',
                'PAS DE REPONSE': 'pas de réponse',
                'INJOIGNABLE': 'pas de réponse',
                'REPORTÉ': 'reporté',
                'REPORTE': 'reporté'
            };
            return statusMap[normalized] || null;
        };

        const newInternalStatus = mapOLivraisonStatus(status);

        snapshot.forEach(doc => {
            const order = doc.data();
            const orderRef = db.collection('orders').doc(doc.id);

            const updates = {
                carrierStatus: String(status),
                lastCarrierUpdate: FieldValue.serverTimestamp()
            };

            // Only update internal status if mapping exists and differs
            if (newInternalStatus && order.status !== newInternalStatus) {
                updates.status = newInternalStatus;
            }

            // Always update if tracking raw status changed or internal status changed
            if (order.carrierStatus !== String(status) || (newInternalStatus && order.status !== newInternalStatus)) {
                batch.update(orderRef, updates);
                updatedCount++;
            }
        });

        if (updatedCount > 0) {
            await batch.commit();
            console.log(`Updated ${updatedCount} orders for O-Livraison tracking ${tracking} to ${newInternalStatus || status}`);
        } else {
            console.log(`No updates needed for O-Livraison tracking ${tracking}`);
        }

        return res.status(200).send({ success: true, updated: updatedCount });

    } catch (error) {
        console.error("Error processing O-Livraison webhook:", error);
        return res.status(500).send("Internal Server Error");
    }
});


/**
 * Sync Stock to WooCommerce on product update
 */
exports.syncStockToWooCommerce = onDocumentWritten({
    document: "products/{productId}",
    database: "comsaas",
}, async (event) => {
    const change = event.data;
    if (!change || !change.after.exists) return;

    const before = change.before.data();
    const after = change.after.data();

    // Only sync if stock changed
    if (before && before.stock === after.stock) return;

    const storeId = after.storeId;
    if (!storeId) return;

    // Get Store Config
    const storeDoc = await db.collection('stores').doc(storeId).get();
    if (!storeDoc.exists) return;
    const storeData = storeDoc.data();

    // Check if WooCommerce integration is active
    if (!storeData.wooUrl || !storeData.wooConsumerKey) return;

    const wooService = new WooService(
        process.env.WOOCOMMERCE_URL || storeData.wooUrl,
        process.env.WOOCOMMERCE_CONSUMER_KEY || storeData.wooConsumerKey,
        process.env.WOOCOMMERCE_CONSUMER_SECRET || storeData.wooConsumerSecret
    );

    try {
        await wooService.updateStock(after.sku, after.stock);
        console.log(`Synced stock for SKU ${after.sku} to WooCommerce: ${after.stock}`);
    } catch (error) {
        console.error(`Failed to sync stock to WooCommerce for SKU ${after.sku}:`, error);
    }
});

/**
 * Track Expenses in Real-Time
 */
exports.onExpenseWrite = onDocumentWritten({
    document: "expenses/{expenseId}",
    database: "comsaas",
    region: "us-central1",
}, async (event) => {
    const change = event.data;
    if (!change) return;

    const before = change.before.exists ? change.before.data() : null;
    const after = change.after.exists ? change.after.data() : null;

    const storeId = after ? after.storeId : before.storeId;
    if (!storeId) return;

    let amountDelta = 0;

    if (!before && after) {
        amountDelta = parseFloat(after.amount) || 0;
    } else if (before && !after) {
        amountDelta = -(parseFloat(before.amount) || 0);
    } else if (before && after) {
        amountDelta = (parseFloat(after.amount) || 0) - (parseFloat(before.amount) || 0);
    }

    if (amountDelta === 0) return;

    const statsRef = db.collection('stores').doc(storeId).collection('stats').doc('sales');
    return statsRef.set({
        'totals.expenses': FieldValue.increment(amountDelta)
    }, { merge: true });
});

/**
 * Daily Stats Reconciliation (Cron Job)
 * Rebuilds stats/sales every night at 2:00 AM to fix any potential drift.
 */
exports.scheduledReconciliation = functions.pubsub.schedule('0 2 * * *')
  .timeZone('Africa/Casablanca')
  .onRun(async (context) => {
    console.log("Starting Daily Recalculation of all Store Stats...");

    const storesSnap = await db.collection('stores').get();
    
    for (const storeDoc of storesSnap.docs) {
        const storeId = storeDoc.id;
        
        try {
            // Fetch Orders
            const ordersSnap = await db.collection('orders').where('storeId', '==', storeId).get();
            // Fetch Expenses
            const expensesSnap = await db.collection('expenses').where('storeId', '==', storeId).get();
            
            const stats = {
                totals: {
                    revenue: 0,
                    count: 0,
                    realizedRevenue: 0,
                    realizedCOGS: 0,
                    realizedDeliveryCost: 0,
                    deliveredRevenue: 0,
                    expectedRevenue: 0,
                    unremittedRevenue: 0,
                    remittedRevenue: 0,
                    expenses: 0
                },
                statusCounts: {},
                daily: {}
            };

            // Aggregate Expenses
            expensesSnap.forEach(eDoc => {
                const e = eDoc.data();
                stats.totals.expenses += (parseFloat(e.amount) || 0);
            });

            // Aggregate Orders
            ordersSnap.forEach(oDoc => {
                const order = oDoc.data();
                const orderVal = (parseFloat(order.price) || 0) * (parseInt(order.quantity) || 1);
                const orderCost = (parseFloat(order.costPrice) || 0) * (parseInt(order.quantity) || 1);
                const deliveryCost = parseFloat(order.realDeliveryCost) || 0;
                const dateKey = order.date ? order.date.split('T')[0] : 'unknown';

                stats.totals.revenue += orderVal;
                stats.totals.count += 1;

                if (order.isPaid) {
                    stats.totals.realizedRevenue += orderVal;
                    stats.totals.realizedCOGS += orderCost;
                    stats.totals.realizedDeliveryCost += deliveryCost;
                }

                if (order.status === 'livraison' || order.status === 'ramassage') {
                    stats.totals.expectedRevenue += orderVal;
                }

                if (order.status === 'livré') {
                    stats.totals.deliveredRevenue += orderVal;
                    if (order.paymentStatus === 'remitted') {
                        stats.totals.remittedRevenue += orderVal;
                    } else {
                        stats.totals.unremittedRevenue += orderVal;
                    }
                }

                const status = order.status || 'unknown';
                stats.statusCounts[status] = (stats.statusCounts[status] || 0) + 1;

                if (!stats.daily[dateKey]) {
                    stats.daily[dateKey] = { revenue: 0, count: 0 };
                }
                stats.daily[dateKey].revenue += orderVal;
                stats.daily[dateKey].count += 1;
            });

            // Commit to Firestore
            await db.collection('stores').doc(storeId).collection('stats').doc('sales').set(stats);
            console.log(`Reconciled Store ${storeId} successfully.`);
        } catch (err) {
            console.error(`Failed to reconcile store ${storeId}:`, err);
        }
    }
    
    console.log("Daily reconciliation finished.");
    return null;
});


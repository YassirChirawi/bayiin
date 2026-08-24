const functions = require('firebase-functions');
const { onDocumentWritten } = require("firebase-functions/v2/firestore");
const { onRequest } = require("firebase-functions/v2/https");
const { onSchedule } = require("firebase-functions/v2/scheduler");
const { initializeApp } = require('firebase-admin/app');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');
const { getAuth } = require('firebase-admin/auth');

// Lazy-load Stripe inside functions that need it
const getStripe = () => {
    const stripeKey = process.env.STRIPE_SECRET_KEY || (functions.config().stripe && functions.config().stripe.secret) || 'sk_test_placeholder';
    return require('stripe')(stripeKey);
};
const WooService = require('./wooService');

initializeApp();
// Connect to the named database used by the frontend
const db = getFirestore('comsaas');

// BAY-104 : source de vérité unique des définitions financières (partagée client/serveur).
const { orderValue: mOrderValue, orderCOGS: mOrderCOGS, collectedValue: mCollected, isRealized: mIsRealized, netProfit: mNetProfit } = require('./shared/money');

// Monitoring : capture des erreurs serveur dans error_logs (visibles dans /admin/errors).
const { logServerError } = require('./logError');

// Copilot AI Function (Groq Proxy)
const { copilotChatV1 } = require('./copilot');
exports.copilotChatV1 = copilotChatV1;

// WhatsApp Webhook & Bot Logic
const { whatsappWebhook, whatsappTimeoutWorker } = require('./whatsapp');
exports.whatsappWebhook = whatsappWebhook;
exports.whatsappTimeoutWorker = whatsappTimeoutWorker;

// YouCan Integration — Auth (standard authorization_code + Qantra embedded)
const { exchangeYoucanToken, youcanWebhook, youcanSyncOrders, youcanInstall, youcanCallback } = require('./youcan');
exports.exchangeYoucanToken = exchangeYoucanToken;
exports.youcanWebhook = youcanWebhook;
exports.youcanSyncOrders = youcanSyncOrders;
exports.youcanInstall = youcanInstall;
exports.youcanCallback = youcanCallback;

// YouCan Integration — Managed Billing
const { createYouCanSubscription, youcanBillingCallback } = require('./youcanBilling');
exports.createYouCanSubscription = createYouCanSubscription;
exports.youcanBillingCallback = youcanBillingCallback;


// Shopify Integration
const { shopifyWebhook } = require('./shopify');
exports.shopifyWebhook = shopifyWebhook;

// WhatsApp Auto-Send Triggers
const { sendOrderConfirmationRequest, sendShippingNotification } = require('./whatsappSender');
exports.sendOrderConfirmationRequest = sendOrderConfirmationRequest;
exports.sendShippingNotification = sendShippingNotification;

// WhatsApp Auth (BYON - Meta Embedded Signup)
const { connectWhatsApp } = require('./whatsappAuth');
exports.connectWhatsApp = connectWhatsApp;

// Hybrid Store Builder AI (Groq Llama 3.3)
const { generateStorefront, enhanceCopywriting } = require('./hybridBuilder');
exports.generateStorefront = generateStorefront;
exports.enhanceCopywriting = enhanceCopywriting;

// Vision AI (Beya3 Phase 4)
const { processInvoiceOCR } = require('./copilot/visionAgent');
exports.processInvoiceOCR = functions.https.onCall(async (data, context) => {
    // Only logged-in users can call this
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
    }
    const { storeId, imageUrl } = data;
    if (!storeId || !imageUrl) {
        throw new functions.https.HttpsError('invalid-argument', 'Missing storeId or imageUrl');
    }
    
    try {
        const result = await processInvoiceOCR(storeId, imageUrl);
        return result;
    } catch (err) {
        throw new functions.https.HttpsError('internal', err.message);
    }
});

// Autonomous Monitoring Engine (Beya3 Phase 1)
const { runAnomalyScanner } = require('./copilot/proactiveAgent');
exports.hourlyAnomalyScanner = onSchedule("0 * * * *", async (event) => {
    console.log("[HourlyScanner] Starting anomaly detection for all stores...");
    // Retrieve all stores (you might want to filter active ones later)
    const storesSnap = await db.collection('stores').get();
    
    const promises = [];
    storesSnap.forEach(doc => {
        promises.push(runAnomalyScanner(doc.id));
    });
    
    await Promise.allSettled(promises);
    console.log(`[HourlyScanner] Completed for ${storesSnap.size} stores.`);
});

// Autonomous Action Layer (Beya3 Phase 2)
const { executeDraft } = require('./copilot/actionExecutor');
exports.onActionDraftUpdate = onDocumentWritten({
    document: "stores/{storeId}/action_drafts/{draftId}",
    database: "comsaas",
}, async (event) => {
    const after = event.data?.after;
    const before = event.data?.before;
    
    if (!after?.exists) return;
    const data = after.data();
    const oldData = before?.exists ? before.data() : {};
    
    // Si le statut passe à 'approved', on exécute l'action en backend
    if (data.status === 'approved' && oldData.status !== 'approved') {
        const storeId = event.params.storeId;
        console.log(`[Autonomous Action] Executing draft ${event.params.draftId} for store ${storeId}: ${data.toolName}`);
        
        // Mettre à jour le statut pour éviter les doubles exécutions
        await after.ref.update({ status: 'executing' });
        
        try {
            const result = await executeDraft(storeId, data);
            
            await after.ref.update({ 
                status: 'executed',
                executedAt: FieldValue.serverTimestamp(),
                result: result || { success: true }
            });
        } catch (error) {
            console.error("[Autonomous Action] Failed:", error);
            await after.ref.update({ 
                status: 'failed', 
                error: error.message 
            });
        }
    }
});

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

    // storeId in the doc is trustworthy: Firestore rules only let a user self-set it to a store
    // they OWN (see users create rule). For invited STAFF who never onboarded (no storeId in doc),
    // derive membership from allowed_users — invitations are written by the store owner/managers.
    let storeId = userData?.storeId || null;
    let effectiveRole = role;
    if (!storeId) {
        try {
            let email = userData?.email || null;
            if (!email) {
                try { email = (await getAuth().getUser(userId)).email || null; } catch (e) { /* no auth user */ }
            }
            if (email) {
                const invite = await db.collection('allowed_users').where('email', '==', email).limit(1).get();
                if (!invite.empty) {
                    storeId = invite.docs[0].data().storeId || null;
                    if (!effectiveRole) effectiveRole = invite.docs[0].data().role || 'staff';
                }
            }
        } catch (e) {
            console.warn(`[CustomClaims] allowed_users lookup failed for ${userId}:`, e.message);
        }
    }

    try {
        await getAuth().setCustomUserClaims(userId, {
            role: effectiveRole,
            storeId: storeId,
            ...(franchiseId ? { franchiseId } : {})
        });
        console.log(`[CustomClaims] Synced role="${effectiveRole}" storeId="${storeId}" for user ${userId}`);
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
 * Events handled:
 *   - checkout.session.completed      → Activate subscription
 *   - customer.subscription.deleted   → Expire subscription
 *   - invoice.payment_failed          → Mark as past_due
 */
exports.stripeWebhook = functions
    .runWith({ secrets: ['STRIPE_SECRET_KEY', 'STRIPE_WEBHOOK_SECRET'] })
    .https.onRequest(async (req, res) => {
    const sig = req.headers['stripe-signature'];
    const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET || (functions.config().stripe && functions.config().stripe.webhook_secret);

    const stripe = getStripe();
    let event;

    try {
        if (!endpointSecret) {
            console.error('Stripe webhook secret not configured. Set STRIPE_WEBHOOK_SECRET env var.');
            return res.status(500).send('Webhook secret not configured');
        }
        event = stripe.webhooks.constructEvent(req.rawBody, sig, endpointSecret);
    } catch (err) {
        console.error(`Stripe Webhook signature error: ${err.message}`);
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    console.log(`[Stripe Webhook] Event received: ${event.type}`);

    try {
        // ------------------------------------------------------------------
        // 1. Checkout completed → Activate subscription
        // ------------------------------------------------------------------
        if (event.type === 'checkout.session.completed') {
            const session = event.data.object;
            const storeId = session.client_reference_id;

            if (!storeId) {
                console.warn('[Stripe] checkout.session.completed: missing client_reference_id');
                return res.json({ received: true });
            }

            // Prefer plan set in metadata (set when creating checkout session).
            // Fall back to amount-based detection for backward compatibility.
            const planFromMeta = session.metadata && session.metadata.plan;
            const planFromAmount = session.amount_total === 7900 ? 'starter' : 'pro';
            const plan = planFromMeta || planFromAmount;

            await db.collection('stores').doc(storeId).update({
                subscriptionStatus: 'active',
                plan,
                lastPaymentDate: FieldValue.serverTimestamp(),
                stripeCustomerId: session.customer,
                stripeSubscriptionId: session.subscription,
            });
            console.log(`[Stripe] Store ${storeId} activated — plan: ${plan}`);
        }

        // ------------------------------------------------------------------
        // 2. Subscription deleted (cancelled / non-renewed) → Expire
        // ------------------------------------------------------------------
        else if (event.type === 'customer.subscription.deleted') {
            const subscription = event.data.object;
            const customerId = subscription.customer;

            // Find the store by Stripe customer ID
            const storesSnap = await db.collection('stores')
                .where('stripeCustomerId', '==', customerId)
                .limit(1)
                .get();

            if (!storesSnap.empty) {
                const storeDoc = storesSnap.docs[0];
                await storeDoc.ref.update({
                    subscriptionStatus: 'expired',
                    subscriptionExpiredAt: FieldValue.serverTimestamp(),
                });
                console.log(`[Stripe] Store ${storeDoc.id} subscription expired.`);
            } else {
                console.warn(`[Stripe] subscription.deleted: no store found for customerId ${customerId}`);
            }
        }

        // ------------------------------------------------------------------
        // 3. Invoice payment failed → Mark as past_due (grace period)
        // ------------------------------------------------------------------
        else if (event.type === 'invoice.payment_failed') {
            const invoice = event.data.object;
            const customerId = invoice.customer;

            const storesSnap = await db.collection('stores')
                .where('stripeCustomerId', '==', customerId)
                .limit(1)
                .get();

            if (!storesSnap.empty) {
                const storeDoc = storesSnap.docs[0];
                await storeDoc.ref.update({
                    subscriptionStatus: 'past_due',
                    lastPaymentFailedAt: FieldValue.serverTimestamp(),
                });
                console.log(`[Stripe] Store ${storeDoc.id} payment failed — status: past_due`);
            } else {
                console.warn(`[Stripe] invoice.payment_failed: no store found for customerId ${customerId}`);
            }
        }

    } catch (error) {
        console.error(`[Stripe] Error processing event ${event.type}:`, error);
        logServerError('stripeWebhook', error, { context: event.type });
        // Return 500 so Stripe RETRIES (backoff, capped ~72h). A 200 here would silently drop
        // a legitimate activation on a transient error → a paying customer left inactive.
        return res.status(500).json({ received: false, error: error.message });
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

    // 1b. Get Private Config (Secrets)
    const privateDoc = await db.collection('stores').doc(storeId).collection('private').doc('config').get();
    const privateData = privateDoc.exists ? privateDoc.data() : {};

    // 2. Verify Signature
    const webhookSecret = process.env.WOOCOMMERCE_WEBHOOK_SECRET || privateData.wooWebhookSecret || storeData.wooWebhookSecret;
    if (!webhookSecret) {
        console.error("WooCommerce Webhook: Missing Webhook Secret for store", storeId);
        return res.status(500).send("Webhook secret not configured");
    }

    const wooService = new WooService(
        process.env.WOOCOMMERCE_URL || storeData.wooUrl,
        process.env.WOOCOMMERCE_CONSUMER_KEY || privateData.wooConsumerKey || storeData.wooConsumerKey,
        process.env.WOOCOMMERCE_CONSUMER_SECRET || privateData.wooConsumerSecret || storeData.wooConsumerSecret,
        webhookSecret
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

/**
 * Calculate the total value of an order.
 * Supports both:
 *   - Multi-product orders: sum of products[].price * products[].quantity
 *   - Legacy single-product orders: order.price * order.quantity
 */
const getOrderValue = (order) => {
    if (!order) return 0;
    // Multi-product order (products array present and non-empty)
    if (Array.isArray(order.products) && order.products.length > 0) {
        return order.products.reduce((sum, item) => {
            return sum + (parseFloat(item.price) || 0) * (parseInt(item.quantity) || 1);
        }, 0);
    }
    // Legacy single-product order
    return (parseFloat(order.price) || 0) * (parseInt(order.quantity) || 1);
};
const getDateKey = (dateString) => dateString || new Date().toISOString().split('T')[0];


exports.onOrderWrite = onDocumentWritten({
    document: "orders/{orderId}",
    database: "comsaas",
    region: "us-central1",
    concurrency: 50,
    minInstances: 1, // Keep one instance warm to avoid cold starts
}, async (event) => {
    // v2 change object is in event.data
    const change = event.data;
    if (!change) return;

    const before = change.before.exists ? change.before.data() : null;
    const after = change.after.exists ? change.after.data() : null;

    const storeId = after ? after.storeId : before.storeId;

    if (!storeId) {
        console.error("No storeId found in order", event.params.orderId);
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

    // Helpers — primitives issues de la SOURCE DE VÉRITÉ UNIQUE (BAY-104, ./shared/money).
    // getCollectedValue = cash réellement encaissé (amountPaid partiel COD, sinon plein si payée).
    const { collectedValue: getCollectedValue, isRealized, orderCOGS: getCostValue } = require('./shared/money');
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
            realizedRevDelta = getCollectedValue(after);
            realizedCostDelta = getCostValue(after);
            realizedDeliveryCostDelta = getDeliveryCost(after);
        }
    } else if (before && !after) {
        // DELETE
        revenueDelta = -getOrderValue(before);
        countDelta = -1;
        if (isRealized(before)) {
            realizedRevDelta = -getCollectedValue(before);
            realizedCostDelta = -getCostValue(before);
            realizedDeliveryCostDelta = -getDeliveryCost(before);
        }
    } else {
        // UPDATE
        const newVal = getOrderValue(after);
        const oldVal = getOrderValue(before);
        const newCollected = getCollectedValue(after);
        const oldCollected = getCollectedValue(before);
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
            realizedRevDelta = newCollected;
            realizedCostDelta = newCost;
            realizedDeliveryCostDelta = newDelivery;
        } else if (!nowRealized && wasRealized) {
            // No longer Realized
            realizedRevDelta = -oldCollected;
            realizedCostDelta = -oldCost;
            realizedDeliveryCostDelta = -oldDelivery;
        } else if (nowRealized && wasRealized) {
            // Stayed Realized (but maybe amount collected / cost / delivery changed)
            realizedRevDelta = newCollected - oldCollected;
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

    // [COHÉRENCE] Champs dérivés du STATUT (livré/expédié/remis) — maintenus en incrémental pour
    // que le Dashboard (stats stockées) == le recalcul (manualReconciliation). Avant, ils n'étaient
    // mis à jour qu'au recalcul (2h ou "Sync") → KPIs "remis/non remis/livré" périmés en intraday.
    // contrib(after) - contrib(before) couvre create/update/delete ET changement de paymentStatus.
    const deliveredContrib = (o) => (o && o.status === 'livré') ? getOrderValue(o) : 0;
    const expectedContrib = (o) => (o && (o.status === 'livraison' || o.status === 'ramassage')) ? getOrderValue(o) : 0;
    const remittedContrib = (o) => (o && o.status === 'livré' && o.paymentStatus === 'remitted') ? getOrderValue(o) : 0;
    const unremittedContrib = (o) => (o && o.status === 'livré' && o.paymentStatus !== 'remitted') ? getOrderValue(o) : 0;
    const deliveredRevDelta = deliveredContrib(after) - deliveredContrib(before);
    const expectedRevDelta = expectedContrib(after) - expectedContrib(before);
    const remittedRevDelta = remittedContrib(after) - remittedContrib(before);
    const unremittedRevDelta = unremittedContrib(after) - unremittedContrib(before);
    if (deliveredRevDelta !== 0) updates['totals.deliveredRevenue'] = FieldValue.increment(deliveredRevDelta);
    if (expectedRevDelta !== 0) updates['totals.expectedRevenue'] = FieldValue.increment(expectedRevDelta);
    if (remittedRevDelta !== 0) updates['totals.remittedRevenue'] = FieldValue.increment(remittedRevDelta);
    if (unremittedRevDelta !== 0) updates['totals.unremittedRevenue'] = FieldValue.increment(unremittedRevDelta);

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

    // 4. STOCK MANAGEMENT (Centralized)
    // BAY-80 : on saute la déduction à la CRÉATION des commandes d'intégration dont le
    // webhook a déjà déduit le stock (Woo/Shopify posent _stockManagedByClient) — sinon le
    // trigger déduit une seconde fois (double décrément). Le client ne pose jamais ce flag ;
    // sur les mises à jour ultérieures (changement de statut), le trigger s'exécute normalement.
    const stockAlreadyDeducted = !before && !!after && after._stockManagedByClient === true;
    if (!stockAlreadyDeducted) {
        const { applyStockUpdates } = require('./stockLogic');
        await applyStockUpdates(db, before, after);
    }

    // Execute Update
    const statsPromise = statsRef.set(updates, { merge: true });

    // Commit batch for Stock (and any other potential batch ops)
    const batchPromise = batch.commit();

    // 5. CUSTOMER totalSpent SYNC
    // When an order transitions to 'livré', increment customer totalSpent by order value.
    // When an order leaves 'livré' (cancelled, returned), decrement it.
    const DELIVERED_STATUS = 'livré';
    const customerId = after?.customerId || before?.customerId;
    const driverId = after?.driverId || before?.driverId;
    let customerSpentPromise = Promise.resolve();
    let driverStatsPromise = Promise.resolve();

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

    // DRIVER STATS SYNC
    if (driverId) {
        const wasDelivered = oldStatus === DELIVERED_STATUS;
        const isDelivered = newStatus === DELIVERED_STATUS;
        const orderValue = getOrderValue(after || before);
        
        let driverUpdates = {};
        
        if (!wasDelivered && isDelivered) {
            driverUpdates = {
                "stats.totalDelivered": FieldValue.increment(1),
                "stats.totalCOD": FieldValue.increment(orderValue)
            };
        } else if (wasDelivered && !isDelivered && before && after) {
            driverUpdates = {
                "stats.totalDelivered": FieldValue.increment(-1),
                "stats.totalCOD": FieldValue.increment(-getOrderValue(before))
            };
        }
        
        if (Object.keys(driverUpdates).length > 0) {
            driverStatsPromise = db.collection('drivers').doc(driverId).update(driverUpdates)
                .catch(e => console.warn('Driver stats update failed:', e.message));
        }
    }

    // 6. KNOWLEDGE GRAPH EXTRACTION (Phase 3)
    // Extraire les relations Produit/Ville/Transporteur lors d'une livraison ou retour
    let kgPromise = Promise.resolve();
    if (oldStatus !== newStatus && (newStatus === 'livré' || newStatus === 'retour') && after) {
        const { upsertNode, incrementEdgeMetric } = require('./copilot/kgService');
        const cityNodeId = `city_${(after.clientCity || 'unknown').toLowerCase().trim()}`;
        const carrierNodeId = `carrier_${(after.carrier || 'unknown').toLowerCase().trim()}`;
        const relationPrefix = newStatus === 'livré' ? 'DELIVERED' : 'RETURNED';
        
        const kgTasks = [];
        
        // Noeuds génériques
        kgTasks.push(upsertNode(storeId, cityNodeId, 'city', { name: after.clientCity || 'Unknown' }));
        kgTasks.push(upsertNode(storeId, carrierNodeId, 'carrier', { name: after.carrier || 'Unknown' }));
        
        // Edge Ville -> Transporteur
        kgTasks.push(incrementEdgeMetric(storeId, cityNodeId, carrierNodeId, `${relationPrefix}_BY`, 'count', 1));

        // Produits
        if (Array.isArray(after.products)) {
            for (const item of after.products) {
                const prodNodeId = `product_${item.id}`;
                kgTasks.push(upsertNode(storeId, prodNodeId, 'product', { name: item.name }));
                // Edge Produit -> Ville
                kgTasks.push(incrementEdgeMetric(storeId, prodNodeId, cityNodeId, `${relationPrefix}_IN`, 'count', 1));
                // Edge Produit -> Transporteur
                kgTasks.push(incrementEdgeMetric(storeId, prodNodeId, carrierNodeId, `${relationPrefix}_BY`, 'count', 1));
            }
        }
        
        kgPromise = Promise.all(kgTasks).catch(e => console.warn('[KnowledgeGraph] Extraction failed:', e.message));
    }

    // 8. AUTOMATIONS (BAY-105) — serveur, couvre TOUTES les commandes (client / webhook / bot).
    // Immédiat : exécuté ici ; à délai : planifié dans automation_tasks (cf. automationScheduler).
    let automationPromise = Promise.resolve();
    if (storeId && after && ((!before) || (oldStatus !== newStatus))) {
        const triggerType = !before ? 'order_created' : 'order_updated';
        const autoPayload = { id: event.params.orderId, ...after };
        automationPromise = (async () => {
            try {
                const storeSnap = await db.collection('stores').doc(storeId).get();
                const { runAutomations } = require('./automation/engine');
                await runAutomations(db, storeId, triggerType, autoPayload, storeSnap.exists ? storeSnap.data() : {});
            } catch (e) { console.warn('[Automation] runAutomations failed:', e.message); }
        })();
    }

    // 9. LIAISON CRM (BAY-112) — les commandes sans customerId (catalogue public, webhook, bot)
    // ne créaient/liaient aucune fiche client → CRM incomplet. On rattache côté serveur, à la
    // création, avec dédup par téléphone (déjà normalisé à l'écriture) et numéro client séquentiel
    // issu du compteur dédié (counters/sequences, BAY-107). Les commandes manuelles ont déjà un
    // customerId → ignorées. Le set de customerId re-déclenche onOrderWrite mais en UPDATE sans
    // changement de statut → pas de boucle ni de double-comptage.
    let customerLinkPromise = Promise.resolve();
    if (!before && after && storeId && !after.customerId && after.clientPhone) {
        const { linkOrderCustomer } = require('./customerLink');
        customerLinkPromise = linkOrderCustomer(db, event.params.orderId)
            .catch(e => console.warn('[CRM link] failed:', e.message));
    }

    // 7. AUDIT LOGGING
    // Log status changes in the store's audit trail
    if (oldStatus !== newStatus && storeId) {
        const auditRef = db.collection('stores').doc(storeId).collection('audit_logs').doc();
        const auditPromise = auditRef.set({
            orderId: event.params.orderId,
            orderNumber: after?.orderNumber || before?.orderNumber || event.params.orderId,
            fromStatus: oldStatus || 'CREATED',
            toStatus: newStatus || 'DELETED',
            userId: after?._updatedBy === 'carrier' ? 'CARRIER_WEBHOOK' : (after?._updatedBy || 'SYSTEM'),
            userName: after?._updatedBy === 'carrier' ? 'Livreur (Webhook)' : 'Automate Système',
            timestamp: FieldValue.serverTimestamp(),
            source: after?._updatedBy === 'carrier' ? 'Webhook' : 'Cloud Function'
        }).catch(e => console.warn('Audit logging failed:', e.message));
        
        return Promise.all([statsPromise, batchPromise, customerSpentPromise, driverStatsPromise, auditPromise, kgPromise, automationPromise, customerLinkPromise]);
    }

    return Promise.all([statsPromise, batchPromise, customerSpentPromise, driverStatsPromise, kgPromise, automationPromise, customerLinkPromise]);
});

/**
 * Automation Scheduler (BAY-105)
 * Exécute les actions d'automatisation à délai arrivées à échéance.
 * Le moteur serveur (functions/automation/engine.js) planifie ces tâches dans
 * stores/{id}/automation_tasks avec un champ runAt ; ici on exécute les tâches dues.
 * Tourne toutes les 15 min. On filtre runAt en mémoire pour éviter un index composite
 * collectionGroup (status+runAt) — le déploiement d'index sur base nommée est bloqué (CLI bug).
 */
exports.automationScheduler = onSchedule("*/15 * * * *", async () => {
    const { executeAction } = require('./automation/engine');
    const now = Date.now();
    let snap;
    try {
        snap = await db.collectionGroup('automation_tasks')
            .where('status', '==', 'scheduled')
            .limit(300)
            .get();
    } catch (e) {
        console.error('[AutomationScheduler] query failed:', e.message);
        return;
    }

    const storeCache = {};
    const getStore = async (storeId) => {
        if (storeCache[storeId] === undefined) {
            const s = await db.collection('stores').doc(storeId).get();
            storeCache[storeId] = s.exists ? s.data() : {};
        }
        return storeCache[storeId];
    };

    let executed = 0;
    for (const taskDoc of snap.docs) {
        const task = taskDoc.data();
        const runAtMs = task.runAt && task.runAt.toMillis ? task.runAt.toMillis() : 0;
        if (runAtMs > now) continue; // pas encore due

        // storeId = grand-parent : stores/{storeId}/automation_tasks/{taskId}
        const storeId = taskDoc.ref.parent.parent && taskDoc.ref.parent.parent.id;
        if (!storeId) { await taskDoc.ref.update({ status: 'error', error: 'no storeId' }).catch(() => {}); continue; }

        try {
            const store = await getStore(storeId);
            await executeAction(db, task.node, task.payload, store, storeId);
            await taskDoc.ref.update({ status: 'done', executedAt: FieldValue.serverTimestamp() });
            executed++;
        } catch (e) {
            console.error(`[AutomationScheduler] task ${taskDoc.id} failed:`, e.message);
            await taskDoc.ref.update({ status: 'error', error: e.message }).catch(() => {});
        }
    }
    if (executed > 0) console.log(`[AutomationScheduler] executed ${executed} due task(s).`);
});

/**
 * dailyErrorDigest — alerte proactive : chaque matin, agrège les erreurs PROD des 24 dernières
 * heures (collection error_logs) et écrit un résumé dans system_alerts. Le super_admin le voit
 * sur son AdminDashboard (sans email). Complète le monitoring passif de /admin/errors.
 */
exports.dailyErrorDigest = onSchedule("0 8 * * *", async () => {
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
    let snap;
    try {
        snap = await db.collection('error_logs').where('at', '>=', cutoff).limit(1000).get();
    } catch (e) {
        console.error('[dailyErrorDigest] query failed:', e.message);
        return;
    }
    const groups = {};
    let total = 0;
    snap.forEach((d) => {
        const e = d.data();
        if (e.mode !== 'prod') return; // uniquement les erreurs de production
        total++;
        const fp = e.fingerprint || 'unknown';
        if (!groups[fp]) groups[fp] = { fingerprint: fp, message: e.message || '', source: e.source || '', count: 0 };
        groups[fp].count++;
    });
    const top = Object.values(groups).sort((a, b) => b.count - a.count).slice(0, 10);
    const date = new Date().toISOString().split('T')[0];
    await db.collection('system_alerts').doc(date).set({
        date, total, distinct: top.length, top,
        createdAt: FieldValue.serverTimestamp(),
    });
    if (total > 0) console.log(`[dailyErrorDigest] ${total} erreur(s) prod / 24h, ${top.length} distinctes.`);
});

/**
 * monthlyMrrSnapshot — le 1er de chaque mois à 6h, fige le MRR réel (boutiques payantes × prix)
 * dans mrr_snapshots/{YYYY-MM}. Alimente le graphique d'évolution du MRR de l'AdminDashboard avec
 * de VRAIES données historiques (au lieu d'une extrapolation).
 */
async function computeAndWriteMrrSnapshot() {
    const { planPrice, isPaying } = require('./pricing');
    const snap = await db.collection('stores').get();
    let mrr = 0;
    let activePaying = 0;
    const byPlan = {};
    snap.forEach((d) => {
        const s = d.data();
        if (!isPaying(s)) return;
        const p = planPrice(s.plan);
        mrr += p;
        activePaying++;
        if (!byPlan[s.plan]) byPlan[s.plan] = { count: 0, mrr: 0 };
        byPlan[s.plan].count++;
        byPlan[s.plan].mrr += p;
    });
    const month = new Date().toISOString().slice(0, 7); // YYYY-MM
    await db.collection('mrr_snapshots').doc(month).set({
        month, mrr, activePaying, byPlan,
        at: FieldValue.serverTimestamp(),
    });
    console.log(`[mrrSnapshot] ${month}: MRR=${mrr} (${activePaying} payants).`);
    return { month, mrr, activePaying };
}

exports.monthlyMrrSnapshot = onSchedule("0 6 1 * *", async () => {
    try {
        await computeAndWriteMrrSnapshot();
    } catch (e) {
        console.error('[monthlyMrrSnapshot] failed:', e.message);
    }
});

/** runMrrSnapshotNow — fige le MRR du mois courant à la demande (super_admin), depuis l'admin. */
exports.runMrrSnapshotNow = functions.https.onCall(async (data, context) => {
    if (!context.auth || context.auth.token.role !== 'super_admin') {
        throw new functions.https.HttpsError('permission-denied', 'Super admin uniquement.');
    }
    try {
        return await computeAndWriteMrrSnapshot();
    } catch (e) {
        throw new functions.https.HttpsError('internal', e.message);
    }
});

/**
 * createCarrierDelivery — crée un colis transporteur CÔTÉ SERVEUR (Sendit/Olivraison/Cathedis).
 * Corrige les problèmes de l'ancien flux navigateur : CORS, secrets exposés, session Cathedis cassée.
 * Le client appelle cette fonction ; les secrets restent côté serveur (stores/{id}/private/config).
 */
const CARRIER_SHIPPABLE_FROM = ['confirmation', 'packing', 'ramassage', 'pas de réponse', 'reporté'];
exports.createCarrierDelivery = functions.https.onCall(async (data, context) => {
    if (!context.auth) throw new functions.https.HttpsError('unauthenticated', 'Connexion requise.');
    const { orderId, carrier } = data || {};
    if (!orderId || !carrier) throw new functions.https.HttpsError('invalid-argument', 'orderId et carrier requis.');

    const orderRef = db.collection('orders').doc(orderId);
    const orderSnap = await orderRef.get();
    if (!orderSnap.exists) throw new functions.https.HttpsError('not-found', 'Commande introuvable.');
    const order = { id: orderSnap.id, ...orderSnap.data() };
    const storeId = order.storeId;
    if (!storeId) throw new functions.https.HttpsError('failed-precondition', 'Commande sans storeId.');

    // Ownership : le caller doit appartenir au store de la commande (claim), sinon vérif ownerId.
    const isSuper = context.auth.token.role === 'super_admin';
    if (!isSuper && context.auth.token.storeId !== storeId) {
        const sDoc = await db.collection('stores').doc(storeId).get();
        if (!sDoc.exists || sDoc.data().ownerId !== context.auth.uid) {
            throw new functions.https.HttpsError('permission-denied', 'Accès refusé à cette commande.');
        }
    }

    // Anti double-expédition + machine d'états.
    if (order.trackingId || order.status === 'livraison' || order.status === 'livré') {
        throw new functions.https.HttpsError('failed-precondition', 'Commande déjà expédiée.');
    }
    if (!CARRIER_SHIPPABLE_FROM.includes(order.status)) {
        throw new functions.https.HttpsError('failed-precondition', `Impossible d'expédier depuis le statut « ${order.status} ».`);
    }

    const [storeSnap, cfgSnap] = await Promise.all([
        db.collection('stores').doc(storeId).get(),
        db.collection('stores').doc(storeId).collection('private').doc('config').get(),
    ]);
    const store = storeSnap.exists ? storeSnap.data() : {};
    const secrets = cfgSnap.exists ? cfgSnap.data() : {};

    let result;
    try {
        const { createDelivery } = require('./carriers');
        result = await createDelivery(carrier, order, store, secrets);
    } catch (e) {
        console.error(`[Carrier ${carrier}] create failed:`, e.message);
        logServerError('createCarrierDelivery', e, { storeId, context: carrier });
        throw new functions.https.HttpsError('internal', e.message || 'Échec de la création du colis.');
    }

    await orderRef.update({
        carrier,
        trackingId: result.trackingId || 'PENDING',
        carrierStatus: result.carrierStatus || 'CREATED',
        labelUrl: result.labelUrl || '',
        status: 'livraison', // passage automatique en livraison (machine d'états respectée ci-dessus)
        _updatedBy: context.auth.uid,
        updatedAt: FieldValue.serverTimestamp(),
    });

    return result;
});

/**
 * carrierAction — lectures transporteur CÔTÉ SERVEUR (suivi de colis, remises/factures).
 * Évite CORS + secrets exposés. La réconciliation cash consomme les remises Sendit.
 */
exports.carrierAction = functions.https.onCall(async (data, context) => {
    if (!context.auth) throw new functions.https.HttpsError('unauthenticated', 'Connexion requise.');
    const { action } = data || {};

    let storeId, order = null;
    if (action === 'tracking') {
        if (!data.orderId) throw new functions.https.HttpsError('invalid-argument', 'orderId requis.');
        const oSnap = await db.collection('orders').doc(data.orderId).get();
        if (!oSnap.exists) throw new functions.https.HttpsError('not-found', 'Commande introuvable.');
        order = oSnap.data();
        storeId = order.storeId;
    } else {
        storeId = context.auth.token.storeId;
    }
    if (!storeId) throw new functions.https.HttpsError('failed-precondition', 'Store introuvable.');

    const isSuper = context.auth.token.role === 'super_admin';
    if (!isSuper && context.auth.token.storeId !== storeId) {
        const sDoc = await db.collection('stores').doc(storeId).get();
        if (!sDoc.exists || sDoc.data().ownerId !== context.auth.uid) {
            throw new functions.https.HttpsError('permission-denied', 'Accès refusé.');
        }
    }

    // Secrets : doc store (clés legacy) + private/config (prioritaire).
    const [sSnap, cSnap] = await Promise.all([
        db.collection('stores').doc(storeId).get(),
        db.collection('stores').doc(storeId).collection('private').doc('config').get(),
    ]);
    const secrets = { ...(sSnap.exists ? sSnap.data() : {}), ...(cSnap.exists ? cSnap.data() : {}) };

    const carriers = require('./carriers');
    try {
        if (action === 'tracking') {
            const carrier = order.carrier || 'sendit';
            if (carrier !== 'sendit') throw new functions.https.HttpsError('unimplemented', 'Suivi serveur disponible pour Sendit.');
            if (!order.trackingId) throw new functions.https.HttpsError('failed-precondition', 'Commande sans numéro de suivi.');
            return await carriers.senditTracking(secrets, order.trackingId);
        }
        if (action === 'remittances') {
            return { data: await carriers.senditInvoices(secrets, data.options || {}) };
        }
        if (action === 'districts') {
            return { data: await carriers.senditDistrictsFull(secrets) };
        }
        if (action === 'pickup') {
            // secrets contient déjà les champs du doc store (nom/tél/adresse/senditPickupCityId).
            return { data: await carriers.senditPickup(secrets, secrets, data.trackingIds || [], data.note) };
        }
        throw new functions.https.HttpsError('invalid-argument', `Action inconnue : ${action}`);
    } catch (e) {
        if (e instanceof functions.https.HttpsError) throw e;
        console.error('[carrierAction] error:', e.message);
        logServerError('carrierAction', e, { storeId, context: action });
        throw new functions.https.HttpsError('internal', e.message || 'Erreur transporteur.');
    }
});

/**
 * Sendit Webhook Handler
 * Updates order status based on Sendit events.
 * 
 * URL to Register: https://us-central1-YOUR-PROJECT-ID.cloudfunctions.net/senditWebhook
 */
exports.senditWebhook = functions.https.onRequest(async (req, res) => {
    const storeId = req.query.store;
    const token = req.query.token;

    if (!storeId || !token) {
        console.warn("Sendit Webhook: Missing store or token.");
        return res.status(401).send("Unauthorized: Missing credentials");
    }

    try {
        // SECURITY CHECK: Tenant-specific token
        const configDoc = await db.collection('stores').doc(storeId).collection('private').doc('config').get();
        if (!configDoc.exists) return res.status(401).send("Unauthorized");
        const expectedToken = configDoc.data().webhookSecret;
        if (!expectedToken || token !== expectedToken) {
            console.warn(`Sendit Webhook: Unauthorized attempt for store ${storeId}.`);
            return res.status(401).send("Unauthorized");
        }

        // Sendit sends JSON body: { code, status, tracking_code, data }
        const { code, status } = req.body;
        console.log(`Sendit Webhook Received for store ${storeId}:`, JSON.stringify(req.body));

        if (!code || !status) return res.status(400).send("Payload invalide");

        // Find order by trackingId (code) WITHIN THE SPECIFIC STORE
        const snapshot = await db.collection('orders')
            .where('storeId', '==', storeId)
            .where('trackingId', '==', code)
            .get();

        if (snapshot.empty) {
            console.log(`No order found for tracking code: ${code} in store: ${storeId}`);
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
                lastCarrierUpdate: FieldValue.serverTimestamp(),
                _updatedBy: 'carrier' // Flag for onOrderWrite stock sync
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
        logServerError('senditWebhook', error);
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
    const storeId = req.query.store;
    const token = req.query.token;

    if (!storeId || !token) {
        console.warn("O-Livraison Webhook: Missing store or token.");
        return res.status(401).send("Unauthorized: Missing credentials");
    }

    try {
        // SECURITY CHECK: Tenant-specific token
        const configDoc = await db.collection('stores').doc(storeId).collection('private').doc('config').get();
        if (!configDoc.exists) return res.status(401).send("Unauthorized");
        const expectedToken = configDoc.data().webhookSecret;
        if (!expectedToken || token !== expectedToken) {
            console.warn(`O-Livraison Webhook: Unauthorized attempt for store ${storeId}.`);
            return res.status(401).send("Unauthorized");
        }

        // Webhooks might be GET (ping) or POST
        if (req.method !== 'POST') {
            return res.status(200).send("O-Livraison Webhook endpoint is active. Awaiting POST.");
        }

        console.log(`O-Livraison Webhook Received Payload for store ${storeId}:`, JSON.stringify(req.body));

        // Support various formats O-Livraison might use
        const payload = req.body;
        const status = payload.status || payload.Status || payload.etat || payload.state;
        const tracking = payload.trackingNumber || payload.tracking_id || payload.code || payload.id || payload.trackingId || payload.package_id;

        if (!tracking || !status) {
            console.warn("Invalid O-Livraison Payload, missing tracking or status.");
            // Always return 200 so they don't retry a bad payload infinitely
            return res.status(200).send({ success: false, reason: "Missing tracking or status fields" });
        }

        // Find order by trackingId WITHIN THE SPECIFIC STORE
        const snapshot = await db.collection('orders')
            .where('storeId', '==', storeId)
            .where('trackingId', '==', String(tracking))
            .get();

        if (snapshot.empty) {
            console.log(`No order found in BayIIn for O-Livraison tracking code: ${tracking} in store: ${storeId}`);
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
                lastCarrierUpdate: FieldValue.serverTimestamp(),
                _updatedBy: 'carrier'
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

    // Get Store Config (public doc — only for wooUrl and activation check)
    const storeDoc = await db.collection('stores').doc(storeId).get();
    if (!storeDoc.exists) return;
    const storeData = storeDoc.data();

    // Get Private Config (WooCommerce credentials — stored in secured subcollection)
    const privateDoc = await db.collection('stores').doc(storeId).collection('private').doc('config').get();
    const privateData = privateDoc.exists ? privateDoc.data() : {};

    // Check if WooCommerce integration is active
    const wooUrl = process.env.WOOCOMMERCE_URL || storeData.wooUrl;
    const wooKey = process.env.WOOCOMMERCE_CONSUMER_KEY || privateData.wooConsumerKey || storeData.wooConsumerKey;
    const wooSecret = process.env.WOOCOMMERCE_CONSUMER_SECRET || privateData.wooConsumerSecret || storeData.wooConsumerSecret;

    if (!wooUrl || !wooKey) return;

    const wooService = new WooService(wooUrl, wooKey, wooSecret);

    try {
        await wooService.updateStock(after.sku, after.stock);
        console.log(`[WooSync] Synced SKU ${after.sku} stock=${after.stock} for store ${storeId}`);
    } catch (error) {
        console.error(`[WooSync] Failed to sync SKU ${after.sku} for store ${storeId}:`, error);
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
                const orderVal = mOrderValue(order);
                const orderCost = mOrderCOGS(order);
                const deliveryCost = parseFloat(order.realDeliveryCost) || 0;
                const dateKey = order.date ? order.date.split('T')[0] : 'unknown';

                stats.totals.revenue += orderVal;
                stats.totals.count += 1;

                // Réalisé = cash réellement encaissé (amountPaid partiel COD ou plein si payée),
                // aligné sur manualReconciliation et financials.js (BAY-104), plus isPaid seul.
                if (mIsRealized(order)) {
                    stats.totals.realizedRevenue += mCollected(order);
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

// ==========================================
// BEYA3 COPILOT - PROACTIVE AGENT JOBS
// ==========================================
const { generateDailyBrief, deliverInsight } = require('./copilot/proactiveAgent'); // runAnomalyScanner already imported above (line ~82)

/**
 * Daily Brief (Runs every day at 08:00 Casablanca time)
 */
exports.beya3DailyBrief = functions.pubsub.schedule('0 8 * * *')
  .timeZone('Africa/Casablanca')
  .onRun(async (context) => {
    console.log("Starting Beya3 Daily Brief generation...");
    // Fetch all active PRO stores
    const storesSnap = await db.collection('stores').where('plan', 'in', ['pro', 'unlimited']).get();
    
    for (const storeDoc of storesSnap.docs) {
        try {
            const brief = await generateDailyBrief(storeDoc.id);
            await deliverInsight(storeDoc.id, brief, 'dashboard', 'daily_brief');
        } catch (e) {
            console.error(`Failed to generate daily brief for store ${storeDoc.id}:`, e);
        }
    }
    return null;
});

/**
 * Anomaly Scanner (Runs every 30 minutes)
 */
exports.beya3AnomalyScanner = functions.pubsub.schedule('*/30 * * * *')
  .onRun(async (context) => {
    // Only scan active PRO stores
    const storesSnap = await db.collection('stores').where('plan', 'in', ['pro', 'unlimited']).get();
    
    for (const storeDoc of storesSnap.docs) {
        try {
            await runAnomalyScanner(storeDoc.id);
        } catch (e) {
            console.error(`Scanner failed for store ${storeDoc.id}:`, e);
        }
    }
    return null;
});

// ==========================================
// BEYA3 COPILOT - WEEKLY BENCHMARK
// ==========================================
const { updateMarketBenchmarks } = require('./copilot/benchmarkService');

/**
 * Weekly Market Benchmark (Runs every Sunday at 02:00 Casablanca time)
 */
exports.beya3WeeklyBenchmark = functions.pubsub.schedule('0 2 * * 0')
  .timeZone('Africa/Casablanca')
  .onRun(async (context) => {
    console.log("Starting Beya3 Weekly Benchmark calculation...");
    try {
        await updateMarketBenchmarks();
        console.log("Weekly benchmark completed.");
    } catch (e) {
        console.error("Weekly benchmark failed:", e);
    }
    return null;
});

// cleanYoucan: REMOVED (SEC-04 — was an unauthenticated destructive endpoint)

/**
 * Manual Reconciliation Function
 * Called manually from the dashboard to recalculate all stats.
 */
exports.manualReconciliation = functions.runWith({ timeoutSeconds: 300, memory: '1GB' }).https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'User must be logged in');
    }
    const storeId = data.storeId;
    if (!storeId) {
        throw new functions.https.HttpsError('invalid-argument', 'Missing storeId');
    }

    // Verify user belongs to store
    const userDoc = await db.collection('users').doc(context.auth.uid).get();
    if (!userDoc.exists || (userDoc.data().storeId !== storeId && context.auth.token.role !== 'super_admin')) {
        throw new functions.https.HttpsError('permission-denied', 'Not authorized for this store');
    }

    try {
        console.log(`Starting manual reconciliation for store ${storeId}`);
        const ordersRef = db.collection('orders').where('storeId', '==', storeId);
        const expRef = db.collection('expenses').where('storeId', '==', storeId);
        const refRef = db.collection('refunds').where('storeId', '==', storeId);

        const [ordersSnap, expSnap, refSnap] = await Promise.all([
            ordersRef.get(),
            expRef.get(),
            refRef.get()
        ]);

        const stats = {
            totals: {
                revenue: 0, count: 0, realizedRevenue: 0, realizedCOGS: 0, realizedDeliveryCost: 0,
                deliveredRevenue: 0, expectedRevenue: 0, unremittedRevenue: 0, remittedRevenue: 0,
                expenses: 0, refunds: 0, netProfit: 0
            },
            statusCounts: {},
            daily: {}
        };

        const customerStats = {};

        ordersSnap.forEach(doc => {
            const order = doc.data();
            const orderVal = mOrderValue(order);
            const orderCost = mOrderCOGS(order);
            const deliveryCost = parseFloat(order.realDeliveryCost) || 0;
            const dateKey = order.date ? order.date.split('T')[0] : 'unknown';

            // Stats Aggregation
            stats.totals.revenue += orderVal;
            stats.totals.count += 1;

            // Réalisé = cash encaissé (source de vérité unique money.js — BAY-104).
            const amountCollected = mCollected(order);
            if (mIsRealized(order)) {
                stats.totals.realizedRevenue += amountCollected;
                stats.totals.realizedCOGS += orderCost;
                stats.totals.realizedDeliveryCost += deliveryCost;
            }

            if (order.status === 'livraison' || order.status === 'ramassage') stats.totals.expectedRevenue += orderVal;
            if (order.status === 'livré') {
                stats.totals.deliveredRevenue += orderVal;
                if (order.paymentStatus === 'remitted') stats.totals.remittedRevenue += orderVal;
                else stats.totals.unremittedRevenue += orderVal;
            }

            const status = order.status || 'unknown';
            stats.statusCounts[status] = (stats.statusCounts[status] || 0) + 1;

            if (!stats.daily[dateKey]) stats.daily[dateKey] = { revenue: 0, count: 0 };
            stats.daily[dateKey].revenue += orderVal;
            stats.daily[dateKey].count += 1;

            // Customer Stats Aggregation — count spend only for DELIVERED orders, matching the
            // incremental onOrderWrite trigger, so "Sync Stats" doesn't inflate totalSpent with
            // cancelled/returned/pending orders (the two paths must agree).
            if (order.customerId) {
                if (!customerStats[order.customerId]) customerStats[order.customerId] = { count: 0, spent: 0, dates: [] };
                customerStats[order.customerId].count += 1;
                if (order.status === 'livré') customerStats[order.customerId].spent += orderVal;
                if (order.date) customerStats[order.customerId].dates.push(order.date);
            }
        });

        expSnap.forEach(doc => { stats.totals.expenses += (parseFloat(doc.data().amount) || 0); });
        // Avoirs : total + agrégat par client, pour aligner la LTV recalculée sur l'incrémental
        // (Returns décrémente totalSpent du montant de l'avoir) — sinon un "Sync" regonfle la LTV.
        const refundsByCustomer = {};
        refSnap.forEach(doc => {
            const r = doc.data();
            const amt = parseFloat(r.amount) || 0;
            stats.totals.refunds += amt;
            if (r.customerId) refundsByCustomer[r.customerId] = (refundsByCustomer[r.customerId] || 0) + amt;
        });

        stats.totals.netProfit = mNetProfit({
            realizedRevenue: stats.totals.realizedRevenue, cogs: stats.totals.realizedCOGS,
            delivery: stats.totals.realizedDeliveryCost, expenses: stats.totals.expenses, refunds: stats.totals.refunds,
        });

        // Commit all updates using batch
        const batch = db.batch();
        batch.set(db.collection('stores').doc(storeId).collection('stats').doc('sales'), stats);

        Object.entries(customerStats).forEach(([custId, cStats]) => {
            const lastOrderDate = cStats.dates.sort().pop() || new Date().toISOString().split('T')[0];
            batch.update(db.collection('customers').doc(custId), {
                orderCount: cStats.count,
                totalSpent: Math.max(0, cStats.spent - (refundsByCustomer[custId] || 0)),
                lastOrderDate: lastOrderDate
            });
        });

        await batch.commit();
        console.log(`Reconciliation completed for store ${storeId}`);
        return { success: true };

    } catch (error) {
        console.error('Manual reconciliation error:', error);
        throw new functions.https.HttpsError('internal', 'Reconciliation failed', error.message);
    }
});

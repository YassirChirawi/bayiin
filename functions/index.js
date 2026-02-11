const functions = require('firebase-functions');
const { onDocumentWritten } = require("firebase-functions/v2/firestore");
const { initializeApp } = require('firebase-admin/app');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');

// Initialize Stripe with Secret Key (set via .env)
const stripeKey = process.env.STRIPE_SECRET_KEY || (functions.config().stripe && functions.config().stripe.secret) || 'sk_test_placeholder';
const stripe = require('stripe')(stripeKey);

initializeApp();
// Connect to the named database used by the frontend
const db = getFirestore('comsaas');

/**
 * Stripe Webhook Handler
 */
exports.stripeWebhook = functions.https.onRequest(async (req, res) => {
    const sig = req.headers['stripe-signature'];
    const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET || (functions.config().stripe && functions.config().stripe.webhook_secret);

    let event;

    try {
        if (endpointSecret) {
            event = stripe.webhooks.constructEvent(req.rawBody, sig, endpointSecret);
        } else {
            event = req.body;
        }
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
    const oldProductId = before?.articleId;
    const newProductId = after?.articleId;

    const getActiveQty = (o) => {
        if (!o) return 0;
        // Inactive statuses do not consume stock
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

    // Execute Update
    console.log("Updates:", JSON.stringify(updates));
    const statsPromise = statsRef.set(updates, { merge: true });

    // Commit batch for Stock (and any other potential batch ops)
    const batchPromise = batch.commit();

    return Promise.all([statsPromise, batchPromise]);
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

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

    // Execute Update
    console.log("Updates:", JSON.stringify(updates));
    return statsRef.set(updates, { merge: true });
});

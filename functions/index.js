const functions = require('firebase-functions');
const admin = require('firebase-admin');
// Initialize Stripe with Secret Key (set via .env)
const stripeKey = process.env.STRIPE_SECRET_KEY || (functions.config().stripe && functions.config().stripe.secret) || 'sk_test_placeholder';
const stripe = require('stripe')(stripeKey);

if (admin.apps.length === 0) {
    admin.initializeApp();
}

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
                await admin.firestore().collection('stores').doc(storeId).update({
                    subscriptionStatus: 'active',
                    plan: session.amount_total === 7900 ? 'starter' : 'pro',
                    lastPaymentDate: admin.firestore.FieldValue.serverTimestamp(),
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

exports.onOrderWrite = functions.firestore.document('orders/{orderId}').onWrite(async (change, context) => {
    const before = change.before.exists ? change.before.data() : null;
    const after = change.after.exists ? change.after.data() : null;

    // Get storeId from either (should be same)
    const storeId = after ? after.storeId : before.storeId;
    if (!storeId) return null; // Should not happen

    const statsRef = admin.firestore().collection('stores').doc(storeId).collection('stats').doc('sales');

    const batch = admin.firestore().batch();

    // Logic for Incremental Updates
    // We track:
    // 1. Total Revenue (totals.revenue)
    // 2. Total Count (totals.count)
    // 3. Daily Revenue (daily.YYYY-MM-DD.revenue)
    // 4. Daily Count (daily.YYYY-MM-DD.count)
    // 5. Status Counts (statusCounts.{status})

    // To ensure idempotency & atomicity, we use increment().
    // We calculate "Delta" (Change).

    let revenueDelta = 0;
    let countDelta = 0;

    // Status Deltas
    let oldStatus = before ? before.status : null;
    let newStatus = after ? after.status : null;

    // Date needed for Daily Stats
    // If order date changes (rare), we technically should decrement old date and increment new date.
    // For simplicity, we assume date doesn't change often, or we handle it.
    let oldDate = before ? getDateKey(before.date) : null;
    let newDate = after ? getDateKey(after.date) : null;

    if (!before && after) {
        // CREATE
        revenueDelta = getOrderValue(after);
        countDelta = 1;
    } else if (before && !after) {
        // DELETE
        revenueDelta = -getOrderValue(before);
        countDelta = -1;
    } else {
        // UPDATE
        revenueDelta = getOrderValue(after) - getOrderValue(before);
        // Count doesn't change unless we track "Active" counts vs "Deleted"? 
        // We are tracking Raw counts here.
        countDelta = 0;
    }

    // Prepare Updates
    const updates = {};

    // 1. Totals
    if (revenueDelta !== 0) updates['totals.revenue'] = admin.firestore.FieldValue.increment(revenueDelta);
    if (countDelta !== 0) updates['totals.count'] = admin.firestore.FieldValue.increment(countDelta);

    // 2. Daily Stats
    // Handle date change edge case: If date changed, we must remove from old and add to new.
    if (before && after && oldDate !== newDate) {
        // Date changed!
        const oldVal = getOrderValue(before);
        const newVal = getOrderValue(after);
        updates[`daily.${oldDate}.revenue`] = admin.firestore.FieldValue.increment(-oldVal);
        updates[`daily.${oldDate}.count`] = admin.firestore.FieldValue.increment(-1);
        updates[`daily.${newDate}.revenue`] = admin.firestore.FieldValue.increment(newVal);
        updates[`daily.${newDate}.count`] = admin.firestore.FieldValue.increment(1);
    } else {
        // Date same (or Create/Delete)
        const targetDate = newDate || oldDate;
        if (targetDate) {
            if (revenueDelta !== 0) updates[`daily.${targetDate}.revenue`] = admin.firestore.FieldValue.increment(revenueDelta);
            if (countDelta !== 0) updates[`daily.${targetDate}.count`] = admin.firestore.FieldValue.increment(countDelta);
        }
    }

    // 3. Status Counts
    if (oldStatus !== newStatus) {
        if (oldStatus) updates[`statusCounts.${oldStatus}`] = admin.firestore.FieldValue.increment(-1);
        if (newStatus) updates[`statusCounts.${newStatus}`] = admin.firestore.FieldValue.increment(1);
    } else if (!before && newStatus) {
        // Create
        updates[`statusCounts.${newStatus}`] = admin.firestore.FieldValue.increment(1);
    } else if (before && !newStatus) {
        // Delete
        updates[`statusCounts.${oldStatus}`] = admin.firestore.FieldValue.increment(-1);
    }

    // Execute Update
    // We use set(..., {merge: true}) in case doc doesn't exist
    return statsRef.set(updates, { merge: true });
});

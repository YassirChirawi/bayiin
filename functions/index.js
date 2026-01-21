const functions = require('firebase-functions');
const admin = require('firebase-admin');
// Initialize Stripe with Secret Key (set via .env)
const stripeKey = process.env.STRIPE_SECRET_KEY || (functions.config().stripe && functions.config().stripe.secret) || 'sk_test_placeholder';
const stripe = require('stripe')(stripeKey);

admin.initializeApp();

/**
 * Stripe Webhook Handler
 * Listens for: checkout.session.completed
 */
exports.stripeWebhook = functions.https.onRequest(async (req, res) => {
    const sig = req.headers['stripe-signature'];
    // Access the secure config variable
    const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET || (functions.config().stripe && functions.config().stripe.webhook_secret);

    let event;

    try {
        if (endpointSecret) {
            // Validate signature if secret is available
            event = stripe.webhooks.constructEvent(req.rawBody, sig, endpointSecret);
        } else {
            // Allow testing without specific secret validation if not set (NOT RECOMMENDED for prod)
            // But usually req.body is already parsed JSON in firebase functions, 
            // so constructing event from rawBody is tricky without signature.
            // We'll assume standard processing.
            event = req.body;
        }
    } catch (err) {
        console.error(`Webhook Error: ${err.message}`);
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    // Handle the event
    if (event.type === 'checkout.session.completed') {
        const session = event.data.object;
        const storeId = session.client_reference_id;

        if (storeId) {
            console.log(`Processing successful payment for store: ${storeId}`);

            try {
                await admin.firestore().collection('stores').doc(storeId).update({
                    subscriptionStatus: 'active',
                    plan: session.amount_total === 7900 ? 'starter' : 'pro', // Simple inference
                    lastPaymentDate: admin.firestore.FieldValue.serverTimestamp(),
                    stripeCustomerId: session.customer,
                    stripeSubscriptionId: session.subscription
                });
                console.log(`Successfully activated subscription for ${storeId}`);
            } catch (error) {
                console.error('Error updating Firestore:', error);
                // Don't error out the webhook, log it.
            }
        }
    }

    // Return a 200 response to acknowledge receipt of the event
    res.json({ received: true });
});

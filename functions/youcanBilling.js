const { onRequest } = require("firebase-functions/v2/https");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");
const { getStoreIdFromYouCanId } = require("./youcanUtils");

const db = getFirestore("comsaas");

// ─────────────────────────────────────────────────────────────────────────────
// HELPER — Récupère les tokens YouCan d'un store BayIIn
// ─────────────────────────────────────────────────────────────────────────────
async function getYouCanTokens(storeId) {
    const configDoc = await db
        .collection('stores').doc(storeId)
        .collection('youcan_integration').doc('config')
        .get();

    if (!configDoc.exists) {
        throw new Error(`No YouCan integration found for store ${storeId}`);
    }
    return configDoc.data();
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPER — Retrouve le storeId BayIIn depuis le shop domain YouCan
// ─────────────────────────────────────────────────────────────────────────────
async function getStoreIdFromShop(shop) {
    // Cherche d'abord par youcanStoreUrl (domain)
    const storesSnap = await db.collectionGroup('youcan_integration')
        .where('youcanStoreUrl', '==', shop)
        .limit(1)
        .get();

    if (!storesSnap.empty) {
        return storesSnap.docs[0].ref.parent.parent.id;
    }

    // Fallback : cherche aussi avec shop sans protocol/www
    const cleanShop = shop.replace(/^https?:\/\/(www\.)?/, '');
    const snap2 = await db.collectionGroup('youcan_integration')
        .where('youcanStoreUrl', '==', cleanShop)
        .limit(1)
        .get();

    if (!snap2.empty) {
        return snap2.docs[0].ref.parent.parent.id;
    }

    return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPER — Refresh automatique si le token expire dans moins de 5 minutes
// ─────────────────────────────────────────────────────────────────────────────
async function ensureFreshToken(storeId, tokens) {
    const { refreshYouCanToken } = require('./youcanUtils');
    const expiresAt = tokens.expiresAt?.toDate ? tokens.expiresAt.toDate() : new Date(tokens.expiresAt);
    const fiveMinBuffer = 5 * 60 * 1000;

    if (Date.now() + fiveMinBuffer > expiresAt.getTime()) {
        if (!tokens.refreshToken) {
            console.warn(`[YouCan Billing] No refresh token for store ${storeId}`);
            return tokens.accessToken;
        }
        const freshToken = await refreshYouCanToken(storeId, tokens.refreshToken);
        return freshToken || tokens.accessToken;
    }
    return tokens.accessToken;
}

// ─────────────────────────────────────────────────────────────────────────────
// ÉTAPE 1 — Créer un abonnement YouCan (Managed Billing)
//
// POST /createYouCanSubscription
// Body: { storeId, planId }   planId: 'free' | 'pro'
//
// Retourne: { confirmationUrl } → rediriger le marchand vers cette URL
// ─────────────────────────────────────────────────────────────────────────────
exports.createYouCanSubscription = onRequest(
    { secrets: ['YOUCAN_CLIENT_SECRET', 'YOUCAN_BILLING_CALLBACK_URL'], cors: true },
    async (req, res) => {
        // Handle CORS preflight explicitly just in case
        if (req.method === 'OPTIONS') {
            res.set('Access-Control-Allow-Origin', '*');
            res.set('Access-Control-Allow-Methods', 'POST');
            res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
            return res.status(204).send('');
        }

        if (req.method !== 'POST') {
            return res.status(405).json({ error: 'Method Not Allowed' });
        }

        const { storeId, planId } = req.body;
        if (!storeId || !planId) {
            return res.status(400).json({ error: 'Missing storeId or planId' });
        }

        // Plan Free : pas de charge YouCan, on met juste le plan
        if (planId === 'free') {
            await db.collection('stores').doc(storeId).update({
                plan: 'free',
                subscriptionStatus: 'active',
                subscriptionSource: 'youcan'
            });
            return res.json({ success: true, plan: 'free' });
        }

        // Plan Pro (99 MAD/mois, 30 jours d'essai gratuit)
        try {
            const tokens = await getYouCanTokens(storeId);
            const accessToken = await ensureFreshToken(storeId, tokens);

            const isProduction = process.env.NODE_ENV === 'production';
            const returnUrl = process.env.YOUCAN_BILLING_CALLBACK_URL
                || `https://us-central1-${process.env.GCLOUD_PROJECT}.cloudfunctions.net/youcanBillingCallback`;

            const chargeRes = await fetch(
                'https://api.youcan.shop/billing/recurring-charges',
                {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${accessToken}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        name: 'BayIIn Pro',
                        price: 99,
                        currency: 'MAD',
                        trial_days: 30,
                        return_url: returnUrl,
                        test: !isProduction
                    })
                }
            );

            if (!chargeRes.ok) {
                const errText = await chargeRes.text();
                throw new Error(`YouCan Billing API error: ${errText}`);
            }

            const charge = await chargeRes.json();

            // Sauvegarder l'ID de la charge en attente
            await db.collection('stores').doc(storeId)
                .collection('youcan_integration').doc('config').update({
                    pendingChargeId: charge.id,
                    chargeStatus: 'pending'
                });

            console.log(`[YouCan Billing] Charge created for store ${storeId}: ${charge.id}`);
            return res.json({ confirmationUrl: charge.confirmation_url });

        } catch (err) {
            console.error('[YouCan Billing] createYouCanSubscription error:', err);
            return res.status(500).json({ error: 'Failed to create subscription' });
        }
    }
);

// ─────────────────────────────────────────────────────────────────────────────
// ÉTAPE 2 — Callback après confirmation du marchand
//
// GET /youcanBillingCallback?charge_id={id}&shop={domain}
//
// YouCan redirige ici après que le marchand a confirmé/refusé la charge.
// ─────────────────────────────────────────────────────────────────────────────
exports.youcanBillingCallback = onRequest(
    { secrets: ['YOUCAN_CLIENT_SECRET', 'YOUCAN_APP_HANDLE'] },
    async (req, res) => {
        const { charge_id, shop } = req.query;

        if (!charge_id || !shop) {
            return res.status(400).send('Missing charge_id or shop parameter');
        }

        try {
            // Retrouver le store BayIIn depuis le shop domain
            const storeId = await getStoreIdFromShop(shop);
            if (!storeId) {
                console.error(`[YouCan Billing Callback] Store non trouvé pour shop: ${shop}`);
                return res.status(404).send('Store not found');
            }

            const tokens = await getYouCanTokens(storeId);
            const accessToken = await ensureFreshToken(storeId, tokens);

            // Vérifier le statut réel de la charge via l'API YouCan
            const chargeRes = await fetch(
                `https://api.youcan.shop/billing/recurring-charges/${charge_id}`,
                {
                    headers: { 'Authorization': `Bearer ${accessToken}` }
                }
            );

            if (!chargeRes.ok) {
                throw new Error(`Failed to fetch charge: ${await chargeRes.text()}`);
            }

            const charge = await chargeRes.json();
            const appHandle = process.env.YOUCAN_APP_HANDLE || 'bayiin';
            const baseRedirect = `https://seller-area.youcan.shop/admin/apps/${appHandle}`;

            if (charge.status === 'active') {
                // Activer le plan Pro dans BayIIn
                const billingDate = charge.billing_on ? new Date(charge.billing_on) : null;

                await db.collection('stores').doc(storeId).update({
                    plan: 'pro',
                    subscriptionStatus: 'active',
                    subscriptionSource: 'youcan',
                    youcanChargeId: charge_id,
                    ...(billingDate ? { currentPeriodEnd: billingDate } : {}),
                    subscribedAt: FieldValue.serverTimestamp()
                });

                // Mettre à jour le statut de la charge dans l'intégration
                await db.collection('stores').doc(storeId)
                    .collection('youcan_integration').doc('config').update({
                        pendingChargeId: FieldValue.delete(),
                        chargeStatus: 'active',
                        activeChargeId: charge_id
                    });

                console.log(`[YouCan Billing] Store ${storeId} activated on Pro plan via YouCan`);
                return res.redirect(`${baseRedirect}?billing=success`);

            } else {
                // Marchand a refusé ou la charge n'est pas active
                console.log(`[YouCan Billing] Charge ${charge_id} status: ${charge.status} for store ${storeId}`);

                await db.collection('stores').doc(storeId)
                    .collection('youcan_integration').doc('config').update({
                        pendingChargeId: FieldValue.delete(),
                        chargeStatus: charge.status
                    });

                return res.redirect(`${baseRedirect}?billing=cancelled`);
            }

        } catch (err) {
            console.error('[YouCan Billing Callback] Error:', err);
            return res.status(500).send('Internal Server Error during billing callback');
        }
    }
);

// ─────────────────────────────────────────────────────────────────────────────
// CHECK — Vérifie si un store a un abonnement YouCan actif
// ─────────────────────────────────────────────────────────────────────────────
async function checkYouCanSubscription(storeId) {
    const storeDoc = await db.collection('stores').doc(storeId).get();
    if (!storeDoc.exists) return false;
    const data = storeDoc.data();
    return data.subscriptionSource === 'youcan' && data.subscriptionStatus === 'active';
}
exports.checkYouCanSubscription = checkYouCanSubscription;
exports.getStoreIdFromShop = getStoreIdFromShop;
exports.getYouCanTokens = getYouCanTokens;

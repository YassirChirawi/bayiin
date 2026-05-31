const { onRequest } = require("firebase-functions/v2/https");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");
const crypto = require("crypto");
const { 
    registerYouCanWebhooks, 
    syncOrdersFromYouCan,
    handleYouCanOrderCreate,
    handleYouCanInventoryLow,
    handleYouCanUpsellAccept,
    getStoreIdFromYouCanId
} = require("./youcanUtils");

const db = getFirestore("comsaas");

// ─────────────────────────────────────────────────────────────────────────────
// HELPER — Valide la signature HMAC de YouCan
// Utilisé par l'endpoint /install
// ─────────────────────────────────────────────────────────────────────────────
function validateYouCanSignature(query, secret) {
    const { signature, ...params } = query;
    if (!signature) return false;

    const sortedParams = Object.keys(params)
        .sort()
        .map(k => `${k}=${params[k]}`)
        .join('&');

    const expected = crypto
        .createHmac('sha256', secret)
        .update(sortedParams)
        .digest('hex');

    try {
        return crypto.timingSafeEqual(
            Buffer.from(expected, 'hex'),
            Buffer.from(signature, 'hex')
        );
    } catch {
        return false;
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// 1a. youcanInstall — ÉTAPE 1 du flow Embedded App (standard authorization_code)
//
// YouCan appelle cette URL quand le marchand installe l'app depuis le marketplace.
// URL enregistrée dans Partner Dashboard : https://<project>.cloudfunctions.net/youcanInstall
//
// GET /youcanInstall?shop={domain}&timestamp={ts}&signature={hmac}
// ─────────────────────────────────────────────────────────────────────────────
exports.youcanInstall = onRequest(
    { secrets: ['YOUCAN_CLIENT_SECRET', 'YOUCAN_REDIRECT_URI'] },
    async (req, res) => {
        const { shop, timestamp, signature } = req.query;

        if (!shop || !timestamp || !signature) {
            return res.status(400).send('Missing required parameters: shop, timestamp, signature');
        }

        // Valider la signature HMAC (sécurité critique)
        const isValid = validateYouCanSignature(req.query, process.env.YOUCAN_CLIENT_SECRET);
        if (!isValid) {
            console.error('[YouCan Install] Invalid HMAC signature', { shop, timestamp });
            return res.status(401).send('Invalid signature');
        }

        // Anti-replay : le timestamp ne doit pas être vieux de plus de 5 minutes
        const tsAge = Math.abs(Date.now() / 1000 - parseInt(timestamp));
        if (tsAge > 300) {
            console.warn('[YouCan Install] Timestamp trop ancien', { tsAge });
            return res.status(401).send('Request expired');
        }

        // Construire l'URL OAuth YouCan avec les scopes minimum nécessaires
        const scopes = [
            'orders:read', 'orders:write',
            'products:read', 'products:write',
            'customers:read',
            'inventory:read', 'inventory:write'
        ].join(' ');

        // Encoder le shop dans le state pour le retrouver au callback (anti-CSRF)
        const state = Buffer.from(JSON.stringify({ shop, ts: timestamp })).toString('base64url');

        const authUrl = new URL('https://seller-area.youcan.shop/admin/oauth/authorize');
        authUrl.searchParams.set('client_id', process.env.YOUCAN_CLIENT_ID);
        authUrl.searchParams.set('redirect_uri', process.env.YOUCAN_REDIRECT_URI);
        authUrl.searchParams.set('response_type', 'code');
        authUrl.searchParams.set('scope', scopes);
        authUrl.searchParams.set('state', state);

        console.log(`[YouCan Install] Redirecting shop ${shop} to OAuth`);
        res.redirect(authUrl.toString());
    }
);

// ─────────────────────────────────────────────────────────────────────────────
// 1b. youcanCallback — ÉTAPE 3 du flow (échange du code OAuth)
//
// YouCan redirige ici après que le marchand a autorisé l'app.
// URL enregistrée dans Partner Dashboard : https://<project>.cloudfunctions.net/youcanCallback
//
// GET /youcanCallback?code={code}&state={state}&shop={domain}
// ─────────────────────────────────────────────────────────────────────────────
exports.youcanCallback = onRequest(
    { secrets: ['YOUCAN_CLIENT_SECRET', 'YOUCAN_REDIRECT_URI', 'YOUCAN_APP_HANDLE'] },
    async (req, res) => {
        const { code, state, shop } = req.query;

        if (!code || !state || !shop) {
            return res.status(400).send('Missing required parameters: code, state, shop');
        }

        // Décoder et valider le state (anti-CSRF)
        let stateData;
        try {
            stateData = JSON.parse(Buffer.from(state, 'base64url').toString('utf8'));
        } catch {
            return res.status(400).send('Invalid state parameter');
        }

        if (stateData.shop !== shop) {
            console.error('[YouCan Callback] State mismatch', { stateShop: stateData.shop, queryShop: shop });
            return res.status(401).send('State mismatch — possible CSRF');
        }

        try {
            // ÉTAPE 3a — Échange code → access_token + refresh_token
            const tokenRes = await fetch('https://api.youcan.shop/oauth/token', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    grant_type: 'authorization_code',
                    client_id: process.env.YOUCAN_CLIENT_ID,
                    client_secret: process.env.YOUCAN_CLIENT_SECRET,
                    redirect_uri: process.env.YOUCAN_REDIRECT_URI,
                    code
                })
            });

            if (!tokenRes.ok) {
                const err = await tokenRes.text();
                throw new Error(`Token exchange failed: ${err}`);
            }

            const { access_token, refresh_token, expires_in } = await tokenRes.json();

            // ÉTAPE 3b — Récupérer les détails de la boutique YouCan
            const storeRes = await fetch('https://api.youcan.shop/store/details', {
                headers: { 'Authorization': `Bearer ${access_token}` }
            });

            if (!storeRes.ok) throw new Error('Failed to fetch YouCan store details');
            const storeData = await storeRes.json();

            // ÉTAPE 3c — Créer ou retrouver le store BayIIn
            const { getAuth } = require('firebase-admin/auth');
            let storeId = await getStoreIdFromYouCanId(storeData.id);
            let uid;

            if (!storeId) {
                const email = storeData.contact_email || `${storeData.id}@youcan-store.bayiin.shop`;
                let userExists = false;

                try {
                    const existingUser = await getAuth().getUserByEmail(email);
                    uid = existingUser.uid;
                    userExists = true;
                    const userDoc = await db.collection('users').doc(uid).get();
                    if (userDoc.exists && userDoc.data().storeId) {
                        storeId = userDoc.data().storeId;
                    }
                } catch (e) {
                    if (e.code !== 'auth/user-not-found') throw e;
                }

                if (!userExists) {
                    const userRecord = await getAuth().createUser({
                        email,
                        password: crypto.randomBytes(8).toString('hex'),
                        displayName: storeData.name || 'YouCan Store'
                    });
                    uid = userRecord.uid;
                }

                if (!storeId) {
                    const newStoreRef = db.collection('stores').doc();
                    storeId = newStoreRef.id;
                    await newStoreRef.set({
                        name: storeData.name || 'My YouCan Store',
                        currency: 'MAD',
                        ownerId: uid,
                        createdAt: FieldValue.serverTimestamp(),
                        subscriptionStatus: 'active',
                        plan: 'youcan_app',
                        subscriptionSource: 'youcan'
                    });
                    await db.collection('users').doc(uid).set({
                        email,
                        name: storeData.name || 'YouCan Store',
                        role: 'owner',
                        storeId,
                        createdAt: FieldValue.serverTimestamp()
                    }, { merge: true });
                }
            } else {
                const storeDoc = await db.collection('stores').doc(storeId).get();
                uid = storeDoc.data().ownerId;
            }

            // ÉTAPE 3d — Sauvegarder les tokens OAuth
            await db.collection('stores').doc(storeId)
                .collection('youcan_integration').doc('config').set({
                    accessToken: access_token,
                    refreshToken: refresh_token || null,
                    expiresAt: FieldValue.fromMillis(Date.now() + (expires_in || 3600) * 1000),
                    youcanStoreId: String(storeData.id),
                    youcanStoreUrl: storeData.domain || shop,
                    connectedAt: FieldValue.serverTimestamp(),
                    isActive: true,
                    webhookSubscriptions: {},
                    authFlow: 'authorization_code'
                }, { merge: true });

            // ÉTAPE 3e — Enregistrer webhooks + sync commandes (background)
            registerYouCanWebhooks(storeId, access_token).catch(console.error);
            syncOrdersFromYouCan(storeId, access_token).catch(console.error);

            // ÉTAPE 3f — Redirect vers l'app dans YouCan Admin (PAS vers bayiin.shop)
            const appHandle = process.env.YOUCAN_APP_HANDLE || 'bayiin';
            const redirectUrl = `https://seller-area.youcan.shop/admin/apps/${appHandle}`;
            console.log(`[YouCan Callback] Shop ${shop} (storeId: ${storeId}) connected. Redirecting to ${redirectUrl}`);
            res.redirect(redirectUrl);

        } catch (err) {
            console.error('[YouCan Callback] Error:', err);
            res.status(500).send('Internal Server Error during OAuth callback');
        }
    }
);

/**
 * Qantra Embedded App Authentication
 * Appelé par le frontend React (non-authentifié) pour échanger le session_token JWT
 * contre un vrai access_token YouCan et créer/connecter le compte BayIIn.
 */
exports.exchangeYoucanToken = onRequest({ secrets: ['YOUCAN_CLIENT_SECRET'], cors: true }, async (req, res) => {
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

    const { session_token, hmac, queryString } = req.body;

    if (!session_token || !hmac || !queryString) {
        return res.status(400).json({ error: 'Missing required parameters' });
    }

    // 1. Vérification HMAC
    const expectedHmac = crypto
        .createHmac('sha256', process.env.YOUCAN_CLIENT_SECRET)
        .update(queryString)
        .digest('hex');

    const receivedBuffer = Buffer.from(hmac, 'hex');
    const expectedBuffer = Buffer.from(expectedHmac, 'hex');

    if (receivedBuffer.length !== expectedBuffer.length || !crypto.timingSafeEqual(receivedBuffer, expectedBuffer)) {
        console.error('[YouCan] HMAC invalide', { expectedHmac, hmac, queryString });
        return res.status(401).json({ error: 'Invalid HMAC signature' });
    }

    try {
        // 2. Échanger le session_token Qantra contre un access_token
        const tokenRes = await fetch('https://api.youcan.shop/oauth/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                grant_type: 'token_exchange',
                client_id: process.env.YOUCAN_CLIENT_ID,
                client_secret: process.env.YOUCAN_CLIENT_SECRET,
                session_token: session_token
            })
        });

        if (!tokenRes.ok) {
            const err = await tokenRes.text();
            throw new Error(`Token exchange failed: ${err}`);
        }

        const { access_token, expires_in } = await tokenRes.json();

        // 3. Récupérer les détails de la boutique YouCan
        const storeRes = await fetch('https://api.youcan.shop/store/details', {
            headers: { 'Authorization': `Bearer ${access_token}` }
        });

        if (!storeRes.ok) {
             throw new Error('Failed to fetch YouCan store details');
        }

        const storeData = await storeRes.json();
        
        const { getAuth } = require('firebase-admin/auth');
        
        // 4. Vérifier si le store existe déjà dans BayIIn
        let storeId = await getStoreIdFromYouCanId(storeData.id);
        let uid;
        
        if (!storeId) {
            const email = storeData.contact_email || `${storeData.id}@youcan-store.bayiin.shop`;
            let userExists = false;
            
            try {
                const existingUser = await getAuth().getUserByEmail(email);
                uid = existingUser.uid;
                userExists = true;
                
                // Récupérer son storeId existant s'il en a un
                const userDoc = await db.collection('users').doc(uid).get();
                if (userDoc.exists && userDoc.data().storeId) {
                    storeId = userDoc.data().storeId;
                }
            } catch (e) {
                if (e.code !== 'auth/user-not-found') {
                    throw e;
                }
            }
            
            if (!userExists) {
                // Créer le nouvel utilisateur
                const userRecord = await getAuth().createUser({
                    email: email,
                    password: crypto.randomBytes(8).toString('hex'),
                    displayName: storeData.name || 'YouCan Store'
                });
                uid = userRecord.uid;
            }
            
            if (!storeId) {
                // Créer un nouveau store BayIIn UNIQUEMENT s'il n'en a pas déjà un
                const newStoreRef = db.collection('stores').doc();
                storeId = newStoreRef.id;
                
                await newStoreRef.set({
                    name: storeData.name || 'My YouCan Store',
                    currency: 'MAD', 
                    ownerId: uid,
                    createdAt: FieldValue.serverTimestamp(),
                    subscriptionStatus: 'active', // Géré par YouCan Billing
                    plan: 'youcan_app',
                    subscriptionSource: 'youcan'
                });
                
                // Enregistrer l'utilisateur
                await db.collection('users').doc(uid).set({
                    email,
                    name: storeData.name || 'YouCan Store',
                    role: 'owner',
                    storeId: storeId,
                    createdAt: FieldValue.serverTimestamp()
                }, { merge: true });
            }
        } else {
            const storeDoc = await db.collection('stores').doc(storeId).get();
            uid = storeDoc.data().ownerId;
        }
        
        // 5. Générer un Custom Token Firebase pour connecter le frontend
        const customToken = await getAuth().createCustomToken(uid);

        // 6. Sauvegarder l'intégration YouCan
        await db.collection("stores").doc(storeId).collection("youcan_integration").doc("config").set({
            accessToken: access_token,
            expiresAt: FieldValue.fromMillis(Date.now() + expires_in * 1000),
            youcanStoreId: storeData.id,
            youcanStoreUrl: storeData.domain || '',
            connectedAt: FieldValue.serverTimestamp(),
            isActive: true,
            webhookSubscriptions: {},
            authFlow: 'qantra_token_exchange'
        }, { merge: true }); // Merge pour garder l'historique
        
        // 7. Configurer les webhooks et synchroniser les commandes (en background pour ne pas bloquer)
        registerYouCanWebhooks(storeId, access_token).catch(console.error);
        syncOrdersFromYouCan(storeId, access_token).catch(console.error);
        
        // 8. Retourner le custom token au frontend
        return res.status(200).json({ customToken });

    } catch (err) {
        console.error("[YouCan Token Exchange] Error:", err);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
});

/**
 * 3. youcanWebhook — Reçoit les événements YouCan
 * Sécurisé par vérification de signature HMAC-SHA256.
 */
exports.youcanWebhook = onRequest({ secrets: ['YOUCAN_CLIENT_SECRET'] }, async (req, res) => {
    // Vérification signature HMAC-SHA256 (obligatoire)
    const signature = req.headers['x-youcan-signature'];
    const payload = JSON.stringify(req.body);
    const expectedSig = crypto
        .createHmac('sha256', process.env.YOUCAN_CLIENT_SECRET)
        .update(payload)
        .digest('hex');
    
    if (signature !== expectedSig) {
        console.error('[YouCan] Signature invalide');
        return res.status(401).json({ error: 'Invalid signature' });
    }
    
    const { event, data } = req.body;
    
    // ── Billing events ───────────────────────────────────────────────────────
    if (event === 'app.subscription_cancelled' || event === 'app.subscription_renewed') {
        const youcanStoreId = data?.store_id || data?.shop_id;
        const storeId = youcanStoreId ? await getStoreIdFromYouCanId(String(youcanStoreId)) : null;

        if (!storeId) {
            console.warn(`[YouCan Billing Webhook] Store non trouvé pour YouCan ID: ${youcanStoreId}`);
            return res.status(200).json({ received: true }); // 200 pour éviter les retries
        }

        if (event === 'app.subscription_cancelled') {
            await db.collection('stores').doc(storeId).update({
                plan: 'free',
                subscriptionStatus: 'cancelled',
                subscriptionCancelledAt: FieldValue.serverTimestamp()
            });
            console.log(`[YouCan Billing] Store ${storeId} subscription cancelled → plan: free`);

        } else if (event === 'app.subscription_renewed') {
            const billingDate = data?.billing_on ? new Date(data.billing_on) : null;
            await db.collection('stores').doc(storeId).update({
                subscriptionStatus: 'active',
                ...(billingDate ? { currentPeriodEnd: billingDate } : {}),
                lastRenewedAt: FieldValue.serverTimestamp()
            });
            console.log(`[YouCan Billing] Store ${storeId} subscription renewed`);
        }

        return res.status(200).json({ received: true });
    }

    // Récupère le storeId interne BayIIn
    const storeId = await getStoreIdFromYouCanId(data.store_id);
    if (!storeId) {
        console.error(`[YouCan] Store non trouvé pour YouCan ID: ${data.store_id}`);
        return res.status(404).json({ error: 'Store non trouvé' });
    }
    
    switch (event) {
        case 'order.create':
            await handleYouCanOrderCreate(storeId, data);
            break;
        case 'inventory.low':
            await handleYouCanInventoryLow(storeId, data);
            break;
        case 'upsell.accept':
            await handleYouCanUpsellAccept(storeId, data);
            break;
        default:
            console.warn('[YouCan] Événement non géré:', event);
    }
    
    res.status(200).json({ received: true });
});

const { onSchedule } = require("firebase-functions/v2/scheduler");
const { refreshYouCanToken } = require("./youcanUtils");

/**
 * 4. youcanSyncOrders — Sync périodique
 * Tourne toutes les 30 minutes pour récupérer les commandes loupées par webhooks.
 */
exports.youcanSyncOrders = onSchedule('every 30 minutes', async (event) => {
    // Récupère tous les stores avec une intégration YouCan active
    const storesSnap = await db.collectionGroup('youcan_integration')
        .where('isActive', '==', true)
        .get();
    
    for (const storeDoc of storesSnap.docs) {
        const storeId = storeDoc.ref.parent.parent.id;
        const config = storeDoc.data();
        let token = config.accessToken;
        
        // Refresh token si expiré
        if (new Date() > config.expiresAt.toDate()) {
            token = await refreshYouCanToken(storeId, config.refreshToken);
        }
        
        if (token) {
            await syncOrdersFromYouCan(storeId, token);
        }
    }
});

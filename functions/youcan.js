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

/**
 * Qantra Embedded App Authentication
 * Appelé par le frontend React (non-authentifié) pour échanger le session_token JWT
 * contre un vrai access_token YouCan et créer/connecter le compte BayIIn.
 */
exports.exchangeYoucanToken = onRequest({ secrets: ['YOUCAN_CLIENT_SECRET'], cors: true }, async (req, res) => {
    // cors: true active CORS automatiquement
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
                    plan: 'youcan_app'
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
            webhookSubscriptions: {}
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

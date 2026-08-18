const { getFirestore, FieldValue } = require("firebase-admin/firestore");

function getDb() {
    return getFirestore("comsaas");
}

/**
 * Enregistre les webhooks YouCan pour les événements pertinents.
 */
async function registerYouCanWebhooks(storeId, accessToken) {
    const webhookUrl = `https://us-central1-${process.env.GCLOUD_PROJECT || process.env.VITE_FIREBASE_PROJECT_ID || 'bayiin'}.cloudfunctions.net/youcanWebhook`;
    const events = ['order.create', 'inventory.low', 'upsell.accept'];
    const subscriptionIds = {};
    
    for (const event of events) {
        try {
            const res = await fetch('https://api.youcan.shop/resthooks/subscribe', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ target_url: webhookUrl, event })
            });
            if (res.ok) {
                const data = await res.json();
                subscriptionIds[event.replace('.', '_')] = data.id;
            } else {
                console.warn(`[YouCan] Echec inscription webhook ${event}:`, await res.text());
            }
        } catch (e) {
            console.error(`[YouCan] Erreur inscription webhook ${event}:`, e);
        }
    }
    
    // Sauvegarde les IDs des webhooks
    if (Object.keys(subscriptionIds).length > 0) {
        const db = getDb();
        await db.collection("stores").doc(storeId).collection("youcan_integration").doc("config").update({
            'webhookSubscriptions': subscriptionIds
        });
    }
}

/**
 * Récupère le StoreID interne BayIIn à partir du YouCan Store ID.
 */
async function getStoreIdFromYouCanId(youcanStoreId) {
    const db = getDb();
    const storesSnap = await db.collectionGroup("youcan_integration")
        .where("youcanStoreId", "==", String(youcanStoreId))
        .limit(1)
        .get();
        
    if (!storesSnap.empty) {
        // Doc is at stores/{storeId}/youcan_integration/config
        return storesSnap.docs[0].ref.parent.parent.id;
    }
    return null;
}

/**
 * Convertit un statut YouCan en statut interne BayIIn.
 */
function mapYouCanStatus(youcanStatus) {
    if (!youcanStatus) return 'reçu';
    const statusMap = {
        'pending':    'reçu',
        'processing': 'confirmation',
        'shipped':    'livraison',
        'delivered':  'livré',
        'cancelled':  'annulé',
        'refunded':   'retour'
    };
    return statusMap[youcanStatus.toLowerCase()] || 'reçu';
}

/**
 * Gère la création d'une commande YouCan (Webhook ou Sync manuelle).
 */
async function handleYouCanOrderCreate(storeId, youcanOrder) {
    const db = getDb();
    // Vérification de doublon par ID de commande YouCan
    const syncDocRef = db.collection("stores").doc(storeId).collection("youcan_orders").doc(String(youcanOrder.id));
    const existing = await syncDocRef.get();
    
    if (existing.exists) {
        console.log(`[YouCan] Commande ${youcanOrder.id} déjà synchronisée pour le store ${storeId}`);
        return; // Éviter les doublons
    }

    // Mapping des champs YouCan → BayIIn
    const bayiinOrder = {
        storeId,
        source: 'youcan',
        youcanOrderId: String(youcanOrder.id),
        orderNumber: youcanOrder.order_number ? `YC-${youcanOrder.order_number}` : `YC-${youcanOrder.id}`,
        
        // Client
        clientName: `${youcanOrder.customer?.first_name || ''} ${youcanOrder.customer?.last_name || ''}`.trim() || 'Client YouCan',
        phone: youcanOrder.customer?.phone || '',
        city: youcanOrder.shipping_address?.city || '',
        address: (youcanOrder.shipping_address?.address_1 || youcanOrder.shipping_address?.address || '').trim(),
        
        // Produit principal (le premier de la liste)
        articleName: youcanOrder.line_items?.[0]?.title || 'Produit YouCan',
        // Note: L'ID produit YouCan n'est pas forcément lié à l'ID BayIIn, mais on garde la ref pour un mapping futur si besoin
        productId: youcanOrder.line_items?.[0]?.product_id || '',
        quantity: parseInt(youcanOrder.line_items?.[0]?.quantity) || 1,
        
        // Finances
        price: parseFloat(youcanOrder.total_price) || 0,
        shippingCost: parseFloat(youcanOrder.shipping_price) || 0,
        
        // Statut
        status: mapYouCanStatus(youcanOrder.status),
        
        // Métadonnées
        date: youcanOrder.created_at?.split('T')[0] || new Date().toISOString().split('T')[0],
        paymentMethod: 'cod',
        note: `Commande importée depuis YouCan (ID: ${youcanOrder.id})`,
        createdAt: FieldValue.serverTimestamp(),
        // On n'impacte pas automatiquement le stock BayIIn ici car les IDs produits ne correspondent pas nativement.
        // Si la sync bidirectionnelle du stock est implémentée, elle sera faite ailleurs ou nécessitera un SKU mapping.
        _stockManagedByClient: false 
    };
    
    // Crée la commande dans BayIIn
    const orderRef = await db.collection("stores").doc(storeId).collection("orders").add(bayiinOrder);
    // Dans l'architecture BayIIn, les commandes sont parfois à la racine /orders avec le storeId à l'intérieur.
    // D'après firestore.rules : match /orders/{orderId}
    // Correction : BayIIn met les commandes dans la collection globale /orders
    const globalOrderRef = await db.collection("orders").add(bayiinOrder);
    
    // Enregistre le lien YouCan ↔ BayIIn
    await syncDocRef.set({
        youcanOrderId: String(youcanOrder.id),
        bayiinOrderId: globalOrderRef.id,
        syncedAt: FieldValue.serverTimestamp(),
        syncStatus: 'synced',
        rawPayload: youcanOrder
    });
    
    // Log audit
    await db.collection("stores").doc(storeId).collection("audit_logs").add({
        action: 'YOUCAN_ORDER_SYNCED',
        orderId: globalOrderRef.id,
        orderNumber: bayiinOrder.orderNumber,
        youcanOrderId: youcanOrder.id,
        source: 'youcan_webhook',
        timestamp: FieldValue.serverTimestamp()
    });
}

/**
 * Gère une alerte de stock faible provenant de YouCan.
 */
async function handleYouCanInventoryLow(storeId, data) {
    console.log(`[YouCan] Inventory low for store ${storeId}:`, data);
    // Peut déclencher une alerte dans BayIIn si le mapping SKU est configuré.
}

/**
 * Gère un événement Upsell Accept provenant de YouCan.
 */
async function handleYouCanUpsellAccept(storeId, data) {
    console.log(`[YouCan] Upsell accepted for store ${storeId}:`, data);
    // Peut mettre à jour la commande BayIIn avec le nouveau prix/produit.
}

/**
 * Récupère l'historique des commandes depuis YouCan via API (Pagination).
 */
async function syncOrdersFromYouCan(storeId, accessToken) {
    let page = 1;
    let hasMore = true;
    let totalSynced = 0;
    
    try {
        while (hasMore) {
            const res = await fetch(`https://api.youcan.shop/orders?page=${page}&per_page=50`, {
                headers: { 'Authorization': `Bearer ${accessToken}` }
            });
            
            if (!res.ok) {
                console.error(`[YouCan] Sync error for store ${storeId}: HTTP ${res.status}`);
                break;
            }

            const responseData = await res.json();
            const data = responseData.data || [];
            const meta = responseData.meta || { current_page: 1, last_page: 1 };
            
            for (const order of data) {
                await handleYouCanOrderCreate(storeId, order);
                totalSynced++;
            }
            
            hasMore = meta.current_page < meta.last_page;
            page++;
            
            // Sécurité anti-spam / boucle infinie (max 5 pages = 250 commandes pour la première sync)
            if (page > 5) hasMore = false; 
        }
        console.log(`[YouCan] Sync complete for store ${storeId}. Synced ${totalSynced} orders.`);
    } catch (e) {
        console.error(`[YouCan] Sync Exception for store ${storeId}:`, e);
    }
}

/**
 * Rafraîchit le token OAuth YouCan.
 */
async function refreshYouCanToken(storeId, refreshToken) {
    try {
        const tokenRes = await fetch('https://api.youcan.shop/oauth/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                grant_type: 'refresh_token',
                client_id: process.env.YOUCAN_CLIENT_ID,
                client_secret: process.env.YOUCAN_CLIENT_SECRET,
                refresh_token: refreshToken
            })
        });
        
        if (!tokenRes.ok) throw new Error("Refresh failed");
        
        const { access_token, refresh_token: new_refresh, expires_in } = await tokenRes.json();
        
        const db = getDb();
        await db.collection("stores").doc(storeId).collection("youcan_integration").doc("config").update({
            accessToken: access_token,
            refreshToken: new_refresh,
            expiresAt: FieldValue.fromMillis(Date.now() + expires_in * 1000)
        });
        
        return access_token;
    } catch (e) {
        console.error(`[YouCan] Token refresh error for store ${storeId}:`, e);
        return null;
    }
}

module.exports = {
    registerYouCanWebhooks,
    syncOrdersFromYouCan,
    handleYouCanOrderCreate,
    handleYouCanInventoryLow,
    handleYouCanUpsellAccept,
    getStoreIdFromYouCanId,
    mapYouCanStatus,
    refreshYouCanToken
};

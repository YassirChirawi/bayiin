const functions = require('firebase-functions');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');
const { onRequest } = require("firebase-functions/v2/https");
const crypto = require('crypto');

const db = getFirestore('comsaas');

/**
 * Verify Shopify Webhook HMAC Signature
 */
function verifyShopifySignature(rawBody, signature, secret) {
    if (!secret || !signature) return false;
    const hash = crypto
        .createHmac('sha256', secret)
        .update(rawBody, 'utf8')
        .digest('base64');
    return hash === signature;
}

/**
 * Shopify Webhook Handler
 * URL: .../shopifyWebhook?storeId=STORE_ID
 */
exports.shopifyWebhook = onRequest({ concurrency: 50 }, async (req, res) => {
    const storeId = req.query.storeId;
    if (!storeId) {
        console.error("Shopify Webhook: Missing storeId");
        return res.status(400).send("Missing storeId");
    }

    // Shopify requires 200 OK immediately
    // For cloud functions synchronous execution is fine unless it takes > 10s
    // But returning early is better if async processing is possible.
    // For now we do it synchronously to easily catch errors.

    const topic = req.headers['x-shopify-topic'];
    const hmac = req.headers['x-shopify-hmac-sha256'];
    const shopDomain = req.headers['x-shopify-shop-domain'];

    if (topic !== 'orders/create') {
        // We only care about orders/create for now
        return res.status(200).send("Ignored topic");
    }

    try {
        // 1. Get Store Config
        const storeDoc = await db.collection('stores').doc(storeId).get();
        if (!storeDoc.exists) return res.status(404).send("Store not found");
        const storeData = storeDoc.data();

        // 1b. Get Private Config (Secrets)
        const privateDoc = await db.collection('stores').doc(storeId).collection('private').doc('config').get();
        const privateData = privateDoc.exists ? privateDoc.data() : {};

        const webhookSecret = process.env.SHOPIFY_WEBHOOK_SECRET || privateData.shopifyWebhookSecret || storeData.shopifyWebhookSecret;

        if (!webhookSecret) {
            console.error("Shopify Webhook: Missing Webhook Secret for store", storeId);
            return res.status(500).send("Webhook secret not configured");
        }

        // 2. Verify Signature
        if (!verifyShopifySignature(req.rawBody, hmac, webhookSecret)) {
            console.error(`Shopify Webhook: Invalid Signature for shop ${shopDomain}`);
            return res.status(401).send("Invalid Signature");
        }

        const orderData = req.body;
        console.log(`Shopify Order Received: ${orderData.id} for Store: ${storeId}`);

        await db.runTransaction(async (transaction) => {
            const mappedProducts = [];
            const items = orderData.line_items || [];

            // A. Deduct Stock using SKU
            for (const item of items) {
                const sku = item.sku;
                const qty = parseInt(item.quantity) || 1;

                if (sku) {
                    const productsSnap = await db.collection('products')
                        .where('storeId', '==', storeId)
                        .where('sku', '==', sku)
                        .limit(1)
                        .get();

                    if (!productsSnap.empty) {
                        const productDoc = productsSnap.docs[0];
                        const product = productDoc.data();

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
                            price: parseFloat(item.price) || 0,
                            sku: sku
                        });
                    } else {
                        // Fallback if product not found by SKU
                        mappedProducts.push({
                            id: "",
                            name: item.title,
                            quantity: qty,
                            price: parseFloat(item.price) || 0,
                            sku: sku
                        });
                    }
                } else {
                    mappedProducts.push({
                        id: "",
                        name: item.title,
                        quantity: qty,
                        price: parseFloat(item.price) || 0
                    });
                }
            }

            // B. Create Order in BayIIn
            const newOrderRef = db.collection('orders').doc(`SHP-${orderData.id}`);
            const shippingAddress = orderData.shipping_address || orderData.customer?.default_address || {};
            const customer = orderData.customer || {};
            
            transaction.set(newOrderRef, {
                storeId: storeId,
                orderNumber: `SHP-${orderData.order_number || orderData.id}`,
                clientName: `${shippingAddress.first_name || customer.first_name || ''} ${shippingAddress.last_name || customer.last_name || ''}`.trim() || 'Client Shopify',
                clientPhone: shippingAddress.phone || customer.phone || "",
                clientAddress: `${shippingAddress.address1 || ''} ${shippingAddress.address2 || ''}`.trim(),
                clientCity: shippingAddress.city || "",
                price: parseFloat(orderData.total_price) || 0,
                status: 'reçu', // "À confirmer"
                createdAt: FieldValue.serverTimestamp(),
                source: 'Shopify',
                externalId: orderData.id.toString(),
                products: mappedProducts,
                isPaid: orderData.financial_status === 'paid',
                paymentMethod: orderData.gateway || 'unknown',
                _stockManagedByClient: true // Stock already deducted above
            });
        });

        res.status(200).send("OK");
    } catch (error) {
        console.error("Shopify Webhook Error:", error);
        res.status(500).send("Internal Server Error");
    }
});

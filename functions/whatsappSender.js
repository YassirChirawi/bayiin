/**
 * WhatsApp Auto-Send Triggers — BayIIn / Beya3
 *
 * Firestore-triggered functions that automatically send WhatsApp messages
 * when order events occur (creation, shipping, delivery).
 *
 * Uses the named database 'comsaas' — matching the rest of BayIIn.
 */

const { onDocumentCreated, onDocumentUpdated } = require("firebase-functions/v2/firestore");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");

const {
    sendTemplateMessage,
    normalizePhone
} = require("./whatsappUtils");

// Use named database 'comsaas'
const db = getFirestore("comsaas");

// ═══════════════════════════════════════════════════════════════════════════════
// ORDER CREATED → Send confirmation request via WhatsApp template
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Triggered when a new order is created.
 * Waits 2 minutes, then sends a WhatsApp template asking the client to confirm.
 *
 * Skips:
 *   - Orders without a phone number
 *   - Orders from YouCan (they have their own flow)
 *   - Stores without WhatsApp enabled
 */
const sendOrderConfirmationRequest = onDocumentCreated(
    {
        document: "orders/{orderId}",
        database: "comsaas",
        region: "us-central1",
        secrets: ["WHATSAPP_TOKEN", "WHATSAPP_PHONE_ID"]
    },
    async (event) => {
        const order = event.data.data();
        const orderId = event.params.orderId;

        // Guard: Must have a phone number
        const rawPhone = order.phone || order.clientPhone;
        if (!rawPhone) {
            console.log(`[WhatsApp] Order ${orderId}: no phone number, skipping`);
            return;
        }

        // Guard: Skip YouCan orders (they have their own confirmation flow)
        if (order.source === "youcan" || order.source === "WooCommerce") {
            console.log(`[WhatsApp] Order ${orderId}: source=${order.source}, skipping`);
            return;
        }

        const storeId = order.storeId;
        if (!storeId) return;

        // 2. Load the store to check if WhatsApp is configured and get BYON tokens
        const storeDoc = await db.collection("stores").doc(storeId).get();
        if (!storeDoc.exists) return;
        
        const store = storeDoc.data();
        if (!store.whatsappAccessToken || !store.whatsappPhoneNumberId) {
            console.log(`[WhatsApp Sender] Store ${storeId} has no WhatsApp credentials configured. Skipping.`);
            return;
        }

        if (!store.whatsappEnabled) {
            console.log(`[WhatsApp] Store ${storeId}: WhatsApp not enabled, skipping`);
            return;
        }

        // Delay 2 minutes before sending (avoid immediate spam after order creation)
        await new Promise(resolve => setTimeout(resolve, 120000));

        const phone = normalizePhone(rawPhone);

        try {
            // Create the conversation document in Firestore
            const convRef = db.collection("stores").doc(storeId)
                              .collection("whatsapp_conversations").doc(phone);

            // Check if conversation already exists (avoid duplicates)
            const existing = await convRef.get();
            if (existing.exists && existing.data().state !== "closed") {
                console.log(`[WhatsApp] Conversation already exists for ${phone}, skipping`);
                return;
            }

            await convRef.set({
                phone,
                orderId,
                orderNumber: order.orderNumber || "",
                state: "awaiting_confirmation",
                attempts: 1,
                language: "fr",
                handoffRequested: false,
                messages: [],
                lastMessageAt: null,
                lastBotMessageAt: FieldValue.serverTimestamp(),
                createdAt: FieldValue.serverTimestamp()
            });

            // Send the confirmation template
            // The template must be pre-approved in Meta Business Manager
            const messageId = await sendTemplateMessage(
                phone, 
                "order_confirmation_fr", 
                [
                    order.clientName || "Client",
                    String(order.orderNumber || orderId.slice(-6)),
                    order.articleName || "Votre produit",
                    String(order.price || 0)
                ],
                "fr",
                store.whatsappAccessToken,
                store.whatsappPhoneNumberId
            );

            // Log the outbound message
            await db.collection("stores").doc(storeId)
                    .collection("whatsapp_logs").add({
                direction: "outbound",
                phone,
                messageId: messageId || "",
                content: `[Template: order_confirmation_fr]`,
                status: "sent",
                orderId,
                timestamp: FieldValue.serverTimestamp()
            });

            console.log(`[WhatsApp Sender] Confirmation requested for order ${orderId}`);

        } catch (error) {
            console.error(`[WhatsApp] Failed to send confirmation for order ${orderId}:`, error);
        }
    }
);

// ═══════════════════════════════════════════════════════════════════════════════
// ORDER STATUS → LIVRAISON : Send shipping notification
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Triggered when an order is updated.
 * If the status changes to 'livraison', sends a shipping notification.
 */
const sendShippingNotification = onDocumentUpdated(
    {
        document: "orders/{orderId}",
        database: "comsaas",
        region: "us-central1",
        secrets: ["WHATSAPP_TOKEN", "WHATSAPP_PHONE_ID"]
    },
    async (event) => {
        const before = event.data.before.data();
        const after = event.data.after.data();
        const orderId = event.params.orderId;

        // Only trigger on status change to 'livraison'
        if (before.status === after.status) return;
        if (after.status !== "livraison") return;

        const rawPhone = after.phone || after.clientPhone;
        if (!rawPhone) return;

        const storeId = after.storeId;
        if (!storeId) return;

        // 1. Verify store and tokens
        const storeDoc = await db.collection("stores").doc(storeId).get();
        if (!storeDoc.exists) return;
        
        const store = storeDoc.data();
        if (!store.whatsappAccessToken || !store.whatsappPhoneNumberId) {
            return;
        }

        if (!store.whatsappEnabled) return;

        const phone = normalizePhone(rawPhone);

        try {
            const messageId = await sendTemplateMessage(
                phone,
                "order_shipped_fr",
                [
                    after.clientName || "Client",
                    String(after.orderNumber || orderId.slice(-6)),
                    after.trackingId || "En cours",
                    after.carrier || "Notre transporteur"
                ],
                "fr",
                store.whatsappAccessToken,
                store.whatsappPhoneNumberId
            );

            // Log outbound
            await db.collection("stores").doc(storeId)
                    .collection("whatsapp_logs").add({
                direction: "outbound",
                phone,
                messageId: messageId || "",
                content: `[Template: order_shipped_fr]`,
                status: "sent",
                orderId,
                timestamp: FieldValue.serverTimestamp()
            });

            // Update conversation state if exists
            const convRef = db.collection("stores").doc(storeId)
                              .collection("whatsapp_conversations").doc(phone);
            await convRef.update({
                state: "question",
                lastBotMessageAt: FieldValue.serverTimestamp()
            }).catch(() => {
                // Not critical if conversation doesn't exist
            });

            console.log(`[WhatsApp] Shipping notification sent to ${phone} for order ${orderId}`);

        } catch (error) {
            console.error(`[WhatsApp] Failed to send shipping notification for order ${orderId}:`, error);
        }
    }
);

// ═══════════════════════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════════════════════

module.exports = {
    sendOrderConfirmationRequest,
    sendShippingNotification
};

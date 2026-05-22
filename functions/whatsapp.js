/**
 * WhatsApp Webhook & Bot Logic — BayIIn / Beya3
 *
 * Main webhook handler for Meta WhatsApp Cloud API.
 * Implements the COD (Cash-On-Delivery) state machine for Moroccan e-commerce.
 *
 * Architecture:
 *   whatsappWebhook (GET verify + POST messages)
 *     → handleIncomingMessage → handleConversationState
 *       ├── awaiting_confirmation → confirm/refuse/reschedule/question/handoff
 *       ├── rescheduled → back to awaiting
 *       └── question → Beya3 AI (Groq)
 */

const { onRequest } = require("firebase-functions/v2/https");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");
const Groq = require("groq-sdk");

const {
    sendTextMessage,
    markMessageAsRead,
    normalizePhone,
    isConfirmation,
    isRefusal,
    isReschedule,
    isHumanRequest
} = require("./whatsappUtils");

// Use named database 'comsaas' — same as the rest of BayIIn
const db = getFirestore("comsaas");

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN WEBHOOK — Single entry point for all WhatsApp events
// ═══════════════════════════════════════════════════════════════════════════════

const whatsappWebhook = onRequest(
    {
        secrets: ["WHATSAPP_TOKEN", "WHATSAPP_PHONE_ID", "WHATSAPP_VERIFY_TOKEN", "GROQ_API_KEY"],
        cors: false,
        maxInstances: 10
    },
    async (req, res) => {

        // ── GET : Webhook verification (Meta sends this on setup) ───────
        if (req.method === "GET") {
            const mode = req.query["hub.mode"];
            const token = req.query["hub.verify_token"];
            const challenge = req.query["hub.challenge"];

            if (mode === "subscribe" && token === process.env.WHATSAPP_VERIFY_TOKEN) {
                console.log("✅ WhatsApp Webhook verified");
                return res.status(200).send(challenge);
            }
            console.warn("❌ WhatsApp Webhook verification failed");
            return res.sendStatus(403);
        }

        // ── POST : Incoming events from Meta ────────────────────────────
        if (req.method === "POST") {
            const body = req.body;

            // Verify it's a WhatsApp Business Account event
            if (body.object !== "whatsapp_business_account") {
                return res.sendStatus(404);
            }

            // Respond 200 immediately to Meta (required within 5 seconds)
            res.sendStatus(200);

            // Process events asynchronously
            try {
                for (const entry of body.entry || []) {
                    for (const change of entry.changes || []) {
                        if (change.field !== "messages") continue;

                        const value = change.value;

                        // Incoming messages from clients
                        if (value.messages) {
                            for (const msg of value.messages) {
                                await handleIncomingMessage(msg, value.metadata);
                            }
                        }

                        // Status updates (delivered, read, failed)
                        if (value.statuses) {
                            for (const status of value.statuses) {
                                await handleMessageStatus(status);
                            }
                        }
                    }
                }
            } catch (error) {
                console.error("[WhatsApp] Webhook processing error:", error);
            }
            return;
        }

        // Other methods
        res.sendStatus(405);
    }
);

// ═══════════════════════════════════════════════════════════════════════════════
// MESSAGE HANDLER — Brain of the bot
// ═══════════════════════════════════════════════════════════════════════════════

async function handleIncomingMessage(msg, metadata) {
    const phone = msg.from;           // e.g. "212612345678"
    const messageId = msg.id;
    const timestamp = new Date(parseInt(msg.timestamp) * 1000);

    // Extract text content based on message type
    let userText = "";
    switch (msg.type) {
        case "text":
            userText = msg.text?.body || "";
            break;
        case "button":
            userText = msg.button?.text || "";
            break;
        case "interactive":
            userText = msg.interactive?.button_reply?.title ||
                       msg.interactive?.list_reply?.title || "";
            break;
        default:
            // Image, audio, video, etc. → inform we only handle text
            // Note: Cannot reply here if we don't have store token yet, so we just return.
            // (We could look up the store first, but for simplicity we ignore non-text for now).
            return;
    }

    // Find the store by WhatsApp Phone Number ID
    const storeId = await findStoreByPhone(metadata.phone_number_id);
    if (!storeId) {
        console.error("[WhatsApp] Store not found for phone_number_id:", metadata.phone_number_id);
        return;
    }

    const store = await getStoreData(storeId);
    if (!store || !store.whatsappAccessToken) {
        console.error("[WhatsApp] Store found but missing whatsappAccessToken:", storeId);
        return;
    }

    // Mark message as read (blue ticks)
    await markMessageAsRead(messageId, store.whatsappAccessToken, store.whatsappPhoneNumberId);

    // Get or create conversation
    const convRef = db.collection("stores").doc(storeId)
                      .collection("whatsapp_conversations").doc(phone);
    const convDoc = await convRef.get();
    const conversation = convDoc.exists ? convDoc.data() : null;

    // Log inbound message
    await logWhatsAppMessage(storeId, {
        direction: "inbound",
        phone,
        messageId,
        content: userText,
        orderId: conversation?.orderId || "",
        timestamp: FieldValue.serverTimestamp()
    });

    // Route based on conversation state
    if (!conversation || conversation.state === "closed") {
        await handleNewConversation(store, phone, userText, convRef);
    } else if (conversation.handoffRequested) {
        // In handoff mode — just log, don't auto-respond
        await handleHumanHandoff(store, phone, userText, conversation);
    } else {
        await handleConversationState(store, phone, userText, conversation, convRef);
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// NEW CONVERSATION — Client writes without an active conversation
// ═══════════════════════════════════════════════════════════════════════════════

async function handleNewConversation(store, phone, userText, convRef) {
    const storeId = store.id;
    // Try to find a recent pending order for this phone number
    const ordersSnap = await db.collection("orders")
        .where("storeId", "==", storeId)
        .where("phone", "==", phone)
        .where("status", "in", ["reçu", "confirmation", "packing"])
        .orderBy("createdAt", "desc")
        .limit(1)
        .get();

    // Also try normalized phone
    let order = null;
    let orderId = null;

    if (!ordersSnap.empty) {
        const doc = ordersSnap.docs[0];
        order = doc.data();
        orderId = doc.id;
    } else {
        // Try with clientPhone field as well
        const altSnap = await db.collection("orders")
            .where("storeId", "==", storeId)
            .where("clientPhone", "==", phone)
            .where("status", "in", ["reçu", "confirmation", "packing"])
            .orderBy("createdAt", "desc")
            .limit(1)
            .get();

        if (!altSnap.empty) {
            const doc = altSnap.docs[0];
            order = doc.data();
            orderId = doc.id;
        }
    }

    if (order) {
        // Found a pending order — create conversation linked to it
        await convRef.set({
            phone,
            orderId,
            orderNumber: order.orderNumber || "",
            state: "awaiting_confirmation",
            attempts: 1,
            language: "fr",
            handoffRequested: false,
            messages: [],
            lastMessageAt: FieldValue.serverTimestamp(),
            lastBotMessageAt: FieldValue.serverTimestamp(),
            createdAt: FieldValue.serverTimestamp()
        });

        await sendTextMessage(phone,
            `Salam ! 👋 Je suis Beya3, votre assistante BayIIn 🤖\n\n` +
            `J'ai trouvé votre commande *#${order.orderNumber}* :\n` +
            `📦 *${order.articleName || "Votre produit"}* × ${order.quantity || 1}\n` +
            `💰 *${order.price} DH* — Paiement à la livraison\n\n` +
            `Pour *confirmer*, répondez *OUI*.\n` +
            `Pour *annuler*, répondez *NON*.\n\n` +
            `Si vous avez une question, je suis là ! 😊`,
            store.whatsappAccessToken, store.whatsappPhoneNumberId
        );
    } else {
        // No pending order — start a free conversation
        await convRef.set({
            phone,
            orderId: "",
            orderNumber: "",
            state: "question",
            attempts: 0,
            language: "fr",
            handoffRequested: false,
            messages: [],
            lastMessageAt: FieldValue.serverTimestamp(),
            lastBotMessageAt: FieldValue.serverTimestamp(),
            createdAt: FieldValue.serverTimestamp()
        });

        await handleBeya3AIResponse(store, phone, userText, { messages: [] }, convRef);
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// STATE MACHINE — COD order confirmation flow
// ═══════════════════════════════════════════════════════════════════════════════

async function handleConversationState(store, phone, userText, conv, convRef) {
    const storeId = store.id;
    const input = userText.toLowerCase().trim();

    switch (conv.state) {

        case "awaiting_confirmation":
            if (isConfirmation(input)) {
                // ✅ Client confirms
                await updateOrderStatus(storeId, conv.orderId, "confirmation");
                await convRef.update({ state: "confirmed", lastMessageAt: FieldValue.serverTimestamp() });

                const order = await getOrderData(storeId, conv.orderId);
                await sendTextMessage(phone,
                    `✅ Parfait ! Votre commande *#${conv.orderNumber}* est confirmée.\n\n` +
                    `📦 *${order?.articleName || "Votre produit"}* × ${order?.quantity || 1}\n` +
                    `💰 *${order?.price || "—"} DH* — Paiement à la livraison\n\n` +
                    `Nous vous enverrons un message dès l'expédition. Tbarkallah ! 🙏`,
                    store.whatsappAccessToken, store.whatsappPhoneNumberId
                );
                await notifyMerchant(storeId, `✅ Client ${phone} a confirmé la commande #${conv.orderNumber}`);

            } else if (isRefusal(input)) {
                // ❌ Client refuses
                await updateOrderStatus(storeId, conv.orderId, "annulé");
                await convRef.update({ state: "refused", lastMessageAt: FieldValue.serverTimestamp() });

                await sendTextMessage(phone,
                    `D'accord, votre commande *#${conv.orderNumber}* a été annulée.\n\n` +
                    `Si vous souhaitez commander à nouveau, n'hésitez pas. Bonne journée ! 😊`,
                    store.whatsappAccessToken, store.whatsappPhoneNumberId
                );
                await notifyMerchant(storeId, `❌ Client ${phone} a annulé la commande #${conv.orderNumber}`);

            } else if (isReschedule(input)) {
                // 📅 Client wants to reschedule
                await convRef.update({ state: "rescheduled", lastMessageAt: FieldValue.serverTimestamp() });

                await sendTextMessage(phone,
                    `Pas de problème ! Quel est le meilleur moment pour vous livrer ?\n\n` +
                    `Répondez avec votre disponibilité et nous nous adapterons 📅`,
                    store.whatsappAccessToken, store.whatsappPhoneNumberId
                );

            } else if (isHumanRequest(input)) {
                // 👤 Client wants a human
                await handleHumanHandoff(store, phone, userText, conv);

            } else {
                // ❓ Unknown response → Beya3 AI
                await handleBeya3AIResponse(store, phone, userText, conv, convRef);
            }
            break;

        case "rescheduled":
            // Client gave their availability
            await convRef.update({
                state: "awaiting_confirmation",
                lastMessageAt: FieldValue.serverTimestamp()
            });
            await sendTextMessage(phone,
                `Noté ! Nous reviendrons vers vous à ce moment-là 📋\n\n` +
                `Pour confirmer définitivement, répondez *OUI* ou *CONFIRMER*.`,
                store.whatsappAccessToken, store.whatsappPhoneNumberId
            );
            await notifyMerchant(storeId,
                `📅 Client ${phone} souhaite être livré : "${userText}"\nCommande : #${conv.orderNumber}`
            );
            break;

        case "question":
        default:
            await handleBeya3AIResponse(store, phone, userText, conv, convRef);
            break;
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// BEYA3 AI — Intelligent response via Groq
// ═══════════════════════════════════════════════════════════════════════════════

async function handleBeya3AIResponse(store, phone, userText, conv, convRef) {
    const storeId = store.id;
    // Get order context if available
    const order = conv.orderId ? await getOrderData(storeId, conv.orderId) : null;

    const systemPrompt = `Tu es Beya3, l'assistante IA de la boutique en ligne.
Tu parles avec un client marocain concernant sa commande.
Tu es serviable, sympathique et concise.
Tu parles en français ou darija selon la langue du client.

${order ? `Informations commande :
- Numéro : #${order.orderNumber}
- Produit : ${order.articleName || "N/A"} × ${order.quantity || 1}
- Prix : ${order.price} DH (paiement à la livraison)
- Statut : ${order.status}
- Date commande : ${order.date || "N/A"}
${order.trackingId ? `- Tracking : ${order.trackingId}` : ""}` : "Aucune commande associée à cette conversation."}

Règles absolues :
1. Ne jamais inventer des informations sur la commande
2. Si tu ne sais pas → dire honnêtement et proposer de contacter le support
3. Pour les demandes complexes → transférer à un humain (répondre avec le tag [HANDOFF])
4. Garder les réponses courtes (max 3 lignes sur WhatsApp)
5. Toujours terminer par une action claire pour le client
6. Si le client veut confirmer sa commande, lui dire de répondre OUI
7. Si le client a une réclamation grave, utiliser [HANDOFF]`;

    // Conversation history (last 6 messages)
    const history = (conv.messages || []).slice(-6).map(m => ({
        role: m.role,
        content: m.content
    }));

    try {
        if (!process.env.GROQ_API_KEY) {
            console.error("[WhatsApp] GROQ_API_KEY not configured");
            await sendTextMessage(phone,
                "Désolé, je ne peux pas répondre pour le moment 😅 " +
                "Un membre de notre équipe va vous répondre très vite !",
                store.whatsappAccessToken, store.whatsappPhoneNumberId
            );
            return;
        }

        const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

        const completion = await groq.chat.completions.create({
            model: "llama-3.3-70b-versatile",
            messages: [
                { role: "system", content: systemPrompt },
                ...history,
                { role: "user", content: userText }
            ],
            max_tokens: 256,
            temperature: 0.7,
            stream: false
        });

        let aiResponse = completion.choices?.[0]?.message?.content || "";

        // Detect if AI requested handoff
        if (aiResponse.includes("[HANDOFF]")) {
            aiResponse = aiResponse.replace("[HANDOFF]", "").trim();
            if (aiResponse) {
                await sendTextMessage(phone, aiResponse, store.whatsappAccessToken, store.whatsappPhoneNumberId);
            }
            await handleHumanHandoff(store, phone, userText, conv);
            return;
        }

        // Send AI response
        if (aiResponse) {
            await sendTextMessage(phone, aiResponse, store.whatsappAccessToken, store.whatsappPhoneNumberId);
        }

        // Update conversation history
        const newMessages = [
            ...(conv.messages || []),
            { role: "user", content: userText, timestamp: new Date().toISOString() },
            { role: "assistant", content: aiResponse, timestamp: new Date().toISOString() }
        ].slice(-20); // Keep last 20 messages

        await convRef.update({
            state: "question",
            lastMessageAt: FieldValue.serverTimestamp(),
            lastBotMessageAt: FieldValue.serverTimestamp(),
            messages: newMessages
        });

    } catch (error) {
        console.error("[WhatsApp] Groq error:", error);
        await sendTextMessage(phone,
            "Désolé, j'ai eu un petit problème technique 😅 " +
            "Un membre de notre équipe va vous répondre très vite !",
            store.whatsappAccessToken, store.whatsappPhoneNumberId
        );
        await handleHumanHandoff(store, phone, userText, conv);
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// HUMAN HANDOFF — Transfer to a human agent
// ═══════════════════════════════════════════════════════════════════════════════

async function handleHumanHandoff(store, phone, lastMessage, conv) {
    const storeId = store.id;
    const convRef = db.collection("stores").doc(storeId)
                      .collection("whatsapp_conversations").doc(phone);

    // Only send the handoff message if not already in handoff mode
    if (!conv?.handoffRequested) {
        await convRef.update({
            handoffRequested: true,
            handoffAt: FieldValue.serverTimestamp(),
            lastMessageAt: FieldValue.serverTimestamp()
        });

        await sendTextMessage(phone,
            "Je vais vous mettre en contact avec notre équipe 👤\n\n" +
            "Un conseiller va vous répondre dans les plus brefs délais. " +
            "Merci pour votre patience ! 🙏"
        );
    }

    // Notify merchant via WhatsApp
    const store = await getStoreData(storeId);
    if (store?.whatsappNumber) {
        try {
            await sendTextMessage(
                normalizePhone(store.whatsappNumber),
                `🔔 *Transfert client requis*\n\n` +
                `Client : ${phone}\n` +
                `Commande : #${conv?.orderNumber || "Inconnue"}\n` +
                `Dernier message : "${lastMessage}"\n\n` +
                `Le client attend votre réponse directement.`
            );
        } catch (err) {
            console.warn("[WhatsApp] Failed to notify merchant:", err.message);
        }
    }

    // Create a Firestore notification for the dashboard
    try {
        await db.collection("stores").doc(storeId)
                .collection("notifications").add({
            type: "WHATSAPP_HANDOFF",
            phone,
            orderId: conv?.orderId || "",
            orderNumber: conv?.orderNumber || "",
            lastMessage,
            isRead: false,
            createdAt: FieldValue.serverTimestamp()
        });
    } catch (err) {
        console.warn("[WhatsApp] Failed to create notification:", err.message);
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// MESSAGE STATUS — Track delivery/read/failed status
// ═══════════════════════════════════════════════════════════════════════════════

async function handleMessageStatus(statusEvent) {
    const messageId = statusEvent.id;
    const status = statusEvent.status; // 'sent', 'delivered', 'read', 'failed'
    const recipientId = statusEvent.recipient_id;

    try {
        // Find and update the log entry
        const logsQuery = await db.collectionGroup("whatsapp_logs")
            .where("messageId", "==", messageId)
            .limit(1)
            .get();

        if (!logsQuery.empty) {
            await logsQuery.docs[0].ref.update({
                status,
                statusUpdatedAt: FieldValue.serverTimestamp()
            });
        }

        // Log failed messages for debugging
        if (status === "failed") {
            const errors = statusEvent.errors || [];
            console.error(`[WhatsApp] Message ${messageId} to ${recipientId} failed:`,
                JSON.stringify(errors));
        }
    } catch (err) {
        console.warn("[WhatsApp] handleMessageStatus error:", err.message);
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Find the BayIIn storeId by WhatsApp Phone Number ID.
 * The store document must have a 'whatsappPhoneNumberId' field.
 */
async function findStoreByPhone(phoneNumberId) {
    const storesSnap = await db.collection("stores")
        .where("whatsappPhoneNumberId", "==", phoneNumberId)
        .limit(1)
        .get();

    if (storesSnap.empty) return null;
    return storesSnap.docs[0].id;
}

/**
 * Get order data by orderId (top-level orders collection).
 */
async function getOrderData(storeId, orderId) {
    if (!orderId) return null;
    try {
        const orderDoc = await db.collection("orders").doc(orderId).get();
        if (!orderDoc.exists) return null;
        const data = orderDoc.data();
        // Verify it belongs to the store
        if (data.storeId !== storeId) return null;
        return { id: orderDoc.id, ...data };
    } catch (err) {
        console.warn("[WhatsApp] getOrderData error:", err.message);
        return null;
    }
}

/**
 * Get store data by storeId.
 */
async function getStoreData(storeId) {
    try {
        const storeDoc = await db.collection("stores").doc(storeId).get();
        if (!storeDoc.exists) return null;
        return { id: storeDoc.id, ...storeDoc.data() };
    } catch (err) {
        console.warn("[WhatsApp] getStoreData error:", err.message);
        return null;
    }
}

/**
 * Update order status in the top-level orders collection.
 */
async function updateOrderStatus(storeId, orderId, newStatus) {
    if (!orderId) return;
    try {
        await db.collection("orders").doc(orderId).update({
            status: newStatus,
            _updatedBy: "whatsapp_bot"
        });
        console.log(`[WhatsApp] Order ${orderId} status updated to '${newStatus}'`);
    } catch (err) {
        console.error("[WhatsApp] updateOrderStatus error:", err.message);
    }
}

/**
 * Create a notification in the merchant's dashboard.
 */
async function notifyMerchant(storeId, message) {
    try {
        await db.collection("stores").doc(storeId)
                .collection("notifications").add({
            type: "WHATSAPP_BOT",
            message,
            isRead: false,
            createdAt: FieldValue.serverTimestamp()
        });
    } catch (err) {
        console.warn("[WhatsApp] notifyMerchant error:", err.message);
    }
}

/**
 * Log a WhatsApp message (inbound or outbound) for audit trail.
 */
async function logWhatsAppMessage(storeId, data) {
    try {
        await db.collection("stores").doc(storeId)
                .collection("whatsapp_logs").add(data);
    } catch (err) {
        console.warn("[WhatsApp] logWhatsAppMessage error:", err.message);
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════════════════════

module.exports = { whatsappWebhook };

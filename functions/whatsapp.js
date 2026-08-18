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
const crypto = require("crypto");

const {
    sendTextMessage,
    markMessageAsRead,
    normalizePhone
} = require("./whatsappUtils");

const { STATES, processTransition, getSystemResponse } = require("./whatsappStateMachine");

// Use named database 'comsaas' — same as the rest of BayIIn
const db = getFirestore("comsaas");

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN WEBHOOK — Single entry point for all WhatsApp events
// ═══════════════════════════════════════════════════════════════════════════════

const whatsappWebhook = onRequest(
    {
        secrets: ["WHATSAPP_TOKEN", "WHATSAPP_PHONE_ID", "WHATSAPP_VERIFY_TOKEN", "GROQ_API_KEY", "FACEBOOK_APP_SECRET"],
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
            // SEC (P0-7): verify Meta's X-Hub-Signature-256 HMAC before trusting the payload.
            const appSecret = process.env.FACEBOOK_APP_SECRET;
            const signature = req.headers["x-hub-signature-256"] || "";
            if (!appSecret) {
                console.error("[WhatsApp] FACEBOOK_APP_SECRET not configured — rejecting webhook");
                return res.sendStatus(403);
            }
            const expected = "sha256=" + crypto.createHmac("sha256", appSecret).update(req.rawBody).digest("hex");
            const sigBuf = Buffer.from(signature);
            const expBuf = Buffer.from(expected);
            if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
                console.warn("[WhatsApp] Invalid webhook signature — rejecting");
                return res.sendStatus(403);
            }

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

    // ÉVOLUTION 9 : WhatsApp Merchant
    // Si le numéro correspond au propriétaire (format international sans +)
    if (store.ownerPhone && normalizePhone(store.ownerPhone) === normalizePhone(phone)) {
        await handleMerchantBeya3(store, phone, userText);
        return;
    }

    // Mark message as read (blue ticks)
    await markMessageAsRead(messageId, store.whatsappAccessToken, store.whatsappPhoneNumberId);

    // Get or create conversation
    const convRef = db.collection("stores").doc(storeId)
                      .collection("whatsapp_conversations").doc(phone);
    const convDoc = await convRef.get();
    const conversation = convDoc.exists ? convDoc.data() : null;

    // Log inbound message (WhatsApp Logs)
    await logWhatsAppMessage(storeId, {
        direction: "inbound",
        phone,
        messageId,
        content: userText,
        orderId: conversation?.orderId || "",
        timestamp: FieldValue.serverTimestamp()
    });

    // PHASE 4: Feed the Omnichannel Inbox
    try {
        await db.collection("stores").doc(storeId)
                .collection("omnichannel_inbox").add({
            source: "whatsapp",
            direction: "inbound",
            sender: phone,
            content: userText,
            isRead: false,
            timestamp: FieldValue.serverTimestamp()
        });
    } catch (err) {
        console.warn("[WhatsApp] Failed to add to omnichannel_inbox:", err.message);
    }

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

        // Enqueue a Cloud Task for 2 hours later to follow up if still awaiting
        try {
            const { getFunctions } = require("firebase-admin/functions");
            const queue = getFunctions().taskQueue("whatsappTimeoutWorker");
            await queue.enqueue({
                storeId,
                phone,
                orderId
            }, {
                scheduleDelaySeconds: 2 * 60 * 60 // 2 hours
            });
        } catch (e) {
            console.error("[WhatsApp] Failed to enqueue timeout task:", e);
        }
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
// MERCHANT BEYA3 — Personal AI assistant for the store owner on WhatsApp
// ═══════════════════════════════════════════════════════════════════════════════

async function handleMerchantBeya3(store, phone, userText) {
    try {
        const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
        const systemPrompt = `Tu es Beya3, le Copilot (CFO/COO) IA du magasin ${store.name}.
Le propriétaire du magasin t'envoie un message privé sur WhatsApp.
Réponds de manière ultra-concise, professionnelle, et propose ton aide pour analyser les ventes, le stock ou la rentabilité.
Si la question nécessite des données précises (ex: "quel est le CA d'aujourd'hui ?"), indique-lui poliment de consulter son dashboard BayIIn car tu ne peux pas lire la base de données en direct via WhatsApp pour le moment.`;

        const completion = await groq.chat.completions.create({
            model: "llama-3.3-70b-versatile",
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: userText }
            ],
            max_tokens: 300,
            temperature: 0.3
        });
        
        const aiResponse = completion.choices[0]?.message?.content;
        if (aiResponse) {
            await sendTextMessage(phone, aiResponse, store.whatsappAccessToken, store.whatsappPhoneNumberId);
        }
    } catch (e) {
        console.error("[WhatsApp] Merchant Beya3 error:", e);
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// STATE MACHINE — COD order confirmation flow
// ═══════════════════════════════════════════════════════════════════════════════

async function handleConversationState(store, phone, userText, conv, convRef) {
    const storeId = store.id;
    const currentState = conv.state || STATES.AWAITING_CONFIRMATION;

    // Run transition logic
    const { nextState, intent, shouldHandoff, isAIHandled } = processTransition(currentState, userText);

    // If human handoff is requested explicitly or via AI
    if (shouldHandoff) {
        await handleHumanHandoff(store, phone, userText, conv);
        // Note: handleHumanHandoff sets handoffRequested = true on the doc
        return;
    }

    // Process Firebase updates if state changed
    if (nextState !== currentState) {
        // Update Order in Firestore based on terminal states
        if (nextState === STATES.CONFIRMED && conv.orderId) {
            await updateOrderStatus(storeId, conv.orderId, "confirmation");
            await notifyMerchant(storeId, `✅ Client ${phone} a confirmé la commande #${conv.orderNumber}`);
        } else if (nextState === STATES.REFUSED && conv.orderId) {
            await updateOrderStatus(storeId, conv.orderId, "annulé");
            await notifyMerchant(storeId, `❌ Client ${phone} a annulé la commande #${conv.orderNumber}`);
        } else if (nextState === STATES.RESCHEDULED && intent === 'reschedule') {
            await notifyMerchant(storeId, `📅 Client ${phone} souhaite reprogrammer.\nCommande : #${conv.orderNumber}`);
        } else if (currentState === STATES.RESCHEDULED && nextState === STATES.AWAITING_CONFIRMATION) {
            await notifyMerchant(storeId, `📅 Client ${phone} a donné ses dispos : "${userText}"\nCommande : #${conv.orderNumber}`);
        }

        // Save new state
        await convRef.update({ 
            state: nextState, 
            lastMessageAt: FieldValue.serverTimestamp() 
        });
    }

    // Generate response
    if (isAIHandled) {
        // Send to Groq for custom contextual reply
        await handleBeya3AIResponse(store, phone, userText, conv, convRef);
    } else {
        // Use system template response
        const orderData = conv.orderId ? await getOrderData(storeId, conv.orderId) : null;
        const systemText = getSystemResponse(currentState, nextState, intent, conv.language || 'fr', orderData || conv);
        
        if (systemText) {
            await sendTextMessage(phone, systemText, store.whatsappAccessToken, store.whatsappPhoneNumberId);
            
            // Append to conversation messages array
            const newMessages = [
                ...(conv.messages || []),
                { role: "user", content: userText, timestamp: new Date().toISOString() },
                { role: "assistant", content: systemText, timestamp: new Date().toISOString() }
            ].slice(-20);

            await convRef.update({
                lastBotMessageAt: FieldValue.serverTimestamp(),
                messages: newMessages
            });
        }
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
    const latestStoreData = await getStoreData(storeId);
    if (latestStoreData?.whatsappNumber) {
        try {
            await sendTextMessage(
                normalizePhone(latestStoreData.whatsappNumber),
                `🔔 *Transfert client requis*\n\n` +
                `Client : ${phone}\n` +
                `Commande : #${conv?.orderNumber || "Inconnue"}\n` +
                `Dernier message : "${lastMessage}"\n\n` +
                `👉 *Répondre au client :* https://app.bayiin.shop/support-ai\n\n` +
                `_BayIIn AI Bot_`,
                latestStoreData.whatsappAccessToken, latestStoreData.whatsappPhoneNumberId
            );
        } catch (e) {
            console.error("[WhatsApp] Failed to notify merchant:", e);
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
        const ref = db.collection("orders").doc(orderId);
        // Le bot utilise l'Admin SDK (contourne les règles Firestore). On garde donc contre la
        // régression d'une commande déjà résolue — ex. un client qui répond « oui » après que
        // la commande a été livrée / retournée / annulée.
        const snap = await ref.get();
        const current = snap.exists ? snap.data().status : null;
        const RESOLVED = ['livré', 'retour', 'retour en cours', 'annulé'];
        if (current && current !== newStatus && RESOLVED.includes(current)) {
            console.log(`[WhatsApp] skip ${orderId}: '${current}' → '${newStatus}' (commande déjà résolue)`);
            return;
        }
        await ref.update({
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

const { onTaskDispatched } = require("firebase-functions/v2/tasks");

// ═══════════════════════════════════════════════════════════════════════════════
// TIMEOUT WORKER (Cloud Tasks)
// ═══════════════════════════════════════════════════════════════════════════════
const whatsappTimeoutWorker = onTaskDispatched(
    {
        retryConfig: {
            maxAttempts: 3,
            minBackoffSeconds: 60
        },
        rateLimits: {
            maxConcurrentDispatches: 50
        }
    },
    async (req) => {
        const { storeId, phone, orderId } = req.data;
        if (!storeId || !phone) return;

        const convRef = db.collection("stores").doc(storeId)
                          .collection("whatsapp_conversations").doc(phone);
        const convDoc = await convRef.get();
        
        if (!convDoc.exists) return;
        const conv = convDoc.data();

        // Check if still awaiting confirmation
        if (conv.state === STATES.AWAITING_CONFIRMATION) {
            const store = await getStoreData(storeId);
            if (!store || !store.whatsappAccessToken) return;

            // Send follow-up message
            const followUpText = conv.language === 'fr' 
                ? `Salam ! 👋 Êtes-vous toujours intéressé par la commande *#${conv.orderNumber}* ?\n\nRépondez par *OUI* pour confirmer ou *NON* pour annuler.`
                : `Salam ! 👋 Wesh mazal mhtem b l'commande *#${conv.orderNumber}* ?\n\nJawb b *OUI* bach t'confirmer wla *NON* bach telghiha.`;

            await sendTextMessage(phone, followUpText, store.whatsappAccessToken, store.whatsappPhoneNumberId);

            // Update conversation to indicate attempt
            await convRef.update({
                attempts: FieldValue.increment(1),
                lastBotMessageAt: FieldValue.serverTimestamp()
            });

            // Log attempt
            await logWhatsAppMessage(storeId, {
                direction: "outbound",
                phone,
                messageId: `timeout_${Date.now()}`,
                content: followUpText,
                orderId: orderId || "",
                timestamp: FieldValue.serverTimestamp()
            });
        }
    }
);

// ═══════════════════════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════════════════════

module.exports = { whatsappWebhook, whatsappTimeoutWorker };

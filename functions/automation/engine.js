/**
 * Moteur d'automatisation SERVEUR (BAY-105).
 *
 * Remplace le moteur client (src/utils/automationEngine.js) qui : (1) n'exécutait jamais
 * les actions à délai (juste une note), (2) envoyait via window.open (non fiable), (3) ne
 * se déclenchait que côté client (les commandes webhook/bot n'étaient pas couvertes).
 *
 * Ici : déclenché par onOrderWrite (toutes les commandes) ; les actions immédiates sont
 * exécutées tout de suite, les actions à délai sont planifiées dans `automation_tasks`
 * et exécutées par la fonction planifiée `automationScheduler`.
 *
 * Note WhatsApp : l'API Meta interdit les messages libres à l'initiative de la boutique,
 * donc `send_whatsapp` crée une TÂCHE MARCHAND actionnable (message pré-rempli) plutôt
 * qu'un envoi automatique bloqué par Meta.
 */
const { FieldValue } = require("firebase-admin/firestore");

const orderTotal = (o) =>
    (o && o.total != null && o.total !== "" ? parseFloat(o.total)
        : (parseFloat(o && o.price) || 0) * (parseInt(o && o.quantity) || 1)) || 0;

function evaluateCondition(node, payload) {
    if (!node) return true;
    switch (node.id) {
        case "status_equals":
            if (!(node.config && node.config.status)) return true;
            return payload.status === node.config.status;
        case "total_greater":
            return orderTotal(payload) > ((node.config && node.config.amount) || 0);
        default:
            return true;
    }
}

/**
 * Parcourt les nœuds d'une automatisation (0 = trigger) et renvoie les actions à exécuter
 * avec leur délai cumulé, ou conditionsPassed=false si une condition échoue.
 */
function collectActions(automation) {
    const nodes = automation.nodes || [];
    const actions = [];
    let delayMs = 0;
    let conditionsPassed = true;

    for (let i = 1; i < nodes.length; i++) {
        const node = nodes[i];
        if (node.type === "condition") {
            // Évaluation faite par l'appelant (a besoin du payload) — ici on collecte juste.
            actions.push({ kind: "condition", node });
        } else if (node.type === "delay") {
            const days = parseInt((node.config && node.config.days) || 0);
            const hours = parseInt((node.config && node.config.hours) || 0);
            delayMs += (days * 86400000) + (hours * 3600000);
        } else if (node.type === "action" || !node.type) {
            actions.push({ kind: "action", node, delayMs });
        }
    }
    return { actions, conditionsPassed };
}

/** Rend un message d'action en interpolant les variables du payload. */
function renderMessage(template, payload, store) {
    let m = template || "";
    m = m.replace(/{name}/g, payload.clientName || "Client");
    m = m.replace(/{product}/g, payload.articleName || "votre commande");
    m = m.replace(/{city}/g, payload.clientCity || "votre ville");
    m = m.replace(/{total}/g, orderTotal(payload) > 0 ? `${orderTotal(payload)} DH` : "le montant convenu");
    m = m.replace(/{store_name}/g, (store && store.name) || "Notre Boutique");
    m = m.replace(/{delivery_address}/g, payload.clientAddress || "votre adresse");
    m = m.replace(/{tracking}/g, payload.trackingId ? `https://sendit.ma/tracking/${payload.trackingId}` : "(lien non disponible)");
    return m;
}

/** Exécute une action immédiatement (Admin SDK). */
async function executeAction(db, node, payload, store, storeId) {
    try {
        switch (node.id) {
            case "send_whatsapp": {
                // Meta interdit le message libre à l'initiative de la boutique → on crée une
                // tâche marchand actionnable (message pré-rempli + téléphone client).
                const message = renderMessage((node.config && node.config.message) || "", payload, store);
                await db.collection(`stores/${storeId}/whatsapp_tasks`).add({
                    orderId: payload.id || null,
                    clientPhone: payload.clientPhone || "",
                    clientName: payload.clientName || "",
                    message,
                    status: "pending",
                    source: "automation",
                    automationName: node.name || null,
                    createdAt: FieldValue.serverTimestamp(),
                });
                return;
            }
            case "create_delivery": {
                // Le port serveur des transporteurs (Sendit) est un chantier à part : on crée
                // une tâche marchand "à expédier" plutôt que d'appeler l'API ici.
                await db.collection(`stores/${storeId}/pending_shipments`).add({
                    orderId: payload.id || null,
                    clientName: payload.clientName || "",
                    clientCity: payload.clientCity || "",
                    status: "pending",
                    source: "automation",
                    createdAt: FieldValue.serverTimestamp(),
                });
                return;
            }
            case "request_pickup":
            default:
                return;
        }
    } catch (e) {
        console.error(`[Automation] executeAction ${node && node.id} error:`, e.message);
    }
}

/** Planifie une action à exécuter plus tard. */
async function scheduleTask(db, storeId, node, payload, runAtMs) {
    await db.collection(`stores/${storeId}/automation_tasks`).add({
        node,
        payload: {
            id: payload.id || null,
            status: payload.status || null,
            clientName: payload.clientName || "",
            clientPhone: payload.clientPhone || "",
            clientCity: payload.clientCity || "",
            clientAddress: payload.clientAddress || "",
            articleName: payload.articleName || "",
            price: payload.price != null ? payload.price : null,
            quantity: payload.quantity != null ? payload.quantity : null,
            trackingId: payload.trackingId || null,
        },
        runAt: new Date(runAtMs),
        status: "scheduled",
        createdAt: FieldValue.serverTimestamp(),
        // TTL : nettoyage auto 30 j après échéance.
        expiresAt: new Date(runAtMs + 30 * 86400000),
    });
}

/**
 * Déclenche les automatisations d'une boutique pour un événement.
 * @param {FirebaseFirestore.Firestore} db
 * @param {string} storeId
 * @param {'order_created'|'order_updated'} triggerType
 * @param {object} payload - la commande (avec .id)
 * @param {object} store - doc boutique (clés API, name…)
 */
async function runAutomations(db, storeId, triggerType, payload, store) {
    const snap = await db.collection(`stores/${storeId}/automations`)
        .where("status", "==", "active")
        .where("triggerType", "==", triggerType)
        .get();
    if (snap.empty) return;

    const now = Date.now();
    for (const doc of snap.docs) {
        const automation = { id: doc.id, ...doc.data() };
        const nodes = automation.nodes || [];
        if (nodes.length < 2) continue;

        // Évalue les conditions et calcule le délai cumulé avant chaque action.
        let delayMs = 0;
        let passed = true;
        const toRun = [];
        for (let i = 1; i < nodes.length; i++) {
            const node = nodes[i];
            if (node.type === "condition") {
                if (!evaluateCondition(node, payload)) { passed = false; break; }
            } else if (node.type === "delay") {
                delayMs += (parseInt((node.config && node.config.days) || 0) * 86400000)
                    + (parseInt((node.config && node.config.hours) || 0) * 3600000);
            } else if (node.type === "action" || !node.type) {
                toRun.push({ node, delayMs });
            }
        }
        if (!passed) continue;

        for (const { node, delayMs: d } of toRun) {
            if (d > 0) await scheduleTask(db, storeId, node, payload, now + d);
            else await executeAction(db, node, payload, store, storeId);
        }
    }
}

module.exports = { runAutomations, executeAction, evaluateCondition, orderTotal, renderMessage, collectActions };

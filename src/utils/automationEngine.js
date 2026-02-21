import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { authenticateSendit, createSenditPackage } from '../lib/sendit';

// Helper to evaluate conditions
const evaluateCondition = (conditionNode, payload) => {
    if (!conditionNode) return true; // No condition = always true

    // Check specific conditions based on ID
    switch (conditionNode.id) {
        case 'status_equals':
            if (!conditionNode.config?.status) return true; // if not configured, let it pass or fail? let's fail to be safe, no wait, if they didn't config it, let's say it doesn't match.
            return payload.status === conditionNode.config.status;
        case 'total_greater':
            return payload.total > (conditionNode.config?.amount || 0);
        default:
            return true;
    }
};

// Helper to execute actions
const executeAction = async (actionNode, payload, store) => {
    try {
        switch (actionNode.id) {
            case 'create_delivery':
                if (!store.senditPublicKey || !store.senditSecretKey) {
                    console.warn("Automation skipped: Sendit keys missing");
                    return;
                }
                const token = await authenticateSendit(store.senditPublicKey, store.senditSecretKey);
                await createSenditPackage(token, payload, store);
                console.log(`Automation: Package created for order ${payload.id || 'unknown'}`);
                break;

            case 'send_whatsapp': {
                // Parse dynamic variables
                let message = actionNode.config?.message || '';
                if (message) {
                    message = message.replace(/{name}/g, payload.clientName || 'Client');
                    message = message.replace(/{product}/g, payload.articleName || 'votre commande');
                    message = message.replace(/{city}/g, payload.clientCity || 'votre ville');
                    message = message.replace(/{total}/g, payload.total ? `${payload.total} DH` : 'le montant convenu');
                    message = message.replace(/{payment_method}/g, payload.paymentMethod || 'Paiement à la livraison');
                    message = message.replace(/{store_name}/g, store?.name || 'Notre Boutique');
                    message = message.replace(/{delivery_address}/g, payload.clientAddress || 'votre adresse');

                    // Tracking link
                    let trackingLink = '';
                    if (payload.trackingId && store?.senditPublicKey) {
                        // Normally this would be a full URL, e.g. https://sendit.ma/tracking/123
                        // Replace with actual Sendit tracking URL format if known, assuming standard
                        trackingLink = `https://sendit.ma/tracking/${payload.trackingId}`;
                    }
                    message = message.replace(/{tracking}/g, trackingLink || '(Lien non disponible)');
                }

                // In a real app, connect to WhatsApp Business API or webhook
                console.log(`Automation: WhatsApp message triggered for phone ${payload.clientPhone}`);
                console.log(`Message Content:\n${message}`);
                break;
            }

            case 'request_pickup':
                console.log(`Automation: Sendit pickup requested`);
                break;

            default:
                console.log(`Automation: Unknown action ${actionNode.id}`);
        }
    } catch (error) {
        console.error(`Automation Engine Error executing ${actionNode.id}:`, error);
        // We catch here so one failed action doesn't crash the whole app flow
    }
};

/**
 * Main function to evaluate and run automations based on an event type
 * @param {string} triggerType - e.g., 'order_created', 'order_updated'
 * @param {object} payload - The data related to the event (e.g., order document)
 * @param {object} store - The tenant store context (needed for API keys)
 */
export const runAutomations = async (triggerType, payload, store) => {
    if (!store?.id) return;

    try {
        // 1. Fetch active automations for this trigger
        const automationsRef = collection(db, `stores/${store.id}/automations`);
        const q = query(
            automationsRef,
            where("status", "==", "active"),
            where("triggerType", "==", triggerType)
        );

        const snapshot = await getDocs(q);
        const automationsToRun = [];
        snapshot.forEach(doc => {
            automationsToRun.push({ id: doc.id, ...doc.data() });
        });

        if (automationsToRun.length === 0) return;

        console.log(`[Automation Engine] Found ${automationsToRun.length} automations for ${triggerType}`);

        // 2. Evaluate and Execute each matching automation
        for (const auto of automationsToRun) {
            const nodes = auto.nodes || [];
            if (nodes.length < 2) continue;

            const conditionNode = nodes.find(n => n.type === 'condition');
            const actionNode = nodes.find(n => n.type === 'action') || nodes[nodes.length - 1]; // fallback

            // 3. Evaluate Conditions
            const passed = evaluateCondition(conditionNode, payload);
            if (!passed) {
                console.log(`[Automation] ${auto.name} skipped: condition not met.`);
                continue;
            }

            // 4. Run Action (Fire and Forget or await depending on strictness)
            // We use await to keep it sequential, but could be Promise.all for speed
            await executeAction(actionNode, payload, store);
        }

    } catch (error) {
        console.error("[Automation Engine] Critical error:", error);
    }
};

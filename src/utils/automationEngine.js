import { collection, query, where, getDocs, updateDoc, doc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { authenticateSendit, createSenditPackage } from '../lib/sendit';

// Helper to evaluate conditions
const evaluateCondition = (conditionNode, payload) => {
    if (!conditionNode) return true; // No condition = always true

    // Check specific conditions based on ID
    switch (conditionNode.id) {
        case 'status_equals':
            if (!conditionNode.config?.status) return true; 
            return payload.status === conditionNode.config.status;
        case 'total_greater':
            return payload.total > (conditionNode.config?.amount || 0);
        default:
            return true;
    }
};

// Helper to execute actions
const executeAction = async (actionNode, payload, store, delayMs = 0) => {
    try {
        // --- DELAY TASK SCHEDULING ---
        // If there's a delay (>0) AND it's an order payload (has an id), we schedule it as a pending Task in the CRM.
        if (delayMs > 0 && payload.id) {
            const followUpDateObj = new Date(Date.now() + delayMs);
            const isoString = followUpDateObj.toISOString();
            const dateStr = isoString.split('T')[0]; // "YYYY-MM-DD"
            
            const messagePreview = actionNode.config?.message ? `(Msg: ${actionNode.config.message.substring(0,10)}...)` : '';
            const followUpNote = `[Automatisation] ${actionNode.name} ${messagePreview}`.trim();
            
            const orderRef = doc(db, `stores/${store.id}/orders`, payload.id);
            await updateDoc(orderRef, {
                followUpDate: dateStr,
                followUpNote: followUpNote
            });
            return; // Exit here. The action is scheduled in the DB, not executed immediately.
        }

        // --- IMMEDIATE EXECUTION ---
        switch (actionNode.id) {
            case 'create_delivery':
                if (!store.senditPublicKey || !store.senditSecretKey) {
                    console.warn("Automation skipped: Sendit keys missing");
                    return;
                }
                const token = await authenticateSendit(store.senditPublicKey, store.senditSecretKey);
                await createSenditPackage(token, payload, store);
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

                    let trackingLink = '';
                    if (payload.trackingId && store?.senditPublicKey) {
                        trackingLink = `https://sendit.ma/tracking/${payload.trackingId}`;
                    }
                    message = message.replace(/{tracking}/g, trackingLink || '(Lien non disponible)');
                }

                if (payload.clientPhone) {
                    const cleanPhone = payload.clientPhone.replace(/[^\d+]/g, '');
                    const encodedMessage = encodeURIComponent(message);
                    try {
                        const link = `https://wa.me/${cleanPhone}?text=${encodedMessage}`;
                        // window.open may fail in background processes, but we trigger it if in frontend context
                        if (typeof window !== 'undefined' && delayMs === 0) {
                             window.open(link, '_blank');
                        }
                    } catch (e) {
                        console.warn("Could not open WhatsApp window (maybe blocked by popup blocker):", e);
                    }
                } else {
                    console.warn("WhatsApp action triggered but clientPhone is missing.");
                }
                break;
            }

            case 'request_pickup':
                break;

            default:
                // Unknown action
        }
    } catch (error) {
        console.error(`Automation Engine Error executing ${actionNode.id}:`, error);
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

        for (const auto of automationsToRun) {
            const nodes = auto.nodes || [];
            if (nodes.length < 2) continue; // Need at least trigger and action

            let conditionsPassed = true;
            let currentDelayMs = 0;
            const actionNodes = [];

            // Traverse the nodes starting from index 1 (0 is trigger)
            for (let i = 1; i < nodes.length; i++) {
                const node = nodes[i];

                if (node.type === 'condition') {
                    if (!evaluateCondition(node, payload)) {
                        conditionsPassed = false;
                        break; // Stop parsing this workflow if a condition fails
                    }
                } else if (node.type === 'delay') {
                    const days = parseInt(node.config?.days || 0);
                    const hours = parseInt(node.config?.hours || 0);
                    const ms = (days * 24 * 60 * 60 * 1000) + (hours * 60 * 60 * 1000);
                    currentDelayMs += ms;
                } else if (node.type === 'action' || !node.type) { 
                    // Fallback !node.type to action for backward compatibility
                    actionNodes.push({ node, delayMs: currentDelayMs });
                }
            }

            if (!conditionsPassed) {
                continue;
            }

            // Execute all collected actions for this workflow
            for (const { node, delayMs } of actionNodes) {
                await executeAction(node, payload, store, delayMs);
            }
        }

    } catch (error) {
        console.error("[Automation Engine] Critical error:", error);
    }
};

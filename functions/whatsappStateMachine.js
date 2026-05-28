/**
 * WhatsApp State Machine
 * Manages the transition of COD (Cash-On-Delivery) conversations.
 */

const { FieldValue } = require("firebase-admin/firestore");
const { detectIntent } = require("./intentDetector");

const STATES = {
    NEW: "new",
    AWAITING_CONFIRMATION: "awaiting_confirmation",
    CONFIRMED: "confirmed",
    REFUSED: "refused",
    RESCHEDULED: "rescheduled",
    PENDING_HUMAN: "pending_human",
    CLOSED: "closed"
};

/**
 * Handles state transitions based on client intent.
 * 
 * @param {string} currentState - The current conversation state
 * @param {string} userText - The text sent by the user
 * @returns {object} - { nextState, intent, shouldHandoff, isAIHandled }
 */
function processTransition(currentState, userText) {
    const intent = detectIntent(userText);
    
    // Global override: If human is explicitly requested
    if (intent === 'human_handoff') {
        return {
            nextState: STATES.PENDING_HUMAN,
            intent,
            shouldHandoff: true,
            isAIHandled: false
        };
    }

    switch (currentState) {
        case STATES.NEW:
        case STATES.AWAITING_CONFIRMATION:
            if (intent === 'confirm') {
                return { nextState: STATES.CONFIRMED, intent, shouldHandoff: false, isAIHandled: false };
            } else if (intent === 'refuse') {
                return { nextState: STATES.REFUSED, intent, shouldHandoff: false, isAIHandled: false };
            } else if (intent === 'reschedule') {
                return { nextState: STATES.RESCHEDULED, intent, shouldHandoff: false, isAIHandled: false };
            } else {
                // If unknown intent, we keep the state awaiting_confirmation but let AI answer the question
                return { nextState: STATES.AWAITING_CONFIRMATION, intent, shouldHandoff: false, isAIHandled: true };
            }

        case STATES.RESCHEDULED:
            // Client is expected to provide the date/time. 
            // After they reply with availability, we move back to awaiting_confirmation
            return { nextState: STATES.AWAITING_CONFIRMATION, intent, shouldHandoff: false, isAIHandled: false };

        case STATES.CONFIRMED:
        case STATES.REFUSED:
        case STATES.CLOSED:
            // Order is already closed/confirmed, any new message goes to AI or Human
            return { nextState: currentState, intent, shouldHandoff: false, isAIHandled: true };

        case STATES.PENDING_HUMAN:
            // Stuck in human queue until a human agent closes it or resets it
            return { nextState: STATES.PENDING_HUMAN, intent, shouldHandoff: true, isAIHandled: false };

        default:
            return { nextState: STATES.AWAITING_CONFIRMATION, intent, shouldHandoff: false, isAIHandled: true };
    }
}

/**
 * Generates the appropriate system response based on the state transition.
 * Note: Actual Firebase updates and sending the message via WhatsApp API is handled in whatsapp.js.
 */
function getSystemResponse(currentState, nextState, intent, language = 'fr', orderData = null) {
    const orderNumber = orderData?.orderNumber || "";
    const articleName = orderData?.articleName || "Votre produit";
    const quantity = orderData?.quantity || 1;
    const price = orderData?.price || "—";

    if (intent === 'human_handoff') {
        return language === 'fr' 
            ? "Je vais vous mettre en contact avec notre équipe 👤\nUn conseiller va vous répondre dans les plus brefs délais. Merci pour votre patience ! 🙏"
            : "Radi ndewzek l'équipe dyalna 👤\nWa7ed men l'équipe radi yjawebk f a9rab wa9t. Chokran 3la sabr dyalak ! 🙏";
    }

    if (nextState === STATES.CONFIRMED) {
        return language === 'fr'
            ? `✅ Parfait ! Votre commande *#${orderNumber}* est confirmée.\n\n📦 *${articleName}* × ${quantity}\n💰 *${price} DH* — Paiement à la livraison\n\nNous vous enverrons un message dès l'expédition. Tbarkallah ! 🙏`
            : `✅ Mezian ! Commande dyalak *#${orderNumber}* m'confirmiya.\n\n📦 *${articleName}* × ${quantity}\n💰 *${price} DH* — 3end l'istilam\n\nRadi nsifto lik message mli tkhrej l'commande. Tbarkallah 3lik ! 🙏`;
    }

    if (nextState === STATES.REFUSED) {
        return language === 'fr'
            ? `D'accord, votre commande *#${orderNumber}* a été annulée.\nSi vous souhaitez commander à nouveau, n'hésitez pas. Bonne journée ! 😊`
            : `Wakha, l'commande dyalak *#${orderNumber}* telghat.\nIla bghiti t3awed tcommander, merhba bik f ay wa9t. Nharak mabrouk ! 😊`;
    }

    if (nextState === STATES.RESCHEDULED && intent === 'reschedule') {
        return language === 'fr'
            ? `Pas de problème ! Quel est le meilleur moment pour vous livrer ? 📅\nRépondez avec votre disponibilité et nous nous adapterons.`
            : `Machi mochkil ! Imta ykoun 7ssen lik nwessloha lik ? 📅\nJawbna b lwa9t li mnasebk.`;
    }

    if (currentState === STATES.RESCHEDULED && nextState === STATES.AWAITING_CONFIRMATION) {
        return language === 'fr'
            ? `Noté ! Nous reviendrons vers vous à ce moment-là 📋\nPour confirmer définitivement, répondez *OUI*.`
            : `M9eyda ! Radi nerj3o 3endek fhad lwa9t 📋\nBach t'confirmer, jawb b *OUI* wla *WAKHA*.`;
    }

    return null; // Signals that AI should handle it
}

module.exports = {
    STATES,
    processTransition,
    getSystemResponse
};

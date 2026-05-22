/**
 * WhatsApp Cloud API Utilities — BayIIn / Beya3
 *
 * Pure functions and API helpers for WhatsApp Cloud API v21.0.
 * All functions use process.env for secrets (WHATSAPP_TOKEN, WHATSAPP_PHONE_ID).
 */

// ═══════════════════════════════════════════════════════════════════════════════
// API HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Send a text message via WhatsApp Cloud API.
 * @param {string} to - Recipient phone (international, no +)
 * @param {string} text - Message body
 * @param {string} token - WhatsApp Access Token
 * @param {string} phoneId - WhatsApp Phone Number ID
 * @returns {Promise<string|null>} WhatsApp message ID or null
 */
async function sendTextMessage(to, text, token = process.env.WHATSAPP_TOKEN, phoneId = process.env.WHATSAPP_PHONE_ID) {
    const response = await fetch(
        `https://graph.facebook.com/v21.0/${phoneId}/messages`,
        {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                messaging_product: 'whatsapp',
                recipient_type: 'individual',
                to,
                type: 'text',
                text: { body: text, preview_url: false }
            })
        }
    );
    const data = await response.json();
    if (data.error) {
        console.error(`[WhatsApp] sendTextMessage error:`, data.error);
        throw new Error(`WhatsApp API error: ${data.error.message}`);
    }
    return data.messages?.[0]?.id || null;
}

/**
 * Send a template message via WhatsApp Cloud API.
 * Templates must be pre-approved in Meta Business Manager.
 * @param {string} to - Recipient phone
 * @param {string} templateName - Approved template name
 * @param {string[]} parameters - Template variable values
 * @param {string} languageCode - Template language code (default: 'fr')
 * @param {string} token - WhatsApp Access Token
 * @param {string} phoneId - WhatsApp Phone Number ID
 * @returns {Promise<string|null>} WhatsApp message ID or null
 */
async function sendTemplateMessage(to, templateName, parameters = [], languageCode = 'fr', token = process.env.WHATSAPP_TOKEN, phoneId = process.env.WHATSAPP_PHONE_ID) {
    const components = parameters.length > 0 ? [{
        type: 'body',
        parameters: parameters.map(p => ({ type: 'text', text: String(p) }))
    }] : [];

    const response = await fetch(
        `https://graph.facebook.com/v21.0/${phoneId}/messages`,
        {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                messaging_product: 'whatsapp',
                to,
                type: 'template',
                template: {
                    name: templateName,
                    language: { code: languageCode },
                    components
                }
            })
        }
    );
    const data = await response.json();
    if (data.error) {
        console.error(`[WhatsApp] sendTemplateMessage error:`, data.error);
        throw new Error(`Template error: ${data.error.message}`);
    }
    return data.messages?.[0]?.id || null;
}

/**
 * Mark a received message as "read" (blue ticks).
 * @param {string} messageId - WhatsApp message ID
 * @param {string} token - WhatsApp Access Token
 * @param {string} phoneId - WhatsApp Phone Number ID
 */
async function markMessageAsRead(messageId, token = process.env.WHATSAPP_TOKEN, phoneId = process.env.WHATSAPP_PHONE_ID) {
    try {
        await fetch(
            `https://graph.facebook.com/v21.0/${phoneId}/messages`,
            {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    messaging_product: 'whatsapp',
                    status: 'read',
                    message_id: messageId
                })
            }
        );
    } catch (err) {
        console.warn('[WhatsApp] markMessageAsRead failed:', err.message);
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// PHONE NORMALIZATION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Normalize a Moroccan phone number to international format without +.
 * Examples:
 *   '0612345678'    → '212612345678'
 *   '+212612345678' → '212612345678'
 *   '212612345678'  → '212612345678'
 *   '06 12 34 56 78'→ '212612345678'
 * @param {string} phone - Raw phone number
 * @returns {string} Normalized phone
 */
function normalizePhone(phone) {
    if (!phone) return '';
    let normalized = phone.replace(/[\s\-\(\)\+]/g, '');
    if (normalized.startsWith('0')) {
        normalized = '212' + normalized.slice(1);
    }
    return normalized;
}

// ═══════════════════════════════════════════════════════════════════════════════
// NLU — CLIENT INTENT DETECTION (French + Darija)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Detect if the client is confirming their order.
 * @param {string} text - Lowercased, trimmed input
 * @returns {boolean}
 */
function isConfirmation(text) {
    const confirmWords = [
        'oui', 'yes', 'confirme', 'ok', 'okay', 'accord', 'parfait',
        'nickel', 'valide', 'confirmer', 'c ok', 'ok oui', 'daccord',
        'd\'accord', 'bien sûr', 'absolument', 'exactement',
        // Darija / Arabic
        'ايه', 'واخا', 'مزيان', 'كنفيرم', 'ayeh', 'waxha', 'wakha',
        'ah', 'iyyeh', 'نعم', 'صافي', 'safi', 'mzyan'
    ];
    return confirmWords.some(w => text.includes(w));
}

/**
 * Detect if the client is refusing/cancelling their order.
 * @param {string} text - Lowercased, trimmed input
 * @returns {boolean}
 */
function isRefusal(text) {
    const refuseWords = [
        'non', 'no', 'annule', 'annuler', 'pas', 'cancel', 'refuse',
        'refuser', 'jamais', 'plus besoin',
        // Darija / Arabic
        'انولي', 'ما غاديش', 'ma ghadi', 'la', 'لا', 'نا',
        'mabghitch', 'ما بغيتش', 'annuli'
    ];
    return refuseWords.some(w => text.includes(w));
}

/**
 * Detect if the client wants to reschedule delivery.
 * @param {string} text - Lowercased, trimmed input
 * @returns {boolean}
 */
function isReschedule(text) {
    const rescheduleWords = [
        'reporter', 'plus tard', 'demain', 'semaine', 'attendre',
        'après-demain', 'weekend', 'lundi', 'mardi', 'mercredi',
        'jeudi', 'vendredi', 'samedi', 'dimanche', 'prochaine',
        // Darija / Arabic
        'بكري', 'غدا', 'lboukra', 'men bad', 'باكي', 'ghda',
        'baad', 'من بعد'
    ];
    return rescheduleWords.some(w => text.includes(w));
}

/**
 * Detect if the client wants to speak to a human.
 * @param {string} text - Lowercased, trimmed input
 * @returns {boolean}
 */
function isHumanRequest(text) {
    const humanWords = [
        'humain', 'personne', 'agent', 'conseiller', 'responsable',
        'parler', 'appel', 'téléphone', 'quelqu', 'manager',
        'directeur', 'patron', 'support', 'aide',
        // Darija / Arabic
        'واحد', 'شي حد', 'shi had', 'bnadem', 'بنادم',
        'klm chi had', 'كلم شي حد'
    ];
    return humanWords.some(w => text.includes(w));
}

// ═══════════════════════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════════════════════

module.exports = {
    sendTextMessage,
    sendTemplateMessage,
    markMessageAsRead,
    normalizePhone,
    isConfirmation,
    isRefusal,
    isReschedule,
    isHumanRequest
};

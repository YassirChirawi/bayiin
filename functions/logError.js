/**
 * logError.js — capture des erreurs SERVEUR (Cloud Functions) dans la collection error_logs,
 * la même que les erreurs client (BAY-108) → visibles/groupées dans /admin/errors.
 *
 * Avant : les échecs des flux critiques (webhooks transporteurs, paiements Stripe, envoi
 * WhatsApp) ne faisaient qu'un console.error → invisibles sauf à ouvrir `firebase functions:log`.
 * Ici, chaque échec critique est persisté et consultable, avec une empreinte de groupage.
 *
 * Ne throw jamais (le logging ne doit pas casser le flux). Fire-and-forget.
 */
const { getFirestore, FieldValue } = require('firebase-admin/firestore');

function hash(str) {
    let h = 5381;
    for (let i = 0; i < str.length; i++) h = ((h << 5) + h + str.charCodeAt(i)) | 0;
    return (h >>> 0).toString(36);
}

/**
 * @param {string} source - nom court du flux (ex: 'stripeWebhook', 'createCarrierDelivery')
 * @param {Error|any} error
 * @param {{ storeId?: string, context?: string }} meta
 */
async function logServerError(source, error, meta = {}) {
    try {
        const db = getFirestore('comsaas');
        const message = (error && (error.message || String(error))) || 'Unknown error';
        const stack = (error && error.stack) || '';
        const norm = String(message).replace(/0x[0-9a-f]+|\d{3,}/gi, '#').slice(0, 200);
        const fingerprint = hash(`${source}|${norm}`);
        await db.collection('error_logs').add({
            fingerprint,
            message: String(message).slice(0, 500),
            stack: String(stack).slice(0, 4000),
            source: `server:${source}`,
            functionName: source,
            storeId: meta.storeId || null,
            context: meta.context ? String(meta.context).slice(0, 500) : null,
            mode: 'prod',
            at: FieldValue.serverTimestamp(),
        });
    } catch (e) {
        console.error('[logServerError] failed:', e.message);
    }
}

module.exports = { logServerError };

/**
 * errorLog.js (BAY-108, option B) — reporting d'erreurs « maison » sans service externe.
 *
 * Avant : l'ErrorBoundary affichait « équipes notifiées » mais ne faisait qu'un console.error →
 * aveugle sur les crashs réels. Ici, chaque erreur est enregistrée dans la collection Firestore
 * `error_logs` avec une EMPREINTE (fingerprint) stable pour regrouper les occurrences identiques.
 * Consultable groupé dans la page /admin/errors (super_admin).
 *
 * Robuste : ne throw jamais (le logging ne doit pas casser l'app), throttle par empreinte pour
 * éviter d'inonder Firestore si une erreur boucle.
 */
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db, auth } from './firebase';

/** Hash court et stable (djb2) → empreinte de groupage. */
function hash(str) {
    let h = 5381;
    for (let i = 0; i < str.length; i++) h = ((h << 5) + h + str.charCodeAt(i)) | 0;
    return (h >>> 0).toString(36);
}

/** Empreinte = message normalisé + 1re ligne de pile applicative (ignore les numéros volatils). */
export function fingerprintError(message, stack) {
    const firstFrame = (stack || '').split('\n').map((l) => l.trim()).find((l) => l.startsWith('at ')) || '';
    const norm = String(message || 'unknown')
        .replace(/https?:\/\/\S+/g, '')      // URLs volatiles
        .replace(/0x[0-9a-f]+|\d{3,}/gi, '#') // adresses / gros nombres
        .slice(0, 200);
    const frame = firstFrame.replace(/:\d+:\d+/g, '').replace(/https?:\/\/\S+?\/assets\/[^\s)]+/g, '');
    return hash(`${norm}|${frame}`);
}

// Throttle in-memory : même empreinte au plus une fois / 30 s par session (anti-boucle).
const _lastSent = new Map();
const THROTTLE_MS = 30000;

/**
 * Enregistre une erreur client. Fire-and-forget, ne throw jamais.
 * @param {Error|any} error
 * @param {{ componentStack?: string, source?: string, storeId?: string }} context
 */
export async function logClientError(error, context = {}) {
    try {
        const message = (error && (error.message || error.toString())) || 'Unknown error';
        const stack = (error && error.stack) || '';
        const fingerprint = fingerprintError(message, stack);

        const now = Date.now();
        const last = _lastSent.get(fingerprint) || 0;
        if (now - last < THROTTLE_MS) return; // déjà remonté récemment
        _lastSent.set(fingerprint, now);

        const user = auth.currentUser;
        await addDoc(collection(db, 'error_logs'), {
            fingerprint,
            message: String(message).slice(0, 500),
            stack: String(stack).slice(0, 4000),
            componentStack: context.componentStack ? String(context.componentStack).slice(0, 4000) : null,
            source: context.source || 'error_boundary',
            url: typeof window !== 'undefined' ? window.location?.href?.slice(0, 500) : null,
            userAgent: typeof navigator !== 'undefined' ? navigator.userAgent?.slice(0, 300) : null,
            userId: user?.uid || null,
            userEmail: user?.email || null,
            storeId: context.storeId || null,
            mode: import.meta.env.DEV ? 'dev' : 'prod',
            at: serverTimestamp(),
        });
    } catch {
        // Ne jamais laisser le logging casser l'app.
    }
}

let _initialized = false;
/** Branche les handlers globaux (erreurs non catchées + promesses rejetées). Idempotent. */
export function initErrorLogging() {
    if (_initialized || typeof window === 'undefined') return;
    _initialized = true;
    window.addEventListener('error', (e) => {
        const err = e.error || new Error(e.message || 'window.onerror');
        logClientError(err, { source: 'window.onerror' });
    });
    window.addEventListener('unhandledrejection', (e) => {
        const reason = e.reason instanceof Error ? e.reason : new Error(String(e.reason));
        logClientError(reason, { source: 'unhandledrejection' });
    });
}

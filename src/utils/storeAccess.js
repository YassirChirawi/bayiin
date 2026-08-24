/**
 * storeAccess.js — source unique de vérité de l'accès d'un store (paywall + support).
 *
 * Utilisé par TenantContext (paywall marchand) ET l'AdminDashboard (fiche support), pour que
 * les deux affichent/appliquent exactement la même règle — sans dérive entre les deux.
 *
 * Leviers support (posés depuis l'admin) :
 *   - suspended: true        → blocage dur, prioritaire sur tout (même un abonné payant).
 *   - testerMode: true       → accès total (bêta), jamais bloqué par le paywall.
 *   - subscriptionStatus:'active_promo' → activation manuelle / promo, accès total.
 *   - trialEndsAt: <date>     → prolonge (ou raccourcit) la fenêtre d'essai gratuite.
 */

// Essai gratuit : 1 mois. Doit rester aligné avec TrialAlert + billing serveur (trial_days: 30).
export const TRIAL_DAYS = 30;
const DAY = 24 * 60 * 60 * 1000;

function toDate(val) {
    if (!val) return null;
    if (typeof val?.toDate === 'function') return val.toDate(); // Firestore Timestamp
    if (val instanceof Date) return val;
    const d = new Date(val);
    return isNaN(d.getTime()) ? null : d;
}

/**
 * @param {object} s - document store
 * @returns {{ active:boolean, status:string, label:string, daysLeft:(number|null) }}
 *   status ∈ suspended | tester | paid | grace | expired | promo | trial | unknown
 */
export function getStoreAccess(s) {
    if (!s) return { active: false, status: 'unknown', label: '—', daysLeft: null };

    // Blocage manuel support : gagne sur tout.
    if (s.suspended) return { active: false, status: 'suspended', label: 'Suspendu', daysLeft: null };

    // Testeurs / bêta : accès total.
    if (s.testerMode) return { active: true, status: 'tester', label: 'Testeur', daysLeft: null };

    // Abonnement payant.
    if (s.plan === 'pro' || s.plan === 'starter' || s.plan === 'unlimited') {
        if (s.subscriptionStatus === 'canceled' || s.subscriptionStatus === 'expired') {
            return { active: false, status: 'expired', label: 'Abonnement expiré', daysLeft: null };
        }
        if (s.subscriptionStatus === 'past_due' && s.currentPeriodEnd) {
            const graceEnd = new Date(s.currentPeriodEnd * 1000 + 7 * DAY);
            const active = new Date() < graceEnd;
            return {
                active,
                status: active ? 'grace' : 'expired',
                label: active ? 'Grâce (impayé)' : 'Abonnement expiré',
                daysLeft: active ? Math.ceil((graceEnd - new Date()) / DAY) : 0,
            };
        }
        return { active: true, status: 'paid', label: `Abonné · ${s.plan}`, daysLeft: null };
    }

    // Activation promo / manuelle → accès total.
    if (s.subscriptionStatus === 'active_promo') {
        return { active: true, status: 'promo', label: 'Activé (promo)', daysLeft: null };
    }

    // Sinon (free / essai) : accès uniquement pendant la fenêtre d'essai.
    const created = toDate(s.createdAt);
    if (!created) return { active: true, status: 'trial', label: 'Essai', daysLeft: null }; // pas de date → ne pas bloquer
    const trialEnd = toDate(s.trialEndsAt) || new Date(created.getTime() + TRIAL_DAYS * DAY);
    const daysLeft = Math.ceil((trialEnd - new Date()) / DAY);
    const active = new Date() < trialEnd;
    return {
        active,
        status: active ? 'trial' : 'expired',
        label: active ? `Essai · ${daysLeft}j restants` : 'Essai expiré',
        daysLeft,
    };
}

/**
 * pricing.js (serveur) — doit rester aligné avec src/config/pricing.js.
 * Prix Pro réellement facturé : 99 MAD/mois (voir youcanBilling.js).
 */
const PLAN_PRICES = { free: 0, starter: 79, pro: 99, unlimited: 199 };
const planPrice = (plan) => PLAN_PRICES[plan] ?? 0;

/**
 * Un store est "payant" (compte dans le MRR) s'il est sur un plan payant et non résilié/expiré/suspendu.
 * Miroir simplifié de getStoreAccess (branche 'paid'/'grace') — promo/testeur/essai = 0 revenu.
 */
function isPaying(s) {
    if (!s || s.suspended) return false;
    if (s.plan !== 'pro' && s.plan !== 'starter' && s.plan !== 'unlimited') return false;
    if (s.subscriptionStatus === 'canceled' || s.subscriptionStatus === 'expired') return false;
    return true;
}

module.exports = { PLAN_PRICES, planPrice, isPaying };

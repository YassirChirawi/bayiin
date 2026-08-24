/**
 * pricing.js — tarifs des abonnements BayIIn (source unique pour l'admin & les calculs financiers).
 *
 * Le prix RÉELLEMENT facturé pour le plan Pro est 99 MAD/mois (YouCan Managed Billing —
 * voir functions/youcanBilling.js). Les autres paliers sont des hypothèses de grille : ajuste-les
 * ici pour qu'ils collent au billing réel, tout le reporting financier s'aligne automatiquement.
 */
export const PLAN_PRICES = {
    free: 0,
    starter: 79,
    pro: 99,
    unlimited: 199,
};

/** Prix mensuel (MAD) d'un plan, 0 si inconnu. */
export const planPrice = (plan) => PLAN_PRICES[plan] ?? 0;

export const CURRENCY = 'MAD';

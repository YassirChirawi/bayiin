/**
 * subscriptionFinance.js — calcul financier des abonnements + prévision (pur, testable).
 *
 * S'appuie sur la même règle d'accès que le paywall (getStoreAccess) pour classer chaque store,
 * et sur la grille de prix centralisée (config/pricing). Aucune donnée inventée : le MRR vient
 * des boutiques réellement payantes ; la prévision applique une hypothèse de conversion explicite
 * au pipeline d'essais en cours.
 */
import { planPrice } from '../config/pricing';
import { getStoreAccess } from './storeAccess';

/**
 * @param {Array<object>} stores
 * @param {{ conversionRate?: number, trialTargetPlan?: string }} opts
 *   conversionRate : part des essais en cours supposée convertir (0..1), défaut 0.3.
 *   trialTargetPlan: plan visé à la conversion d'un essai, défaut 'pro'.
 * @returns {object} agrégats financiers
 */
export function computeSubscriptionFinance(stores = [], opts = {}) {
    const conversionRate = typeof opts.conversionRate === 'number' ? opts.conversionRate : 0.3;
    const trialTargetPlan = opts.trialTargetPlan || 'pro';

    let mrr = 0;
    let activePaying = 0;
    let promoCount = 0;   // accès offert (promo) → 0 revenu
    let testers = 0;      // testeurs → 0 revenu
    let trials = 0;       // essais en cours
    let trialsExpiring7d = 0;
    let expired = 0;
    let suspended = 0;
    const byPlan = {};    // { pro: { count, mrr }, ... }

    for (const s of stores) {
        const a = getStoreAccess(s);
        switch (a.status) {
            case 'paid':
            case 'grace': {
                const p = planPrice(s.plan);
                mrr += p;
                activePaying++;
                if (!byPlan[s.plan]) byPlan[s.plan] = { count: 0, mrr: 0 };
                byPlan[s.plan].count++;
                byPlan[s.plan].mrr += p;
                break;
            }
            case 'promo': promoCount++; break;
            case 'tester': testers++; break;
            case 'trial':
                trials++;
                if (a.daysLeft !== null && a.daysLeft <= 7) trialsExpiring7d++;
                break;
            case 'expired': expired++; break;
            case 'suspended': suspended++; break;
            default: break;
        }
    }

    const arr = mrr * 12;
    // Valeur potentielle si TOUS les essais en cours convertissaient au plan cible.
    const trialPipelineValue = trials * planPrice(trialTargetPlan);
    // Prévision MRR = récurrent actuel + fraction convertie du pipeline d'essais.
    const forecastMrr = Math.round(mrr + trialPipelineValue * conversionRate);
    const arpu = activePaying > 0 ? Math.round(mrr / activePaying) : 0;

    return {
        mrr, arr, arpu,
        activePaying, promoCount, testers,
        trials, trialsExpiring7d, expired, suspended,
        byPlan,
        trialPipelineValue,
        conversionRate,
        forecastMrr,
        forecastArr: forecastMrr * 12,
    };
}

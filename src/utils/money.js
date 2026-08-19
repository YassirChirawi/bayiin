/**
 * money.js (pont client) — réexporte la SOURCE DE VÉRITÉ UNIQUE des définitions financières.
 *
 * La définition canonique vit dans functions/shared/money.js (CommonJS, module pur sans
 * dépendance) pour être déployée avec les Cloud Functions ET consommée côté client. Ce fichier
 * n'ajoute AUCUNE logique : il expose simplement les mêmes fonctions aux modules ESM (src/).
 * Voir BAY-104 et tests/unit/money.consistency.test.js (verrou anti-divergence).
 */
import money from '../../functions/shared/money.js';

export const {
    orderValue,
    orderCOGS,
    isOrderPaid,
    collectedValue,
    isRealized,
    deliveryCostIncurred,
    orderDeliveryCost,
    tvaFromTTC,
    netProfit,
    DELIVERY_COST_STATUSES,
} = money;

export default money;

/**
 * money.js (CLIENT) — définitions financières canoniques de BayIIn, côté ESM (BAY-104).
 *
 * ⚠️ MIROIR de functions/shared/money.js (serveur, CommonJS). Les deux fichiers doivent rester
 * STRICTEMENT identiques en logique. On ne peut pas partager un seul fichier physique : le client
 * est ESM (Vite) et les Cloud Functions sont CommonJS, et l'import cross-pipeline d'un module CJS
 * casse en dev Vite (« does not provide an export named 'default' »). Au lieu d'un pont fragile,
 * on maintient deux implémentations verrouillées par tests/unit/money.consistency.test.js, qui
 * exécute les MÊMES fixtures dans les deux modules et échoue à la moindre divergence.
 *
 * Toute modification ici doit être répliquée à l'identique dans functions/shared/money.js.
 */

const num = (v) => { const n = parseFloat(v); return isNaN(n) ? 0 : n; };
const int = (v) => { const n = parseInt(v); return isNaN(n) ? 0 : n; };

/** Valeur commerciale d'une commande (TTC) : somme des lignes products[] sinon price×quantity. */
export function orderValue(order) {
    if (!order) return 0;
    if (Array.isArray(order.products) && order.products.length > 0) {
        return order.products.reduce((s, it) => s + num(it.price) * (int(it.quantity) || 1), 0);
    }
    return num(order.price) * (int(order.quantity) || 1);
}

/** Coût des marchandises (COGS) d'une commande : somme products[] sinon costPrice×quantity. */
export function orderCOGS(order) {
    if (!order) return 0;
    if (Array.isArray(order.products) && order.products.length > 0) {
        return order.products.reduce((s, it) => s + num(it.costPrice != null ? it.costPrice : it.cost) * (int(it.quantity) || 1), 0);
    }
    return num(order.costPrice) * (int(order.quantity) || 1);
}

/**
 * La commande est-elle marquée payée ? (drapeau, hors montant partiel)
 * Union canonique : isPaid booléen/chaîne OU paymentStatus 'remitted' (cash remis par le transporteur).
 */
export function isOrderPaid(order) {
    if (!order) return false;
    return order.isPaid === true || order.isPaid === 'true' || order.paymentStatus === 'remitted';
}

/**
 * Cash RÉELLEMENT encaissé pour une commande (base de la comptabilité réalisée COD).
 * Priorité au montant partiel amountPaid s'il est renseigné ; sinon plein montant si payée, 0 sinon.
 */
export function collectedValue(order) {
    if (!order) return 0;
    if (order.amountPaid !== undefined && order.amountPaid !== null && order.amountPaid !== '') {
        return num(order.amountPaid);
    }
    return isOrderPaid(order) ? orderValue(order) : 0;
}

/** La commande contribue-t-elle au revenu réalisé ? (encaissement > 0 ou marquée payée) */
export function isRealized(order) {
    return collectedValue(order) > 0 || isOrderPaid(order);
}

/** Statuts pour lesquels un coût de livraison réel est engagé (expédiée / retour / en cours). */
export const DELIVERY_COST_STATUSES = ['livré', 'retour', 'retour en cours', 'livraison', 'ramassage'];

/** La commande engage-t-elle un coût de livraison ? */
export function deliveryCostIncurred(order) {
    return !!order && DELIVERY_COST_STATUSES.includes(order.status);
}

/** Coût de livraison réel imputable à la commande (0 si non engagé). */
export function orderDeliveryCost(order) {
    return deliveryCostIncurred(order) ? num(order && order.realDeliveryCost) : 0;
}

/** TVA marocaine extraite d'un montant TTC (20 %) : TTC − TTC/1.2. */
export function tvaFromTTC(amountTTC) {
    const a = num(amountTTC);
    return a > 0 ? a - (a / 1.2) : 0;
}

/**
 * Résultat net = revenu réalisé − COGS − livraison − dépenses − avoirs/retours − frais d'approche.
 * Formule unique consommée par le client (financials.js), la réconciliation et le copilot.
 */
export function netProfit({ realizedRevenue = 0, cogs = 0, delivery = 0, expenses = 0, refunds = 0, importFees = 0 } = {}) {
    return num(realizedRevenue) - num(cogs) - num(delivery) - num(expenses) - num(refunds) - num(importFees);
}

export default {
    orderValue, orderCOGS, isOrderPaid, collectedValue, isRealized,
    deliveryCostIncurred, orderDeliveryCost, tvaFromTTC, netProfit, DELIVERY_COST_STATUSES,
};

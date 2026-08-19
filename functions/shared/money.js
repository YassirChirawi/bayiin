/**
 * money.js — SOURCE DE VÉRITÉ UNIQUE des définitions financières de BayIIn (BAY-104).
 *
 * Avant : la définition du « cash réalisé » (revenu encaissé) était dupliquée à l'identique
 * dans 4 endroits, avec des divergences subtiles :
 *   - src/utils/financials.js (client)
 *   - functions/index.js  → onOrderWrite (incrémental) ET manualReconciliation (recalcul)
 *   - functions/copilot/financialEngine.js (Beya3)
 * Divergences constatées : (a) le client comptait `paymentStatus==='remitted'` comme payé,
 * pas le serveur ; (b) le serveur sommait `products[]` (multi-produits), pas le client.
 *
 * Ce module CommonJS est la seule définition. Il est requis par les 3 consommateurs serveur
 * (functions/) et réexporté côté client via src/utils/money.js (ESM). Un test de cohérence
 * croisé (tests/unit/money.consistency.test.js) verrouille l'alignement.
 *
 * ⚠️ Module PUR : aucune dépendance Firestore/Node — importable partout (client + serveur).
 */

const num = (v) => { const n = parseFloat(v); return isNaN(n) ? 0 : n; };
const int = (v) => { const n = parseInt(v); return isNaN(n) ? 0 : n; };

/** Valeur commerciale d'une commande (TTC) : somme des lignes products[] sinon price×quantity. */
function orderValue(order) {
    if (!order) return 0;
    if (Array.isArray(order.products) && order.products.length > 0) {
        return order.products.reduce((s, it) => s + num(it.price) * (int(it.quantity) || 1), 0);
    }
    return num(order.price) * (int(order.quantity) || 1);
}

/** Coût des marchandises (COGS) d'une commande : somme products[] sinon costPrice×quantity. */
function orderCOGS(order) {
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
function isOrderPaid(order) {
    if (!order) return false;
    return order.isPaid === true || order.isPaid === 'true' || order.paymentStatus === 'remitted';
}

/**
 * Cash RÉELLEMENT encaissé pour une commande (base de la comptabilité réalisée COD).
 * Priorité au montant partiel amountPaid s'il est renseigné ; sinon plein montant si payée, 0 sinon.
 */
function collectedValue(order) {
    if (!order) return 0;
    if (order.amountPaid !== undefined && order.amountPaid !== null && order.amountPaid !== '') {
        return num(order.amountPaid);
    }
    return isOrderPaid(order) ? orderValue(order) : 0;
}

/** La commande contribue-t-elle au revenu réalisé ? (encaissement > 0 ou marquée payée) */
function isRealized(order) {
    return collectedValue(order) > 0 || isOrderPaid(order);
}

/** Statuts pour lesquels un coût de livraison réel est engagé (expédiée / retour / en cours). */
const DELIVERY_COST_STATUSES = ['livré', 'retour', 'retour en cours', 'livraison', 'ramassage'];

/** La commande engage-t-elle un coût de livraison ? */
function deliveryCostIncurred(order) {
    return !!order && DELIVERY_COST_STATUSES.includes(order.status);
}

/** Coût de livraison réel imputable à la commande (0 si non engagé). */
function orderDeliveryCost(order) {
    return deliveryCostIncurred(order) ? num(order && order.realDeliveryCost) : 0;
}

/** TVA marocaine extraite d'un montant TTC (20 %) : TTC − TTC/1.2. */
function tvaFromTTC(amountTTC) {
    const a = num(amountTTC);
    return a > 0 ? a - (a / 1.2) : 0;
}

/**
 * Résultat net = revenu réalisé − COGS − livraison − dépenses − avoirs/retours − frais d'approche.
 * Formule unique consommée par le client (financials.js), la réconciliation et le copilot.
 */
function netProfit({ realizedRevenue = 0, cogs = 0, delivery = 0, expenses = 0, refunds = 0, importFees = 0 } = {}) {
    return num(realizedRevenue) - num(cogs) - num(delivery) - num(expenses) - num(refunds) - num(importFees);
}

module.exports = {
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
    _num: num,
    _int: int,
};

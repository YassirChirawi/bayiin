/**
 * Logique PURE de rapprochement COD (matching CSV transporteur ↔ commandes).
 * Extraite de SmartReconciliationWizard pour être testée réellement
 * (voir tests/unit/reconciliation.test.js) — plus de duplication de la logique.
 */

export const cleanRef = (refStr) => {
    if (!refStr) return "";
    return String(refStr).toLowerCase().replace(/[^a-z0-9]/g, "");
};

// Extrait les chiffres bruts d'une référence (ex: "CMD-1025" -> "1025").
export const extractNumber = (refStr) => {
    if (!refStr) return "";
    const match = String(refStr).match(/\d+/);
    return match ? match[0] : "";
};

// Valeur d'une commande (prix × quantité).
export const orderAmount = (order) =>
    (parseFloat(order?.price) || 0) * (parseInt(order?.quantity) || 1);

/**
 * Trouve la commande correspondant à une référence transporteur.
 * 1) match exact sur la référence nettoyée, 2) repli sur les chiffres bruts.
 */
export const findMatchingOrder = (orders, courierRef) => {
    if (!courierRef) return null;
    const cleaned = cleanRef(courierRef);
    const num = extractNumber(courierRef);
    const list = orders || [];

    let matched = list.find(o => cleanRef(o.orderNumber) === cleaned || cleanRef(o.id) === cleaned);
    if (!matched && num) {
        matched = list.find(o => extractNumber(o.orderNumber) === num);
    }
    return matched || null;
};

/**
 * Qualifie un rapprochement.
 * @returns "orphan" (aucune commande) | "already_paid" | "perfect" (écart < 1) | "mismatch"
 */
export const evaluateMatch = (dbOrder, courierAmount) => {
    if (!dbOrder) return "orphan";
    if (dbOrder.isPaid) return "already_paid";
    const diff = Math.abs(orderAmount(dbOrder) - (parseFloat(courierAmount) || 0));
    return diff < 1 ? "perfect" : "mismatch";
};

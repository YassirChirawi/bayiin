/**
 * orderStock.js (SERVEUR, CommonJS) — sémantique partagée des mouvements de stock d'une commande.
 *
 * BAY-109 : la déduction/restitution de stock faisant autorité est calculée ici, à partir des
 * ITEMS ACTIFS avant/après. Le serveur (stockLogic.applyStockUpdates) applique ces deltas ; le
 * client s'en sert UNIQUEMENT pour le journal d'audit (stock_logs) afin qu'il reflète EXACTEMENT
 * ce que le serveur fait — avant, calculateStockDeltas (client) réimplémentait une logique
 * distincte, risquant de diverger de la réalité.
 *
 * ⚠️ MIROIR ESM strict dans src/utils/orderStock.js (ESM Vite vs CommonJS Functions → on ne peut
 * pas partager un seul fichier). Verrouillé par tests/unit/orderStock.consistency.test.js.
 * Module PUR : aucune dépendance Firestore/Node.
 */

// Statuts inactifs : ne consomment pas de stock (restitué s'ils l'avaient consommé).
const INACTIVE_STATUSES = ['retour', 'annulé', 'pending_catalog', 'pas de réponse'];

/** Items d'une commande qui consomment du stock (vide si commande inactive/supprimée). */
function getActiveItems(o) {
    if (!o) return [];
    if (o.deleted === true || INACTIVE_STATUSES.includes(o.status)) return [];

    const items = [];
    if (o.articleId) {
        items.push({ id: o.articleId, variantId: o.variantId, quantity: parseInt(o.quantity) || 1, warehouseId: o.warehouseId });
    }
    if (o.products && Array.isArray(o.products)) {
        items.push(...o.products.map((p) => ({
            id: p.id,
            variantId: p.variantId,
            quantity: parseInt(p.quantity) || 1,
            warehouseId: o.warehouseId || p.warehouseId,
        })));
    }
    return items;
}

/**
 * Delta net de stock entre before et after, groupé par produit — MÊME base que la mutation serveur
 * (items actifs avant restitués +, items actifs après déduits −). netChange > 0 = restock, < 0 = déduction.
 * @returns {Object} { [productId]: [{ id, variantId, warehouseId, netChange }] }
 */
function computeNetDeltas(before, after) {
    const acc = {}; // clé id__variant__wh -> { id, variantId, warehouseId, netChange }
    const apply = (items, sign) => {
        for (const it of items) {
            if (!it.id) continue;
            const wh = it.warehouseId || 'default';
            const key = `${it.id}__${it.variantId || ''}__${wh}`;
            if (!acc[key]) acc[key] = { id: it.id, variantId: it.variantId || null, warehouseId: wh, netChange: 0 };
            acc[key].netChange += sign * (parseInt(it.quantity) || 1);
        }
    };
    apply(getActiveItems(before), +1); // ancien état restitué
    apply(getActiveItems(after), -1);  // nouvel état déduit

    const grouped = {};
    for (const d of Object.values(acc)) {
        if (d.netChange === 0) continue;
        (grouped[d.id] = grouped[d.id] || []).push(d);
    }
    return grouped;
}

module.exports = { getActiveItems, computeNetDeltas, INACTIVE_STATUSES };

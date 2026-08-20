/**
 * orderStock.js (CLIENT, ESM) — sémantique des mouvements de stock d'une commande.
 *
 * ⚠️ MIROIR strict de functions/shared/orderStock.js (serveur, CommonJS). On ne peut pas partager
 * un seul fichier (ESM Vite vs CommonJS Functions, l'import cross-pipeline casse en dev Vite).
 * Le serveur applique ces deltas (stockLogic) ; le client s'en sert pour le journal d'audit
 * (stock_logs) afin qu'il reflète EXACTEMENT la mutation serveur (BAY-109). Verrouillé par
 * tests/unit/orderStock.consistency.test.js. Toute modif ici doit être répliquée côté serveur.
 */

const INACTIVE_STATUSES = ['retour', 'annulé', 'pending_catalog', 'pas de réponse'];

/** Items d'une commande qui consomment du stock (vide si commande inactive/supprimée). */
export function getActiveItems(o) {
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
 * Delta net de stock entre before et after, groupé par produit (même base que la mutation serveur).
 * netChange > 0 = restock, < 0 = déduction.
 * @returns {Object} { [productId]: [{ id, variantId, warehouseId, netChange }] }
 */
export function computeNetDeltas(before, after) {
    const acc = {};
    const apply = (items, sign) => {
        for (const it of items) {
            if (!it.id) continue;
            const wh = it.warehouseId || 'default';
            const key = `${it.id}__${it.variantId || ''}__${wh}`;
            if (!acc[key]) acc[key] = { id: it.id, variantId: it.variantId || null, warehouseId: wh, netChange: 0 };
            acc[key].netChange += sign * (parseInt(it.quantity) || 1);
        }
    };
    apply(getActiveItems(before), +1);
    apply(getActiveItems(after), -1);

    const grouped = {};
    for (const d of Object.values(acc)) {
        if (d.netChange === 0) continue;
        (grouped[d.id] = grouped[d.id] || []).push(d);
    }
    return grouped;
}

export { INACTIVE_STATUSES };

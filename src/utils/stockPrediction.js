/**
 * stockPrediction.js
 * Run Rate Algorithm for predicting stock depletion.
 * Used by Beya3 (localCopilot) and the Dashboard widget.
 */

/**
 * Predict when a product will run out of stock based on recent sales velocity.
 * @param {object} product - Product with { name, stock, id }
 * @param {Array} orders - Orders with { date, status, articleId, quantity, products[] }
 * @param {number} [windowDays=30] - Days to look back for velocity calculation
 * @returns {{ daysLeft:number, isAtRisk:boolean, isCritical:boolean, recommendedOrder:number, dailyRate:number, totalSold:number }}
 */
export function predictStockout(product, orders, windowDays = 30) {
    const now = Date.now();
    const windowMs = windowDays * 86400000;
    const pid = product.id;
    const pname = (product.name || '').toLowerCase();

    let totalSold = 0;
    for (const o of orders) {
        if (!o.date) continue;
        if (now - new Date(o.date).getTime() > windowMs) continue;
        if (['retour', 'annulé'].includes(o.status)) continue;

        // Commandes multi-produits : additionner les quantités du produit dans le panier.
        // (Auparavant ces ventes n'étaient PAS comptées → vélocité sous-estimée.)
        if (Array.isArray(o.products) && o.products.length) {
            for (const it of o.products) {
                if (it.id === pid) totalSold += parseInt(it.quantity) || 1;
            }
            continue;
        }
        // Commandes mono-article : match par id, sinon repli par nom.
        if (o.articleId === pid || (o.articleName || o.productName || '').toLowerCase() === pname) {
            totalSold += parseInt(o.quantity) || 1;
        }
    }

    const dailyRate = totalSold / windowDays;
    const currentStock = parseInt(product.stock) || 0;
    const isOut = currentStock <= 0;
    const daysLeft = isOut ? 0 : (dailyRate > 0 ? Math.floor(currentStock / dailyRate) : Infinity);

    return {
        daysLeft,
        isAtRisk: isOut || (dailyRate > 0 && daysLeft < 7),
        isCritical: isOut || (dailyRate > 0 && daysLeft < 3),
        recommendedOrder: Math.ceil(dailyRate * 30), // 30 jours de stock de sécurité
        dailyRate: Math.round(dailyRate * 100) / 100,
        totalSold,
    };
}

/**
 * Get all products at risk of running out of stock.
 * Inclut les produits DÉJÀ en rupture qui se vendaient encore (perte de CA), ce que
 * l'ancien filtre `stock > 0` excluait à tort.
 * @param {Array} products
 * @param {Array} orders
 * @param {number} [thresholdDays=7]
 * @returns {Array<{ product:object, prediction:object }>}
 */
export function getAtRiskProducts(products, orders, thresholdDays = 7) {
    if (!products?.length || !orders?.length) return [];

    return products
        .filter(p => !p.deleted)
        .map(p => ({ product: p, prediction: predictStockout(p, orders) }))
        .filter(({ prediction }) => prediction.dailyRate > 0 && prediction.daysLeft <= thresholdDays)
        .sort((a, b) => a.prediction.daysLeft - b.prediction.daysLeft);
}

/**
 * stockPrediction.js
 * Run Rate Algorithm for predicting stock depletion.
 * Used by Beya3 (localCopilot) and the Dashboard widget.
 */

/**
 * Predict when a product will run out of stock based on recent sales velocity.
 * @param {object} product - Product with { name, stock, id }
 * @param {Array} orders - Array of orders with { date, status, articleName, productName, articleId, quantity }
 * @param {number} [windowDays=30] - Number of days to look back for velocity calculation
 * @returns {{ daysLeft: number, isAtRisk: boolean, recommendedOrder: number, dailyRate: number }}
 */
export function predictStockout(product, orders, windowDays = 30) {
    const now = Date.now();
    const windowMs = windowDays * 86400000;

    const recentSales = orders.filter(o => {
        if (!o.date) return false;
        const orderDate = new Date(o.date).getTime();
        if (now - orderDate > windowMs) return false;
        if (['retour', 'annulé'].includes(o.status)) return false;
        // Match by articleId or by name
        return o.articleId === product.id ||
            (o.articleName || o.productName || '').toLowerCase() === (product.name || '').toLowerCase();
    });

    const totalSold = recentSales.reduce((acc, o) => acc + (parseInt(o.quantity) || 1), 0);
    const dailyRate = totalSold / windowDays;
    const currentStock = parseInt(product.stock) || 0;

    if (dailyRate <= 0 || currentStock <= 0) {
        return {
            daysLeft: currentStock <= 0 ? 0 : Infinity,
            isAtRisk: currentStock <= 0,
            recommendedOrder: 0,
            dailyRate: 0,
            totalSold
        };
    }

    const daysLeft = Math.floor(currentStock / dailyRate);

    return {
        daysLeft,
        isAtRisk: daysLeft < 7,
        isCritical: daysLeft < 3,
        recommendedOrder: Math.ceil(dailyRate * 30), // 30 days of safety stock
        dailyRate: Math.round(dailyRate * 100) / 100,
        totalSold
    };
}

/**
 * Get all products at risk of running out of stock.
 * @param {Array} products - Array of products
 * @param {Array} orders - Array of orders
 * @param {number} [thresholdDays=7] - Products with fewer days left are considered at risk
 * @returns {Array<{ product: object, prediction: object }>}
 */
export function getAtRiskProducts(products, orders, thresholdDays = 7) {
    if (!products?.length || !orders?.length) return [];

    return products
        .filter(p => (parseInt(p.stock) || 0) > 0 && !p.deleted)
        .map(p => ({
            product: p,
            prediction: predictStockout(p, orders)
        }))
        .filter(({ prediction }) => prediction.daysLeft <= thresholdDays && prediction.dailyRate > 0)
        .sort((a, b) => a.prediction.daysLeft - b.prediction.daysLeft);
}

/**
 * financeUtils.js
 * Pure financial calculation helpers for BayIIn.
 * These functions are intentionally dependency-free for easy unit testing.
 */

/**
 * Calculate the net profit for a single order.
 *
 * Formula: netProfit = salePrice - productCost - deliveryCost - adSpend
 *
 * @param {number} salePrice     - Prix de vente (MAD)
 * @param {number} productCost   - Coût du produit (COGS)
 * @param {number} deliveryCost  - Frais de livraison réels
 * @param {number} adSpend       - Dépenses publicitaires allouées à cette commande
 * @returns {number} Profit net (peut être négatif)
 */
export const calculateOrderProfit = (salePrice, productCost, deliveryCost, adSpend) => {
    const price    = parseFloat(salePrice)    || 0;
    const cost     = parseFloat(productCost)  || 0;
    const delivery = parseFloat(deliveryCost) || 0;
    const ads      = parseFloat(adSpend)      || 0;

    return parseFloat((price - cost - delivery - ads).toFixed(2));
};

/**
 * Calculate the profit margin as a percentage.
 *
 * @param {number} profit    - Net profit
 * @param {number} salePrice - Prix de vente
 * @returns {number} Margin in % (0 if salePrice is 0)
 */
export const calculateMarginPercent = (profit, salePrice) => {
    const price = parseFloat(salePrice) || 0;
    if (price === 0) return 0;
    return parseFloat(((profit / price) * 100).toFixed(2));
};

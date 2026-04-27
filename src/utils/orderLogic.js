import { ORDER_STATUS } from './constants';

/**
 * Determines if an order transition requires restocking the items.
 * Restock happens when moving from an Active state to a Cancelled/Returned/No Answer state.
 * @param {string} oldStatus - The previous status of the order.
 * @param {string} newStatus - The new status of the order.
 * @returns {boolean} True if stock should be added back.
 */
export const shouldRestock = (oldStatus, newStatus) => {
    const isCancelledOrReturned = [ORDER_STATUS.CANCELLED, ORDER_STATUS.RETURNED, ORDER_STATUS.NO_ANSWER].includes(newStatus);
    const wasActive = ![ORDER_STATUS.CANCELLED, ORDER_STATUS.RETURNED, ORDER_STATUS.NO_ANSWER, 'pending_catalog'].includes(oldStatus);
    return wasActive && isCancelledOrReturned;
};

/**
 * Determines if an order transition requires deducting stock.
 * Deduction happens when moving from a Cancelled/Returned/No Answer state back to an Active state.
 * @param {string} oldStatus - The previous status of the order.
 * @param {string} newStatus - The new status of the order.
 * @returns {boolean} True if stock should be deducted.
 */
export const shouldDeductStock = (oldStatus, newStatus) => {
    const wasCancelledOrReturned = [ORDER_STATUS.CANCELLED, ORDER_STATUS.RETURNED, ORDER_STATUS.NO_ANSWER, 'pending_catalog'].includes(oldStatus);
    const isActive = ![ORDER_STATUS.CANCELLED, ORDER_STATUS.RETURNED, ORDER_STATUS.NO_ANSWER, 'pending_catalog'].includes(newStatus);
    return wasCancelledOrReturned && isActive;
};

/**
 * Extracts a normalized list of items from order data.
 * Supports both multi-product (data.products) and single-product (data.articleId) orders.
 * @param {Object} data - The order data.
 * @returns {Array} List of item objects { id, variantId, quantity }.
 */
export const getOrderItems = (data) => {
    if (!data) return [];
    let items = [];
    if (data.products && data.products.length > 0) {
        items = [...data.products];
    } else if (data.articleId) {
        items.push({ id: data.articleId, variantId: data.variantId, quantity: data.quantity });
    }
    return items.map(item => ({
        id: item.id,
        variantId: item.variantId,
        quantity: parseInt(item.quantity) || 1
    }));
};

/**
 * Calculates the net stock changes needed when an order is updated.
 * Positive netChange means ADD to stock (restock).
 * Negative netChange means REMOVE from stock (deduct).
 * 
 * @param {Object} oldData - The previous order data.
 * @param {Object} newData - The new order data.
 * @returns {Object} A map grouped by product ID containing the net changes.
 *                   Format: { [productId]: [ { id, variantId, netChange } ] }
 */
export const calculateStockDeltas = (oldData, newData) => {
    const restock = shouldRestock(oldData.status, newData.status);
    const deduct = shouldDeductStock(oldData.status, newData.status);
    const wasActive = ![ORDER_STATUS.CANCELLED, ORDER_STATUS.RETURNED, ORDER_STATUS.NO_ANSWER, 'pending_catalog'].includes(oldData.status);
    const isActive = ![ORDER_STATUS.CANCELLED, ORDER_STATUS.RETURNED, ORDER_STATUS.NO_ANSWER, 'pending_catalog'].includes(newData.status);

    const netChanges = {}; // { [productId_variantId]: { id, variantId, netChange } }

    const addChange = (id, variantId, amount) => {
        if (!id || amount === 0) return;
        const key = variantId ? `${id}_${variantId}` : id;
        if (!netChanges[key]) {
            netChanges[key] = { id, variantId, netChange: 0 };
        }
        netChanges[key].netChange += amount;
    };

    if (restock) {
        // Active -> Cancelled: Add back all old items
        getOrderItems(oldData).forEach(item => addChange(item.id, item.variantId, item.quantity));
    } else if (deduct) {
        // Cancelled -> Active: Deduct all new items
        getOrderItems(newData).forEach(item => addChange(item.id, item.variantId, -item.quantity));
    } else if (wasActive && isActive) {
        // Active -> Active: Diff the items (e.g. quantity changed, or item removed)
        // 1. Add back old items
        getOrderItems(oldData).forEach(item => addChange(item.id, item.variantId, item.quantity));
        // 2. Deduct new items
        getOrderItems(newData).forEach(item => addChange(item.id, item.variantId, -item.quantity));
    }
    // Note: Cancelled -> Cancelled means NO stock change (it's already in stock)

    // Filter out zero net changes and group by product ID
    const groupedByProduct = {};
    Object.values(netChanges).forEach(adj => {
        if (adj.netChange !== 0) {
            if (!groupedByProduct[adj.id]) {
                groupedByProduct[adj.id] = [];
            }
            groupedByProduct[adj.id].push(adj);
        }
    });

    return groupedByProduct;
};

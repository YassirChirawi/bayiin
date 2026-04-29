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

    const warehouseChanged = oldData.warehouseId !== newData.warehouseId;
    const netChanges = []; // Array of { id, variantId, netChange, warehouseId }

    if (restock) {
        // Active -> Cancelled: Add back all old items to the warehouse they were in
        getOrderItems(oldData).forEach(item => {
            netChanges.push({ id: item.id, variantId: item.variantId, netChange: item.quantity, warehouseId: oldData.warehouseId });
        });
    } else if (deduct) {
        // Cancelled -> Active: Deduct all new items from the new warehouse
        getOrderItems(newData).forEach(item => {
            netChanges.push({ id: item.id, variantId: item.variantId, netChange: -item.quantity, warehouseId: newData.warehouseId });
        });
    } else if (wasActive && isActive) {
        if (warehouseChanged) {
            // Warehouse changed: Return all to old WH, Deduct all from new WH
            getOrderItems(oldData).forEach(item => {
                netChanges.push({ id: item.id, variantId: item.variantId, netChange: item.quantity, warehouseId: oldData.warehouseId });
            });
            getOrderItems(newData).forEach(item => {
                netChanges.push({ id: item.id, variantId: item.variantId, netChange: -item.quantity, warehouseId: newData.warehouseId });
            });
        } else {
            // Same Warehouse: Just diff the quantities
            const diffs = {}; // key -> { id, variantId, netChange }
            getOrderItems(oldData).forEach(item => {
                const key = item.variantId ? `${item.id}_${item.variantId}` : item.id;
                diffs[key] = { id: item.id, variantId: item.variantId, netChange: item.quantity };
            });
            getOrderItems(newData).forEach(item => {
                const key = item.variantId ? `${item.id}_${item.variantId}` : item.id;
                if (diffs[key]) {
                    diffs[key].netChange -= item.quantity;
                } else {
                    diffs[key] = { id: item.id, variantId: item.variantId, netChange: -item.quantity };
                }
            });
            Object.values(diffs).forEach(d => {
                if (d.netChange !== 0) {
                    netChanges.push({ ...d, warehouseId: newData.warehouseId });
                }
            });
        }
    }

    // Group by product ID for efficient batch updates
    const groupedByProduct = {};
    netChanges.forEach(adj => {
        if (!groupedByProduct[adj.id]) {
            groupedByProduct[adj.id] = [];
        }
        groupedByProduct[adj.id].push(adj);
    });

    return groupedByProduct;
};

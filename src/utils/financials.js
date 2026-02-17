/**
 * Financial Calculation Utilities
 * Centralizes logic for calculating Revenue, Expenses, Margins, and KPIs.
 */

// Helper: Safely parse a float
const safeFloat = (val) => {
    const num = parseFloat(val);
    return isNaN(num) ? 0 : num;
};

// Helper: Safely parse an int
const safeInt = (val) => {
    const num = parseInt(val);
    return isNaN(num) ? 1 : num;
};

/**
 * Calculate Financial Statistics
 * @param {Array} orders - List of orders (filtered by date externally if needed, or we filter here)
 * @param {Array} expenses - List of expenses
 * @param {Object} dateRange - { start, end } (ISO strings)
 * @param {String} collectionId - Optional: Filter expenses by collection
 */
export const calculateFinancialStats = (orders, expenses, dateRange = null, collectionId = null) => {
    const res = {
        realizedRevenue: 0, // Cash Collected (isPaid)
        deliveredRevenue: 0, // Potential from Delivered (status == livré)
        totalCOGS: 0,
        totalRealDelivery: 0,
        totalExpenses: 0,

        netResult: 0,
        margin: "0.0",

        // Advanced
        adsSpend: 0,
        roas: "0.00",
        cac: "0.00",
        shippingRatio: "0.0",
        profitPerOrder: "0.00",

        deliveredCount: 0,
        activeCount: 0
    };

    // Date Filtering for Expenses (Orders are typically already filtered by the hook, but let's be safe if needed)
    // NOTE: This utility assumes 'orders' passed in are ALREADY filtered by dateRange.
    // However, 'expenses' might need filtering if we fetch all.

    const start = dateRange ? new Date(dateRange.start) : null;
    const end = dateRange ? new Date(dateRange.end + "T23:59:59") : null;

    // 1. Process Orders
    orders.forEach(o => {
        const qty = safeInt(o.quantity);
        const price = safeFloat(o.price);
        const cost = safeFloat(o.costPrice);
        const delivery = safeFloat(o.realDeliveryCost);

        const revenue = price * qty;
        const cogs = cost * qty;

        const isPaid = o.isPaid === true || o.isPaid === "true";

        // Delivered Potential
        if (o.status === 'livré') {
            res.deliveredRevenue += revenue;
            res.deliveredCount++;
        }

        // Active / Pending
        if (['reçu', 'confirmation', 'packing', 'livraison', 'ramassage', 'reporté'].includes(o.status)) {
            res.activeCount++;
        }

        // Realized Cash (The Gold Standard)
        if (isPaid) {
            res.realizedRevenue += revenue;
            res.totalCOGS += cogs;
        }

        // Delivery Costs
        // We count delivery cost if status is 'livré' or 'retour' OR if there is a realDeliveryCost set > 0 (attempt made)
        if (['livré', 'retour'].includes(o.status) || delivery > 0) {
            res.totalRealDelivery += delivery;
        }
    });

    // 2. Process Expenses
    const filteredExpenses = expenses.filter(e => {
        if (collectionId) {
            if (e.collectionId === collectionId) return true; // Explicit link
            if (e.collectionId) return false; // Linked to ANOTHER collection

            // Not linked, check date
            if (!e.date || !start || !end) return false;
            const d = new Date(e.date);
            return d >= start && d <= end;
        } else {
            // Global View: Pure Date Filtering
            if (!e.date || !start || !end) return true; // Safety
            const d = new Date(e.date);
            return d >= start && d <= end;
        }
    });

    res.totalExpenses = filteredExpenses.reduce((sum, e) => sum + safeFloat(e.amount), 0);

    // Breakdowns
    res.adsSpend = filteredExpenses
        .filter(e => e.category === 'Ads')
        .reduce((sum, e) => sum + safeFloat(e.amount), 0);

    // 3. Net Result
    res.netResult = res.realizedRevenue - res.totalCOGS - res.totalRealDelivery - res.totalExpenses;

    // 4. derivated
    res.margin = res.realizedRevenue > 0 ? ((res.netResult / res.realizedRevenue) * 100).toFixed(1) : "0.0";
    res.roas = res.adsSpend > 0 ? (res.realizedRevenue / res.adsSpend).toFixed(2) : "0.00";
    res.cac = res.deliveredCount > 0 ? (res.adsSpend / res.deliveredCount).toFixed(2) : "0.00";

    const totalShipping = res.totalRealDelivery + filteredExpenses.filter(e => e.category === 'Shipping').reduce((sum, e) => sum + safeFloat(e.amount), 0);
    res.shippingRatio = res.realizedRevenue > 0 ? ((totalShipping / res.realizedRevenue) * 100).toFixed(1) : "0.0";
    res.profitPerOrder = res.deliveredCount > 0 ? (res.netResult / res.deliveredCount).toFixed(2) : "0.00";

    return { res, filteredExpenses };
};

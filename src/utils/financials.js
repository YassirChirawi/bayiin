/**
 * Financial Calculation Utilities
 * Centralizes logic for calculating Revenue, Expenses, Margins, KPIs, and Moroccan TVA.
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
 * @param {Array} orders - List of orders (filtered by date externally)
 * @param {Array} expenses - List of expenses
 * @param {Object} dateRange - { start, end } (ISO strings)
 * @param {String} collectionId - Optional: Filter expenses by collection
 * @param {Number} importFees - Optional: Frais d'approche (Douane, Transit, Transport)
 */
export const calculateFinancialStats = (orders, expenses, dateRange = null, collectionId = null, importFees = 0) => {
    const res = {
        realizedRevenue: 0, // Cash Collected (isPaid)
        deliveredRevenue: 0, // Potential from Delivered (status == livré)
        totalCOGS: 0,
        totalRealDelivery: 0,
        totalExpenses: 0,

        netResult: 0,
        margin: "0.0",

        // Moroccan Tax
        tvaCollectee: 0, // TVA 20% sur ventes livrées

        // Advanced
        adsSpend: 0,
        roas: "0.00",
        cac: "0.00",
        shippingRatio: "0.0",
        profitPerOrder: "0.00",

        deliveredCount: 0,
        activeCount: 0
    };

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

        const isPaid = o.isPaid === true || o.isPaid === "true" || o.paymentStatus === 'remitted';

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
        if (['livré', 'retour'].includes(o.status) || delivery > 0) {
            res.totalRealDelivery += delivery;
        }
    });

    // TVA 20% sur le Chiffre d'Affaires Livré (hors TVA = TTC / 1.2, TVA = TTC - HT)
    // Formule: TVA = CA_livré - (CA_livré / 1.20)
    res.tvaCollectee = res.deliveredRevenue > 0
        ? res.deliveredRevenue - (res.deliveredRevenue / 1.2)
        : 0;

    // 2. Process Expenses
    const filteredExpenses = expenses.filter(e => {
        if (collectionId) {
            if (e.collectionId === collectionId) return true;
            if (e.collectionId) return false;
            if (!e.date || !start || !end) return false;
            const d = new Date(e.date);
            return d >= start && d <= end;
        } else {
            if (!e.date || !start || !end) return true;
            const d = new Date(e.date);
            return d >= start && d <= end;
        }
    });

    res.totalExpenses = filteredExpenses.reduce((sum, e) => sum + safeFloat(e.amount), 0);

    // Breakdowns
    res.adsSpend = filteredExpenses
        .filter(e => e.category === 'Ads')
        .reduce((sum, e) => sum + safeFloat(e.amount), 0);

    // 3. Net Result (incluant les frais d'approche)
    const importFeesAmount = safeFloat(importFees);
    res.netResult = res.realizedRevenue - res.totalCOGS - res.totalRealDelivery - res.totalExpenses - importFeesAmount;

    // 4. Derived Metrics
    res.margin = res.realizedRevenue > 0 ? ((res.netResult / res.realizedRevenue) * 100).toFixed(1) : "0.0";
    res.roas = res.adsSpend > 0 ? (res.realizedRevenue / res.adsSpend).toFixed(2) : "0.00";
    res.cac = res.deliveredCount > 0 ? (res.adsSpend / res.deliveredCount).toFixed(2) : "0.00";

    const totalShipping = res.totalRealDelivery + filteredExpenses.filter(e => e.category === 'Shipping').reduce((sum, e) => sum + safeFloat(e.amount), 0);
    res.shippingRatio = res.realizedRevenue > 0 ? ((totalShipping / res.realizedRevenue) * 100).toFixed(1) : "0.0";
    res.profitPerOrder = res.deliveredCount > 0 ? (res.netResult / res.deliveredCount).toFixed(2) : "0.00";

    return { res, filteredExpenses };
};

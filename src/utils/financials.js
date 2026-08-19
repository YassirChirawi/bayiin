/**
 * Financial Calculation Utilities
 * Centralizes logic for calculating Revenue, Expenses, Margins, KPIs, and Moroccan TVA.
 *
 * BAY-104 : les primitives « argent » (valeur commande, cash encaissé, COGS, livraison, TVA,
 * résultat net) proviennent de la SOURCE DE VÉRITÉ UNIQUE (src/utils/money.js →
 * functions/shared/money.js), partagée avec le serveur. Ne pas ré-implémenter ici.
 */
import {
    orderValue, orderCOGS, isOrderPaid, collectedValue,
    orderDeliveryCost, tvaFromTTC, netProfit,
} from './money.js';

// Helper: Safely parse a float
const safeFloat = (val) => {
    const num = parseFloat(val);
    return isNaN(num) ? 0 : num;
};

/**
 * Calculate Financial Statistics
 * @param {Array} orders - List of orders (filtered by date externally)
 * @param {Array} expenses - List of expenses
 * @param {Object} dateRange - { start, end } (ISO strings)
 * @param {String} collectionId - Optional: Filter expenses by collection
 * @param {Number} importFees - Optional: Frais d'approche (Douane, Transit, Transport)
 */
export const calculateFinancialStats = (orders, expenses, refunds = [], dateRange = null, collectionId = null, importFees = 0) => {
    const res = {
        realizedRevenue: 0, // Cash Collected (isPaid)
        deliveredRevenue: 0, // Potential from Delivered (status == livré)
        totalCOGS: 0,
        totalRealDelivery: 0,
        totalExpenses: 0,
        totalRefunds: 0, // NEW

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

    // 1. Process Orders — primitives issues de la source de vérité unique (money.js)
    orders.forEach(o => {
        const revenue = orderValue(o);
        const isPaid = isOrderPaid(o);

        // Delivered Potential
        if (o.status === 'livré') {
            res.deliveredRevenue += revenue;
            res.deliveredCount++;
        }

        // Active / Pending
        if (['reçu', 'confirmation', 'packing', 'livraison', 'ramassage', 'reporté'].includes(o.status)) {
            res.activeCount++;
        }

        // Realized Cash (The Gold Standard) — cash réellement encaissé (amountPaid ou plein si payée)
        const amountCollected = collectedValue(o);
        if (amountCollected > 0 || isPaid) {
            res.realizedRevenue += amountCollected;
            // COGS plein dès qu'un paiement est reçu (règle métier partagée client/serveur).
            res.totalCOGS += orderCOGS(o);
        }

        // Delivery Costs: engagés si expédiée (livré/retour/livraison/ramassage) — 0 sinon.
        res.totalRealDelivery += orderDeliveryCost(o);
    });

    // TVA 20% extraite du CA livré (TTC) — formule unique tvaFromTTC.
    res.tvaCollectee = tvaFromTTC(res.deliveredRevenue);

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

    // 3. Process Refunds
    const filteredRefunds = refunds.filter(r => {
        if (collectionId) {
            if (r.collectionId === collectionId) return true;
            if (r.collectionId) return false;
            if (!r.date || !start || !end) return false;
            const d = new Date(r.date);
            return d >= start && d <= end;
        } else {
            if (!r.date || !start || !end) return true;
            const d = new Date(r.date);
            return d >= start && d <= end;
        }
    });

    res.totalRefunds = filteredRefunds.reduce((sum, r) => sum + safeFloat(r.amount), 0);

    // 4. Net Result (incluant frais d'approche et Avoirs) — formule unique netProfit.
    res.netResult = netProfit({
        realizedRevenue: res.realizedRevenue,
        cogs: res.totalCOGS,
        delivery: res.totalRealDelivery,
        expenses: res.totalExpenses,
        refunds: res.totalRefunds,
        importFees: safeFloat(importFees),
    });

    // 5. Derived Metrics
    // Net Revenue = Gross Realized - Refunds
    const netRevenue = res.realizedRevenue - res.totalRefunds;
    res.margin = netRevenue > 0 ? ((res.netResult / netRevenue) * 100).toFixed(1) : "0.0";
    res.roas = res.adsSpend > 0 ? (netRevenue / res.adsSpend).toFixed(2) : "0.00";
    res.cac = res.deliveredCount > 0 ? (res.adsSpend / res.deliveredCount).toFixed(2) : "0.00";

    const totalShipping = res.totalRealDelivery + filteredExpenses.filter(e => e.category === 'Shipping').reduce((sum, e) => sum + safeFloat(e.amount), 0);
    res.shippingRatio = netRevenue > 0 ? ((totalShipping / netRevenue) * 100).toFixed(1) : "0.0";
    res.profitPerOrder = res.deliveredCount > 0 ? (res.netResult / res.deliveredCount).toFixed(2) : "0.00";

    return { res, filteredExpenses, filteredRefunds };
};

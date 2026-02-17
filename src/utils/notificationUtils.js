
import { calculateFinancialStats } from './financials';
import { detectFinancialLeaks } from '../services/aiService';

/**
 * Generates a list of application alerts based on current data.
 * @param {Array} orders - List of orders
 * @param {Array} expenses - List of expenses
 * @returns {Array} List of alert objects
 */
export const generateAlerts = (orders, expenses) => {
    const newAlerts = [];

    // Safety check
    if (!orders || !expenses) return newAlerts;

    // 1. Calculate Financials (to get CAC)
    // We look at the whole dataset passed (which should be last 2 months from Context)
    // Use a wide date range to ensure we cover the data
    const dateRange = { start: '2000-01-01', end: new Date().toISOString() };
    const stats = calculateFinancialStats(orders, expenses, dateRange);
    const cac = parseFloat(stats.res.cac) || 0;

    // 2. Detect Leaks
    const leaks = detectFinancialLeaks(orders, cac);

    // 3. Construct Alerts
    if (leaks.ghostOrders.length > 0) {
        newAlerts.push({
            id: 'ghost-orders',
            type: 'critical', // Red
            title: `${leaks.ghostOrders.length} Recouvrements en attente`,
            message: `Commandes livrées depuis >15j non payées. Total: ${leaks.ghostOrders.reduce((sum, o) => sum + parseFloat(o.amount || 0), 0)} DH`,
            link: '/finances',
            action: 'Voir Audit'
        });
    }

    if (leaks.negativeMargins.length > 0) {
        newAlerts.push({
            id: 'neg-margins',
            type: 'warning', // Orange
            title: `${leaks.negativeMargins.length} Ventes à perte`,
            message: `Attention, certains produits sont vendus sous le seuil de rentabilité.`,
            link: '/finances',
            action: 'Analyser'
        });
    }

    // 4. Stock / Inventory Checks (Placeholder)
    // if (products.some(p => p.stock < 5)) ...

    return newAlerts;
};

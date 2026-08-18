import { differenceInDays } from 'date-fns';

/**
 * Segmentation client (RFM).
 * segments : NEW · VIP · VIP_RISK · LOYAL · RISK · LOST · REGULAR
 */

const NEW_SEGMENT = {
    id: 'NEW',
    label: 'Nouveau Client',
    color: 'bg-blue-100 text-blue-800',
    icon: '🌱',
    messageKey: 'welcome',
};

// Seuils (pourront devenir dynamiques par boutique).
const VIP_SPEND_THRESHOLD = 2000; // MAD
const VIP_FREQ_THRESHOLD = 5;     // commandes
const RISK_DAYS_THRESHOLD = 60;
const LOST_DAYS_THRESHOLD = 120;

/** Décision de segment à partir des métriques RFM déjà calculées. */
function decideSegment(totalSpent, orderCount, daysSinceLastOrder) {
    if (totalSpent >= VIP_SPEND_THRESHOLD && orderCount >= VIP_FREQ_THRESHOLD) {
        return daysSinceLastOrder > RISK_DAYS_THRESHOLD
            ? { id: 'VIP_RISK', label: 'VIP à Risque', color: 'bg-orange-100 text-orange-800', icon: '⚠️🏆', messageKey: 'vip_comeback' }
            : { id: 'VIP', label: 'Client VIP', color: 'bg-purple-100 text-purple-800', icon: '🏆', messageKey: 'vip_offer' };
    }
    if (orderCount >= 3 || totalSpent >= 1000) {
        return daysSinceLastOrder > RISK_DAYS_THRESHOLD
            ? { id: 'RISK', label: 'À Risque', color: 'bg-yellow-100 text-yellow-800', icon: '⚠️', messageKey: 'comeback' }
            : { id: 'LOYAL', label: 'Fidèle', color: 'bg-green-100 text-green-800', icon: '⭐', messageKey: 'loyalty_reward' };
    }
    if (daysSinceLastOrder > LOST_DAYS_THRESHOLD) {
        return { id: 'LOST', label: 'Inactif', color: 'bg-gray-100 text-gray-800', icon: '💤', messageKey: 'winback' };
    }
    return { id: 'REGULAR', label: 'Actif', color: 'bg-green-50 text-green-600', icon: '🙂', messageKey: 'standard_promo' };
}

/**
 * Segmentation à partir de l'historique de commandes complet (RFM exact).
 * @param {Object} customer
 * @param {Array} orders - commandes du client
 */
export const getCustomerSegment = (customer, orders = []) => {
    if (!orders || orders.length === 0) return NEW_SEGMENT;

    const delivered = orders.filter(o => o.status === 'livré');
    const totalSpent = delivered.reduce((sum, o) => sum + (parseFloat(o.price || 0) * (parseInt(o.quantity || 1))), 0);
    const orderCount = delivered.length;

    const sorted = [...orders].sort((a, b) =>
        new Date(b.createdAt?.seconds * 1000 || b.createdAt) - new Date(a.createdAt?.seconds * 1000 || a.createdAt));
    const lastOrderDate = sorted[0]?.createdAt
        ? new Date(sorted[0].createdAt?.seconds * 1000 || sorted[0].createdAt)
        : new Date();

    return decideSegment(totalSpent, orderCount, differenceInDays(new Date(), lastOrderDate));
};

/**
 * Segmentation à partir du RÉSUMÉ agrégé du client (totalSpent / orderCount / lastOrderDate),
 * quand l'historique complet n'est pas chargé. Évite le hack des "mock orders" côté page,
 * qui cassait la segmentation (VIP/Fidèle jamais atteints).
 * @param {Object} customer - { totalSpent, orderCount, lastOrderDate }
 */
export const getSegmentFromSummary = (customer = {}) => {
    const totalSpent = parseFloat(customer.totalSpent) || 0;
    const orderCount = parseInt(customer.orderCount) || 0;
    if (orderCount === 0 && totalSpent === 0) return NEW_SEGMENT;

    const last = customer.lastOrderDate ? new Date(customer.lastOrderDate) : new Date();
    const days = isNaN(last.getTime()) ? 0 : differenceInDays(new Date(), last);
    return decideSegment(totalSpent, orderCount, days);
};

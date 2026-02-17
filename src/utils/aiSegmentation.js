import { differenceInDays } from 'date-fns';

/**
 * AI-Driven Customer Segmentation Logic (RFM)
 * 
 * @param {Object} customer - Customer object with order history
 * @param {Array} orders - List of all orders for this customer
 * @returns {Object} { segment: 'VIP' | 'LOYAL' | 'RISK' | 'NEW' | 'LOST', color: string, icon: string, messageKey: string }
 */
export const getCustomerSegment = (customer, orders = []) => {
    if (!orders || orders.length === 0) {
        return {
            id: 'NEW',
            label: 'Nouveau Client',
            color: 'bg-blue-100 text-blue-800',
            icon: '🌱',
            messageKey: 'welcome' // Welcome offer
        };
    }

    // 1. Calculate RFM Metrics
    const totalSpent = orders.reduce((sum, order) => sum + (parseFloat(order.price || 0) * (parseInt(order.quantity || 1))), 0);
    const orderCount = orders.length;

    // Sort orders by date descending to find last purchase
    const sortedOrders = [...orders].sort((a, b) => new Date(b.createdAt?.seconds * 1000 || b.createdAt) - new Date(a.createdAt?.seconds * 1000 || a.createdAt));
    const lastOrderDate = sortedOrders[0]?.createdAt ? new Date(sortedOrders[0].createdAt?.seconds * 1000 || sortedOrders[0].createdAt) : new Date();
    const daysSinceLastOrder = differenceInDays(new Date(), lastOrderDate);

    // 2. Define Thresholds (Can be dynamic based on store settings later)
    const VIP_SPEND_THRESHOLD = 2000; // e.g., 2000 MAD
    const VIP_FREQ_THRESHOLD = 5; // 5 orders
    const RISK_DAYS_THRESHOLD = 60; // 60 days inactive
    const LOST_DAYS_THRESHOLD = 120; // 120 days inactive

    // 3. Determine Segment

    // VIP: High value AND frequent
    if (totalSpent >= VIP_SPEND_THRESHOLD && orderCount >= VIP_FREQ_THRESHOLD) {
        if (daysSinceLastOrder > RISK_DAYS_THRESHOLD) {
            return {
                id: 'VIP_RISK',
                label: 'VIP à Risque',
                color: 'bg-orange-100 text-orange-800',
                icon: '⚠️🏆',
                messageKey: 'vip_comeback'
            };
        }
        return {
            id: 'VIP',
            label: 'Client VIP',
            color: 'bg-purple-100 text-purple-800',
            icon: '🏆',
            messageKey: 'vip_offer'
        };
    }

    // LOYAL: Good frequency OR high spend (but not both VIP level yet)
    if (orderCount >= 3 || totalSpent >= 1000) {
        if (daysSinceLastOrder > RISK_DAYS_THRESHOLD) {
            return {
                id: 'RISK',
                label: 'À Risque',
                color: 'bg-yellow-100 text-yellow-800',
                icon: '⚠️',
                messageKey: 'comeback'
            };
        }
        return {
            id: 'LOYAL',
            label: 'Fidèle',
            color: 'bg-green-100 text-green-800',
            icon: '⭐',
            messageKey: 'loyalty_reward'
        };
    }

    // SLIPPED / LOST
    if (daysSinceLastOrder > LOST_DAYS_THRESHOLD) {
        return {
            id: 'LOST',
            label: 'Inactif',
            color: 'bg-gray-100 text-gray-800',
            icon: '💤',
            messageKey: 'winback'
        };
    }

    // ACTIVE / REGULAR
    return {
        id: 'REGULAR',
        label: 'Actif',
        color: 'bg-green-50 text-green-600',
        icon: '🙂',
        messageKey: 'standard_promo'
    };
};

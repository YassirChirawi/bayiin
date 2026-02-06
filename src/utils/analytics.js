import { ORDER_STATUS } from "./constants";

/*
 * Calculates the top 5 selling products by quantity.
 * Only considers orders with status 'livré' (DELIVERED).
 */
export const getTopProducts = (orders) => {
    if (!orders || !orders.length) return [];

    const productStats = {};

    orders.forEach(order => {
        // Strict Filter: Only Delivered
        if (order.status !== ORDER_STATUS.DELIVERED) return;

        const name = order.articleName || "Unknown Product";
        const qty = parseInt(order.quantity) || 0;
        const revenue = parseFloat(order.price) * qty || 0;

        if (!productStats[name]) {
            productStats[name] = { name, quantity: 0, revenue: 0 };
        }

        productStats[name].quantity += qty;
        productStats[name].revenue += revenue;
    });

    // Convert to Array and Sort by Quantity Descending
    return Object.values(productStats)
        .sort((a, b) => b.quantity - a.quantity)
        .slice(0, 5);
};

/*
 * Calculates Revenue and Return Rate per City.
 * Revenue: Sum of price * quantity for 'livré' orders.
 * Return Rate: (Count 'retour' / Total Orders) * 100.
 */
export const getCityStats = (orders) => {
    if (!orders || !orders.length) return [];

    const cityStats = {};

    orders.forEach(order => {
        let city = order.clientCity || order.city || "Unknown";
        // Normalize city name (basic)
        city = city.trim().toUpperCase();

        if (!cityStats[city]) {
            cityStats[city] = {
                name: city,
                revenue: 0,
                totalOrders: 0,
                returnedOrders: 0,
                deliveredOrders: 0
            };
        }

        cityStats[city].totalOrders += 1;

        if (order.status === ORDER_STATUS.DELIVERED) {
            cityStats[city].deliveredOrders += 1;
            const qty = parseInt(order.quantity) || 1;
            const price = parseFloat(order.price) || 0;
            cityStats[city].revenue += (price * qty);
        } else if (order.status === ORDER_STATUS.RETURNED) {
            cityStats[city].returnedOrders += 1;
        }
    });

    // Calculate Rates and Format
    return Object.values(cityStats).map(stat => ({
        ...stat,
        returnRate: stat.totalOrders > 0 ? (stat.returnedOrders / stat.totalOrders) * 100 : 0
    })).sort((a, b) => b.revenue - a.revenue); // Sort by Revenue by default
};

/*
 * Returns a list of cities with High Return Rate (> threshold, default 20%).
 * Only considers cities with at least 5 orders to avoid noise.
 */
export const getHighReturnCities = (orders, threshold = 20, minOrders = 5) => {
    const stats = getCityStats(orders);
    return stats.filter(city => city.totalOrders >= minOrders && city.returnRate > threshold)
        .sort((a, b) => b.returnRate - a.returnRate);
};

/*
 * Calculates Returning Customer Rate.
 * Based on Phone Number.
 */
export const getRetentionStats = (orders) => {
    if (!orders || !orders.length) return { new: 0, returning: 0, rate: 0 };

    const customerCounts = {};
    orders.forEach(order => {
        const phone = order.clientPhone;
        if (!phone) return;
        customerCounts[phone] = (customerCounts[phone] || 0) + 1;
    });

    let newCustomers = 0;
    let returningCustomers = 0;

    Object.values(customerCounts).forEach(count => {
        if (count > 1) returningCustomers++;
        else newCustomers++;
    });

    const total = newCustomers + returningCustomers;

    return {
        new: newCustomers,
        returning: returningCustomers,
        rate: total > 0 ? (returningCustomers / total) * 100 : 0
    };
};

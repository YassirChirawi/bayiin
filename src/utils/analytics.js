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

        const items = (order.products && order.products.length > 0) 
            ? order.products 
            : [{ name: order.articleName || "Unknown Product", quantity: order.quantity || 1, price: order.price || 0 }];

        items.forEach(item => {
            const name = item.name || "Unknown Product";
            const qty = parseInt(item.quantity) || 0;
            const price = parseFloat(item.price) || 0;
            const revenue = price * qty;

            if (!productStats[name]) {
                productStats[name] = { name, quantity: 0, revenue: 0 };
            }

            productStats[name].quantity += qty;
            productStats[name].revenue += revenue;
        });
    });

    // Convert to Array and Sort by Quantity Descending
    return Object.values(productStats)
        .sort((a, b) => b.quantity - a.quantity)
        .slice(0, 5);
};

export const normalizeCityName = (cityStr) => {
    if (!cityStr) return "UNKNOWN";
    let normalized = cityStr.trim().toUpperCase();

    // Remove common accents for safe comparison
    normalized = normalized.normalize("NFD").replace(/[\u0300-\u036f]/g, "");

    const CASABLANCA = "CASABLANCA";
    const MARRAKECH = "MARRAKECH";
    const RABAT = "RABAT";
    const TANGIER = "TANGER";

    if (["CASA", "CASABLANCA", "DAR BEIDA", "DAR EL BEIDA"].includes(normalized)) return CASABLANCA;
    if (["KECH", "MARRAKESH", "MARRAKECH"].includes(normalized)) return MARRAKECH;
    if (["RBT", "RABAT"].includes(normalized)) return RABAT;
    if (["TANJA", "TANGIER", "TANGER"].includes(normalized)) return TANGIER;
    
    return normalized;
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
        // Normalize city name robustly
        city = normalizeCityName(city);

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

/*
 * Calculates Financial Reconciliation Stats for Cash On Delivery (COD).
 * Breaks down revenue into Expected (shipping), Unremitted (delivered but not paid out), and Remitted (cash received).
 */
export const getFinancialReconciliationStats = (orders) => {
    let expected = 0; // En cours de livraison
    let unremitted = 0; // Livré mais argent pas encore reçu
    let remitted = 0; // Livré et argent encaissé

    if (!orders || !orders.length) return { expected, unremitted, remitted };

    orders.forEach(order => {
        const qty = parseInt(order.quantity) || 1;
        const totalAmount = parseFloat(order.price) * qty || 0;

        // Is it out for delivery? (Expected money)
        if (order.status === ORDER_STATUS.SHIPPING || order.status === 'ramassage') {
            expected += totalAmount;
        }

        // Is it delivered? (Actual revenue to reconcile)
        else if (order.status === ORDER_STATUS.DELIVERED) {
            if (order.paymentStatus === 'remitted') {
                remitted += totalAmount;
            } else {
                // 'pending' or undefined means we are waiting for the cash
                unremitted += totalAmount;
            }
        }
    });

    return {
        expected,
        unremitted,
        remitted,
        totalRecognized: unremitted + remitted // Total CA Deliveré
    };
};

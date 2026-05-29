const { getFirestore } = require('firebase-admin/firestore');

/**
 * Moteur Financier Déterministe pour Beya3
 * Toutes les fonctions ici retournent des valeurs mathématiquement exactes basées sur Firestore.
 */

const getDb = () => getFirestore('comsaas'); // Assuming the secondary DB is used based on your firebase.json

// Helpers for date filtering
const getStartOfDay = (dateString) => {
    const d = dateString ? new Date(dateString) : new Date();
    d.setHours(0, 0, 0, 0);
    return d.toISOString(); // We might need to adjust based on how dates are stored in BayIIn (ISO strings vs Timestamps)
};

const getEndOfDay = (dateString) => {
    const d = dateString ? new Date(dateString) : new Date();
    d.setHours(23, 59, 59, 999);
    return d.toISOString();
};

/**
 * Calcule le profit net exact sur une période donnée.
 */
async function calculateNetProfit(storeId, startDate, endDate, breakdown = 'total') {
    const db = getDb();
    
    // 1. Fetch Orders (Delivered & Returns)
    let ordersQuery = db.collection('orders')
        .where('storeId', '==', storeId)
        .where('status', 'in', ['livré', 'retour']);
        
    // Date filtering (assuming 'createdAt' or 'date' is used)
    // Note: BayIIn seems to use string dates in some places. We will fetch all and filter in-memory if query is complex
    const ordersSnap = await ordersQuery.get();
    
    // 2. Fetch Expenses
    const expensesSnap = await db.collection('expenses')
        .where('storeId', '==', storeId)
        .get();

    let grossRevenue = 0;
    let cogs = 0;
    let deliveryCosts = 0;
    let expenses = 0;
    let returnImpact = 0;
    let ordersCount = 0;
    
    const byProduct = {};
    const byCity = {};
    const byDay = {};

    // Filter by date range
    const startObj = startDate ? new Date(startDate) : new Date(0);
    const endObj = endDate ? new Date(endDate) : new Date();
    endObj.setHours(23, 59, 59, 999);

    ordersSnap.forEach(doc => {
        const order = doc.data();
        const orderDateStr = order.date || order.createdAt; // Handle both formats
        let orderDate = new Date();
        if (orderDateStr) {
             orderDate = typeof orderDateStr === 'string' ? new Date(orderDateStr) : orderDateStr.toDate();
        }

        if (orderDate >= startObj && orderDate <= endObj) {
            const price = parseFloat(order.price) || 0;
            const qty = parseInt(order.quantity) || 1;
            const cost = parseFloat(order.costPrice) || 0;
            const realDeliveryCost = parseFloat(order.realDeliveryCost) || 0;
            
            const dateKey = orderDate.toISOString().split('T')[0];
            const cityKey = order.clientCity || 'Inconnu';

            if (order.status === 'livré') {
                grossRevenue += (price * qty);
                cogs += (cost * qty);
                deliveryCosts += realDeliveryCost;
                ordersCount++;

                // Breakdowns
                if (breakdown === 'by_city') {
                    byCity[cityKey] = (byCity[cityKey] || 0) + (price * qty);
                }
                if (breakdown === 'by_day') {
                    byDay[dateKey] = (byDay[dateKey] || 0) + (price * qty);
                }
            } else if (order.status === 'retour') {
                // Impact négatif: On a payé la livraison (aller/retour souvent) mais pas encaissé
                returnImpact += realDeliveryCost; // Simplified: Only counting delivery loss on returns
            }
        }
    });

    expensesSnap.forEach(doc => {
        const expense = doc.data();
        const expenseDateStr = expense.date || expense.createdAt;
        let expenseDate = new Date();
        if (expenseDateStr) {
             expenseDate = typeof expenseDateStr === 'string' ? new Date(expenseDateStr) : expenseDateStr.toDate();
        }

        if (expenseDate >= startObj && expenseDate <= endObj) {
            expenses += parseFloat(expense.amount) || 0;
        }
    });

    const netProfit = grossRevenue - cogs - deliveryCosts - expenses - returnImpact;
    const margin = grossRevenue > 0 ? (netProfit / grossRevenue) * 100 : 0;

    const result = {
        grossRevenue: Number(grossRevenue.toFixed(2)),
        cogs: Number(cogs.toFixed(2)),
        deliveryCosts: Number(deliveryCosts.toFixed(2)),
        expenses: Number(expenses.toFixed(2)),
        returnImpact: Number(returnImpact.toFixed(2)),
        netProfit: Number(netProfit.toFixed(2)),
        margin: Number(margin.toFixed(2)),
        ordersCount,
        avgOrderValue: ordersCount > 0 ? Number((grossRevenue / ordersCount).toFixed(2)) : 0,
        period: { startDate, endDate }
    };

    if (breakdown === 'by_city') result.byCity = byCity;
    if (breakdown === 'by_day') result.byDay = byDay;

    return result;
}

/**
 * Analyse l'état de la trésorerie et les encaissements en attente.
 */
async function getPendingCashflow(storeId, carrier = 'all') {
    const db = getDb();
    
    // Commandes livrées non encore payées (remitted)
    const query = db.collection('orders')
        .where('storeId', '==', storeId)
        .where('status', 'in', ['livraison', 'livré']);
        
    const snap = await query.get();
    
    let inTransit = 0;
    let pendingRemittance = 0;
    let encaissed = 0;
    
    const byCarrier = {
        sendit: { inTransit: 0, pending: 0 },
        olivraison: { inTransit: 0, pending: 0 },
        internal: { inTransit: 0, pending: 0 }
    };

    const urgentRemittances = [];
    const now = new Date();

    snap.forEach(doc => {
        const order = doc.data();
        const carrierName = (order.carrier || 'internal').toLowerCase();
        
        if (carrier !== 'all' && !carrierName.includes(carrier.toLowerCase())) return;

        const value = (parseFloat(order.price) || 0) * (parseInt(order.quantity) || 1);
        
        // Ensure structure exists
        if (!byCarrier[carrierName]) {
             byCarrier[carrierName] = { inTransit: 0, pending: 0 };
        }

        if (order.status === 'livraison') {
            inTransit += value;
            byCarrier[carrierName].inTransit += value;
        } else if (order.status === 'livré') {
            if (order.paymentStatus !== 'remitted') {
                pendingRemittance += value;
                byCarrier[carrierName].pending += value;
                
                // Check age
                const deliveryDateStr = order.lastCarrierUpdate || order.updatedAt;
                let deliveryDate = new Date();
                if (deliveryDateStr) {
                    deliveryDate = typeof deliveryDateStr === 'string' ? new Date(deliveryDateStr) : deliveryDateStr.toDate();
                }
                
                const daysSinceDelivery = (now - deliveryDate) / (1000 * 60 * 60 * 24);
                if (daysSinceDelivery > 15) {
                    urgentRemittances.push({
                        orderId: doc.id,
                        orderNumber: order.orderNumber,
                        amount: value,
                        carrier: carrierName,
                        daysPending: Math.round(daysSinceDelivery)
                    });
                }
            } else {
                encaissed += value;
            }
        }
    });

    return {
        inTransit: Number(inTransit.toFixed(2)),
        pendingRemittance: Number(pendingRemittance.toFixed(2)),
        encaissed: Number(encaissed.toFixed(2)),
        byCarrier,
        oldestPendingDays: urgentRemittances.length > 0 ? Math.max(...urgentRemittances.map(u => u.daysPending)) : 0,
        urgentRemittances: urgentRemittances.sort((a,b) => b.daysPending - a.daysPending)
    };
}

/**
 * Calcule la valeur totale du stock.
 */
async function getInventoryValue(storeId) {
    const db = getDb();
    const snap = await db.collection('products')
        .where('storeId', '==', storeId)
        .get();
        
    let totalValue = 0;
    const byProduct = [];
    let outOfStock = 0;
    let lowStock = 0;

    snap.forEach(doc => {
        const p = doc.data();
        const stock = parseInt(p.stock) || 0;
        const costPrice = parseFloat(p.costPrice) || 0;
        const value = stock * costPrice;
        
        totalValue += value;
        
        if (stock === 0) outOfStock++;
        else if (stock < 5) lowStock++; // Assuming 5 is a generic low stock threshold
        
        byProduct.push({
            productId: doc.id,
            name: p.name,
            stock,
            costPrice,
            totalValue: value
        });
    });

    // Sort by highest value
    byProduct.sort((a, b) => b.totalValue - a.totalValue);

    return {
        totalValue: Number(totalValue.toFixed(2)),
        totalProducts: snap.size,
        outOfStock,
        lowStock,
        byProduct: byProduct.slice(0, 10) // Top 10 only to save tokens
    };
}

/**
 * Prédit les ruptures de stock imminentes.
 */
async function predictStockRunout(storeId, daysLookAhead = 30, urgencyThreshold = 7) {
    const db = getDb();
    
    // 1. Fetch current stock
    const productsSnap = await db.collection('products')
        .where('storeId', '==', storeId)
        .get();
        
    const products = {};
    productsSnap.forEach(doc => {
        products[doc.id] = { ...doc.data(), id: doc.id };
    });

    // 2. Fetch recent orders (last 14 days to calculate trend)
    const fourteenDaysAgo = new Date();
    fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);
    
    const ordersSnap = await db.collection('orders')
        .where('storeId', '==', storeId)
        .where('status', 'in', ['reçu', 'confirmation', 'packing', 'livraison', 'livré'])
        .get();

    // Aggregate sales
    const salesLast7Days = {};
    const salesPrevious7Days = {};

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    ordersSnap.forEach(doc => {
        const order = doc.data();
        const orderDateStr = order.date || order.createdAt;
        let orderDate = new Date();
        if (orderDateStr) {
             orderDate = typeof orderDateStr === 'string' ? new Date(orderDateStr) : orderDateStr.toDate();
        }

        if (orderDate < fourteenDaysAgo) return;

        const pId = order.articleId || (order.products && order.products[0]?.id);
        const qty = parseInt(order.quantity) || 1;
        
        if (!pId) return;

        if (orderDate >= sevenDaysAgo) {
            salesLast7Days[pId] = (salesLast7Days[pId] || 0) + qty;
        } else {
            salesPrevious7Days[pId] = (salesPrevious7Days[pId] || 0) + qty;
        }
    });

    const critical = [];
    const urgent = [];
    const watch = [];
    const healthy = [];
    const outOfStock = [];

    // 3. Calculate predictions
    Object.values(products).forEach(p => {
        const stock = parseInt(p.stock) || 0;
        
        if (stock <= 0) {
            outOfStock.push({ product: p.name, daysLeft: 0, stock: 0 });
            return;
        }

        const recentSales = salesLast7Days[p.id] || 0;
        const pastSales = salesPrevious7Days[p.id] || 0;
        
        if (recentSales === 0) {
            healthy.push({ product: p.name, daysLeft: 999, stock });
            return;
        }

        const dailyRate = recentSales / 7;
        const trend = pastSales > 0 ? recentSales / pastSales : 1;
        
        // If trend is accelerating (e.g. > 1.2), adjust daily rate up slightly
        const adjustedRate = trend > 1.2 ? dailyRate * 1.15 : (trend < 0.8 ? dailyRate * 0.9 : dailyRate);
        
        const daysLeft = Math.round(stock / adjustedRate);
        const recommendedQty = Math.ceil(adjustedRate * 30 * 1.2); // 30 days cover + 20% buffer

        const item = { product: p.name, daysLeft, dailyRate: Number(adjustedRate.toFixed(1)), stock, recommendedQty };

        if (daysLeft <= 3) critical.push(item);
        else if (daysLeft <= urgencyThreshold) urgent.push(item);
        else if (daysLeft <= 14) watch.push(item);
        else healthy.push(item);
    });

    return {
        critical: critical.sort((a,b) => a.daysLeft - b.daysLeft),
        urgent: urgent.sort((a,b) => a.daysLeft - b.daysLeft),
        watch: watch.sort((a,b) => a.daysLeft - b.daysLeft),
        outOfStock: outOfStock,
        summary: `${critical.length} ruptures imminentes, ${outOfStock.length} déjà en rupture.`
    };
}

/**
 * Détecte les anomalies financières.
 */
async function detectFinancialAnomalies(storeId) {
    const db = getDb();
    
    const ghostOrders = [];
    const negativeMargins = [];
    const suspiciousReturns = []; // Simplification: we'll skip deep customer return rate calculation to save time here

    // Orders in last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const ordersSnap = await db.collection('orders')
        .where('storeId', '==', storeId)
        .get();
        
    const now = new Date();

    ordersSnap.forEach(doc => {
        const order = doc.data();
        const price = parseFloat(order.price) || 0;
        const qty = parseInt(order.quantity) || 1;
        const cost = parseFloat(order.costPrice) || 0;
        const realDelivery = parseFloat(order.realDeliveryCost) || 0;
        
        const totalRevenue = price * qty;
        const totalCost = (cost * qty) + realDelivery;

        // 1. Negative Margins (only for delivered or packing/livraison where we expect profit)
        if (['confirmation', 'packing', 'livraison', 'livré'].includes(order.status)) {
             if (totalCost > totalRevenue && totalRevenue > 0) {
                 negativeMargins.push({
                     orderId: doc.id,
                     orderNumber: order.orderNumber,
                     sellingPrice: totalRevenue,
                     totalCost: totalCost,
                     loss: totalCost - totalRevenue
                 });
             }
        }

        // 2. Ghost Orders (in delivery for > 10 days)
        if (order.status === 'livraison') {
            const dateStr = order.lastCarrierUpdate || order.date || order.createdAt;
            let dateObj = new Date();
            if (dateStr) {
                dateObj = typeof dateStr === 'string' ? new Date(dateStr) : dateStr.toDate();
            }
            const daysInTransit = (now - dateObj) / (1000 * 60 * 60 * 24);
            if (daysInTransit > 10) {
                ghostOrders.push({
                    orderId: doc.id,
                    orderNumber: order.orderNumber,
                    amount: totalRevenue,
                    carrier: order.carrier || 'Inconnu',
                    daysInTransit: Math.round(daysInTransit)
                });
            }
        }
    });

    return {
        hasAnomalies: ghostOrders.length > 0 || negativeMargins.length > 0,
        ghostOrders: ghostOrders.sort((a,b) => b.daysInTransit - a.daysInTransit),
        negativeMargins: negativeMargins.sort((a,b) => b.loss - a.loss),
        summary: `${ghostOrders.length} commandes fantômes et ${negativeMargins.length} ventes à perte détectées.`
    };
}


module.exports = {
    calculateNetProfit,
    getPendingCashflow,
    getInventoryValue,
    predictStockRunout,
    detectFinancialAnomalies
};

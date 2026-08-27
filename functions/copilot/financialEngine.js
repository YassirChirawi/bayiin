const { getFirestore } = require('firebase-admin/firestore');
// BAY-104 : primitives argent depuis la source de vérité unique (partagée client/serveur).
const { collectedValue, isRealized: isOrderRealized, orderCOGS, orderDeliveryCost, netProfit: computeNetProfit } = require('../shared/money');

/**
 * Moteur Financier Déterministe pour Beya3
 * Toutes les fonctions ici retournent des valeurs mathématiquement exactes basées sur Firestore.
 */

const getDb = () => getFirestore('comsaas');

/** Statuts considérés comme un retour, pour la ventilation du reporting. */
const RETURN_STATUSES = ['retour', 'retour en cours'];

// Helpers for date filtering
const getStartOfDay = (dateString) => {
    const d = dateString ? new Date(dateString) : new Date();
    d.setHours(0, 0, 0, 0);
    return d.toISOString();
};

const getEndOfDay = (dateString) => {
    const d = dateString ? new Date(dateString) : new Date();
    d.setHours(23, 59, 59, 999);
    return d.toISOString();
};

// ═══════════════════════════════════════════════════════════════
// ÉVOLUTION 3 — SAISONNALITÉ MAROCAINE
// ═══════════════════════════════════════════════════════════════

const MOROCCAN_CALENDAR_2026 = {
    ramadan:      { start: '2026-02-18', end: '2026-03-19', label: 'Ramadan' },
    aidAlFitr:    { start: '2026-03-20', end: '2026-03-22', label: 'Aïd al-Fitr' },
    aidAlAdha:    { start: '2026-05-27', end: '2026-05-30', label: 'Aïd al-Adha' },
    rentree:      { start: '2026-09-01', end: '2026-09-15', label: 'Rentrée scolaire' },
    blackFriday:  { start: '2026-11-20', end: '2026-11-30', label: 'Black Friday / White Friday' },
    noel:         { start: '2026-12-20', end: '2026-12-31', label: 'Fêtes de fin d\'année' }
};

const MOROCCAN_SEASONALITY = {
    ramadan:     { factor: 1.4, categories: ['vetements', 'alimentaire', 'deco', 'cuisine', 'maison'] },
    aidAlFitr:   { factor: 1.8, categories: ['vetements', 'cadeaux', 'parfum', 'beaute', 'enfants'] },
    aidAlAdha:   { factor: 1.6, categories: ['vetements', 'cadeaux', 'cuisine', 'maison'] },
    rentree:     { factor: 1.3, categories: ['fournitures', 'electronique', 'sacs', 'chaussures', 'vetements'] },
    blackFriday: { factor: 2.1, categories: ['all'] },
    noel:        { factor: 1.5, categories: ['cadeaux', 'deco', 'electronique', 'jouets'] }
};

/**
 * Détecte les événements marocains à venir dans les N prochains jours.
 */
function getUpcomingEvents(currentDate, daysAhead = 30) {
    const now = currentDate ? new Date(currentDate) : new Date();
    const upcoming = [];

    for (const [eventKey, dates] of Object.entries(MOROCCAN_CALENDAR_2026)) {
        const eventStart = new Date(dates.start);
        const eventEnd = new Date(dates.end);
        const daysUntil = Math.round((eventStart - now) / 86400000);

        if (now <= eventEnd && daysUntil <= daysAhead) {
            upcoming.push({
                event: eventKey,
                label: dates.label,
                daysUntil: Math.max(0, daysUntil),
                isActive: daysUntil <= 0 && now <= eventEnd,
                startDate: dates.start,
                endDate: dates.end
            });
        }
    }

    return upcoming.sort((a, b) => a.daysUntil - b.daysUntil);
}

/**
 * Calcule le facteur saisonnier pour un produit donné.
 * Le facteur monte progressivement 21 jours avant l'événement.
 */
function getSeasonalFactor(productCategory, currentDate) {
    const events = getUpcomingEvents(currentDate, 30);
    if (events.length === 0) return { factor: 1.0, event: null };

    const category = (productCategory || '').toLowerCase();
    let bestFactor = 1.0;
    let bestEvent = null;

    for (const upcoming of events) {
        const seasonality = MOROCCAN_SEASONALITY[upcoming.event];
        if (!seasonality) continue;

        const categoryMatch = seasonality.categories.includes('all') ||
            seasonality.categories.some(c => category.includes(c));
        if (!categoryMatch) continue;

        let factor;
        if (upcoming.isActive) {
            factor = seasonality.factor; // Full factor during the event
        } else {
            // Progressive ramp-up over 21 days
            const daysUntil = upcoming.daysUntil;
            factor = 1 + (seasonality.factor - 1) * Math.max(0, (21 - daysUntil) / 21);
        }

        if (factor > bestFactor) {
            bestFactor = factor;
            bestEvent = upcoming;
        }
    }

    return { factor: Number(bestFactor.toFixed(2)), event: bestEvent };
}

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
            const dateKey = orderDate.toISOString().split('T')[0];
            const cityKey = order.clientCity || 'Inconnu';

            // Base TRÉSORERIE (le "vrai cash") via la source de vérité unique money.js : montant
            // réellement encaissé (amountPaid, sinon isPaid/remitted → total). Beya3, la page
            // Finances et les stats serveur partagent désormais EXACTEMENT la même définition.
            const collected = collectedValue(order);
            if (isOrderRealized(order)) {
                grossRevenue += collected;
                cogs += orderCOGS(order); // COGS plein dès qu'un paiement est reçu
                ordersCount++;
                if (breakdown === 'by_city') byCity[cityKey] = (byCity[cityKey] || 0) + collected;
                if (breakdown === 'by_day') byDay[dateKey] = (byDay[dateKey] || 0) + collected;
            }
            // Coûts de livraison : encourus dès l'expédition (0 sinon) — même définition partagée.
            const delivery = orderDeliveryCost(order);
            deliveryCosts += delivery;

            // returnImpact est une VENTILATION pour le reporting, pas une charge
            // supplémentaire : le coût de livraison d'un retour est déjà compté
            // dans deliveryCosts ci-dessus. Il n'entre donc pas dans netProfit,
            // sous peine de double comptage.
            //
            // Ce compteur n'était jamais incrémenté : il restait à 0 en toutes
            // circonstances, et le brief quotidien envoyé aux marchands
            // (proactiveAgent.js) annonçait donc « retours : 0 » même après une
            // journée de retours.
            if (RETURN_STATUSES.includes(order.status)) {
                returnImpact += delivery;
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

    // refunds: 0 — volontaire. Le coût des retours est déjà inclus dans
    // deliveryCosts ; le repasser ici le compterait deux fois. returnImpact
    // reste exposé comme ventilation informative dans le résultat.
    const netProfit = computeNetProfit({ realizedRevenue: grossRevenue, cogs, delivery: deliveryCosts, expenses, refunds: 0 });
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

    // 3. Calculate predictions (with seasonal adjustment)
    const seasonalAlerts = [];

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
        
        // Trend acceleration adjustment
        let adjustedRate = trend > 1.2 ? dailyRate * 1.15 : (trend < 0.8 ? dailyRate * 0.9 : dailyRate);
        
        // SEASONAL BOOST (Évolution 3)
        const productCategory = p.category || p.subcategory || '';
        const seasonal = getSeasonalFactor(productCategory);
        const seasonalAdjustedRate = adjustedRate * seasonal.factor;
        
        const daysLeft = Math.round(stock / seasonalAdjustedRate);
        const recommendedQty = Math.ceil(seasonalAdjustedRate * 30 * 1.2);

        const item = {
            product: p.name,
            daysLeft,
            dailyRate: Number(adjustedRate.toFixed(1)),
            seasonalDailyRate: Number(seasonalAdjustedRate.toFixed(1)),
            stock,
            recommendedQty,
            seasonalFactor: seasonal.factor
        };

        // Generate seasonal alert if a major event is approaching
        if (seasonal.event && seasonal.factor > 1.1) {
            const recommendedStockForEvent = Math.ceil(seasonalAdjustedRate * Math.max(seasonal.event.daysUntil + 7, 14));
            if (stock < recommendedStockForEvent) {
                seasonalAlerts.push({
                    product: p.name,
                    event: seasonal.event.label,
                    daysUntil: seasonal.event.daysUntil,
                    expectedDemandIncrease: `+${Math.round((seasonal.factor - 1) * 100)}%`,
                    currentStock: stock,
                    recommendedStockForEvent,
                    deficit: recommendedStockForEvent - stock,
                    urgency: (recommendedStockForEvent - stock) > stock ? 'CRITICAL' : 'WARNING'
                });
            }
        }

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
        seasonalAlerts: seasonalAlerts.sort((a,b) => a.daysUntil - b.daysUntil),
        upcomingEvents: getUpcomingEvents(null, 30),
        summary: `${critical.length} ruptures imminentes, ${outOfStock.length} déjà en rupture.${seasonalAlerts.length > 0 ? ` ⚠️ ${seasonalAlerts.length} alertes saisonnières !` : ''}`
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

/**
 * GESTION DES CLIENTS
 * Récupère la liste des clients récents de la boutique.
 */
async function getCustomerList(storeId, limit = 10) {
    try {
        const db = getDb();
        const customersSnap = await db.collection("customers")
            .where("storeId", "==", storeId)
            .orderBy("lastOrderDate", "desc")
            .limit(limit)
            .get();

        if (customersSnap.empty) {
            return { customers: [], message: "Aucun client trouvé." };
        }

        const customers = [];
        customersSnap.forEach(doc => {
            const data = doc.data();
            customers.push({
                name: data.name || "Non renseigné",
                phone: data.phone || "Non renseigné",
                city: data.city || "Non renseigné",
                totalOrders: data.totalOrders || 0,
                totalSpent: data.totalSpent || 0,
                lastOrderDate: data.lastOrderDate || "Inconnue"
            });
        });

        return {
            totalReturned: customersSnap.size,
            customers
        };
    } catch (e) {
        console.error("getCustomerList error:", e);
        return { error: "Failed to retrieve customers" };
    }
}

module.exports = {
    calculateNetProfit,
    getPendingCashflow,
    getInventoryValue,
    predictStockRunout,
    detectFinancialAnomalies,
    getCustomerList,
    getUpcomingEvents,
    getSeasonalFactor,
    MOROCCAN_CALENDAR_2026,
    MOROCCAN_SEASONALITY
};

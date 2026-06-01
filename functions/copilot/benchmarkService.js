const { getFirestore, FieldValue } = require('firebase-admin/firestore');

const getDb = () => getFirestore('comsaas');

/**
 * Benchmark Service — Comparaison anonymisée avec le marché
 * 
 * Calcule des médianes agrégées par segment de taille de boutique.
 * JAMAIS de storeId stocké dans les benchmarks — données strictement anonymes.
 */

const SEGMENTS = {
    micro: { label: 'Micro (<50 cmd/mois)', maxOrders: 50 },
    small: { label: 'Small (50-200 cmd/mois)', maxOrders: 200 },
    medium: { label: 'Medium (200-1000 cmd/mois)', maxOrders: 1000 },
    large: { label: 'Large (>1000 cmd/mois)', maxOrders: Infinity }
};

function getSegment(monthlyOrders) {
    if (monthlyOrders < 50) return 'micro';
    if (monthlyOrders < 200) return 'small';
    if (monthlyOrders < 1000) return 'medium';
    return 'large';
}

function percentile(sortedArr, p) {
    if (sortedArr.length === 0) return 0;
    const index = (p / 100) * (sortedArr.length - 1);
    const lower = Math.floor(index);
    const upper = Math.ceil(index);
    if (lower === upper) return sortedArr[lower];
    return sortedArr[lower] + (sortedArr[upper] - sortedArr[lower]) * (index - lower);
}

/**
 * Calcule et stocke les benchmarks du marché.
 * À exécuter chaque dimanche à 02:00 via Cloud Scheduler.
 */
async function updateMarketBenchmarks() {
    const db = getDb();
    const now = new Date();
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // 1. Fetch all active PRO stores
    const storesSnap = await db.collection('stores')
        .where('plan', 'in', ['pro', 'unlimited'])
        .get();

    if (storesSnap.empty) {
        console.log('[Benchmark] No active PRO stores found.');
        return;
    }

    // 2. Calculate metrics per store (anonymized — we never save storeId)
    const storeMetrics = [];

    for (const storeDoc of storesSnap.docs) {
        const storeId = storeDoc.id;

        try {
            // Get orders from last 30 days
            const ordersSnap = await db.collection('orders')
                .where('storeId', '==', storeId)
                .get();

            let deliveredCount = 0;
            let returnCount = 0;
            let totalRevenue = 0;
            let totalCost = 0;
            let totalOrders = 0;

            ordersSnap.forEach(doc => {
                const o = doc.data();
                const dateStr = o.date || o.createdAt;
                let orderDate = new Date();
                if (dateStr) {
                    orderDate = typeof dateStr === 'string' ? new Date(dateStr) : dateStr.toDate();
                }

                if (orderDate < thirtyDaysAgo) return;
                totalOrders++;

                const price = parseFloat(o.price) || 0;
                const qty = parseInt(o.quantity) || 1;
                const cost = parseFloat(o.costPrice) || 0;
                const delivery = parseFloat(o.realDeliveryCost) || 0;

                if (o.status === 'livré') {
                    deliveredCount++;
                    totalRevenue += price * qty;
                    totalCost += (cost * qty) + delivery;
                } else if (o.status === 'retour') {
                    returnCount++;
                }
            });

            if (totalOrders < 5) continue; // Skip stores with too few orders

            const margin = totalRevenue > 0 ? ((totalRevenue - totalCost) / totalRevenue) * 100 : 0;
            const returnRate = (deliveredCount + returnCount) > 0
                ? (returnCount / (deliveredCount + returnCount)) * 100
                : 0;
            const avgOrderValue = deliveredCount > 0 ? totalRevenue / deliveredCount : 0;
            const ordersPerDay = totalOrders / 30;

            storeMetrics.push({
                segment: getSegment(totalOrders),
                margin: Number(margin.toFixed(2)),
                returnRate: Number(returnRate.toFixed(2)),
                avgOrderValue: Number(avgOrderValue.toFixed(2)),
                ordersPerDay: Number(ordersPerDay.toFixed(2)),
                monthlyOrders: totalOrders
            });
        } catch (e) {
            console.error(`[Benchmark] Error processing store:`, e);
        }
    }

    // 3. Aggregate by segment
    const segmentData = {};
    for (const seg of Object.keys(SEGMENTS)) {
        const stores = storeMetrics.filter(s => s.segment === seg);
        if (stores.length < 3) continue; // Need at least 3 stores for meaningful stats

        const margins = stores.map(s => s.margin).sort((a, b) => a - b);
        const returnRates = stores.map(s => s.returnRate).sort((a, b) => a - b);
        const aovs = stores.map(s => s.avgOrderValue).sort((a, b) => a - b);
        const opds = stores.map(s => s.ordersPerDay).sort((a, b) => a - b);

        segmentData[seg] = {
            sampleSize: stores.length,
            margin: { p25: percentile(margins, 25), p50: percentile(margins, 50), p75: percentile(margins, 75) },
            returnRate: { p25: percentile(returnRates, 25), p50: percentile(returnRates, 50), p75: percentile(returnRates, 75) },
            avgOrderValue: { p25: percentile(aovs, 25), p50: percentile(aovs, 50), p75: percentile(aovs, 75) },
            ordersPerDay: { p25: percentile(opds, 25), p50: percentile(opds, 50), p75: percentile(opds, 75) }
        };
    }

    // 4. Save to Firestore (global, not under any store)
    const dateKey = now.toISOString().split('T')[0];
    for (const [seg, data] of Object.entries(segmentData)) {
        await db.collection('market_benchmarks').doc(seg).set({
            ...data,
            updatedAt: FieldValue.serverTimestamp(),
            dateKey,
            segmentLabel: SEGMENTS[seg].label
        }, { merge: true });
    }

    console.log(`[Benchmark] Updated benchmarks for ${Object.keys(segmentData).length} segments from ${storeMetrics.length} stores.`);
}

/**
 * Enrichit les métriques d'un store avec le contexte benchmark.
 */
async function addBenchmarkContext(storeId, metrics) {
    const db = getDb();

    // Determine this store's segment
    const monthlyOrders = metrics.ordersCount || metrics.totalOrders || 0;
    const segment = getSegment(monthlyOrders);

    // Fetch the benchmark for this segment
    const benchDoc = await db.collection('market_benchmarks').doc(segment).get();
    if (!benchDoc.exists) {
        return { ...metrics, benchmark: null };
    }

    const bench = benchDoc.data();
    const storeMargin = metrics.margin || 0;
    const storeReturnRate = metrics.returnRate || 0;

    let position = 'at_median';
    if (storeMargin >= bench.margin.p75) position = 'top_quartile';
    else if (storeMargin >= bench.margin.p50) position = 'above_median';
    else if (storeMargin >= bench.margin.p25) position = 'below_median';
    else position = 'bottom_quartile';

    let insight = '';
    switch (position) {
        case 'top_quartile':
            insight = "Votre marge est dans le top 25% des boutiques similaires 🌟";
            break;
        case 'above_median':
            insight = "Votre marge est au-dessus de la médiane du marché 📈";
            break;
        case 'below_median':
            insight = "Votre marge est sous la médiane — optimisation possible 📊";
            break;
        case 'bottom_quartile':
            insight = "Votre marge est dans le quart inférieur — action urgente recommandée ⚠️";
            break;
        default:
            insight = "Données insuffisantes pour comparaison.";
    }

    return {
        ...metrics,
        benchmark: {
            segment,
            segmentLabel: bench.segmentLabel,
            sampleSize: bench.sampleSize,
            margin: { yours: storeMargin, p25: bench.margin.p25, p50: bench.margin.p50, p75: bench.margin.p75 },
            returnRate: bench.returnRate ? {
                yours: storeReturnRate,
                p25: bench.returnRate.p25,
                p50: bench.returnRate.p50,
                p75: bench.returnRate.p75
            } : null,
            avgOrderValue: bench.avgOrderValue || null,
            position,
            insight,
            lastUpdated: bench.dateKey
        }
    };
}

/**
 * Tool function: compare spécifique métriques avec le marché.
 */
async function getMarketBenchmark(storeId, metricsArray = ['margin', 'return_rate', 'avg_order_value']) {
    const db = getDb();

    // First we need to know this store's metrics
    // We'll fetch basic order data
    const ordersSnap = await db.collection('orders')
        .where('storeId', '==', storeId)
        .get();

    const now = new Date();
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    let deliveredCount = 0, returnCount = 0, totalRevenue = 0, totalCost = 0, totalOrders = 0;

    ordersSnap.forEach(doc => {
        const o = doc.data();
        const dateStr = o.date || o.createdAt;
        let orderDate = new Date();
        if (dateStr) {
            orderDate = typeof dateStr === 'string' ? new Date(dateStr) : dateStr.toDate();
        }
        if (orderDate < thirtyDaysAgo) return;
        totalOrders++;

        const price = parseFloat(o.price) || 0;
        const qty = parseInt(o.quantity) || 1;
        const cost = parseFloat(o.costPrice) || 0;
        const delivery = parseFloat(o.realDeliveryCost) || 0;

        if (o.status === 'livré') {
            deliveredCount++;
            totalRevenue += price * qty;
            totalCost += (cost * qty) + delivery;
        } else if (o.status === 'retour') {
            returnCount++;
        }
    });

    const storeMargin = totalRevenue > 0 ? ((totalRevenue - totalCost) / totalRevenue) * 100 : 0;
    const storeReturnRate = (deliveredCount + returnCount) > 0
        ? (returnCount / (deliveredCount + returnCount)) * 100 : 0;
    const storeAOV = deliveredCount > 0 ? totalRevenue / deliveredCount : 0;

    const segment = getSegment(totalOrders);
    const benchDoc = await db.collection('market_benchmarks').doc(segment).get();

    if (!benchDoc.exists) {
        return {
            message: "Pas encore assez de données marché pour votre segment. Les benchmarks sont calculés chaque dimanche.",
            yourMetrics: { margin: storeMargin.toFixed(2), returnRate: storeReturnRate.toFixed(2), avgOrderValue: storeAOV.toFixed(2) }
        };
    }

    const bench = benchDoc.data();
    const result = { segment, segmentLabel: bench.segmentLabel, comparisons: {} };

    if (metricsArray.includes('margin')) {
        result.comparisons.margin = {
            yours: Number(storeMargin.toFixed(2)),
            marketMedian: bench.margin.p50,
            marketTop25: bench.margin.p75,
            status: storeMargin >= bench.margin.p75 ? '🌟 Top 25%' :
                    storeMargin >= bench.margin.p50 ? '📈 Au-dessus de la médiane' :
                    '📊 Sous la médiane'
        };
    }

    if (metricsArray.includes('return_rate') && bench.returnRate) {
        result.comparisons.returnRate = {
            yours: Number(storeReturnRate.toFixed(2)),
            marketMedian: bench.returnRate.p50,
            marketTop25: bench.returnRate.p25, // Lower is better for returns
            status: storeReturnRate <= bench.returnRate.p25 ? '🌟 Meilleur que 75% du marché' :
                    storeReturnRate <= bench.returnRate.p50 ? '📈 Sous la médiane (bien)' :
                    '⚠️ Au-dessus de la médiane'
        };
    }

    if (metricsArray.includes('avg_order_value') && bench.avgOrderValue) {
        result.comparisons.avgOrderValue = {
            yours: Number(storeAOV.toFixed(2)),
            marketMedian: bench.avgOrderValue.p50,
            marketTop25: bench.avgOrderValue.p75,
            status: storeAOV >= bench.avgOrderValue.p75 ? '🌟 Top 25%' :
                    storeAOV >= bench.avgOrderValue.p50 ? '📈 Au-dessus de la médiane' :
                    '📊 Sous la médiane'
        };
    }

    return result;
}

module.exports = {
    updateMarketBenchmarks,
    addBenchmarkContext,
    getMarketBenchmark,
    getSegment,
    percentile
};

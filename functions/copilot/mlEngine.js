/**
 * Beya3 Local ML Engine
 * Implémentations légères (zéro-dépendance) d'algorithmes prédictifs pour l'agent CTO/CFO.
 */

/**
 * 1. Détection d'anomalies financières (Z-Score)
 * Identifie les valeurs aberrantes (ventes trop basses ou trop hautes).
 * @param {Array<number>} data - Tableau de valeurs financières ou de quantités
 * @param {number} threshold - Z-score minimum pour être considéré comme anomalie (ex: 2.0 = 95% de certitude)
 * @returns {Array<{index: number, value: number, zScore: number}>} Les anomalies trouvées
 */
function detectOutliers(data, threshold = 2.0) {
    if (!data || data.length < 3) return [];

    const mean = data.reduce((sum, val) => sum + val, 0) / data.length;
    const variance = data.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / data.length;
    const stdDev = Math.sqrt(variance);

    if (stdDev === 0) return []; // Pas de variation

    const anomalies = [];
    data.forEach((val, i) => {
        const zScore = Math.abs((val - mean) / stdDev);
        if (zScore > threshold) {
            anomalies.push({ index: i, value: val, zScore });
        }
    });

    return anomalies;
}

/**
 * 2. Prédiction de séries temporelles (Moyenne mobile pondérée exponentielle - EMA)
 * Utilisée pour une prédiction locale rapide (ARIMA-like léger) du Run Rate et des stocks.
 * @param {Array<number>} series - Historique des ventes journalières
 * @param {number} daysAhead - Nombre de jours à prédire
 * @param {number} alpha - Poids de l'EMA (0.1 à 0.3 en général)
 * @returns {Array<number>} Prédictions pour les jours suivants
 */
function predictSalesEMA(series, daysAhead = 7, alpha = 0.3) {
    if (!series || series.length === 0) return Array(daysAhead).fill(0);
    
    // Calcul de l'EMA (Exponential Moving Average)
    let ema = series[0];
    for (let i = 1; i < series.length; i++) {
        ema = alpha * series[i] + (1 - alpha) * ema;
    }

    // Calcul de la tendance (Trend) sur les 7 derniers points
    const recent = series.slice(-7);
    let trend = 0;
    if (recent.length > 1) {
        let diffSum = 0;
        for (let i = 1; i < recent.length; i++) {
            diffSum += recent[i] - recent[i - 1];
        }
        trend = diffSum / (recent.length - 1);
    }

    // Atténuation de la tendance pour éviter des prédictions extrêmes
    const dampening = 0.8;
    
    const predictions = [];
    let lastPred = ema;
    let currentTrend = trend;

    for (let i = 0; i < daysAhead; i++) {
        lastPred += currentTrend;
        currentTrend *= dampening; // Dampened trend
        predictions.push(Math.max(0, lastPred)); // Pas de ventes négatives
    }

    return predictions;
}

/**
 * 3. Segmentation RFM simplifiée via K-Means (1D/3D simplifié)
 * Sépare les clients en N clusters basés sur une métrique (ex: Montant dépensé).
 * @param {Array<number>} data - Points de données (ex: totaux dépensés par client)
 * @param {number} k - Nombre de clusters
 * @returns {Array<Array<number>>} Les clusters générés
 */
function clusterCustomers1D(data, k = 3) {
    if (!data || data.length < k) return [data];

    // Initialisation naïve des centroïdes
    let centroids = data.slice(0, k).sort((a, b) => a - b);
    let clusters = Array.from({ length: k }, () => []);

    let iterations = 0;
    let changed = true;

    while (changed && iterations < 50) {
        changed = false;
        const newClusters = Array.from({ length: k }, () => []);

        // Assigner chaque point au centroïde le plus proche
        data.forEach(val => {
            let minDiff = Infinity;
            let closestIdx = 0;
            centroids.forEach((c, idx) => {
                const diff = Math.abs(val - c);
                if (diff < minDiff) {
                    minDiff = diff;
                    closestIdx = idx;
                }
            });
            newClusters[closestIdx].push(val);
        });

        // Calculer les nouveaux centroïdes
        const newCentroids = newClusters.map(cluster => {
            if (cluster.length === 0) return 0;
            return cluster.reduce((sum, val) => sum + val, 0) / cluster.length;
        });

        // Vérifier la convergence
        for (let i = 0; i < k; i++) {
            if (Math.abs(centroids[i] - newCentroids[i]) > 0.1) {
                changed = true;
                break;
            }
        }

        centroids = newCentroids;
        clusters = newClusters;
        iterations++;
    }

    return clusters;
}

module.exports = {
    detectOutliers,
    predictSalesEMA,
    clusterCustomers1D
};

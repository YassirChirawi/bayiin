const { getFirestore, FieldValue } = require('firebase-admin/firestore');
const { calculateNetProfit, detectFinancialAnomalies, predictStockRunout } = require('./financialEngine');

const getDb = () => getFirestore('comsaas');

/**
 * Génère le brief quotidien pour un store.
 */
async function generateDailyBrief(storeId) {
    const db = getDb();
    const now = new Date();
    
    // Yesterday boundaries
    const yesterdayStart = new Date(now);
    yesterdayStart.setDate(yesterdayStart.getDate() - 1);
    yesterdayStart.setHours(0,0,0,0);
    
    const yesterdayEnd = new Date(yesterdayStart);
    yesterdayEnd.setHours(23,59,59,999);

    // 1. Performance de la veille
    const yesterdayPerf = await calculateNetProfit(storeId, yesterdayStart.toISOString(), yesterdayEnd.toISOString());

    // 2. Anomalies & Stocks (Priorités du jour)
    const anomalies = await detectFinancialAnomalies(storeId);
    const stockStatus = await predictStockRunout(storeId, 30, 7);
    
    const today_priorities = [];
    if (anomalies.ghostOrders.length > 0) {
        today_priorities.push(`${anomalies.ghostOrders.length} commandes en transit depuis plus de 10 jours.`);
    }
    if (anomalies.negativeMargins.length > 0) {
        today_priorities.push(`🚨 ${anomalies.negativeMargins.length} ventes à marge négative détectées.`);
    }
    if (stockStatus.critical.length > 0) {
        today_priorities.push(`Stock critique : ${stockStatus.critical.length} produits en rupture d'ici 3 jours.`);
    }

    // 3. Quick wins
    const quick_wins = [];
    // Here we could add logic to find unremitted money
    
    return {
        yesterday_performance: {
            revenue: yesterdayPerf.grossRevenue,
            profit: yesterdayPerf.netProfit,
            orders: yesterdayPerf.ordersCount,
            returns: yesterdayPerf.returnImpact
        },
        today_priorities,
        quick_wins,
        beya3_tip: "Surveillez vos taux de confirmation sur WhatsApp pour les nouvelles commandes."
    };
}

/**
 * Délivre un insight planifié au store
 */
async function deliverInsight(storeId, contentObj, channel = 'dashboard', type = 'daily_brief', priority = 'medium', customTextContent = null) {
    const db = getDb();
    
    let textContent = customTextContent || '';
    if (!customTextContent && type === 'daily_brief') {
        textContent = `📊 Résumé de la veille : ${contentObj.yesterday_performance.revenue} MAD de CA (${contentObj.yesterday_performance.orders} commandes). Profit net : ${contentObj.yesterday_performance.profit} MAD.`;
    }

    const docRef = db.collection(`stores/${storeId}/beya3_scheduled_insights`).doc();
    await docRef.set({
        type,
        scheduledFor: FieldValue.serverTimestamp(),
        deliveredAt: FieldValue.serverTimestamp(),
        deliveryChannel: channel,
        content: textContent,
        data: contentObj,
        priority,
        isRead: false,
        isDismissed: false,
        userFeedback: null
    });
}

/**
 * Scanner d'anomalies (Toutes les heures via Scheduler)
 */
async function runAnomalyScanner(storeId) {
    const anomalies = await detectFinancialAnomalies(storeId);
    if (anomalies.hasAnomalies) {
        let contentObj = {
            summary: anomalies.summary,
            ghostOrders: anomalies.ghostOrders.length,
            negativeMargins: anomalies.negativeMargins.length
        };
        
        let textContent = `⚠️ J'ai détecté des anomalies nécessitant ton attention :\n\n`;
        if (anomalies.negativeMargins.length > 0) {
            textContent += `- ${anomalies.negativeMargins.length} commandes ont une marge négative (tu perds de l'argent).\n`;
        }
        if (anomalies.ghostOrders.length > 0) {
            textContent += `- ${anomalies.ghostOrders.length} commandes "fantômes" sont en transit depuis plus de 10 jours.\n`;
        }
        textContent += `\nJe t'ai préparé des actions correctives.`;
        
        await deliverInsight(storeId, contentObj, 'copilot_timeline', 'anomaly_alert', 'high', textContent);

        // PHASE 2: Autonomous Action Layer - Create draft automatically
        if (anomalies.ghostOrders.length > 0) {
            const db = getDb();
            const draftRef = db.collection(`stores/${storeId}/action_drafts`).doc();
            await draftRef.set({
                toolName: 'bulk_update_orders',
                toolArgs: {
                    orderIds: anomalies.ghostOrders,
                    newStatus: 'retour' // Supposer un retour si bloqué en transit > 10j
                },
                status: 'pending_approval',
                source: 'autonomous_monitoring',
                createdAt: FieldValue.serverTimestamp()
            });
        }
    }
}

module.exports = {
    generateDailyBrief,
    deliverInsight,
    runAnomalyScanner
};

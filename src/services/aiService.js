const COPILOT_URL = import.meta.env.VITE_COPILOT_URL || 
  "http://localhost:5001/bayiin/us-central1/copilotChat";

/**
 * Generic AI Response Generator
 * Used by other services for specific prompts
 */
export async function generateAIResponse(prompt) {
  return await generateCopilotResponse([{ role: "user", content: prompt }]);
}

export async function generateCopilotResponse(
  messages,
  businessContext = null,
  storeName = "BayIIn Store",
  onChunk = null
) {
  try {
    const response = await fetch(COPILOT_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages, businessContext, storeName })
    });

    if (!response.ok) throw new Error("Copilot function error");

    // Streaming reader
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let fullText = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const lines = decoder.decode(value).split("\n");
      for (const line of lines) {
        if (line.startsWith("data: ") && line !== "data: [DONE]") {
          try {
            const data = JSON.parse(line.slice(6));
            if (data.delta) {
              fullText += data.delta;
              onChunk?.(fullText);
            }
          } catch (e) {
            console.warn("Error parsing stream chunk:", e);
          }
        }
      }
    }

    return fullText;
  } catch (error) {
    console.error("Copilot AI Error:", error);
    throw error;
  }
}

/**
 * Marketing: generateAdsCopy
 */
export async function generateAdsCopy(productName) {
  const prompt = `Génère 3 textes publicitaires (Ads Copy) percutants pour Meta/Instagram pour le produit: ${productName}. 
  Chaque texte doit avoir un angle différent (émotionnel, bénéfice direct, urgence).
  Utilise des emojis et garde un ton professionnel mais engageant en français.`;
  return await generateAIResponse(prompt);
}

/**
 * Automations: generateWhatsAppTemplate
 */
export async function generateWhatsAppTemplate(userPrompt, language = 'fr') {
  const prompt = `Rédige un modèle de message WhatsApp court et professionnel pour une boutique en ligne.
  Contexte de l'utilisateur: ${userPrompt}
  Langue: ${language}
  Utilise des placeholders comme {name}, {product}, {total} si nécessaire. 
  Réponds UNIQUEMENT avec le texte du message.`;
  return await generateAIResponse(prompt);
}

/**
 * Dashboard: generateStockForecast
 */
export async function generateStockForecast(products, orders) {
  const prompt = `Analyses les produits et commandes suivants pour prédire les ruptures de stock (Run Rate).
  Produits: ${JSON.stringify(products.slice(0, 10).map(p => ({ sku: p.sku, name: p.name, stock: p.stock })))}
  Commandes récentes: ${JSON.stringify(orders.slice(0, 20).map(o => ({ sku: o.sku, date: o.date })))}

  Retourne UNIQUEMENT un tableau JSON d'objets avec:
  - sku: le SKU du produit
  - urgency: 'Haut' ou 'Moyen'
  - rationale: une phrase expliquant pourquoi (ex: "Ventes en hausse de 20% cette semaine")
  - suggestedQuantity: nombre suggéré à commander

  Format: [{"sku": "...", "urgency": "...", "rationale": "...", "suggestedQuantity": 10}]`;

  const response = await generateAIResponse(prompt);
  try {
    const jsonMatch = response.match(/\[.*\]/s);
    return JSON.parse(jsonMatch ? jsonMatch[0] : response);
  } catch (e) {
    console.error("Failed to parse forecast JSON:", e);
    return [];
  }
}

/**
 * Finances: generateFinancialInsight
 */
export async function generateFinancialInsight(stats) {
  const prompt = `Tu es un CFO expert. Analyse ces indicateurs financiers d'une boutique e-commerce :
  Revenu: ${stats.deliveredRevenue} MAD
  Profit Net: ${stats.netResult} MAD
  Marge: ${stats.margin}%
  ROAS: ${stats.roas}
  CAC: ${stats.cac} MAD
  
  Donne 3 points d'analyse clairs et des recommandations concrètes pour améliorer la rentabilité.
  Sois précis, professionnel et direct (en français).`;
  return await generateAIResponse(prompt);
}

/**
 * Finances: analyzeFinancialScenario (CFO Simulator)
 */
export async function analyzeFinancialScenario(currentStats, scenario, projections) {
  const prompt = `Analyse ce scénario de simulation financière (What-If) pour une boutique e-commerce.
  Données actuelles: ${JSON.stringify(currentStats)}
  Changements appliqués: Ads(${scenario.adSpend}%), Prix(${scenario.price}%), COGS(${scenario.cogs}%)
  Projections résultantes: Revenu(${projections.revenue}), Profit(${projections.profit}), Marge(${projections.margin}%)
  
  Explique la viabilité, les risques et les opportunités de ce scénario en 3 paragraphes courts.
  Sois critique (détecte si les projections sont irréalistes) et constructif.`;
  return await generateAIResponse(prompt);
}

/**
 * Rules-based AI Utilities (No API call needed)
 */

// Algorithme de Scoring (Anti-Retour) - Rules-based
export const evaluateOrderRisk = (order) => {
    let score = 0;
    let reasons = [];

    if (order.total > 1000) {
        score += 20;
        reasons.push("Montant élevé (> 1000 DH)");
    }

    if (!order.address || order.address.length < 10) {
        score += 30;
        reasons.push("Adresse courte ou incomplète");
    }

    if (["Casablanca", "Rabat"].includes(order.city)) {
        score -= 10;
    } else {
        score += 10;
        reasons.push("Zone éloignée");
    }

    let riskLevel = "Faible";
    if (score > 50) riskLevel = "Élevé";
    else if (score > 20) riskLevel = "Moyen";

    return { score, riskLevel, reasons };
};

/**
 * AI Guardian - Leak Detection
 * Scans orders for financial anomalies:
 * 1. Ghost Orders: Delivered > 15 days ago but NOT Paid.
 * 2. Negative Margin: (Cost + Delivery + CAC) > Price.
 */
export const detectFinancialLeaks = (orders, cac = 0) => {
    const ghostOrders = [];
    const negativeMargins = [];
    const now = new Date();
    const fifteenDaysAgo = new Date(now.setDate(now.getDate() - 15));

    orders.forEach(order => {
        // 1. Ghost Order Check
        if (order.status === 'livré' && (!order.isPaid || order.isPaid === "false")) {
            const deliveryDate = order.deliveryDate ? new Date(order.deliveryDate) : (order.date ? new Date(order.date) : null);
            if (deliveryDate && deliveryDate < fifteenDaysAgo) {
                ghostOrders.push({
                    id: order.id,
                    reference: order.orderNumber || order.id.substring(0, 6),
                    amount: parseFloat(order.price) * (parseInt(order.quantity) || 1),
                    date: order.date
                });
            }
        }

        // 2. Negative Margin Check
        const price = parseFloat(order.price) * (parseInt(order.quantity) || 1);
        const cost = parseFloat(order.costPrice) * (parseInt(order.quantity) || 1);
        const delivery = parseFloat(order.realDeliveryCost || 0);
        const globalCAC = parseFloat(cac);
        const totalCost = cost + delivery + globalCAC;

        if (totalCost > price) {
            negativeMargins.push({
                id: order.id,
                reference: order.orderNumber || order.id.substring(0, 6),
                loss: (totalCost - price).toFixed(2),
                details: `Prix: ${price}, Coût: ${cost}, Livr: ${delivery}, CAC: ${globalCAC}`
            });
        }
    });

    return {
        hasLeaks: ghostOrders.length > 0 || negativeMargins.length > 0,
        ghostOrders,
        negativeMargins,
        summary: `Détection terminée : ${ghostOrders.length} commandes fantômes et ${negativeMargins.length} marges négatives.`
    };
};


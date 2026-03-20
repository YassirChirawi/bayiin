// src/services/aiService.js
import { GoogleGenerativeAI } from "@google/generative-ai";
import { SYSTEM_PERSONA_INSTRUCTIONS, SHIPPING_INFO, SALES_SCRIPTS, FAQ, GROWTH_MODULES } from './knowledge.js';

// Initialize Gemini API
let genAI = null;
let model = null;

export const initializeAI = (apiKey) => {
    if (!apiKey) return;
    try {
        genAI = new GoogleGenerativeAI(apiKey);
        // gemini-1.5-flash: available on free tier (use gemini-2.0-flash if on paid plan)
        model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-lite" });
    } catch (error) {
        console.error("Failed to initialize AI:", error);
    }
};

// Lite RAG: Construct context from knowledge base
const constructContext = (userMsg) => {
    let context = "";
    const lowerMsg = userMsg.toLowerCase();

    if (lowerMsg.includes("livraison") || lowerMsg.includes("frais") || lowerMsg.includes("expédition")) {
        context += `\n[INFO LOGISTIQUE]: ${JSON.stringify(SHIPPING_INFO)}`;
    }

    if (lowerMsg.includes("client") || lowerMsg.includes("message") || lowerMsg.includes("sms") || lowerMsg.includes("whatsapp")) {
        context += `\n[SCRIPTS DE VENTE]: ${JSON.stringify(SALES_SCRIPTS)}`;
    }

    if (lowerMsg.includes("roas") || lowerMsg.includes("pub") || lowerMsg.includes("facebook") || lowerMsg.includes("instagram")) {
        context += `\n[MODULE GROWTH]: ${GROWTH_MODULES.META_ADS}`;
    }

    FAQ.forEach(item => {
        if (lowerMsg.includes(item.q.toLowerCase()) || lowerMsg.includes(item.a.toLowerCase())) {
            context += `\n[FAQ SIMILAIRE]: Q: ${item.q} R: ${item.a}`;
        }
    });

    return context;
};

/**
 * Core AI call. Throws on API errors so callers handle them properly.
 * - Returns a friendly message if no model is initialized.
 * - Throws an Error with isRateLimit=true on 429, with a user-readable message.
 * - Re-throws other errors (do NOT return error strings — callers that JSON.parse() would crash).
 */
export const generateAIResponse = async (prompt) => {
    if (!model) {
        return "Oups ! Je n'ai pas encore ma clé API pour réfléchir. 🗝️ Peux-tu la configurer dans les paramètres ? (Tu peux la trouver sur Google AI Studio)";
    }

    try {
        const result = await model.generateContent(prompt);
        const response = await result.response;
        return response.text();
    } catch (error) {
        console.error("Gemini Error:", error);
        // 429 — rate limit exceeded: surface a specific, friendly message
        if (error?.message?.includes('429') || error?.status === 429) {
            const retryMatch = error.message?.match(/(\d+)s/);
            const retryIn = retryMatch ? ` Réessaie dans ${retryMatch[1]}s.` : '';
            const friendly = `⏳ Quota API dépassé.${retryIn} (Limite du plan gratuit Gemini atteinte)`;
            throw Object.assign(new Error(friendly), { isRateLimit: true });
        }
        // Re-throw other errors — callers that JSON.parse() the result have their own catch blocks
        throw error;
    }
};

/**
 * Main Copilot Function
 */
export const generateCopilotResponse = async (msg, history = [], productContext = null) => {
    let fullPrompt = `${SYSTEM_PERSONA_INSTRUCTIONS}\n`;

    const knowledgeContext = constructContext(msg);
    if (knowledgeContext) {
        fullPrompt += `\nUTILISE CES INFORMATIONS SI PERTIENT:\n${knowledgeContext}\n`;
    }

    if (productContext && productContext.length > 0) {
        const snippet = productContext.slice(0, 10).map(p => `${p.name} (${p.price} DH)`).join(", ");
        fullPrompt += `\n[CONTEXTE PRODUITS (Magasin)]:\nVoici quelques produits: ${snippet}...\n`;
    }

    fullPrompt += `
    [CAPACITÉS D'ACTION]:
    Tu peux créer des commandes si l'utilisateur te le demande explicitement avec les détails (Nom, Tel, Ville, Produit, Prix).
    Si tu as toutes les infos, génère un bloc JSON unique à la fin de ta réponse (invisible pour l'utilisateur) sous ce format :
    
    \`\`\`json
    {
      "action": "CREATE_ORDER",
      "data": {
        "clientName": "Nom Client",
        "clientPhone": "06XXXXXXXX",
        "clientCity": "Ville",
        "clientAddress": "Adresse (ou Ville par défaut)",
        "articleName": "Nom Produit",
        "price": 123,
        "quantity": 1,
        "note": "Mentionne si c'est pour Sendit ou une info spéciale"
      }
    }
    \`\`\`

    Règle pour la note :
    - Si l'utilisateur mentionne "Sendit", commence la note par "Via Sendit".
    - Sinon, utilise le format standard.
    `;

    const recentHistory = history.slice(-5);
    if (recentHistory.length > 0) {
        fullPrompt += `\n[HISTORIQUE RECENT]:\n${recentHistory.map(m => `${m.role === 'user' ? 'Utilisateur' : 'Beya3'}: ${m.content}`).join("\n")}\n`;
    }

    fullPrompt += `\nUtilisateur: ${msg}\nBeya3:`;

    try {
        return await generateAIResponse(fullPrompt);
    } catch (error) {
        return error.message || "Une erreur est survenue avec l'IA. Vérifie ta clé API dans les paramètres.";
    }
};

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

export const generateFinancialInsight = async (stats) => {
    const prompt = `
    Agis comme Beya3, Head of Growth. Analyse ces chiffres financiers pour la période sélectionnée :
    - Chiffre d'affaires Livré : ${stats.deliveredRevenue} DH
    - Chiffre d'affaires Encaissé : ${stats.realizedRevenue} DH
    - Dépenses Totales : ${stats.totalExpenses} DH
    - Marge Nette : ${stats.margin}%
    - ROAS : ${stats.roas}
    - CAC : ${stats.cac} DH
    
    Donne-moi 3 points clés (Top, Flop, Opportunité) et un conseil actionnable pour améliorer la rentabilité. Sois bref et percutant.
    `;

    try {
        return await generateAIResponse(prompt);
    } catch (error) {
        return error.message || "Erreur analyse financière.";
    }
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

/**
 * Analyzes a financial scenario from the CFO Simulator
 */
export const analyzeFinancialScenario = async (baseStats, scenario, projections) => {
    const prompt = `
    Agis comme un Directeur Financier (CFO) expert pour un E-commerce. Analyse ce scénario simulé :
    
    SCÉNARIO:
    - Budget Pub: ${scenario.adSpend > 0 ? '+' : ''}${scenario.adSpend}%
    - Prix de Vente: ${scenario.price > 0 ? '+' : ''}${scenario.price}%
    - Coût Produit (COGS): ${scenario.cogs > 0 ? '+' : ''}${scenario.cogs}%

    RÉSULTATS PROJETÉS:
    - Chiffre d'affaires: ${projections.revenue.toFixed(0)} DH (vs ${baseStats.realizedRevenue} DH)
    - Profit Net: ${projections.profit.toFixed(0)} DH (vs ${baseStats.netResult} DH)
    - Marge Nette: ${projections.margin.toFixed(1)}% (vs ${baseStats.margin}%)

    TA MISSION:
    1. Donne un verdict immédiat (Risqué, Rentable, ou Prudent).
    2. Explique pourquoi en 1 phrase simple.
    3. Donne un conseil stratégique pour sécuriser ce plan.

    Réponds en français, ton amical et professionnel (style Beya3).
    `;

    try {
        return await generateAIResponse(prompt);
    } catch (error) {
        return error.message || "Erreur simulation CFO.";
    }
};

/**
 * Generates a custom WhatsApp message template using AI based on user instructions.
 */
export const generateWhatsAppTemplate = async (instructions, language = 'fr') => {
    const langInstructions = language === 'darija'
        ? "Réponds EXCLUSIVEMENT en Darija marocaine (en caractères latins/français)."
        : "Réponds EXCLUSIVEMENT en Français professionnel et chaleureux.";

    const prompt = `
    Tu es un expert en e-commerce et relation client. Ton but est d'écrire UN SEUL message WhatsApp parfait pour une automatisation.

    INSTRUCTIONS DU CLIENT: "${instructions}"

    CONSIGNES STRICTES:
    1. ${langInstructions}
    2. Utilise les variables dynamiques suivantes là où c'est pertinent :
       - {name} : Nom du client
       - {product} : Nom du produit acheté
       - {city} : Ville de livraison
       - {total} : Montant de la commande
       - {payment_method} : Méthode de paiement
       - {store_name} : Nom de la boutique (pour signer le message)
       - {tracking} : Lien de suivi de livraison (si pertinent)
    3. Le message doit être direct, clair, utiliser quelques emojis, et prêt à être envoyé.
    4. Retourne UNIQUEMENT le texte du message, sans guillemets, sans commentaires avant ou après. Ne dis pas "Voici le message", donne juste le message.
    `;

    try {
        return await generateAIResponse(prompt);
    } catch (error) {
        return error.message || "Erreur génération message WhatsApp.";
    }
};

/**
 * AI ProductAdvisor — suggest complementary products based on parameters.
 */
export const suggestComplementaryProducts = async (sku, productList = [], storeName = "notre boutique") => {
    const names = productList.slice(0, 15).map(p => `${p.sku || '?'} — ${p.name}`).join('\n');
    const prompt = `
Tu es un expert de vente pour ${storeName}. Analysez l'article "${sku}" et suggère les produits complémentaires parmi cette liste pour créer une offre complète pour le client :
${names}

Réponds en 3 bullet points maximum, en français, en citant les références et les bénéfices de l'association.
`;
    try {
        return await generateAIResponse(prompt);
    } catch (error) {
        return error.message || "Erreur suggestion produits.";
    }
};

/**
 * AI Stock Forecasting — predict critical ruptures based on run rate.
 * @returns {Promise<Object[]>} array of {sku, rationale, suggestedQuantity, urgency}
 */
export const generateStockForecast = async (products = [], orders = [], storeName = "la boutique") => {
    const productsData = products.slice(0, 20).map(p => ({
        name: p.name,
        sku: p.sku,
        stock: p.stock,
        min: p.min_stock_alert || 5
    }));

    const prompt = `
        Rôle : Expert Logistique de ${storeName}.
        Données : ${JSON.stringify(productsData)}
        Analyse les stocks et prédis les ruptures imminentes. 
        Format : JSON array uniquement [{sku, rationale, suggestedQuantity, urgency: 'Haut'|'Moyen'}].
        Sois court et pro.
    `;

    try {
        const text = await generateAIResponse(prompt);
        // Robustly extract the first JSON array from the response,
        // even if the model adds prose or markdown fences around it.
        const match = text.match(/(\[\s*\{[\s\S]*?\}\s*\])/m);
        if (!match) return [];
        return JSON.parse(match[1]);
    } catch (e) {
        console.error("Forecasting AI Error:", e);
        return [];
    }
};

/**
 * AI Ads Generator — Creates Meta/Instagram ad copies.
 */
export const generateAdsCopy = async (productName, targetAudience = "L'audience cible de BayIIn") => {
    const prompt = `Agis comme un expert Media Buyer Facebook/Instagram Ads. Rédige 3 textes publicitaires (Copywriting) ultra-performants pour vendre ce produit : "${productName}".
Cible : ${targetAudience}.
Chaque proposition doit contenir :
- Une phrase d'accroche irrésistible (Hook)
- Le corps du texte avec les bénéfices clés (Body)
- Un appel à l'action clair (CTA)
Utilise un langage persuasif, des émojis et un formatage aéré pour Meta/Instagram Ads. Ne dis pas bonjour ni au revoir, donne juste les textes.`;

    try {
        return await generateAIResponse(prompt);
    } catch (error) {
        return error.message || "Erreur génération publicité.";
    }
};

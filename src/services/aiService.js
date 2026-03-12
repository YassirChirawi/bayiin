// src/services/aiService.js
import { GoogleGenerativeAI } from "@google/generative-ai";
import { SYSTEM_PERSONA_INSTRUCTIONS, SHIPPING_INFO, SALES_SCRIPTS, FAQ, GROWTH_MODULES } from './knowledge.js';

// Initialize Gemini API
// NOTE: Ideally, the API key should be fetched from backend/server function to keep it secure.
// For this frontend implementation, we'll try to use an environment variable or a user-provided setting.
let genAI = null;
let model = null;

export const initializeAI = (apiKey) => {
    if (!apiKey) return;
    try {
        genAI = new GoogleGenerativeAI(apiKey);
        model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-001" });
    } catch (error) {
        console.error("Failed to initialize AI:", error);
    }
};

// Lite RAG: Construct context from knowledge base
const constructContext = (userMsg) => {
    let context = "";
    const lowerMsg = userMsg.toLowerCase();

    // Check for keywords to inject specific knowledge
    if (lowerMsg.includes("livraison") || lowerMsg.includes("frais") || lowerMsg.includes("expédition")) {
        context += `\n[INFO LOGISTIQUE]: ${JSON.stringify(SHIPPING_INFO)}`;
    }

    if (lowerMsg.includes("client") || lowerMsg.includes("message") || lowerMsg.includes("sms") || lowerMsg.includes("whatsapp")) {
        context += `\n[SCRIPTS DE VENTE]: ${JSON.stringify(SALES_SCRIPTS)}`;
    }

    if (lowerMsg.includes("roas") || lowerMsg.includes("pub") || lowerMsg.includes("facebook") || lowerMsg.includes("instagram")) {
        context += `\n[MODULE GROWTH]: ${GROWTH_MODULES.META_ADS}`;
    }

    // Add FAQ context if relevant (simple keyword match for now)
    FAQ.forEach(item => {
        if (lowerMsg.includes(item.q.toLowerCase()) || lowerMsg.includes(item.a.toLowerCase())) {
            context += `\n[FAQ SIMILAIRE]: Q: ${item.q} R: ${item.a}`;
        }
    });

    return context;
};

export const generateAIResponse = async (prompt) => {
    if (!model) {
        // Fallback if no API key is configured yet
        return "Oups ! Je n'ai pas encore ma clé API pour réfléchir. 🗝️ Peux-tu la configurer dans les paramètres ? (Tu peux la trouver sur Google AI Studio)";
    }

    try {
        const result = await model.generateContent(prompt);
        const response = await result.response;
        return response.text();
    } catch (error) {
        console.error("Gemini Error:", error);
        return `Aïe, j'ai un petit mal de tête... 🤕 (Erreur: ${error.message || error})`;
    }
};

/**
 * Main Copilot Function
 * @param {string} msg - User message
 * @param {Array} history - Previous chat history
 * @param {Object} productContext - Optional: List of products or store context
 */
export const generateCopilotResponse = async (msg, history = [], productContext = null) => {
    // 1. Build System Prompt with Persona
    let fullPrompt = `${SYSTEM_PERSONA_INSTRUCTIONS}\n`;

    // 2. Add Context (RAG-lite)
    const knowledgeContext = constructContext(msg);
    if (knowledgeContext) {
        fullPrompt += `\nUTILISE CES INFORMATIONS SI PERTIENT:\n${knowledgeContext}\n`;
    }

    // 3. Add Product Context if available
    if (productContext && productContext.length > 0) {
        const snippet = productContext.slice(0, 10).map(p => `${p.name} (${p.price} DH)`).join(", ");
        fullPrompt += `\n[CONTEXTE PRODUITS (Magasin)]:\nVoici quelques produits: ${snippet}...\n`;
    }

    // NEW: Action Capabilities
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

    // 4. Add Conversation History (Last 5 messages)
    const recentHistory = history.slice(-5);
    if (recentHistory.length > 0) {
        fullPrompt += `\n[HISTORIQUE RECENT]:\n${recentHistory.map(m => `${m.role === 'user' ? 'Utilisateur' : 'Beya3'}: ${m.content}`).join("\n")}\n`;
    }

    // 5. Add User Message
    fullPrompt += `\nUtilisateur: ${msg}\nBeya3:`;

    // 6. Call API
    return await generateAIResponse(fullPrompt);
};

// Algorithme de Scoring (Anti-Retour) - Rules-based for now, could be AI-enhanced later
export const evaluateOrderRisk = (order) => {
    let score = 0;
    let reasons = [];

    // Rule 1: High Value
    if (order.total > 1000) {
        score += 20;
        reasons.push("Montant élevé (> 1000 DH)");
    }

    // Rule 2: Incomplete Address (heuristic)
    if (!order.address || order.address.length < 10) {
        score += 30;
        reasons.push("Adresse courte ou incomplète");
    }

    // Rule 3: City Check (Example: Specific cities might have higher return rates - hypothetical)
    if (["Casablanca", "Rabat"].includes(order.city)) {
        // usually safer, maybe minus risk?
        score -= 10;
    } else {
        // remote areas might have higher risk
        score += 10;
        reasons.push("Zone éloignée");
    }

    let riskLevel = "Faible";
    if (score > 50) riskLevel = "Élevé";
    else if (score > 20) riskLevel = "Moyen";

    return { score, riskLevel, reasons };
};

export const generateFinancialInsight = async (stats) => {
    // Construct a prompt summarizing the stats
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

    return await generateAIResponse(prompt);
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
            // Fallback: note that 'date' is usually order creation date. If no delivery date, we assume delivery happened reasonably after creation?
            // Strict check: if creation date > 15 days ago and status is Delivered, it's likely a ghost if not paid.
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
        const delivery = parseFloat(order.realDeliveryCost || 0); // Only real cost
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
 * @param {object} baseStats - Current actual stats
 * @param {object} scenario - Slider values {adSpend, price, cogs}
 * @param {object} projections - Projected stats {revenue, profit, margin}
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

    return await generateAIResponse(prompt);
};

/**
 * Generates a custom WhatsApp message template using AI based on user instructions.
 * @param {string} instructions - The user's prompt (e.g. "Un message de relance poli")
 * @param {string} language - 'fr' or 'darija'
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

    return await generateAIResponse(prompt);
};

/**
 * AI ProductAdvisor — suggest complementary KUO'S products based on SKU line code.
 * @param {string} sku  e.g. "DSVP001"
 * @param {Object[]} productList  Products with name and sku
 * @returns {Promise<string>} AI rationale text
 */
export const suggestComplementaryProducts = async (sku, productList = []) => {
    const names = productList.slice(0, 15).map(p => `${p.sku || '?'} — ${p.name}`).join('\n');
    const prompt = `
Tu es un expert en cosmétique KUO'S. Analysez le SKU "${sku}" et suggère les produits complémentaires parmi cette liste pour créer une routine beauté complète pour le client :
${names}

Réponds en 3 bullet points maximum, en français, en citant les SKU et les bénéfices pour la peau.
`;
    return await generateAIResponse(prompt);
};

/**
 * AI Stock Forecasting — predict critical ruptures based on run rate.
 * @param {Object[]} products 
 * @param {Object[]} orders 
 * @returns {Promise<Object[]>} array of {sku, rationale, suggestedQuantity, urgency}
 */
export const generateStockForecast = async (products = [], orders = []) => {
    const productsData = products.slice(0, 20).map(p => ({
        name: p.name,
        sku: p.sku,
        stock: p.stock,
        min: p.min_stock_alert || 5
    }));

    const prompt = `
        Rôle : Expert Logistique BayIIn (KUO'S Maroc).
        Données : ${JSON.stringify(productsData)}
        Analyse les stocks et prédis les ruptures imminentes. 
        Format : JSON array uniquement [{sku, rationale, suggestedQuantity, urgency: 'Haut'|'Moyen'}].
        Sois court et pro.
    `;

    try {
        const text = await generateAIResponse(prompt);
        const jsonStr = text.replace(/```json|```/g, '').trim();
        return JSON.parse(jsonStr);
    } catch (e) {
        console.error("Forecasting AI Error:", e);
        return [];
    }
};

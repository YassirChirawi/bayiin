const Groq = require("groq-sdk");

const AGENT_SPECIALIZATIONS = {
  cfo: {
    name: "Beya3 CFO",
    tools: ['analyze_profit', 'get_cashflow_status', 'compare_periods', 'detect_anomalies', 'get_market_benchmark'],
    systemPrompt: "Tu es Beya3 CFO, spécialisé en finance. Sois précis et donne des données exactes uniquement.",
    temperature: 0.1
  },
  coo: {
    name: "Beya3 COO",
    tools: ['get_orders_status', 'bulk_update_orders', 'get_inventory_intelligence', 'predict_stock_runout'],
    systemPrompt: "Tu es Beya3 COO, spécialisé en opérations. Efficacité et rapidité avant tout.",
    temperature: 0.2
  },
  cmo: {
    name: "Beya3 CMO",
    tools: ['analyze_customers', 'analyze_return_patterns', 'send_whatsapp_campaign', 'get_market_benchmark'],
    systemPrompt: "Tu es Beya3 CMO, spécialisé en croissance. Focalise-toi sur la conversion et la fidélisation.",
    temperature: 0.4
  },
  cto: {
    name: "Beya3 CTO",
    tools: ['get_inventory_intelligence', 'predict_stock_runout', 'detect_anomalies', 'draft_purchase_order'],
    systemPrompt: "Tu es Beya3 CTO, spécialisé en prédictions et gestion avancée des stocks.",
    temperature: 0.1
  }
};

/**
 * Route une question vers le bon agent spécialisé.
 */
async function routeToAgent(userMessage, groqApiKey) {
  const groq = new Groq({ apiKey: groqApiKey });
  try {
      const classification = await groq.chat.completions.create({
        model: "llama-3.1-8b-instant",
        messages: [{
          role: "user",
          content: `Classifie cette question en: cfo, coo, cmo, cto ou multi (si elle touche à plusieurs domaines ou aucun en particulier).
          Question: "${userMessage}"
          Réponds avec un seul mot strictement parmi la liste.`
        }],
        max_tokens: 10,
        temperature: 0
      });
    
      const agentType = classification.choices[0]?.message?.content?.trim()?.toLowerCase();
      
      if (['cfo', 'coo', 'cmo', 'cto'].includes(agentType)) {
          return AGENT_SPECIALIZATIONS[agentType];
      }
      return null; // multi / default
  } catch (err) {
      console.error("[MultiAgent] Routing failed, falling back to general agent:", err);
      return null;
  }
}

module.exports = {
    AGENT_SPECIALIZATIONS,
    routeToAgent
};

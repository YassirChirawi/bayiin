/**
 * Beya3 — Parseur de fallback "action JSON dans le texte".
 *
 * Certains modèles répondent avec un JSON { "action": "...", "data": {...} } au lieu
 * d'un tool_call natif. Ce parseur le récupère MAIS n'autorise QUE des outils en
 * LECTURE SEULE — les actions mutantes (dépenses, maj commandes, campagnes) ne peuvent
 * jamais être déclenchées depuis du texte parsé (défense anti-injection, BAY-88/96).
 *
 * Module pur (aucune dépendance) → testable en isolation.
 */

const FALLBACK_ALLOWED_TOOLS = new Set([
  "analyze_profit",
  "get_cashflow_status",
  "get_inventory_intelligence",
  "detect_anomalies",
  "predict_stock_runout",
  "get_market_benchmark",
  "query_knowledge_graph",
  "get_customer_list",
  "assess_order_risk",
]);

/**
 * @param {string} content        Texte brut renvoyé par le modèle.
 * @param {Set<string>} allowed   Allow-list d'outils lecture seule.
 * @returns {{id:string, function:{name:string, arguments:string}}|null}
 */
function parseTextFallbackTool(content, allowed = FALLBACK_ALLOWED_TOOLS) {
  if (!content || typeof content !== "string") return null;
  const m = content.match(/\{\s*"action"\s*:\s*"([^"]+)"\s*,\s*"data"\s*:\s*(\{.*\})\s*\}/i);
  if (!m) return null;

  let name = m[1];
  if (name.toLowerCase() === "analyze_finances") name = "analyze_profit"; // alias hérité

  if (!allowed.has(name)) return null; // outil non-lecture → refusé

  return { id: "call_fallback_" + Date.now(), function: { name, arguments: m[2] } };
}

module.exports = { parseTextFallbackTool, FALLBACK_ALLOWED_TOOLS };

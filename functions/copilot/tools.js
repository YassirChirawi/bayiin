/**
 * Liste des Outils (Tools) pour l'Agent Copilot Beya3.
 * Utilisé pour le Function Calling de Groq.
 */

const BEYA3_TOOLS = [
    // ── ANALYSE FINANCIÈRE ──────────────────────────
    {
      type: "function",
      function: {
        name: "analyze_profit",
        description: "Calcule le profit net exact sur une période donnée. À utiliser pour toute question sur les gains, revenus, marges, bénéfices.",
        parameters: {
          type: "object",
          properties: {
            period: {
              type: "string",
              enum: ["today", "yesterday", "this_week", "last_week", "this_month", "last_month", "custom"],
              description: "Période d'analyse"
            },
            startDate: { type: "string", description: "YYYY-MM-DD si period=custom" },
            endDate: { type: "string", description: "YYYY-MM-DD si period=custom" },
            breakdown: {
              type: "string",
              enum: ["total", "by_product", "by_city", "by_day"],
              description: "Niveau de détail souhaité"
            }
          },
          required: ["period"]
        }
      }
    },
  
    {
      type: "function",
      function: {
        name: "get_cashflow_status",
        description: "Retourne l'état de la trésorerie : argent en transit chez les livreurs, argent encaissé, argent dû.",
        parameters: {
          type: "object",
          properties: {
            carrier: {
              type: "string",
              enum: ["all", "sendit", "olivraison", "internal"],
              description: "Filtrer par transporteur"
            }
          }
        }
      }
    },
  
    {
      type: "function",
      function: {
        name: "get_inventory_intelligence",
        description: "Analyse de l'inventaire : valeur totale, produits à risque de rupture, FEFO alerts, recommandations de réapprovisionnement.",
        parameters: {
          type: "object",
          properties: {
            focus: {
              type: "string",
              enum: ["all", "low_stock", "out_of_stock", "expiring_soon", "slow_movers", "fast_movers"]
            },
            daysThreshold: { type: "number", description: "Jours avant rupture pour considérer comme risque" }
          }
        }
      }
    },
  
    // ── OPÉRATIONS ──────────────────────────────────
    {
      type: "function",
      function: {
        name: "detect_anomalies",
        description: "Détecte les anomalies financières et opérationnelles : commandes fantômes, marges négatives, dépenses anormales.",
        parameters: {
          type: "object",
          properties: {
            type: {
              type: "string",
              enum: ["all", "ghost_orders", "negative_margins", "unusual_expenses", "suspicious_returns"]
            }
          }
        }
      }
    },
  
    {
      type: "function",
      function: {
        name: "predict_stock_runout",
        description: "Prédit quand chaque produit sera en rupture de stock selon le rythme de vente actuel.",
        parameters: {
          type: "object",
          properties: {
            daysLookAhead: { type: "number" },
            urgencyThreshold: { type: "number", description: "Jours restants pour considérer comme urgent" }
          }
        }
      }
    },
  
    // ── ACTIONS (nécessitent confirmation) ──────────
    {
      type: "function",
      function: {
        name: "draft_expense",
        description: "Prépare un brouillon de dépense à confirmer par le marchand. Ne crée pas directement.",
        parameters: {
          type: "object",
          properties: {
            amount: { type: "number" },
            label: { type: "string" },
            category: {
              type: "string",
              enum: ["ads", "packaging", "shipping", "salary", "rent", "tools", "other"]
            },
            platform: { type: "string" }
          },
          required: ["amount", "label", "category"]
        }
      }
    },
  
    {
      type: "function",
      function: {
        name: "bulk_update_orders",
        description: "Met à jour le statut de plusieurs commandes en même temps. Nécessite confirmation obligatoire.",
        parameters: {
          type: "object",
          properties: {
            orderIds: { type: "array", items: { type: "string" } },
            newStatus: { type: "string" },
            reason: { type: "string" }
          },
          required: ["orderIds", "newStatus"]
        }
      }
    },
  
    // ── MÉMOIRE & PERSONNALISATION ───────────────────
    {
      type: "function",
      function: {
        name: "store_memory",
        description: "Mémorise une information importante sur le marchand ou son business pour les prochaines conversations.",
        parameters: {
          type: "object",
          properties: {
            type: { type: "string", enum: ["fact", "preference", "goal", "alert_rule"] },
            content: { type: "string" },
            category: { type: "string" }
          },
          required: ["type", "content"]
        }
      }
    }
  ];
  
  module.exports = { BEYA3_TOOLS };

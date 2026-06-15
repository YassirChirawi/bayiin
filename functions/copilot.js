const functions = require("firebase-functions");
const Groq = require("groq-sdk");
const cors = require('cors')({
    origin: (origin, callback) => {
        const ALLOWED = [
            'https://bayiin.shop',
            'https://app.bayiin.shop',
            'https://commerce-saas-62f32.web.app',
            'https://commerce-saas-62f32.firebaseapp.com',
        ];
        // Allow server-to-server calls (no origin) and whitelisted origins
        if (!origin || ALLOWED.includes(origin)) {
            callback(null, true);
        } else {
            console.warn(`[SEC] CORS blocked origin: ${origin}`);
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
});
const { getAuth } = require("firebase-admin/auth");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");

// Import Copilot modules
const { BEYA3_TOOLS } = require("./copilot/tools");
const { 
    calculateNetProfit, 
    getPendingCashflow, 
    getInventoryValue, 
    predictStockRunout, 
    detectFinancialAnomalies,
    getCustomerList
} = require("./copilot/financialEngine");
const { 
    storeMemory, 
    retrieveMemories, 
    extractAndStoreMemories, 
    buildSystemPrompt,
    updateMerchantProfile,
    getMerchantProfile,
    setExplicitPreference
} = require("./copilot/memoryService");
const { queryGraph } = require("./copilot/kgService");
const { shouldUseReAct, runReActLoop } = require("./copilot/reactAgent");
const { executeWithRollback, rollbackLastAction } = require("./copilot/actionExecutor");
const { getMarketBenchmark } = require("./copilot/benchmarkService");
const { routeToAgent } = require("./copilot/multiAgent");

const getDb = () => getFirestore('comsaas');

/**
 * Exécute un outil financier de manière déterministe
 */
async function executeFinancialTool(toolName, toolArgs, storeId, userId) {
    try {
        switch (toolName) {
            case "analyze_profit": {
                let start, end;
                const now = new Date();
                
                if (toolArgs.period === 'today') {
                    start = new Date(now.setHours(0,0,0,0)).toISOString();
                    end = new Date(now.setHours(23,59,59,999)).toISOString();
                } else if (toolArgs.period === 'yesterday') {
                    const yesterday = new Date(now);
                    yesterday.setDate(yesterday.getDate() - 1);
                    start = new Date(yesterday.setHours(0,0,0,0)).toISOString();
                    end = new Date(yesterday.setHours(23,59,59,999)).toISOString();
                } else if (toolArgs.period === 'this_month') {
                    start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
                    end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString();
                } else if (toolArgs.period === 'custom') {
                    start = toolArgs.startDate;
                    end = toolArgs.endDate;
                }
                
                return await calculateNetProfit(storeId, start, end, toolArgs.breakdown);
            }
            case "get_cashflow_status":
                return await getPendingCashflow(storeId, toolArgs.carrier || 'all');
                
            case "get_inventory_intelligence": {
                const inventory = await getInventoryValue(storeId);
                if (toolArgs.focus === 'out_of_stock') {
                    return { outOfStock: inventory.outOfStock, totalValue: inventory.totalValue };
                }
                return inventory;
            }
            case "predict_stock_runout":
                return await predictStockRunout(storeId, toolArgs.daysLookAhead || 30, toolArgs.urgencyThreshold || 7);
                
            case "detect_anomalies":
                return await detectFinancialAnomalies(storeId);
                
            case "store_memory":
                return await storeMemory(storeId, toolArgs);
                
            case "retrieve_memory":
                return await retrieveMemories(storeId, toolArgs.query, toolArgs.limit || 5);

            // ── ÉVOLUTION 4 — ROLLBACK ──────────────────────
            case "rollback_last_action":
                return await rollbackLastAction(storeId, userId, toolArgs.actionId);

            // ── ÉVOLUTION 5 — PRÉFÉRENCES MARCHAND ──────────
            case "update_merchant_preference":
                return await setExplicitPreference(storeId, toolArgs.preference);

            // ── ÉVOLUTION 6 — BENCHMARK MARCHÉ ──────────────
            case "get_market_benchmark":
                return await getMarketBenchmark(storeId, toolArgs.metrics || ['margin', 'return_rate', 'avg_order_value']);
                
            // ── ÉVOLUTION 7 — KNOWLEDGE GRAPH ───────────────
            case "query_knowledge_graph":
                return await queryGraph(storeId, {
                    sourceId: toolArgs.sourceId,
                    targetId: toolArgs.targetId,
                    relationType: toolArgs.relationType,
                    orderBy: 'count', // Order by count (weight)
                    limit: toolArgs.limit || 10,
                    includeNodes: true
                });

            // ── ÉVOLUTION 8 — GESTION DES CLIENTS ───────────
            case "get_customer_list":
                return await getCustomerList(storeId, toolArgs.limit || 10);
                
            default:
                return { error: `Tool ${toolName} not implemented yet or is a draft tool.` };
        }
    } catch (e) {
        console.error(`Error executing tool ${toolName}:`, e);
        return { error: `Failed to execute ${toolName}: ${e.message}` };
    }
}

/**
 * Sauvegarde la conversation
 */
async function saveConversationMessage(storeId, conversationId, data) {
    if (!conversationId) return;
    const db = getDb();
    const convRef = db.collection(`stores/${storeId}/beya3_conversations`).doc(conversationId);
    
    await convRef.set({
        lastMessageAt: FieldValue.serverTimestamp(),
        messageCount: FieldValue.increment(2)
    }, { merge: true });
    
    await convRef.collection('messages').add({
        role: 'user',
        content: data.userMessage,
        timestamp: FieldValue.serverTimestamp()
    });
    
    await convRef.collection('messages').add({
        role: 'assistant',
        content: data.assistantMessage,
        toolsUsed: data.toolsUsed || [],
        actionsDrafted: data.actionsDrafted || [],
        reactSteps: data.reactSteps || null,
        timestamp: FieldValue.serverTimestamp()
    });
}


exports.copilotChatV1 = functions.runWith({ secrets: ["GROQ_API_KEY"], timeoutSeconds: 120, memory: '512MB' }).https.onRequest((req, res) => {
  cors(req, res, async () => {
    // SEC-03: Verify Firebase Auth token
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Unauthorized: Missing auth token' });
    }
    
    let decodedToken;
    try {
        decodedToken = await getAuth().verifyIdToken(authHeader.split('Bearer ')[1]);
    } catch (authErr) {
        return res.status(401).json({ error: 'Unauthorized: Invalid token' });
    }

    const userId = decodedToken.uid;
    const { messages, businessContext, storeName, storeId, conversationId } = req.body;
    
    if (!storeId) {
        return res.status(400).json({ error: 'Missing storeId' });
    }

    if (!process.env.GROQ_API_KEY) {
        console.error("GROQ_API_KEY secret not found in environment.");
        return res.status(500).json({ error: "Configuration error" });
    }

    // Tenant Isolation Check — SEC: storeId must match the authenticated user's store
    const db = getDb();
    const userDoc = await db.collection('users').doc(userId).get();
    const userData = userDoc.exists ? userDoc.data() : {};
    const role = userData.role || 'user';
    const userStoreId = userData.storeId || null;

    // Super admins can access any store; all others must own the store they request
    if (role !== 'super_admin' && storeId !== userStoreId) {
        console.warn(`[SEC] Tenant mismatch: user ${userId} (store: ${userStoreId}) tried to access store ${storeId}`);
        return res.status(403).json({ error: 'Forbidden: storeId does not match your account' });
    }
    
    // ── CHARGEMENT CONTEXTE ET MÉMOIRE ──────────────────────────
    const userLastMessage = messages[messages.length - 1].content;
    const relevantMemories = await retrieveMemories(storeId, userLastMessage, 5);
    const merchantProfile = await getMerchantProfile(storeId);
    
    const systemPrompt = buildSystemPrompt({
        storeName,
        storeId,
        userId,
        userRole: role,
        memories: relevantMemories,
        currentDateTime: new Date().toISOString(),
        merchantProfile
    });

    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

    // ── ÉVOLUTION 7: MULTI-AGENT ROUTING ────────────────────
    let activeSystemPrompt = systemPrompt;
    let activeTools = BEYA3_TOOLS;
    let agentTemperature = 0.1;
    let agentName = "Beya3";

    const specificAgent = await routeToAgent(userLastMessage, process.env.GROQ_API_KEY);
    if (specificAgent) {
        agentName = specificAgent.name;
        activeSystemPrompt = specificAgent.systemPrompt + "\n\nCONTEXTE GLOBAL:\n" + systemPrompt;
        // ÉVOLUTION 7 FIX : On ne filtre plus les outils pour éviter de brider l'agent en cas de question multi-domaine
        activeTools = BEYA3_TOOLS; 
        agentTemperature = specificAgent.temperature;
    }

    try {
      // Setup Streaming headers for EVOLUTION 8
      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      
      // ── ÉVOLUTION 1: REACT ROUTING ────────────────────
      const useReAct = shouldUseReAct(userLastMessage);

      if (useReAct) {
          // ══ REACT MODE ══════════════════════════════════
          console.log(`[Copilot] ReAct mode triggered for: "${userLastMessage.substring(0, 50)}..."`);
          res.write(`data: ${JSON.stringify({ type: 'thinking', text: 'Je réfléchis en profondeur...', agent: agentName })}\n\n`);
          
          const reactResult = await runReActLoop(
              storeId,
              userLastMessage,
              { systemPrompt: activeSystemPrompt },
              (toolName, toolArgs, sid) => executeFinancialTool(toolName, toolArgs, sid, userId),
              process.env.GROQ_API_KEY
          );

          const answer = reactResult.finalAnswer || "Je n'ai pas pu finaliser mon analyse.";
          
          // Stream in chunks for typing effect
          const chunkSize = 50;
          for (let i = 0; i < answer.length; i += chunkSize) {
              const chunk = answer.substring(i, i + chunkSize);
              res.write(`data: ${JSON.stringify({ delta: chunk })}\n\n`);
          }

          // Include ReAct metadata for transparency
          if (reactResult.steps.length > 0) {
              res.write(`data: ${JSON.stringify({ 
                  type: 'react_metadata',
                  iterationsUsed: reactResult.iterationsUsed,
                  toolsUsed: reactResult.toolsUsed,
                  maxIterReached: reactResult.maxIterReached
              })}\n\n`);
          }

          res.write("data: [DONE]\n\n");
          res.end();

          // Post-processing
          await saveConversationMessage(storeId, conversationId, {
              userMessage: userLastMessage,
              assistantMessage: answer,
              toolsUsed: reactResult.toolsUsed,
              reactSteps: reactResult.steps.length
          });
          await extractAndStoreMemories(storeId, answer, messages);
          
          // Update merchant profile from user messages
          const userMessages = messages.filter(m => m.role === 'user');
          await updateMerchantProfile(storeId, userMessages);

          return;
      }

      // ══ SINGLE-PASS MODE (standard) ═══════════════════
      res.write(`data: ${JSON.stringify({ type: 'thinking', text: 'J\'analyse...', agent: agentName })}\n\n`);
      
      // ── PASSE 1 : INTENT ROUTING + TOOL CALLING ──────
      const firstPass = await groq.chat.completions.create({
        model: "llama-3.3-70b-versatile",
        messages: [
          { role: "system", content: activeSystemPrompt },
          ...messages.slice(-8)
        ],
        tools: activeTools.length > 0 ? activeTools : undefined,
        tool_choice: activeTools.length > 0 ? "auto" : "none",
        max_tokens: 512,
        temperature: agentTemperature
      });

      const firstChoice = firstPass.choices[0];
      let toolCalls = firstChoice.message.tool_calls || [];
      
      // FALLBACK JSON
      if (toolCalls.length === 0 && firstChoice.message.content) {
          const jsonMatch = firstChoice.message.content.match(/\{\s*"action"\s*:\s*"([^"]+)"\s*,\s*"data"\s*:\s*(\{.*\})\s*\}/i);
          if (jsonMatch) {
              const fallbackToolName = jsonMatch[1].toLowerCase() === 'analyze_finances' ? 'analyze_profit' : jsonMatch[1];
              toolCalls = [{
                  id: 'call_fallback_' + Date.now(),
                  function: { name: fallbackToolName, arguments: jsonMatch[2] }
              }];
          }
      }
      
      const toolResults = [];
      const actionsDrafted = [];

      // ── EXÉCUTION DES OUTILS ─────────────────────────
      if (toolCalls.length > 0) {
          for (const toolCall of toolCalls) {
              const toolName = toolCall.function.name;
              res.write(`data: ${JSON.stringify({ type: 'thinking', text: 'Exécution...', toolName, agent: agentName })}\n\n`);
              let toolArgs;
              try {
                  toolArgs = JSON.parse(toolCall.function.arguments);
              } catch (e) {
                  toolArgs = {};
              }
              
              // Outils qui nécessitent confirmation
              const DRAFT_TOOLS = ['draft_expense', 'draft_purchase_order', 'bulk_update_orders', 'send_whatsapp_campaign'];
              
              if (DRAFT_TOOLS.includes(toolName)) {
                  actionsDrafted.push({ toolName, toolArgs, toolCallId: toolCall.id });
                  
                  // PHASE 2: Autonomous Action Layer - Save draft to Firestore
                  const draftRef = getDb().collection(`stores/${storeId}/action_drafts`).doc(toolCall.id);
                  await draftRef.set({
                      toolName,
                      toolArgs,
                      status: 'pending_approval',
                      source: 'copilot_chat',
                      createdAt: FieldValue.serverTimestamp()
                  });

                  toolResults.push({
                      tool_call_id: toolCall.id,
                      role: "tool",
                      name: toolName,
                      content: JSON.stringify({ status: 'pending_confirmation', draft: toolArgs })
                  });
              } else {
                  const result = await executeFinancialTool(toolName, toolArgs, storeId, userId);
                  toolResults.push({
                      tool_call_id: toolCall.id,
                      role: "tool",
                      name: toolName,
                      content: JSON.stringify(result)
                  });
              }
          }
      }

      // ── PASSE 2 : GÉNÉRATION RÉPONSE FINALE ─────────
      let fullResponse = '';

      if (toolCalls.length > 0) {
          res.write(`data: ${JSON.stringify({ type: 'thinking', text: 'Je formule ma réponse...', agent: agentName })}\n\n`);
          const messagesForPass2 = [
              { role: "system", content: activeSystemPrompt },
              ...messages.slice(-8),
              firstChoice.message,
              ...toolResults
          ];
          
          const secondPass = await groq.chat.completions.create({
              model: "llama-3.3-70b-versatile",
              messages: messagesForPass2,
              max_tokens: 1024,
              temperature: agentTemperature + 0.3, // Slightly higher for response gen
              stream: true
          });
          
          for await (const chunk of secondPass) {
              const delta = chunk.choices[0]?.delta?.content || "";
              if (delta) {
                  fullResponse += delta;
                  res.write(`data: ${JSON.stringify({ delta })}\n\n`);
              }
          }
      } else {
          if (firstChoice.message.content) {
              fullResponse = firstChoice.message.content;
              res.write(`data: ${JSON.stringify({ delta: fullResponse })}\n\n`);
          } else {
              res.write(`data: ${JSON.stringify({ delta: "Je ne suis pas sûr de comprendre." })}\n\n`);
          }
      }

      // Send pending actions if any
      if (actionsDrafted.length > 0) {
          res.write(`data: ${JSON.stringify({
              type: 'actions_pending',
              actions: actionsDrafted
          })}\n\n`);
      }

      res.write("data: [DONE]\n\n");
      res.end();

      // ── POST-TRAITEMENT (Asynchrone) ──────────────────────────────
      await saveConversationMessage(storeId, conversationId, {
          userMessage: userLastMessage,
          assistantMessage: fullResponse,
          toolsUsed: toolCalls.map(t => t.function.name),
          actionsDrafted
      });
      
      await extractAndStoreMemories(storeId, fullResponse, messages);
      
      // Update merchant profile
      const userMessages = messages.filter(m => m.role === 'user');
      await updateMerchantProfile(storeId, userMessages);

    } catch (error) {
      console.error("Groq error:", error);
      res.status(500).json({ error: "Copilot unavailable", details: error.message });
    }
  }); // close cors
});

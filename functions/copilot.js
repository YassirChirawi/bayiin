const functions = require("firebase-functions");
const Groq = require("groq-sdk");
const cors = require("cors")({ origin: true });
const { getAuth } = require("firebase-admin/auth");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");

// Import the new Copilot modules
const { BEYA3_TOOLS } = require("./copilot/tools");
const { 
    calculateNetProfit, 
    getPendingCashflow, 
    getInventoryValue, 
    predictStockRunout, 
    detectFinancialAnomalies 
} = require("./copilot/financialEngine");
const { 
    storeMemory, 
    retrieveMemories, 
    extractAndStoreMemories, 
    buildSystemPrompt 
} = require("./copilot/memoryService");

const getDb = () => getFirestore('comsaas');

/**
 * Exécute un outil financier de manière déterministe
 */
async function executeFinancialTool(toolName, toolArgs, storeId) {
    try {
        switch (toolName) {
            case "analyze_profit":
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
                } // default to all time if not specified properly for simplicity
                
                return await calculateNetProfit(storeId, start, end, toolArgs.breakdown);
                
            case "get_cashflow_status":
                return await getPendingCashflow(storeId, toolArgs.carrier || 'all');
                
            case "get_inventory_intelligence":
                const inventory = await getInventoryValue(storeId);
                // Simple filtering based on focus
                if (toolArgs.focus === 'out_of_stock') {
                    return { outOfStock: inventory.outOfStock, totalValue: inventory.totalValue };
                }
                return inventory;
                
            case "predict_stock_runout":
                return await predictStockRunout(storeId, toolArgs.daysLookAhead || 30, toolArgs.urgencyThreshold || 7);
                
            case "detect_anomalies":
                return await detectFinancialAnomalies(storeId);
                
            case "store_memory":
                return await storeMemory(storeId, toolArgs);
                
            case "retrieve_memory":
                return await retrieveMemories(storeId, toolArgs.query, toolArgs.limit || 5);
                
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
    
    // Simplification for the POC: We just append messages
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

    // Tenant Isolation Check
    const db = getDb();
    const userDoc = await db.collection('users').doc(userId).get();
    const role = userDoc.exists ? userDoc.data().role : 'user';
    
    // Basic rate limit check could be added here
    
    // ── CHARGEMENT CONTEXTE ET MÉMOIRE ──────────────────────────
    const userLastMessage = messages[messages.length - 1].content;
    const relevantMemories = await retrieveMemories(storeId, userLastMessage, 5);
    
    const systemPrompt = buildSystemPrompt({
        storeName,
        storeId,
        userId,
        userRole: role,
        memories: relevantMemories,
        currentDateTime: new Date().toISOString()
    });

    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

    try {
      // ── PASSE 1 : INTENT ROUTING + TOOL CALLING ──────
      const firstPass = await groq.chat.completions.create({
        model: "llama-3.3-70b-versatile",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages.slice(-8)
        ],
        tools: BEYA3_TOOLS,
        tool_choice: "auto",
        max_tokens: 512,
        temperature: 0.1 // Low temperature for deterministic routing
      });

      const firstChoice = firstPass.choices[0];
      const toolCalls = firstChoice.message.tool_calls || [];
      
      const toolResults = [];
      const actionsDrafted = [];

      // ── EXÉCUTION DES OUTILS ─────────────────────────
      if (toolCalls.length > 0) {
          for (const toolCall of toolCalls) {
              const toolName = toolCall.function.name;
              const toolArgs = JSON.parse(toolCall.function.arguments);
              
              // Outils qui nécessitent confirmation
              const DRAFT_TOOLS = ['draft_expense', 'draft_purchase_order', 'bulk_update_orders', 'send_whatsapp_campaign'];
              
              if (DRAFT_TOOLS.includes(toolName)) {
                  actionsDrafted.push({ toolName, toolArgs, toolCallId: toolCall.id });
                  toolResults.push({
                      tool_call_id: toolCall.id,
                      role: "tool",
                      name: toolName,
                      content: JSON.stringify({ status: 'pending_confirmation', draft: toolArgs })
                  });
              } else {
                  // Exécution directe des outils de lecture
                  const result = await executeFinancialTool(toolName, toolArgs, storeId);
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
      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");

      let fullResponse = '';

      if (toolCalls.length > 0) {
          const messagesForPass2 = [
              { role: "system", content: systemPrompt },
              ...messages.slice(-8),
              firstChoice.message,
              ...toolResults
          ];
          
          const secondPass = await groq.chat.completions.create({
              model: "llama-3.3-70b-versatile",
              messages: messagesForPass2,
              max_tokens: 1024,
              temperature: 0.6,
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
          // No tools called, the first pass was the response
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
      // 1. Sauvegarder dans l'historique
      await saveConversationMessage(storeId, conversationId, {
          userMessage: userLastMessage,
          assistantMessage: fullResponse,
          toolsUsed: toolCalls.map(t => t.function.name),
          actionsDrafted
      });
      
      // 2. Extraire les nouvelles mémoires
      await extractAndStoreMemories(storeId, fullResponse, messages);

    } catch (error) {
      console.error("Groq error:", error);
      res.status(500).json({ error: "Copilot unavailable", details: error.message });
    }
  }); // close cors
});

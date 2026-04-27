const { onRequest } = require("firebase-functions/v2/https");
const Groq = require("groq-sdk");

exports.copilotChat = onRequest(
  { secrets: ["GROQ_API_KEY"] },
  async (req, res) => {
    res.set("Access-Control-Allow-Origin", "*");
    res.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.set("Access-Control-Allow-Headers", "Content-Type, Authorization");

    if (req.method === "OPTIONS") {
      res.status(204).send("");
      return;
    }

    const { messages, businessContext, storeName } = req.body;
    
    if (!process.env.GROQ_API_KEY) {
        console.error("GROQ_API_KEY secret not found in environment.");
        res.status(500).json({ error: "Configuration error" });
        return;
    }

    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

    const systemPrompt = `
Tu es Beya3, l'assistante Head of Growth de ${storeName || 'notre boutique'}.
Tu parles en français (ou darija si l'utilisateur le fait).
Tu es directe, orientée résultats, jamais verbose.

Données business actuelles :
${JSON.stringify(businessContext, null, 2)}

Tu peux effectuer des ACTIONS réelles. Format strict :
\`\`\`json
{ "action": "NOM_ACTION", "data": { ... } }
\`\`\`

Actions disponibles :
- CREATE_ORDER : { productName, clientName, phone, price, quantity }
- UPDATE_ORDER_STATUS : { orderId, newStatus }
- SHIP_ORDER : { orderId, carrier } (carrier: "olivraison" ou "sendit")
- CREATE_EXPENSE : { label, amount, category }
- ANALYZE_FINANCES : { period } (period: "this_month", "last_month")
- SEND_WHATSAPP : { phone, message }

Règles :
- Utilise UNIQUEMENT les données du contexte pour répondre
- Confirme avant toute action irréversible
- Ne jamais inventer des chiffres
- Réponses courtes sauf si analyse demandée
    `;

    try {
      const completion = await groq.chat.completions.create({
        model: "llama-3.1-8b-instant",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages.slice(-10) // garde les 10 derniers messages
        ],
        max_tokens: 1024,
        temperature: 0.7,
        stream: true
      });

      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");

      for await (const chunk of completion) {
        const delta = chunk.choices[0]?.delta?.content || "";
        if (delta) {
            res.write(`data: ${JSON.stringify({ delta })}\n\n`);
        }
      }

      res.write("data: [DONE]\n\n");
      res.end();
    } catch (error) {
      console.error("Groq error:", error);
      res.status(500).json({ error: "Copilot unavailable", details: error.message });
    }
  }
);

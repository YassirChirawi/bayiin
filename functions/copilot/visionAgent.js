const Groq = require("groq-sdk");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");

const getDb = () => getFirestore('comsaas');

/**
 * Agent Vision basé sur LLaMA 3.2 90B Vision (Groq)
 * Phase 4 : OCR de Factures et analyse d'images
 */
async function processInvoiceOCR(storeId, imageUrl) {
    if (!process.env.GROQ_API_KEY) {
        throw new Error("GROQ_API_KEY is not configured.");
    }
    
    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
    
    // Le modèle Vision demande une URL ou une image en base64
    // Ici nous utilisons l'URL publique de l'image stockée (ex: Firebase Storage)
    const prompt = `
Tu es un agent comptable expert. Analyse cette facture fournisseur.
Extrais les informations suivantes au format JSON strict :
- supplierName (string, le nom du fournisseur)
- totalAmount (number, le montant total TTC)
- taxAmount (number, le montant de la TVA si disponible, sinon 0)
- date (string, date au format YYYY-MM-DD)
- category (string, catégorie suggérée parmi : 'achat de marchandise', 'marketing', 'logistique', 'frais généraux', 'autre')

Réponds UNIQUEMENT avec l'objet JSON, sans aucun texte avant ou après.`;

    try {
        const completion = await groq.chat.completions.create({
            model: "llama-3.2-90b-vision-preview",
            messages: [
                {
                    role: "user",
                    content: [
                        { type: "text", text: prompt },
                        { type: "image_url", image_url: { url: imageUrl } }
                    ]
                }
            ],
            temperature: 0.1,
            max_tokens: 500,
        });

        const responseText = completion.choices[0]?.message?.content || "";
        
        // Clean JSON from markdown block if necessary
        let jsonStr = responseText;
        if (jsonStr.includes("```json")) {
            jsonStr = jsonStr.split("```json")[1].split("```")[0].trim();
        } else if (jsonStr.includes("```")) {
            jsonStr = jsonStr.split("```")[1].split("```")[0].trim();
        }
        
        const invoiceData = JSON.parse(jsonStr);
        
        // PHASE 4: Human-in-the-loop — On crée un Draft d'Expense (Action Layer)
        const db = getDb();
        const draftRef = db.collection(`stores/${storeId}/action_drafts`).doc();
        await draftRef.set({
            toolName: 'draft_expense',
            toolArgs: {
                category: invoiceData.category || 'achat de marchandise',
                amount: invoiceData.totalAmount || 0,
                description: `Facture fournisseur : ${invoiceData.supplierName || 'Inconnu'}`,
                invoiceUrl: imageUrl,
                metadata: invoiceData
            },
            status: 'pending_approval',
            source: 'vision_ocr',
            createdAt: FieldValue.serverTimestamp()
        });
        
        return {
            success: true,
            data: invoiceData,
            draftId: draftRef.id,
            message: "Facture analysée avec succès. Une dépense est en attente de validation."
        };
        
    } catch (error) {
        console.error("[VisionAgent] OCR Error:", error);
        throw new Error("L'analyse de la facture a échoué.");
    }
}

module.exports = {
    processInvoiceOCR
};

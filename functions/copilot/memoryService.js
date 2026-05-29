const { getFirestore, FieldValue } = require('firebase-admin/firestore');
const Groq = require('groq-sdk');

const getDb = () => getFirestore('comsaas');

/**
 * Mémorise une information importante sur le marchand ou son business.
 */
async function storeMemory(storeId, memoryData) {
    const db = getDb();
    const memoriesRef = db.collection(`stores/${storeId}/beya3_memory`);

    // Basic deduplication: Check if an exact or very similar memory exists in the same category
    const snapshot = await memoriesRef
        .where('category', '==', memoryData.category || 'general')
        .where('type', '==', memoryData.type)
        .get();

    let duplicateId = null;
    snapshot.forEach(doc => {
        // Simple string inclusion check for deduplication (in a real system, we'd use embeddings)
        const existingContent = doc.data().content.toLowerCase();
        const newContent = memoryData.content.toLowerCase();
        
        if (existingContent.includes(newContent) || newContent.includes(existingContent)) {
            duplicateId = doc.id;
        }
    });

    if (duplicateId) {
        // Update existing memory
        await memoriesRef.doc(duplicateId).update({
            accessCount: FieldValue.increment(1),
            lastAccessedAt: FieldValue.serverTimestamp(),
            content: memoryData.content // Replace with the latest version
        });
        return { success: true, action: 'updated', id: duplicateId };
    }

    // Create new memory
    const newDoc = memoriesRef.doc();
    await newDoc.set({
        type: memoryData.type,
        content: memoryData.content,
        category: memoryData.category || 'general',
        confidence: memoryData.confidence || 1.0,
        source: memoryData.source || 'system',
        createdAt: FieldValue.serverTimestamp(),
        lastAccessedAt: FieldValue.serverTimestamp(),
        accessCount: 1,
        isActive: true
    });

    // Enforce limits (max 200 memories per store)
    const allMemories = await memoriesRef.orderBy('lastAccessedAt', 'asc').get();
    if (allMemories.size > 200) {
        // Delete oldest accessed
        const toDeleteCount = allMemories.size - 200;
        const batch = db.batch();
        allMemories.docs.slice(0, toDeleteCount).forEach(doc => {
            batch.delete(doc.ref);
        });
        await batch.commit();
    }

    return { success: true, action: 'created', id: newDoc.id };
}

/**
 * Récupère les mémoires pertinentes pour une conversation.
 * Note: Simple keyword matching for now. Semantic search would require an embedding model.
 */
async function retrieveMemories(storeId, query, limitCount = 5) {
    const db = getDb();
    const memoriesRef = db.collection(`stores/${storeId}/beya3_memory`);
    
    // Fetch all active memories (we assume max 200 so it's fine to fetch all and filter in memory)
    const snapshot = await memoriesRef.where('isActive', '==', true).get();
    
    const queryWords = query.toLowerCase().split(/\s+/);
    let scoredMemories = [];

    snapshot.forEach(doc => {
        const data = doc.data();
        let score = 0;
        const contentWords = data.content.toLowerCase().split(/\s+/);
        
        // Match score
        queryWords.forEach(qw => {
            if (qw.length > 3 && contentWords.includes(qw)) score += 2;
        });

        // Boost for recently/frequently accessed
        score += (data.accessCount || 0) * 0.1;
        
        // Goals and alert rules are always highly relevant
        if (['goal', 'alert_rule'].includes(data.type)) score += 5;

        scoredMemories.push({ id: doc.id, score, ...data });
    });

    // Sort by score and take top limit
    scoredMemories.sort((a, b) => b.score - a.score);
    const topMemories = scoredMemories.slice(0, limitCount);

    // Update access timestamps for retrieved memories
    if (topMemories.length > 0) {
        const batch = db.batch();
        topMemories.forEach(m => {
            batch.update(memoriesRef.doc(m.id), {
                lastAccessedAt: FieldValue.serverTimestamp(),
                accessCount: FieldValue.increment(1)
            });
        });
        await batch.commit();
    }

    return topMemories;
}

/**
 * Extrait automatiquement des mémoires à partir d'un échange (Tâche asynchrone).
 */
async function extractAndStoreMemories(storeId, assistantResponse, messagesContext) {
    if (!process.env.GROQ_API_KEY) return;
    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

    const prompt = `
Extrais les informations importantes à retenir sur ce marchand ou son business à partir de la conversation suivante.
Retourne UNIQUEMENT un JSON array de mémoires au format [{"type": "fact|preference|goal|alert_rule", "content": "string", "category": "finance|logistics|products|behavior"}].
Maximum 3 mémoires. Si rien d'important, retourne [].

Conversation:
${messagesContext.slice(-4).map(m => `${m.role}: ${m.content}`).join('\n')}
Assistant: ${assistantResponse}
    `;

    try {
        const completion = await groq.chat.completions.create({
            model: "llama-3.1-8b-instant", // Use smaller/faster model for memory extraction
            messages: [{ role: "user", content: prompt }],
            response_format: { type: "json_object" }, // Groq supports this for some models, or we just parse JSON
            temperature: 0.1
        });

        const content = completion.choices[0]?.message?.content;
        let memories = [];
        try {
            // Groq might return {"memories": [...]} or just [...] depending on prompting.
            const parsed = JSON.parse(content);
            memories = Array.isArray(parsed) ? parsed : (parsed.memories || []);
        } catch (e) {
            console.error("Failed to parse extracted memories", e);
            return;
        }

        for (const memory of memories) {
            if (memory.type && memory.content) {
                await storeMemory(storeId, {
                    type: memory.type,
                    content: memory.content,
                    category: memory.category || 'general',
                    source: 'auto_extraction'
                });
            }
        }
    } catch (e) {
        console.error("Error extracting memories:", e);
    }
}

/**
 * Construit le system prompt enrichi avec le contexte et les mémoires.
 */
function buildSystemPrompt({ storeName, storeId, userId, userRole, memories, currentDateTime }) {
    const memoryStrings = memories.map(m => `- [${m.type.toUpperCase()}] ${m.content}`).join('\n');
    const hasDarijaPreference = memories.some(m => m.content.toLowerCase().includes('darija'));
    const languageRule = hasDarijaPreference ? 'Parle en darija (script latin ou arabe)' : 'Parle en français sauf si l\'utilisateur utilise une autre langue';

    return `Tu es Beya3, l'assistante CFO/COO de la boutique e-commerce ${storeName || 'BayIIn Store'}.
Date actuelle : ${currentDateTime}
Rôle de l'utilisateur qui te parle : ${userRole || 'admin'}

MÉMOIRES PERTINENTES (ce que tu sais sur ce marchand) :
${memoryStrings || "Aucune mémoire spécifique."}

RÈGLES ABSOLUES :
1. TON RÔLE N'EST PAS DE CALCULER. Pour TOUT chiffre financier, inventaire ou logistique, utilise UNIQUEMENT les outils (tools). Ne jamais faire de mathématiques toi-même.
2. Pour les actions modifiant des données (dépenses, statuts), utilise l'outil correspondant pour générer un DRAFT. Jamais exécuter directement.
3. Tu n'as accès qu'au storeId ${storeId}. Refuse catégoriquement toute demande sur d'autres stores.
4. ${languageRule}.
5. Réponses courtes, professionnelles et orientées action. Maximum 3 paragraphes. Exception: rapports détaillés explicitement demandés.
6. Ne mentionne jamais que tu utilises des "outils" ou que tu fais des "requêtes à une base de données". Présente les données avec assurance.
`;
}

module.exports = {
    storeMemory,
    retrieveMemories,
    extractAndStoreMemories,
    buildSystemPrompt
};

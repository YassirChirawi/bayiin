const { getFirestore, FieldValue } = require('firebase-admin/firestore');
const Groq = require('groq-sdk');

const getDb = () => getFirestore('comsaas');

// ═══════════════════════════════════════════════════════════════
// ÉVOLUTION 2 — TF-IDF SÉMANTIQUE
// ═══════════════════════════════════════════════════════════════

const STOP_WORDS_FR = new Set([
    // Articles, pronoms, prépositions FR
    'le','la','les','un','une','des','du','de','ce','cette','ces',
    'je','tu','il','elle','nous','vous','ils','elles','on','se','me','te',
    'est','sont','suis','sommes','êtes','été','être','avoir','avons','avez','ont',
    'mais','ou','et','donc','car','ni','si','que','qui','quoi','dont','où',
    'dans','sur','sous','avec','sans','pour','par','entre','vers','chez',
    'plus','moins','très','trop','bien','mal','pas','ne','jamais','rien','tout',
    'aussi','comme','encore','même','déjà','quand','comment','pourquoi',
    'mon','ton','son','notre','votre','leur','mes','tes','ses','nos','vos','leurs',
    'ça','cela','ceci','celui','celle','ceux','celles',
    'faire','fait','fais','font','peut','peux','peuvent','doit','dois','doivent',
    'faut','veux','veut','veulent','vouloir','pouvoir','devoir',
    'cette','quel','quelle','quels','quelles',
    // Darija commune
    'dyal','dial','hna','nta','nti','howa','hiya','homa','fach','fin','ach','wach',
    'kayn','makaynch','bghit','bgha','kandir','dir','ghi','walakin','ila','bach',
    // Mots e-commerce trop génériques
    'commande','commandes','produit','produits','client','clients','boutique','store',
    'prix','vente','ventes','jour','mois','semaine'
]);

/**
 * Extrait les mots-clés significatifs d'un texte en filtrant les stop words.
 */
function extractKeywords(text) {
    if (!text) return [];
    return text
        .toLowerCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // Remove accents for matching
        .split(/[\s\W]+/)
        .filter(w => w.length > 3 && !STOP_WORDS_FR.has(w))
        .filter((w, i, arr) => arr.indexOf(w) === i); // Dedupe
}

/**
 * Calcule le score TF-IDF simplifié entre une mémoire et une requête.
 */
function tfIdfScore(memoryKeywords, queryKeywords) {
    if (!memoryKeywords?.length || !queryKeywords?.length) return 0;
    const intersection = queryKeywords.filter(k => memoryKeywords.includes(k));
    if (intersection.length === 0) return 0;
    
    // TF = proportion des termes de la requête trouvés dans la mémoire
    const tf = intersection.length / memoryKeywords.length;
    // IDF simplifié = pénalise les termes très communs (approximation)
    const idf = Math.log(1 + 200 / (intersection.length + 1));
    return tf * idf;
}

/**
 * Calcule un score de récence (décroissance exponentielle sur 30 jours).
 */
function recencyScore(lastAccessedAt) {
    if (!lastAccessedAt) return 0;
    const dateObj = typeof lastAccessedAt.toDate === 'function' ? lastAccessedAt.toDate() : new Date(lastAccessedAt);
    const daysSince = (Date.now() - dateObj.getTime()) / 86400000;
    return Math.exp(-daysSince / 30); // Halves roughly every 21 days
}

/**
 * Normalise un accessCount (0-1 range).
 */
function accessScore(accessCount, maxAccess = 50) {
    return Math.min((accessCount || 0) / maxAccess, 1);
}

// ═══════════════════════════════════════════════════════════════
// CORE MEMORY FUNCTIONS
// ═══════════════════════════════════════════════════════════════

/**
 * Mémorise une information importante sur le marchand ou son business.
 */
async function storeMemory(storeId, memoryData) {
    const db = getDb();
    const memoriesRef = db.collection(`stores/${storeId}/beya3_memory`);

    // Extract keywords for TF-IDF indexing
    const keywords = extractKeywords(memoryData.content);

    // Deduplication: Check if a similar memory exists
    const snapshot = await memoriesRef
        .where('category', '==', memoryData.category || 'general')
        .where('type', '==', memoryData.type)
        .get();

    let duplicateId = null;
    snapshot.forEach(doc => {
        const existingKeywords = doc.data().keywords || [];
        const overlap = keywords.filter(k => existingKeywords.includes(k));
        // If > 60% keyword overlap, consider it a duplicate
        if (existingKeywords.length > 0 && overlap.length / existingKeywords.length > 0.6) {
            duplicateId = doc.id;
        }
    });

    if (duplicateId) {
        await memoriesRef.doc(duplicateId).update({
            accessCount: FieldValue.increment(1),
            lastAccessedAt: FieldValue.serverTimestamp(),
            content: memoryData.content,
            keywords // Update keywords with latest version
        });
        return { success: true, action: 'updated', id: duplicateId };
    }

    // Create new memory
    const newDoc = memoriesRef.doc();
    await newDoc.set({
        type: memoryData.type,
        content: memoryData.content,
        category: memoryData.category || 'general',
        keywords,
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
 * Récupère les mémoires pertinentes via TF-IDF sémantique + récence + accès.
 * Score final = tfIdfScore * 0.7 + recencyScore * 0.2 + accessScore * 0.1
 */
async function retrieveMemories(storeId, query, limitCount = 5) {
    const db = getDb();
    const memoriesRef = db.collection(`stores/${storeId}/beya3_memory`);
    
    const snapshot = await memoriesRef.where('isActive', '==', true).get();
    const queryKeywords = extractKeywords(query);
    let scoredMemories = [];

    snapshot.forEach(doc => {
        const data = doc.data();
        
        // TF-IDF score (0.7 weight)
        const memKeywords = data.keywords || extractKeywords(data.content);
        const tfidf = tfIdfScore(memKeywords, queryKeywords);
        
        // Recency score (0.2 weight)
        const recency = recencyScore(data.lastAccessedAt);
        
        // Access frequency score (0.1 weight)
        const access = accessScore(data.accessCount);
        
        // Goals and alert rules always get a boost
        const typeBoost = ['goal', 'alert_rule'].includes(data.type) ? 0.3 : 0;
        
        // Merchant profile always returned if relevant
        const profileBoost = data.type === 'merchant_profile' ? 0.5 : 0;
        
        const finalScore = (tfidf * 0.7) + (recency * 0.2) + (access * 0.1) + typeBoost + profileBoost;

        if (finalScore > 0.01) { // Only include memories with some relevance
            scoredMemories.push({ id: doc.id, score: finalScore, ...data });
        }
    });

    scoredMemories.sort((a, b) => b.score - a.score);
    const topMemories = scoredMemories.slice(0, limitCount);

    // Update access timestamps
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
 * Extrait automatiquement des mémoires à partir d'un échange.
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
            model: "llama-3.1-8b-instant",
            messages: [{ role: "user", content: prompt }],
            response_format: { type: "json_object" },
            temperature: 0.1
        });

        const content = completion.choices[0]?.message?.content;
        let memories = [];
        try {
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

// ═══════════════════════════════════════════════════════════════
// ÉVOLUTION 5 — PROFIL PSYCHOLOGIQUE MARCHAND
// ═══════════════════════════════════════════════════════════════

const MERCHANT_PROFILES = {
    analyst: {
        indicators: ['détail', 'exactement', 'précis', 'pourquoi', 'chiffre', 'donnée', 'data', 'tableau', 'breakdown'],
        tone: 'data-first',
        detailLevel: 'high',
        preferredFormat: 'tables',
        description: 'Aime les détails, les chiffres précis et les tableaux'
    },
    busy: {
        indicators: ['vite', 'résumé', 'rapide', 'bref', 'court', 'tldr', 'résume', 'direct'],
        tone: 'ultra-concise',
        detailLevel: 'minimal',
        preferredFormat: 'bullets',
        description: 'Préfère les réponses courtes et directes'
    },
    learner: {
        indicators: ['comment', 'expliquer', 'comprendre', 'apprendre', 'quoi', 'définition', 'signifie'],
        tone: 'educational',
        detailLevel: 'high',
        preferredFormat: 'step-by-step',
        description: 'Pose des questions de compréhension, veut apprendre'
    },
    action_oriented: {
        indicators: ['faire', 'action', 'maintenant', 'solution', 'régler', 'fixer', 'corriger', 'lancer'],
        tone: 'directive',
        detailLevel: 'low',
        preferredFormat: 'actionable',
        description: 'Veut des actions concrètes, pas d\'analyse'
    }
};

/**
 * Analyse les messages d'un utilisateur pour détecter son profil.
 */
function detectProfile(userMessages) {
    if (!userMessages || userMessages.length === 0) return null;

    const allText = userMessages.map(m => m.content || m).join(' ').toLowerCase();
    const avgLength = userMessages.reduce((sum, m) => sum + (m.content || m).length, 0) / userMessages.length;

    const scores = {};
    for (const [profile, config] of Object.entries(MERCHANT_PROFILES)) {
        let score = 0;
        config.indicators.forEach(indicator => {
            const regex = new RegExp(indicator, 'gi');
            const matches = allText.match(regex);
            if (matches) score += matches.length;
        });
        scores[profile] = score;
    }

    // Length-based adjustments
    if (avgLength < 30) scores.busy = (scores.busy || 0) + 3;
    if (avgLength > 100) scores.analyst = (scores.analyst || 0) + 2;

    // Find dominant profile
    const sorted = Object.entries(scores).sort((a, b) => b[1] - a[1]);
    if (sorted[0][1] === 0) return null;

    const totalScore = sorted.reduce((sum, [, s]) => sum + s, 0);
    const confidence = totalScore > 0 ? sorted[0][1] / totalScore : 0;

    return {
        profile: sorted[0][0],
        confidence: Number(confidence.toFixed(2)),
        scores,
        avgMessageLength: Math.round(avgLength)
    };
}

/**
 * Met à jour le profil psychologique du marchand.
 * Appelé en post-traitement après chaque conversation.
 */
async function updateMerchantProfile(storeId, userMessages) {
    const detected = detectProfile(userMessages);
    if (!detected || detected.confidence < 0.3) return; // Pas assez de signal

    const db = getDb();
    const memoriesRef = db.collection(`stores/${storeId}/beya3_memory`);

    // Check if profile already exists
    const existing = await memoriesRef
        .where('type', '==', 'merchant_profile')
        .limit(1)
        .get();

    const profileData = {
        type: 'merchant_profile',
        content: `Profil marchand: ${detected.profile} (${MERCHANT_PROFILES[detected.profile].description})`,
        category: 'behavior',
        keywords: ['profil', 'marchand', 'preference', 'communication', detected.profile],
        confidence: detected.confidence,
        source: 'auto_detection',
        profileDetails: {
            profile: detected.profile,
            tone: MERCHANT_PROFILES[detected.profile].tone,
            detailLevel: MERCHANT_PROFILES[detected.profile].detailLevel,
            preferredFormat: MERCHANT_PROFILES[detected.profile].preferredFormat,
            avgMessageLength: detected.avgMessageLength,
            prefersDarija: false, // Will be updated by explicit preference
            prefersDetails: detected.profile === 'analyst' || detected.profile === 'learner',
            prefersBulletPoints: detected.profile === 'busy' || detected.profile === 'action_oriented'
        },
        isActive: true,
        lastAccessedAt: FieldValue.serverTimestamp(),
        accessCount: 1
    };

    if (!existing.empty) {
        const existingDoc = existing.docs[0];
        const existingData = existingDoc.data();
        
        // Merge: Keep explicit preferences, update detected ones
        const mergedProfile = {
            ...profileData.profileDetails,
            ...(existingData.profileDetails?.prefersDarija !== undefined && {
                prefersDarija: existingData.profileDetails.prefersDarija
            }),
            ...(existingData.profileDetails?.explicitPreferences && {
                explicitPreferences: existingData.profileDetails.explicitPreferences
            })
        };

        await memoriesRef.doc(existingDoc.id).update({
            content: profileData.content,
            confidence: detected.confidence,
            profileDetails: mergedProfile,
            lastAccessedAt: FieldValue.serverTimestamp(),
            accessCount: FieldValue.increment(1)
        });
    } else {
        await memoriesRef.doc().set({
            ...profileData,
            createdAt: FieldValue.serverTimestamp()
        });
    }
}

/**
 * Permet au marchand de définir explicitement une préférence.
 * Ex: "Beya3, je préfère les réponses courtes" ou "parle en darija"
 */
async function setExplicitPreference(storeId, preference) {
    const db = getDb();
    const memoriesRef = db.collection(`stores/${storeId}/beya3_memory`);

    const existing = await memoriesRef
        .where('type', '==', 'merchant_profile')
        .limit(1)
        .get();

    const explicitUpdate = {};

    // Parse common preference patterns
    const prefLower = preference.toLowerCase();
    if (/court|bref|concis|rapide/i.test(prefLower)) {
        explicitUpdate.detailLevel = 'minimal';
        explicitUpdate.preferredFormat = 'bullets';
        explicitUpdate.prefersDetails = false;
    }
    if (/détail|complet|approfondi/i.test(prefLower)) {
        explicitUpdate.detailLevel = 'high';
        explicitUpdate.prefersDetails = true;
    }
    if (/darija|darja|marocain/i.test(prefLower)) {
        explicitUpdate.prefersDarija = true;
    }
    if (/français|french/i.test(prefLower)) {
        explicitUpdate.prefersDarija = false;
    }
    if (/tableau|table/i.test(prefLower)) {
        explicitUpdate.preferredFormat = 'tables';
    }
    if (/bullet|liste|puces/i.test(prefLower)) {
        explicitUpdate.preferredFormat = 'bullets';
    }

    if (!existing.empty) {
        const doc = existing.docs[0];
        const currentProfile = doc.data().profileDetails || {};
        await memoriesRef.doc(doc.id).update({
            'profileDetails': {
                ...currentProfile,
                ...explicitUpdate,
                explicitPreferences: {
                    ...(currentProfile.explicitPreferences || {}),
                    [Date.now()]: preference
                }
            },
            content: `Profil marchand: ${currentProfile.profile || 'custom'} — Préférence explicite: "${preference}"`,
            lastAccessedAt: FieldValue.serverTimestamp()
        });
    } else {
        await memoriesRef.doc().set({
            type: 'merchant_profile',
            content: `Préférence explicite du marchand: "${preference}"`,
            category: 'behavior',
            keywords: ['profil', 'marchand', 'preference', ...extractKeywords(preference)],
            confidence: 1.0,
            source: 'explicit',
            profileDetails: {
                profile: 'custom',
                ...explicitUpdate,
                explicitPreferences: { [Date.now()]: preference }
            },
            isActive: true,
            createdAt: FieldValue.serverTimestamp(),
            lastAccessedAt: FieldValue.serverTimestamp(),
            accessCount: 1
        });
    }

    return { success: true, applied: explicitUpdate, message: `Préférence enregistrée: "${preference}"` };
}

/**
 * Récupère le profil marchand actuel.
 */
async function getMerchantProfile(storeId) {
    const db = getDb();
    const snap = await db.collection(`stores/${storeId}/beya3_memory`)
        .where('type', '==', 'merchant_profile')
        .where('isActive', '==', true)
        .limit(1)
        .get();

    if (snap.empty) return null;
    return snap.docs[0].data().profileDetails || null;
}

// ═══════════════════════════════════════════════════════════════
// SYSTEM PROMPT BUILDER (enrichi avec profil)
// ═══════════════════════════════════════════════════════════════

/**
 * Construit le system prompt enrichi avec le contexte, mémoires et profil.
 */
function buildSystemPrompt({ storeName, storeId, userId, userRole, memories, currentDateTime, merchantProfile }) {
    const memoryStrings = memories.map(m => `- [${m.type.toUpperCase()}] ${m.content}`).join('\n');
    const hasDarijaPreference = merchantProfile?.prefersDarija || memories.some(m => m.content?.toLowerCase().includes('darija'));
    const languageRule = hasDarijaPreference ? 'Parle en darija (script latin ou arabe)' : "Parle en français sauf si l'utilisateur utilise une autre langue";

    // Profile-specific instructions
    let profileInstructions = '';
    if (merchantProfile) {
        const p = merchantProfile;
        profileInstructions = `
PROFIL MARCHAND DÉTECTÉ : ${p.profile || 'standard'}
- ${p.prefersDetails ? 'Aime les détails et les chiffres précis' : 'Préfère la concision'}
- Format préféré : ${p.preferredFormat || 'paragraphes'}
- Niveau de détail : ${p.detailLevel || 'medium'}
${p.preferredFormat === 'tables' ? '- Utilise des tableaux markdown quand possible' : ''}
${p.preferredFormat === 'bullets' ? '- Utilise des listes à puces, pas de paragraphes longs' : ''}
${p.preferredFormat === 'step-by-step' ? '- Explique étape par étape avec des numéros' : ''}
${p.preferredFormat === 'actionable' ? '- Donne directement les actions à faire, pas d\'analyse longue' : ''}
`;
    }

    return `Tu es Beya3, l'assistante CFO/COO de la boutique e-commerce ${storeName || 'BayIIn Store'}.
Date actuelle : ${currentDateTime}
Rôle de l'utilisateur qui te parle : ${userRole || 'admin'}

MÉMOIRES PERTINENTES (ce que tu sais sur ce marchand) :
${memoryStrings || "Aucune mémoire spécifique."}
${profileInstructions}
RÈGLES ABSOLUES :
1. TON RÔLE N'EST PAS DE CALCULER. Pour TOUT chiffre financier, inventaire ou logistique, utilise UNIQUEMENT les outils (tools). Ne jamais faire de mathématiques toi-même.
2. Pour les actions modifiant des données (dépenses, statuts), utilise l'outil correspondant pour générer un DRAFT. Jamais exécuter directement.
3. Tu n'as accès qu'au storeId ${storeId}. Refuse catégoriquement toute demande sur d'autres stores.
4. ${languageRule}.
5. Réponses courtes, professionnelles et orientées action. Maximum 3 paragraphes. Exception: rapports détaillés explicitement demandés.
6. Ne mentionne jamais que tu utilises des "outils" ou que tu fais des "requêtes à une base de données". Présente les données avec assurance.
7. Si le marchand exprime une préférence de communication (langue, format, niveau de détail), utilise l'outil update_merchant_preference pour la mémoriser.
`;
}

module.exports = {
    storeMemory,
    retrieveMemories,
    extractAndStoreMemories,
    buildSystemPrompt,
    updateMerchantProfile,
    getMerchantProfile,
    setExplicitPreference,
    extractKeywords,
    tfIdfScore,
    recencyScore,
    detectProfile,
    MERCHANT_PROFILES
};

const functions = require('firebase-functions');
const Groq = require("groq-sdk");

exports.generateStorefront = functions.runWith({ secrets: ["GROQ_API_KEY"] }).https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'User must be logged in.');
    }

    const { storeName, industry } = data;

    if (!process.env.GROQ_API_KEY) {
        throw new functions.https.HttpsError('internal', 'GROQ_API_KEY non configurée.');
    }

    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

    const systemPrompt = `Tu es Beya3, un expert en création de sites e-commerce très sophistiqués et optimisés pour la conversion (Surtout en COD - Paiement à la livraison au Maroc).
L'utilisateur te donne le nom de sa boutique et son secteur.
Tu dois générer une structure JSON de 5 à 7 sections pour une page d'accueil ultra-développée, professionnelle et convaincante.
Chaque section doit respecter cette interface :
{
  "id": "unique-id",
  "type": "Hero | Features | ProductGrid | ImageText | Testimonials | FAQ",
  "variant": "String (Modern/Split for Hero, Glass/Minimal for Features, Classic for ProductGrid)",
  "title": "String",
  "subtitle": "String",
  "content": "String (optional detailed description)",
  "ctaText": "String (optional button text)",
  "items": [ // OBLIGATOIRE pour Features, Testimonials et FAQ. Optionnel ailleurs.
    { 
      "title": "string", 
      "content": "string", 
      "emoji": "string (un emoji pertinent, ex: 🚀, 💎, 🚚. Pour Features uniquement)", 
      "author": "string (ex: Fatima Z., pour Testimonials uniquement)", 
      "rating": 5 // (nombre de 1 à 5, pour Testimonials uniquement)
    }
  ],
  "settings": {
    "alignment": "string (left ou center)",
    "backgroundType": "string (color, image ou video. Utilise souvent 'image' ou 'video' pour le Hero ou CallToAction)",
    "backgroundUrl": "string (Si image ou video, met une belle URL Unsplash ou Pexels pertinente, ex: https://images.unsplash.com/photo-1515378960530-7c0da622941f?q=80&w=2070 pour la mode)",
    "overlayOpacity": number (0 à 100, ex: 40 si tu mets une image/video de fond pour que le texte blanc soit lisible),
    "filterBlur": number (0 à 20, ex: 5 si tu veux flouter l'image de fond),
    "textColor": "string (code hex, ex: #ffffff pour fond sombre, #0f172a pour fond clair)",
    "backgroundColor": "string (code hex, ex: #ffffff, #f8fafc ou #1e293b)",
    "paddingTop": number (ex: 64, 96, 128),
    "paddingBottom": number (ex: 64, 96, 128)
  }
}

Réponds UNIQUEMENT avec un objet JSON valide ayant une clé "sections" qui est un tableau de ces objets. Pas de markdown, juste du JSON pur.
Alterne intelligemment les types de fond (couleurs, images, vidéos) pour créer un rythme visuel premium.
Le ton doit être premium, rassurant, et mettre fortement en avant les avantages du paiement à la livraison (COD) et de la livraison express.`;

    try {
        const completion = await groq.chat.completions.create({
            model: "llama-3.3-70b-versatile",
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: `Boutique: ${storeName || 'Ma Boutique'}. Secteur: ${industry || 'Vente en ligne globale'}` }
            ],
            response_format: { type: "json_object" },
            temperature: 0.7,
        });

        const jsonStr = completion.choices[0]?.message?.content;
        return JSON.parse(jsonStr); // should return { sections: [...] }
    } catch (error) {
        console.error("Groq generateStorefront error:", error);
        throw new functions.https.HttpsError('internal', 'Erreur lors de la génération IA', error.message);
    }
});

exports.enhanceCopywriting = functions.runWith({ secrets: ["GROQ_API_KEY"] }).https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'User must be logged in.');
    }

    const { text, fieldType } = data; // fieldType = 'title', 'subtitle', etc.

    if (!process.env.GROQ_API_KEY) {
        throw new functions.https.HttpsError('internal', 'GROQ_API_KEY non configurée.');
    }

    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

    const prompt = `Tu es un copywriter e-commerce de génie pour le marché marocain (Cash on Delivery).
Améliore ce texte d'un marchand pour le rendre plus percutant, vendeur et rassurant. 
Type de champ: ${fieldType || 'texte général'}.
Texte original: "${text}"

Règles:
- Réponds DIRECTEMENT avec le texte amélioré.
- Pas de guillemets autour du texte.
- Pas d'introduction ni de conclusion ni de markdown.
- Reste concis (adapté à un ${fieldType || 'texte'}).`;

    try {
        const completion = await groq.chat.completions.create({
            model: "llama-3.3-70b-versatile",
            messages: [
                { role: "user", content: prompt }
            ],
            temperature: 0.7,
        });

        const enhancedText = completion.choices[0]?.message?.content?.trim();
        return { enhancedText };
    } catch (error) {
        console.error("Groq enhanceCopywriting error:", error);
        throw new functions.https.HttpsError('internal', "Erreur lors de l'amélioration IA", error.message);
    }
});

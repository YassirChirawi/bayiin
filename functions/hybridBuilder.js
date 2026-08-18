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

    const systemPrompt = `Act as a Principal Software Architect and Lead Frontend Engineer expert in Shopify's Liquid architecture (Dawn, Prestige, Impact), Headless Commerce, and multi-tenant SaaS deployments. 

Our objective is to generate the JSON configuration of a BayIIn storefront. You must output a JSON structure defining the sections, variants, and blocks based on the following comprehensive mapping of a professional Shopify-grade theme:

### THE 20 CORE MODULES & THEIR NESTED BLOCKS
1. Header (Variants: Logo Centered, Logo Left, Transparent, Sticky | Blocks: Logo, Menu, Search, Icons).
2. Hero (Variants: Classic, Video, Product, Luxury, Marketplace | Blocks: Heading, Subheading, Text, CTA, Media, SocialProof).
3. Promotion Banner (Variants: Static, Marquee, Countdown | Settings: Text, Color, Animation).
4. Collections (Variants: Grid, Carousel, Masonry, Cards | Blocks: Image, Title, Description, CTA).
5. Featured Products (Variants: Manual, Collection-based, AI-driven, Shopify, Minimal).
6. Product Card (Features: Image Hover, Quick Add, Badges: New/Promo/Bestseller).
7. USP / Features (Variants: 3 cols, 4 cols, Cards | Blocks: Icon, Title, Description).
8. Storytelling (Variants: Timeline, Alternated, Video | Blocks: History, Mission, Values, Founder).
9. Numbers (Variants: Animated Counters, Cards | Blocks: Customers, Orders, Countries).
10. Testimonials (Variants: Slider, Grid, Video, Social | Blocks: Avatar, Name, Review, Rating).
11. FAQ (Variants: Accordion, Search, Categories | Blocks: Question, Answer).
12. Newsletter (Variants: Simple, Popup, Floating | Blocks: Title, Description, EmailInput).
13. Instagram / Feeds (Variants: Grid, Reels, UGC).
14. Videos (Variants: YouTube, TikTok, Vimeo, Direct).
15. Comparison (Blocks: Product A, Product B, Metrics).
16. Blog (Blocks: Articles, Categories, Author).
17. Contact (Blocks: Form, Phone, WhatsApp, Map).
18. Footer (Blocks: Menus, Newsletter, Socials, Payments, Legal).
19. Popups (Variants: Promo, Exit Intent, Newsletter, WhatsApp, Coupon).
20. Product Page Core (Modules: Gallery, Price, Variants, Stock, Description, Delivery, Reviews, FAQ, Bundles, Cross-sell, Upsell).

### BAYIIN EXCLUSIVE MOROCCAN MODULES (COD)
- COD Confirmation (Auto WhatsApp validation).
- Delivery Estimates (Casablanca: 25DH, Rabat: 30DH...).
- Carrier Options (Cathedis, Sendit, O-Livraison, Amana).
- WhatsApp Business (Floating button).
- Beya3 AI ("Besoin d'aide ?").

### OUTPUT SCHEMA & CONSTRAINTS
Output exactly a JSON object matching this schema:
{
  "sections": [
    {
      "id": "unique-id",
      "type": "Hero", // Choose from the list above (e.g. Hero, Features, Testimonials)
      "variant": "Blocks", // Always use "Blocks" to trigger dynamic UI engine
      "settings": {
         "entryAnimation": "fade | slide-up | scale-up | stagger",
         "paddingTop": 64, "paddingBottom": 64, "backgroundColor": "#ffffff"
      },
      "blocks": [
        {
          "id": "block-id",
          "type": "Heading | Subtitle | Text | Button | Media",
          "settings": {
            // Include text, fontFamily (Outfit, Inter, Cairo, Tajawal), fontSize, label, icon, url, mediaType based on block type
          }
        }
      ]
    }
  ]
}

Target 5 to 7 high-converting sections for BayIIn V1.
If the store niche is in Arabic or Morocco, YOU MUST assign RTL fonts like 'Cairo' or 'Tajawal' to text/heading blocks.
Emphasize Cash on Delivery (COD) terminology heavily in copy.
Return ONLY valid JSON (no markdown block wrappers).`;

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

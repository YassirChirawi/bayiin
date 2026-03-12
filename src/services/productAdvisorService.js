/**
 * productAdvisorService.js
 * AI-powered product recommendation engine for KUO'S Cosmetics.
 * Uses Gemini to suggest complementary products based on SKU line codes.
 */

import { generateAIResponse } from './aiService';
import { KUOS_LINE_MAP, validateSKU } from '../lib/skuService';

// ─── Skin Profile Map per Line ────────────────────────────────────────────────
// Maps line codes → skin profile, to give Gemini meaningful context
const LINE_SKIN_PROFILES = {
    REN: 'Peau Mature / Anti-âge — besoin de renouvellement cellulaire',
    SVP: 'Peau Mixte à Grasse / Soin Intensif — ligne Supreme haute gamme',
    SEN: 'Peau Sensible / Réactive — formules douces et apaisantes',
    COL: 'Peau avec Taches / Éclat — ligne brightening Colastin',
    HYD: 'Peau Déshydratée — hydratation profonde',
    BRI: 'Peau Terne / Sans Éclat — illumination et correction',
    ANT: 'Peau Mature / Rides — action anti-âge ciblée',
    MIC: 'Nettoyage Doux / Démaquillage — tout type de peau',
    SER: 'Traitement Concentré — booster actif',
    MAS: 'Soin Hebdomadaire / Masque — régénération intensive',
    OIL: 'Soin Nourrissant / Huile — peau sèche à très sèche',
    TON: 'Équilibre pH / Préparation — avant sérum',
    CRM: 'Hydratation Quotidienne / Crème',
    SPF: 'Protection Solaire — tous types de peau',
    EYE: 'Contour des Yeux — cernes, poches, rides',
    LIP: 'Soin Lèvres — hydratation et protection',
    BOD: 'Soin Corps — hydratation et fermeté',
    HAI: 'Soin Cheveux — nutrition et force',
};

// ─── Rules-based Complementary Map (fast, no API call) ───────────────────────
const COMPLEMENTARY_RULES = {
    REN: ['SER', 'EYE', 'SPF'],    // Anti-age → sérum + yeux + SPF
    SVP: ['SER', 'MAS', 'TON'],    // Supreme → sérum + masque + toner
    SEN: ['MIC', 'CRM', 'EYE'],    // Sensitive → micellar + crème douce + yeux
    COL: ['SER', 'SPF', 'TON'],    // Colastin → sérum éclaircissant + SPF
    HYD: ['SER', 'MAS', 'OIL'],    // Hydra → sérum + masque + huile
    BRI: ['SER', 'SPF', 'TON'],    // Brightening → sérum + SPF
    ANT: ['EYE', 'SER', 'MAS'],
    MIC: ['TON', 'CRM'],
    SER: ['CRM', 'SPF'],
    MAS: ['SER', 'CRM'],
    OIL: ['CRM', 'BOD'],
    TON: ['SER', 'CRM'],
    SPF: ['MIC', 'TON'],
};

/**
 * Get rules-based complementary product suggestions (no API call, instant).
 * @param {string} sku  e.g. "DSVP001"
 * @param {Object[]} allProducts  Firestore products with sku field
 * @returns {{ suggestions: Array, lineProfile: string }}
 */
export function getComplementaryProducts(sku, allProducts = []) {
    const validation = validateSKU(sku);
    if (!validation.valid) return { suggestions: [], lineProfile: null };

    const { lineCode, lineName } = validation;
    const lineProfile = LINE_SKIN_PROFILES[lineCode] || lineName;
    const complementaryCodes = COMPLEMENTARY_RULES[lineCode] || [];

    // Map codes to actual products in the catalog
    const suggestions = complementaryCodes
        .flatMap(code => {
            const prefix = `D${code}`;
            const matches = allProducts.filter(p =>
                p.sku && p.sku.toUpperCase().startsWith(prefix) && p.sku !== sku
            );
            return matches.map(p => ({
                productId: p.id,
                sku: p.sku,
                name: p.name,
                price: p.price,
                lineCode: code,
                lineName: KUOS_LINE_MAP[code] || code,
                reason: `Complément ${lineName} → ${KUOS_LINE_MAP[code] || code}`,
            }));
        })
        .slice(0, 5); // Max 5 suggestions

    return { suggestions, lineProfile, lineCode, lineName };
}

/**
 * Get AI-enhanced suggestions using Gemini.
 * Falls back gracefully if AI not initialized.
 * @param {string} sku  The current product's SKU
 * @param {Object[]} cartItems  Current order cart items
 * @param {Object[]} allProducts  All store products
 * @returns {Promise<{ suggestions: Array, aiInsight: string, lineProfile: string }>}
 */
export async function getAISuggestions(sku, cartItems = [], allProducts = []) {
    const { suggestions, lineProfile, lineName } = getComplementaryProducts(sku, allProducts);

    // Build prompt for Gemini
    const cartNames = cartItems.map(i => i.name || i.articleName).filter(Boolean).join(', ') || 'aucun';
    const suggestionNames = suggestions.map(s => `${s.sku} - ${s.name}`).join('\n') || 'Aucun produit correspondant dans le catalogue';

    const prompt = `
Tu es un expert en cosmétique KUO'S. Un client achète :
Panier : ${cartNames}
Produit analysé : ${sku} (Ligne ${lineName} — ${lineProfile || 'Soin cosmétique'})

Produits complémentaires disponibles dans le catalogue :
${suggestionNames}

En 2 phrases maximum, explique pourquoi ces produits complémentaires sont pertinents pour ce profil de peau.
Sois concis, professionnel et orienté bénéfice client (en français).
`;

    let aiInsight = '';
    try {
        aiInsight = await generateAIResponse(prompt);
    } catch {
        aiInsight = `Ligne ${lineName} : associez avec les soins complémentaires pour une routine complète.`;
    }

    return { suggestions, aiInsight, lineProfile, lineName };
}

/**
 * Get complementary suggestions for a full cart (multiple SKUs).
 * Deduplicates and ranks by frequency.
 * @param {Object[]} cartItems  [{ sku, name, ... }]
 * @param {Object[]} allProducts
 */
export function getComplementaryForCart(cartItems = [], allProducts = []) {
    const seen = new Set(cartItems.map(i => i.sku).filter(Boolean));
    const scoreMap = {};

    cartItems.forEach(item => {
        if (!item.sku) return;
        const { suggestions } = getComplementaryProducts(item.sku, allProducts);
        suggestions.forEach(s => {
            if (seen.has(s.sku)) return; // Already in cart
            scoreMap[s.sku] = scoreMap[s.sku] || { ...s, score: 0 };
            scoreMap[s.sku].score += 1;
        });
    });

    return Object.values(scoreMap)
        .sort((a, b) => b.score - a.score)
        .slice(0, 4);
}

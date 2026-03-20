/**
 * productAdvisorService.js
 * AI-powered product recommendation engine for BayIIn.
 * Uses Gemini to suggest complementary products based on store configurations.
 */

import { generateAIResponse } from './aiService';
import { validateSKU } from '../lib/skuService';

/**
 * Get rules-based complementary product suggestions.
 * In a fully dynamic SaaS, this should be driven by the store's configured complementary rules.
 * For now, returns a generic fallback if no specific rules are set.
 * @param {string} sku  e.g. "PRD001"
 * @param {Object[]} allProducts  Firestore products with sku field
 * @param {Object} storeSettings  Store configuration
 * @returns {{ suggestions: Array, lineProfile: string }}
 */
export function getComplementaryProducts(sku, allProducts = [], storeSettings = null) {
    const validation = validateSKU(sku, storeSettings);
    if (!validation.valid) return { suggestions: [], lineProfile: null };

    const { lineCode, lineName } = validation;
    const lineProfile = storeSettings?.lineProfiles?.[lineCode] || lineName || "Gamme de produits";
    const complementaryCodes = storeSettings?.complementaryRules?.[lineCode] || [];

    let suggestions = [];

    if (complementaryCodes.length > 0) {
        // If the store configured specific line pairings
        suggestions = complementaryCodes
            .flatMap(code => {
                const matches = allProducts.filter(p =>
                    p.sku && p.sku.toUpperCase().includes(code.toUpperCase()) && p.sku !== sku
                );
                return matches.map(p => ({
                    productId: p.id,
                    sku: p.sku,
                    name: p.name,
                    price: p.price,
                    lineCode: code,
                    lineName: code,
                    reason: `Complément suggéré : Gamme ${code}`,
                }));
            })
            .slice(0, 5); // Max 5 suggestions
    } else {
        // Generic fallback: suggest random other products from the catalog that aren't the same
        const otherProducts = allProducts.filter(p => p.sku !== sku).sort(() => 0.5 - Math.random());
        suggestions = otherProducts.slice(0, 3).map(p => ({
            productId: p.id,
            sku: p.sku,
            name: p.name,
            price: p.price,
            lineCode: 'GENERIC',
            lineName: 'Catalogue',
            reason: `Suggestion du catalogue`,
        }));
    }

    return { suggestions, lineProfile, lineCode, lineName };
}

/**
 * Get AI-enhanced suggestions using Gemini.
 * @param {string} sku  The current product's SKU
 * @param {Object[]} cartItems  Current order cart items
 * @param {Object[]} allProducts  All store products
 * @param {Object} storeSettings
 * @returns {Promise<{ suggestions: Array, aiInsight: string, lineProfile: string }>}
 */
export async function getAISuggestions(sku, cartItems = [], allProducts = [], storeSettings = null) {
    const { suggestions, lineProfile, lineName } = getComplementaryProducts(sku, allProducts, storeSettings);

    const storeName = storeSettings?.name || "cette boutique";
    const cartNames = cartItems.map(i => i.name || i.articleName).filter(Boolean).join(', ') || 'aucun';
    const suggestionNames = suggestions.map(s => `${s.sku} - ${s.name}`).join('\n') || 'Aucun produit correspondant dans le catalogue';

    const prompt = `
Tu es un expert de vente pour ${storeName}. Un client achète :
Panier : ${cartNames}
Produit analysé : ${sku} (${lineProfile || 'Article de boutique'})

Produits complémentaires disponibles dans le catalogue :
${suggestionNames}

En 2 phrases maximum, explique pourquoi ces produits complémentaires sont pertinents pour le client.
Sois concis, professionnel et orienté bénéfice client (en français).
`;

    let aiInsight = '';
    try {
        aiInsight = await generateAIResponse(prompt);
    } catch {
        aiInsight = `Associez cet article avec nos recommandations pour une meilleure expérience.`;
    }

    return { suggestions, aiInsight, lineProfile, lineName };
}

/**
 * Get complementary suggestions for a full cart (multiple SKUs).
 * Deduplicates and ranks by frequency.
 * @param {Object[]} cartItems  [{ sku, name, ... }]
 * @param {Object[]} allProducts
 * @param {Object} storeSettings
 */
export function getComplementaryForCart(cartItems = [], allProducts = [], storeSettings = null) {
    const seen = new Set(cartItems.map(i => i.sku).filter(Boolean));
    const scoreMap = {};

    cartItems.forEach(item => {
        if (!item.sku) return;
        const { suggestions } = getComplementaryProducts(item.sku, allProducts, storeSettings);
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

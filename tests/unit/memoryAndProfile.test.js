import { describe, it, expect } from 'vitest';

const { 
    extractKeywords, 
    tfIdfScore, 
    recencyScore,
    detectProfile,
    MERCHANT_PROFILES
} = require('../../functions/copilot/memoryService');

describe('TF-IDF Memory (Évolution 2)', () => {
    describe('extractKeywords', () => {
        it('extracts meaningful words and removes stopwords', () => {
            const kw = extractKeywords("Le profit de ma boutique est très bon ce mois");
            expect(kw).not.toContain('le');
            expect(kw).not.toContain('est');
            expect(kw).not.toContain('très');
            expect(kw).toContain('profit');
        });

        it('removes words shorter than 4 chars', () => {
            const kw = extractKeywords("Le CA du mois de mai est bon");
            expect(kw).not.toContain('ca');
            expect(kw).not.toContain('mai');
            expect(kw).not.toContain('bon');
        });

        it('handles empty/null input', () => {
            expect(extractKeywords('')).toEqual([]);
            expect(extractKeywords(null)).toEqual([]);
        });

        it('removes darija stopwords', () => {
            const kw = extractKeywords("wach kayn chi commande jdida dyal lyoum");
            expect(kw).not.toContain('wach');
            expect(kw).not.toContain('kayn');
            expect(kw).not.toContain('dyal');
        });

        it('deduplicates keywords', () => {
            const kw = extractKeywords("profit profit profit marge marge");
            expect(kw.filter(w => w === 'profit').length).toBe(1);
            expect(kw.filter(w => w === 'marge').length).toBe(1);
        });

        it('normalizes accents for matching', () => {
            const kw = extractKeywords("élevé préférence détaillé");
            expect(kw).toContain('eleve');
            expect(kw).toContain('preference');
        });
    });

    describe('tfIdfScore', () => {
        it('returns 0 for empty inputs', () => {
            expect(tfIdfScore([], ['test'])).toBe(0);
            expect(tfIdfScore(['test'], [])).toBe(0);
            expect(tfIdfScore(null, ['test'])).toBe(0);
        });

        it('returns positive score for overlapping keywords', () => {
            const score = tfIdfScore(
                ['profit', 'marge', 'rentabilite', 'augmenter'],
                ['profit', 'marge']
            );
            expect(score).toBeGreaterThan(0);
        });

        it('returns higher score for more overlap', () => {
            const low = tfIdfScore(
                ['profit', 'marge', 'rentabilite', 'augmenter'],
                ['profit']
            );
            const high = tfIdfScore(
                ['profit', 'marge', 'rentabilite', 'augmenter'],
                ['profit', 'marge', 'rentabilite']
            );
            expect(high).toBeGreaterThan(low);
        });

        it('returns 0 for no overlap', () => {
            const score = tfIdfScore(['profit', 'marge'], ['stock', 'rupture']);
            expect(score).toBe(0);
        });
    });

    describe('recencyScore', () => {
        it('returns ~1 for very recent dates', () => {
            const score = recencyScore(new Date());
            expect(score).toBeGreaterThan(0.9);
        });

        it('returns lower score for older dates', () => {
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
            const score = recencyScore(thirtyDaysAgo);
            expect(score).toBeLessThan(0.5);
        });

        it('returns 0 for null input', () => {
            expect(recencyScore(null)).toBe(0);
        });
    });
});

describe('Merchant Profile (Évolution 5)', () => {
    describe('detectProfile', () => {
        it('detects analyst profile from detailed questions', () => {
            const result = detectProfile([
                { content: "Donne-moi les détails exacts de chaque produit" },
                { content: "Je veux un breakdown précis des chiffres par ville" },
                { content: "Quel est le pourquoi de cette baisse ?" }
            ]);
            expect(result).not.toBeNull();
            expect(result.profile).toBe('analyst');
        });

        it('detects busy profile from short messages', () => {
            const result = detectProfile([
                { content: "vite" },
                { content: "résumé CA" },
                { content: "bref" }
            ]);
            expect(result).not.toBeNull();
            expect(result.profile).toBe('busy');
        });

        it('detects learner profile from questions', () => {
            const result = detectProfile([
                { content: "Comment fonctionne le calcul de la marge ?" },
                { content: "Tu peux m'expliquer ce que veut dire ROAS ?" },
                { content: "Je voudrais comprendre la différence entre CA et profit" }
            ]);
            expect(result).not.toBeNull();
            expect(result.profile).toBe('learner');
        });

        it('detects action_oriented profile', () => {
            const result = detectProfile([
                { content: "Faut faire quelque chose maintenant" },
                { content: "Quelle action pour corriger ça ?" },
                { content: "Lance la solution directement" }
            ]);
            expect(result).not.toBeNull();
            expect(result.profile).toBe('action_oriented');
        });

        it('returns null for empty messages', () => {
            expect(detectProfile([])).toBeNull();
            expect(detectProfile(null)).toBeNull();
        });

        it('has a confidence score', () => {
            const result = detectProfile([
                { content: "Donne-moi les détails exacts de chaque produit" }
            ]);
            expect(result.confidence).toBeGreaterThan(0);
            expect(result.confidence).toBeLessThanOrEqual(1);
        });
    });

    describe('MERCHANT_PROFILES', () => {
        it('has all 4 profiles defined', () => {
            expect(Object.keys(MERCHANT_PROFILES)).toHaveLength(4);
            expect(MERCHANT_PROFILES.analyst).toBeDefined();
            expect(MERCHANT_PROFILES.busy).toBeDefined();
            expect(MERCHANT_PROFILES.learner).toBeDefined();
            expect(MERCHANT_PROFILES.action_oriented).toBeDefined();
        });

        it('each profile has required fields', () => {
            for (const profile of Object.values(MERCHANT_PROFILES)) {
                expect(profile.indicators).toBeDefined();
                expect(Array.isArray(profile.indicators)).toBe(true);
                expect(profile.tone).toBeDefined();
                expect(profile.detailLevel).toBeDefined();
                expect(profile.preferredFormat).toBeDefined();
            }
        });
    });
});

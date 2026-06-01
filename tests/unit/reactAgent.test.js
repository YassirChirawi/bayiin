import { describe, it, expect } from 'vitest';

// Import the pure functions (no Firebase dependency)
const { shouldUseReAct } = require('../../functions/copilot/reactAgent');

describe('ReAct Agent', () => {
    describe('shouldUseReAct', () => {
        it('returns false for simple questions', () => {
            expect(shouldUseReAct("Quel est mon CA ?")).toBe(false);
            expect(shouldUseReAct("Combien de commandes aujourd'hui ?")).toBe(false);
            expect(shouldUseReAct("Montre-moi les retours")).toBe(false);
            expect(shouldUseReAct("Bonjour")).toBe(false);
        });

        it('returns true for "pourquoi" questions', () => {
            expect(shouldUseReAct("Pourquoi ma marge baisse ce mois-ci ?")).toBe(true);
            expect(shouldUseReAct("Pourquoi mon CA est plus bas que le mois dernier ?")).toBe(true);
        });

        it('returns true for "comment améliorer" questions', () => {
            expect(shouldUseReAct("Comment améliorer ma rentabilité ?")).toBe(true);
            expect(shouldUseReAct("Comment augmenter mes ventes ?")).toBe(true);
            expect(shouldUseReAct("Comment réduire mes retours ?")).toBe(true);
            expect(shouldUseReAct("Comment optimiser mes coûts ?")).toBe(true);
        });

        it('returns true for complex analysis requests', () => {
            expect(shouldUseReAct("Fais-moi une analyse complète de mon business")).toBe(true);
            expect(shouldUseReAct("Donne-moi un diagnostic de ma boutique")).toBe(true);
            expect(shouldUseReAct("Fais un bilan du mois")).toBe(true);
        });

        it('returns true for strategy questions', () => {
            expect(shouldUseReAct("Quelle stratégie pour la rentrée ?")).toBe(true);
        });

        it('returns true for compound questions (multiple "et")', () => {
            expect(shouldUseReAct("Analyse mes ventes et mes retours et mes dépenses")).toBe(true);
            expect(shouldUseReAct("Donne-moi le CA et puis les marges et aussi les stocks")).toBe(true);
        });

        it('returns false for darija simple messages', () => {
            expect(shouldUseReAct("chhal dert lyoum")).toBe(false);
            expect(shouldUseReAct("wach kayn chi commande jdida")).toBe(false);
        });

        it('returns true for recommendation requests', () => {
            expect(shouldUseReAct("Tes recommandations pour ce mois ?")).toBe(true);
            expect(shouldUseReAct("Donne-moi un action plan")).toBe(true);
        });
    });
});

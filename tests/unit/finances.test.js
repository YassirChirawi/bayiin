import { describe, it, expect } from 'vitest';
import { calculateOrderProfit } from '../../src/utils/financeUtils.js';

describe('calculateOrderProfit', () => {

    it('1. Profit positif standard', () => {
        // Vente 500 MAD, coût 150, livraison 30, pub 50 → profit 270
        const profit = calculateOrderProfit(500, 150, 30, 50);
        expect(profit).toBe(270);
    });

    it('2. Profit négatif (retour / vente à 0)', () => {
        // Vente 0, coût 150, livraison 30, pub 50 → profit -230
        const profit = calculateOrderProfit(0, 150, 30, 50);
        expect(profit).toBe(-230);
    });

    it('3. Commande gratuite (tous les montants à 0)', () => {
        // Tous à 0 → profit 0
        const profit = calculateOrderProfit(0, 0, 0, 0);
        expect(profit).toBe(0);
    });

    it('4. Grands montants', () => {
        // Vente 10000, coût 4000, livraison 200, pub 800 → profit 5000
        const profit = calculateOrderProfit(10000, 4000, 200, 800);
        expect(profit).toBe(5000);
    });

    it('5. Valeurs décimales', () => {
        // Vente 299.99, coût 89.50, livraison 25.00, pub 40.00 → profit 145.49
        const profit = calculateOrderProfit(299.99, 89.50, 25.00, 40.00);
        expect(profit).toBe(145.49);
    });

});

import { describe, it, expect } from 'vitest';
import { calculateProductPrice } from './pricing';

describe('calculateProductPrice', () => {
    it('returns 0 if no product is provided', () => {
        expect(calculateProductPrice(null, 'RETAIL')).toBe(0);
        expect(calculateProductPrice(undefined, 'PRO')).toBe(0);
    });

    it('returns retail price for RETAIL customerType', () => {
        const product = { price: 100 };
        expect(calculateProductPrice(product, 'RETAIL')).toBe(100);
        expect(calculateProductPrice(product, undefined)).toBe(100);
        expect(calculateProductPrice(product, null)).toBe(100);
    });

    it('returns calculated discount price for PRO customerType if no proPrice is defined', () => {
        const product = { price: 100 };
        expect(calculateProductPrice(product, 'PRO')).toBe(70);

        const product2 = { price: 50 };
        expect(calculateProductPrice(product2, 'PRO')).toBe(35);
    });

    it('returns explicit proPrice for PRO customerType if defined', () => {
        const product = { price: 100, proPrice: 60 };
        expect(calculateProductPrice(product, 'PRO')).toBe(60);
    });

    it('handles string prices correctly', () => {
        const product = { price: "100" };
        expect(calculateProductPrice(product, 'RETAIL')).toBe(100);
        expect(calculateProductPrice(product, 'PRO')).toBe(70);
    });
});

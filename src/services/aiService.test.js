import { describe, it, expect, vi } from 'vitest';
import { detectFinancialLeaks, evaluateOrderRisk } from './aiService';

// Mock values
const CAC = 20;

describe('detectFinancialLeaks', () => {
    const today = new Date();
    const twentyDaysAgo = new Date(new Date().setDate(today.getDate() - 20)).toISOString().split('T')[0];
    const twoDaysAgo = new Date(new Date().setDate(today.getDate() - 2)).toISOString().split('T')[0];

    const mockOrders = [
        {
            id: '1',
            orderNumber: 'ORD-001',
            status: 'livré',
            isPaid: false,
            date: twentyDaysAgo, // Delivered > 15 days ago + Unpaid = GHOST
            price: 200,
            quantity: 1,
            costPrice: 50,
            realDeliveryCost: 30
        },
        {
            id: '2',
            orderNumber: 'ORD-002',
            status: 'livré',
            isPaid: true, // Paid = OK
            date: twentyDaysAgo,
            price: 200,
            quantity: 1
        },
        {
            id: '3',
            orderNumber: 'ORD-003',
            status: 'livré',
            isPaid: false, // Unpaid but recent = OK
            date: twoDaysAgo,
            price: 200,
            quantity: 1
        },
        {
            id: '4',
            orderNumber: 'ORD-004',
            status: 'livré',
            isPaid: true,
            price: 100, // Price 100
            quantity: 1,
            costPrice: 80, // Cost 80
            realDeliveryCost: 10 // Deliv 10
            // CAC 20 (passed in)
            // Total Cost = 80 + 10 + 20 = 110 > 100 = NEGATIVE MARGIN
        }
    ];

    it('should detect ghost orders (delivered > 15 days ago and unpaid)', () => {
        const result = detectFinancialLeaks(mockOrders, CAC);
        expect(result.ghostOrders).toHaveLength(1);
        expect(result.ghostOrders[0].reference).toBe('ORD-001');
    });

    it('should detect negative margins', () => {
        const result = detectFinancialLeaks(mockOrders, CAC);
        expect(result.negativeMargins).toHaveLength(1);
        expect(result.negativeMargins[0].reference).toBe('ORD-004');
        expect(result.negativeMargins[0].loss).toBe("10.00"); // 110 - 100
    });

    it('should return summary and hasLeaks status', () => {
        const result = detectFinancialLeaks(mockOrders, CAC);
        expect(result.hasLeaks).toBe(true);
        expect(result.summary).toContain('1 commandes fantômes');
        expect(result.summary).toContain('1 marges négatives');
    });
});

describe('evaluateOrderRisk', () => {
    it('should verify high risk for high value and short address', () => {
        const order = {
            total: 1200, // +20
            address: 'Agdal', // < 10 chars -> +30
            city: 'Tanger' // Remote -> +10
        };
        // Total Score: 60 -> Elevé
        const result = evaluateOrderRisk(order);
        expect(result.score).toBe(60);
        expect(result.riskLevel).toBe('Élevé');
    });

    it('should verify low risk for low value and Casablanca', () => {
        const order = {
            total: 300,
            address: 'Bd Zerktouni, Maarif, Casablanca', // OK
            city: 'Casablanca' // -10
        };
        // Total Score: -10 (clamped to 0? Logic says score can be negative)
        const result = evaluateOrderRisk(order);
        expect(result.riskLevel).toBe('Faible');
    });
});

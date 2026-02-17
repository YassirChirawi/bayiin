
import { describe, it, expect, vi } from 'vitest';
import { generateAlerts } from './notificationUtils';

// Mock dependencies if needed, but integration testing with real helpers is often better for utils.
// However, since calculateFinancialStats and detectFinancialLeaks are pure, we can just feed data.

describe('generateAlerts', () => {
    it('should return empty array if no leaks', () => {
        const orders = [
            { id: 1, status: 'livré', isPaid: true, price: 200, costPrice: 50, quantity: 1 }
        ];
        const expenses = [];
        const alerts = generateAlerts(orders, expenses);
        expect(alerts).toHaveLength(0);
    });

    it('should generate critical alert for ghost orders', () => {
        // Ghost Order: Delivered > 15 days ago and NOT paid
        const oldDate = new Date();
        oldDate.setDate(oldDate.getDate() - 20);

        const orders = [
            {
                id: 'ghost1',
                status: 'livré',
                isPaid: false, // Not paid
                deliveryDate: oldDate.toISOString(),
                price: 1000,
                quantity: 1,
                costPrice: 200
            }
        ];
        const expenses = [];

        const alerts = generateAlerts(orders, expenses);

        expect(alerts).toHaveLength(1);
        expect(alerts[0].id).toBe('ghost-orders');
        expect(alerts[0].type).toBe('critical');
        expect(alerts[0].message).toContain('1000'); // Check if amount is in message
    });

    it('should generate warning alert for negative margins', () => {
        // Negative Margin: Cost (200) > Price (100)
        // CAC will be 0 if no expenses
        const orders = [
            {
                id: 'loss1',
                status: 'livré',
                isPaid: true,
                price: 100,
                quantity: 1,
                costPrice: 200, // Higher than price
                realDeliveryCost: 0
            }
        ];
        const expenses = []; // No extra expenses

        const alerts = generateAlerts(orders, expenses);

        expect(alerts).toHaveLength(1);
        expect(alerts[0].id).toBe('neg-margins');
        expect(alerts[0].type).toBe('warning');
    });

    it('should combine both alerts', () => {
        const oldDate = new Date();
        oldDate.setDate(oldDate.getDate() - 20);

        const orders = [
            // Ghost
            {
                id: 'ghost1',
                status: 'livré',
                isPaid: false,
                deliveryDate: oldDate.toISOString(),
                price: 1000,
                quantity: 1
            },
            // Loss
            {
                id: 'loss1',
                status: 'livré',
                isPaid: true,
                price: 100,
                quantity: 1,
                costPrice: 200
            }
        ];
        const expenses = [];

        const alerts = generateAlerts(orders, expenses);
        expect(alerts).toHaveLength(2);
    });
});

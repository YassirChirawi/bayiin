import { describe, it, expect } from 'vitest';
import { calculateFinancialStats } from './financials';

describe('Financial Logic Edge Cases', () => {
    
    it('Scenario 1: Partial payment should trigger full COGS liability', () => {
        const orders = [{
            id: 'ord-1',
            price: 2000,
            costPrice: 1000,
            quantity: 1,
            amountPaid: 200,
            realDeliveryCost: 45,
            status: 'livraison',
            isPaid: false
        }];
        const expenses = [];
        
        const { res } = calculateFinancialStats(orders, expenses);
        
        // Realized = 200, COGS = 1000, Delivery = 45 (because delivery > 0 triggers it)
        // Net = 200 - 1000 - 45 = -845
        expect(res.realizedRevenue).toBe(200);
        expect(res.totalCOGS).toBe(1000);
        expect(res.netResult).toBe(-845);
    });

    it('Scenario 2: Returns should capture shipping costs as a loss', () => {
        const orders = [{
            id: 'ord-2',
            price: 500,
            costPrice: 200,
            quantity: 1,
            status: 'retour',
            realDeliveryCost: 40,
            isPaid: false
        }];
        const { res } = calculateFinancialStats(orders, []);
        
        // Realized = 0, COGS = 0 (returned to stock), Delivery = 40
        // Net = 0 - 0 - 40 = -40
        expect(res.realizedRevenue).toBe(0);
        expect(res.totalCOGS).toBe(0);
        expect(res.netResult).toBe(-40);
    });

    it('Scenario 3: Refunds (Avoirs) should decrease net revenue and profit', () => {
        const orders = [{
            id: 'ord-3',
            price: 1000,
            costPrice: 400,
            quantity: 1,
            status: 'livré',
            isPaid: true
        }];
        const refunds = [{
            id: 'ref-1',
            amount: 300,
            date: '2026-04-23'
        }];
        
        const { res } = calculateFinancialStats(orders, [], refunds);
        
        // Realized = 1000, COGS = 400, Refund = 300
        // Net Result = 1000 - 400 - 300 = 300
        // Net Revenue (for margin) = 1000 - 300 = 700
        // Margin = (300 / 700) * 100 = 42.85...% -> 42.9
        expect(res.netResult).toBe(300);
        expect(res.margin).toBe("42.9");
    });

    it('Scenario 4: Import fees should impact global net result', () => {
        const orders = [{
            id: 'ord-4',
            price: 10000,
            costPrice: 4000,
            quantity: 1,
            status: 'livré',
            isPaid: true
        }];
        const importFees = 2000;
        
        const { res } = calculateFinancialStats(orders, [], [], null, null, importFees);
        
        // Net = 10000 - 4000 - 2000 = 4000
        expect(res.netResult).toBe(4000);
    });

    it('Scenario 5: High Ads Spend with low volume should yield high CAC and low ROAS', () => {
        const orders = [{
            id: 'ord-5',
            price: 500,
            costPrice: 200,
            quantity: 1,
            status: 'livré',
            isPaid: true
        }];
        const expenses = [{
            id: 'exp-1',
            amount: 1000,
            category: 'Ads',
            date: '2026-04-23'
        }];
        
        const dateRange = { start: '2026-04-01', end: '2026-04-30' };
        const { res } = calculateFinancialStats(orders, expenses, [], dateRange);
        
        expect(res.roas).toBe("0.50");
        expect(res.cac).toBe("1000.00");
        expect(res.netResult).toBe(-700);
    });

    it('Scenario 6: Moroccan TVA (20%) should be calculated only on delivered revenue', () => {
        const orders = [
            { id: 'o-1', price: 1200, quantity: 1, status: 'livré' }, // TVA included: 200
            { id: 'o-2', price: 600, quantity: 1, status: 'reçu' }    // Not delivered, no TVA yet
        ];
        const { res } = calculateFinancialStats(orders, []);
        
        // Delivered Revenue = 1200. TVA = 1200 - (1200 / 1.2) = 200
        expect(res.deliveredRevenue).toBe(1200);
        expect(res.tvaCollectee).toBe(200);
    });

    it('Scenario 7: Collection Filtering should isolate expenses', () => {
        const expenses = [
            { id: 'e-1', amount: 500, collectionId: 'coll-A' },
            { id: 'e-2', amount: 300, collectionId: 'coll-B' }
        ];
        // Filter for coll-A
        const { res: resA } = calculateFinancialStats([], expenses, [], null, 'coll-A');
        expect(resA.totalExpenses).toBe(500);
        
        // Filter for coll-B
        const { res: resB } = calculateFinancialStats([], expenses, [], null, 'coll-B');
        expect(resB.totalExpenses).toBe(300);
    });

    it('Scenario 8: Date Range should exclude out-of-range orders and expenses', () => {
        const orders = [
            { id: 'o-old', date: '2026-01-01', price: 1000, quantity: 1, status: 'livré' },
            { id: 'o-new', date: '2026-04-15', price: 500, quantity: 1, status: 'livré' }
        ];
        const expenses = [
            { id: 'e-old', date: '2026-01-01', amount: 200 },
            { id: 'e-new', date: '2026-04-20', amount: 100 }
        ];
        const dateRange = { start: '2026-04-01', end: '2026-04-30' };
        
        // Note: The function assumes orders are already filtered by date in the main component, 
        // but it filters expenses itself. Let's verify expense filtering.
        const { res } = calculateFinancialStats(orders.filter(o => o.date >= '2026-04-01'), expenses, [], dateRange);
        
        expect(res.deliveredRevenue).toBe(500);
        expect(res.totalExpenses).toBe(100);
    });

    it('Scenario 9: System should not crash with empty or null data', () => {
        const { res } = calculateFinancialStats([], [], []);
        expect(res.netResult).toBe(0);
        expect(res.margin).toBe("0.0");
        expect(res.roas).toBe("0.00");
    });

    it('Scenario 10: Shipping Ratio should include category-specific shipping expenses', () => {
        const orders = [
            { id: 'o-1', price: 1000, quantity: 1, status: 'livré', isPaid: true, realDeliveryCost: 50 }
        ];
        const expenses = [
            { id: 'e-1', amount: 30, category: 'Shipping', date: '2026-04-23' }
        ];
        const dateRange = { start: '2026-04-01', end: '2026-04-30' };
        
        const { res } = calculateFinancialStats(orders, expenses, [], dateRange);
        
        // Total Shipping = 50 (order) + 30 (expense) = 80
        // Net Revenue = 1000
        // Ratio = (80 / 1000) * 100 = 8.0%
        expect(res.shippingRatio).toBe("8.0");
    });

});

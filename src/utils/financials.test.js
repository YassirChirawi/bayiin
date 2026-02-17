import { describe, it, expect } from 'vitest';
import { calculateFinancialStats } from './financials';

describe('calculateFinancialStats', () => {
    const mockOrders = [
        {
            id: 1,
            status: 'livré',
            isPaid: true,
            price: 200,
            quantity: 1,
            costPrice: 50,
            realDeliveryCost: 30
        },
        {
            id: 2,
            status: 'livré',
            isPaid: false, // Delivered but not paid yet
            price: 150,
            quantity: 1,
            costPrice: 40,
            realDeliveryCost: 30
        },
        {
            id: 3,
            status: 'retour',
            isPaid: false,
            price: 200,
            quantity: 1,
            costPrice: 50,
            realDeliveryCost: 30 // Delivery fee paid for return
        }
    ];

    const mockExpenses = [
        { id: 1, category: 'Ads', amount: 100, date: '2023-01-10' }, // Inside range
        { id: 2, category: 'Other', amount: 50, date: '2023-01-15' }, // Inside range
        { id: 3, category: 'Ads', amount: 200, date: '2023-02-01' }  // Outside range
    ];

    const dateRange = { start: '2023-01-01', end: '2023-01-31' };

    it('should calculate realized revenue correctly (only paid orders)', () => {
        const { res } = calculateFinancialStats(mockOrders, [], dateRange);
        // Only order 1 is paid: 200 * 1 = 200
        expect(res.realizedRevenue).toBe(200);
    });

    it('should calculate delivered revenue correctly (all delivered orders)', () => {
        const { res } = calculateFinancialStats(mockOrders, [], dateRange);
        // Order 1 (200) + Order 2 (150) = 350
        expect(res.deliveredRevenue).toBe(350);
        expect(res.deliveredCount).toBe(2);
    });

    it('should sum expenses within date range', () => {
        const { res, filteredExpenses } = calculateFinancialStats([], mockExpenses, dateRange);
        // Expense 1 (100) + Expense 2 (50) = 150
        expect(res.totalExpenses).toBe(150);
        expect(filteredExpenses).toHaveLength(2);
    });

    it('should calculate Net Result correctly', () => {
        // Realized Revenue: 200 (Order 1)
        // COGS (Paid Only): 50 (Order 1)
        // Real Delivery (Delivered + Return): 30 (Ord 1) + 30 (Ord 2 - wait, realized logic?) 
        // Logic check: "We count delivery cost if status is 'livré' or 'retour' OR if realDeliveryCost > 0"
        // Order 1 (Livré): 30
        // Order 2 (Livré): 30
        // Order 3 (Retour): 30
        // Total Delivery: 90
        // Expenses: 150

        // Net Result = Realized (200) - COGS (50) - Delivery (90) - Expenses (150) = -90

        const { res } = calculateFinancialStats(mockOrders, mockExpenses, dateRange);
        expect(res.totalRealDelivery).toBe(90);
        expect(res.netResult).toBe(-90);
    });

    it('should calculate ROAS correctly', () => {
        // Realized Revenue: 200
        // Ads Spend: 100 (Expense 1)
        // ROAS = 200 / 100 = 2.00
        const { res } = calculateFinancialStats(mockOrders, mockExpenses, dateRange);
        expect(res.adsSpend).toBe(100);
        expect(res.roas).toBe("2.00");
    });
});

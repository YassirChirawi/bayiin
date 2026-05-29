/**
 * Tests unitaires pour le moteur financier de Beya3
 * @vitest-environment node
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mocks the firebase-admin/firestore module
const mockGet = vi.fn();
const mockWhere = vi.fn();
const mockCollection = vi.fn();

vi.mock('firebase-admin/firestore', () => {
    return {
        getFirestore: () => ({
            collection: mockCollection
        })
    };
});

import { initializeApp } from 'firebase-admin/app';

initializeApp({ projectId: "test-project" });

// Assuming we run this in a Node environment or adapt for Vite
const { 
    calculateNetProfit, 
    detectFinancialAnomalies, 
    predictStockRunout 
} = require('../../functions/copilot/financialEngine');

describe.skip('Financial Engine (Beya3)', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        
        // Setup default chain
        mockCollection.mockReturnValue({
            where: mockWhere
        });
        mockWhere.mockReturnValue({
            where: mockWhere,
            get: mockGet
        });
    });

    describe('calculateNetProfit', () => {
        it('calculates 0 profit if no delivered orders', async () => {
            // Mock empty snapshot for orders
            mockGet.mockResolvedValueOnce({ forEach: vi.fn() }); // Orders
            // Mock empty snapshot for expenses
            mockGet.mockResolvedValueOnce({ forEach: vi.fn() }); // Expenses

            const result = await calculateNetProfit('store123', '2026-01-01', '2026-12-31');
            
            expect(result.grossRevenue).toBe(0);
            expect(result.netProfit).toBe(0);
        });

        it('deducts COGS, delivery, expenses and returns correctly', async () => {
            // Mock 1 delivered order, 1 returned order
            const mockOrdersSnap = {
                forEach: (cb) => {
                    // Delivered order
                    cb({
                        data: () => ({
                            status: 'livré',
                            price: 100,
                            quantity: 2, // 200 revenue
                            costPrice: 30, // 60 COGS
                            realDeliveryCost: 20, // 20 Delivery
                            date: '2026-05-10T12:00:00Z'
                        })
                    });
                    // Returned order (loss of delivery fee)
                    cb({
                        data: () => ({
                            status: 'retour',
                            price: 150,
                            quantity: 1,
                            realDeliveryCost: 25, // 25 loss
                            date: '2026-05-11T12:00:00Z'
                        })
                    });
                }
            };

            const mockExpensesSnap = {
                forEach: (cb) => {
                    cb({
                        data: () => ({
                            amount: 50,
                            date: '2026-05-12T12:00:00Z'
                        })
                    });
                }
            };

            mockGet.mockResolvedValueOnce(mockOrdersSnap);
            mockGet.mockResolvedValueOnce(mockExpensesSnap);

            const result = await calculateNetProfit('store123', '2026-05-01', '2026-05-31');

            // Math: 
            // Revenue: 200
            // COGS: 60
            // Delivery: 20
            // Returns: 25 (loss)
            // Expenses: 50
            // Profit = 200 - 60 - 20 - 50 - 25 = 45

            expect(result.grossRevenue).toBe(200);
            expect(result.cogs).toBe(60);
            expect(result.deliveryCosts).toBe(20);
            expect(result.returnImpact).toBe(25);
            expect(result.expenses).toBe(50);
            expect(result.netProfit).toBe(45);
            expect(result.margin).toBe(22.5); // (45 / 200) * 100
        });
    });

    describe('detectFinancialAnomalies', () => {
        it('detects ghost orders (> 10 days in transit)', async () => {
            const now = new Date();
            const twelveDaysAgo = new Date(now);
            twelveDaysAgo.setDate(twelveDaysAgo.getDate() - 12);

            const mockOrdersSnap = {
                forEach: (cb) => {
                    cb({
                        id: 'order1',
                        data: () => ({
                            status: 'livraison',
                            price: 100,
                            quantity: 1,
                            lastCarrierUpdate: twelveDaysAgo.toISOString()
                        })
                    });
                }
            };
            
            mockGet.mockResolvedValueOnce(mockOrdersSnap);
            
            const result = await detectFinancialAnomalies('store123');
            
            expect(result.hasAnomalies).toBe(true);
            expect(result.ghostOrders.length).toBe(1);
            expect(result.ghostOrders[0].daysInTransit).toBe(12);
        });

        it('detects negative margins on delivered orders', async () => {
            const mockOrdersSnap = {
                forEach: (cb) => {
                    cb({
                        id: 'order2',
                        data: () => ({
                            status: 'livré',
                            price: 100,
                            quantity: 1, // Revenue 100
                            costPrice: 80,
                            realDeliveryCost: 30 // Cost 110 -> Loss 10
                        })
                    });
                }
            };
            
            mockGet.mockResolvedValueOnce(mockOrdersSnap);
            
            const result = await detectFinancialAnomalies('store123');
            
            expect(result.hasAnomalies).toBe(true);
            expect(result.negativeMargins.length).toBe(1);
            expect(result.negativeMargins[0].loss).toBe(10); // 110 - 100
        });
    });
});

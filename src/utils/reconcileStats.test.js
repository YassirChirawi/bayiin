import { describe, it, expect, vi, beforeEach } from 'vitest';
import { reconcileStoreStats } from './reconcileStats';

// Mock specific Firestore functions used in the file
// We need to match the imports in reconcileStats.js
vi.mock('firebase/firestore', async (importOriginal) => {
    const actual = await importOriginal();
    return {
        ...actual,
        collection: vi.fn(),
        getDocs: vi.fn(),
        query: vi.fn(),
        where: vi.fn(),
        doc: vi.fn(),
        writeBatch: vi.fn(() => ({
            set: vi.fn(),
            commit: vi.fn().mockResolvedValue(true)
        })),
        increment: vi.fn(),
    };
});

import { getDocs } from 'firebase/firestore';

describe('reconcileStoreStats', () => {
    const mockDb = {};
    const storeId = 'store-123';

    it('should calculate global totals correctly', async () => {
        // Mock 2 orders
        const mockOrders = [
            {
                price: 100, quantity: 2, costPrice: 50, realDeliveryCost: 20,
                isPaid: true, status: 'livré', date: '2023-01-01'
            },
            {
                price: 200, quantity: 1, costPrice: 100, realDeliveryCost: 30,
                isPaid: false, status: 'expédié', date: '2023-01-02'
            }
        ];

        // Mock snapshot
        const mockSnapshot = {
            size: 2,
            forEach: (callback) => mockOrders.forEach(o => callback({ data: () => o }))
        };
        getDocs.mockResolvedValue(mockSnapshot);

        const stats = await reconcileStoreStats(mockDb, storeId);

        // Revenue: (100*2) + (200*1) = 400
        expect(stats.totals.revenue).toBe(400);
        expect(stats.totals.count).toBe(2);

        // Realized (Paid only): Order 1
        // Revenue: 200
        // COGS: 50*2 = 100
        // Delivery: 20
        expect(stats.totals.realizedRevenue).toBe(200);
        expect(stats.totals.realizedCOGS).toBe(100);
        expect(stats.totals.realizedDeliveryCost).toBe(20);

        // Delivered Revenue (Order 1 only)
        expect(stats.totals.deliveredRevenue).toBe(200);
    });

    it('should calculate daily stats correctly', async () => {
        const mockOrders = [
            { price: 100, quantity: 1, date: '2023-01-01T10:00:00' },
            { price: 100, quantity: 1, date: '2023-01-01T15:00:00' },
            { price: 50, quantity: 1, date: '2023-01-02T10:00:00' }
        ];

        const mockSnapshot = {
            size: 3,
            forEach: (callback) => mockOrders.forEach(o => callback({ data: () => o }))
        };
        getDocs.mockResolvedValue(mockSnapshot);

        const stats = await reconcileStoreStats(mockDb, storeId);

        expect(stats.daily['2023-01-01'].revenue).toBe(200);
        expect(stats.daily['2023-01-01'].count).toBe(2);
        expect(stats.daily['2023-01-02'].revenue).toBe(50);
    });
});

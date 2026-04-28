import { describe, it, expect } from 'vitest';
import { shouldRestock, shouldDeductStock, calculateStockDeltas, getOrderItems } from '../../src/utils/orderLogic';
import { ORDER_STATUS } from '../../src/utils/constants';

describe('Order Stock Management Logic', () => {

    describe('shouldRestock', () => {
        it('should return true when moving from RECEIVED to CANCELLED', () => {
            expect(shouldRestock(ORDER_STATUS.RECEIVED, ORDER_STATUS.CANCELLED)).toBe(true);
        });

        it('should return false when moving from CANCELLED to RETURNED (both inactive)', () => {
            expect(shouldRestock(ORDER_STATUS.CANCELLED, ORDER_STATUS.RETURNED)).toBe(false);
        });

        it('should return false when moving from RECEIVED to DELIVERED (both active)', () => {
            expect(shouldRestock(ORDER_STATUS.RECEIVED, ORDER_STATUS.DELIVERED)).toBe(false);
        });
    });

    describe('shouldDeductStock', () => {
        it('should return true when moving from CANCELLED back to RECEIVED', () => {
            expect(shouldDeductStock(ORDER_STATUS.CANCELLED, ORDER_STATUS.RECEIVED)).toBe(true);
        });

        it('should return false when moving from RECEIVED to LIVRAISON (both active)', () => {
            expect(shouldDeductStock(ORDER_STATUS.RECEIVED, ORDER_STATUS.LIVRAISON)).toBe(false);
        });
    });

    describe('calculateStockDeltas', () => {
        const productA = { id: 'prod-a', variantId: 'v1', quantity: 2 };
        const productB = { id: 'prod-b', quantity: 5 };

        it('should calculate correct delta for quantity change in active order', () => {
            const oldOrder = { status: ORDER_STATUS.RECEIVED, products: [productA] };
            const newOrder = { status: ORDER_STATUS.RECEIVED, products: [{ ...productA, quantity: 3 }] };

            const deltas = calculateStockDeltas(oldOrder, newOrder);
            // Old was 2, New is 3. Net change for product A should be -1 (deduct one more)
            expect(deltas['prod-a']).toHaveLength(1);
            expect(deltas['prod-a'][0].netChange).toBe(-1);
        });

        it('should calculate correct delta when item is removed from active order', () => {
            const oldOrder = { status: ORDER_STATUS.RECEIVED, products: [productA, productB] };
            const newOrder = { status: ORDER_STATUS.RECEIVED, products: [productA] };

            const deltas = calculateStockDeltas(oldOrder, newOrder);
            // Product B was removed. Net change should be +5 (restock the 5 removed items)
            expect(deltas['prod-b']).toHaveLength(1);
            expect(deltas['prod-b'][0].netChange).toBe(5);
        });

        it('should calculate correct delta when status changes from active to cancelled', () => {
            const oldOrder = { status: ORDER_STATUS.RECEIVED, products: [productA] };
            const newOrder = { status: ORDER_STATUS.CANCELLED, products: [productA] };

            const deltas = calculateStockDeltas(oldOrder, newOrder);
            // Status became cancelled. Net change should be +2 (restock all)
            expect(deltas['prod-a'][0].netChange).toBe(2);
        });
    });
});

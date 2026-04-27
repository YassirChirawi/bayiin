import { describe, it, expect } from 'vitest';
import { shouldRestock, shouldDeductStock, calculateStockDeltas, getOrderItems } from '../../src/utils/orderLogic';
import { ORDER_STATUS } from '../../src/utils/constants';

describe('orderLogic', () => {

    describe('shouldRestock', () => {
        it('should return true when moving from Active to Cancelled', () => {
            expect(shouldRestock(ORDER_STATUS.RECEIVED, ORDER_STATUS.CANCELLED)).toBe(true);
            expect(shouldRestock(ORDER_STATUS.SHIPPED, ORDER_STATUS.RETURNED)).toBe(true);
        });

        it('should return false when moving between Active states', () => {
            expect(shouldRestock(ORDER_STATUS.RECEIVED, ORDER_STATUS.CONFIRMED)).toBe(false);
            expect(shouldRestock(ORDER_STATUS.SHIPPED, ORDER_STATUS.DELIVERED)).toBe(false);
        });

        it('should return false when moving from Cancelled to Cancelled/Returned', () => {
            expect(shouldRestock(ORDER_STATUS.CANCELLED, ORDER_STATUS.RETURNED)).toBe(false);
        });
    });

    describe('shouldDeductStock', () => {
        it('should return true when moving from Cancelled to Active', () => {
            expect(shouldDeductStock(ORDER_STATUS.CANCELLED, ORDER_STATUS.RECEIVED)).toBe(true);
            expect(shouldDeductStock(ORDER_STATUS.RETURNED, ORDER_STATUS.SHIPPED)).toBe(true);
        });

        it('should return false when moving between Active states', () => {
            expect(shouldDeductStock(ORDER_STATUS.RECEIVED, ORDER_STATUS.CONFIRMED)).toBe(false);
        });

        it('should return false when moving from Active to Cancelled', () => {
            expect(shouldDeductStock(ORDER_STATUS.RECEIVED, ORDER_STATUS.CANCELLED)).toBe(false);
        });
    });

    describe('getOrderItems', () => {
        it('should extract items from single product order', () => {
            const data = { articleId: 'p1', variantId: 'v1', quantity: '2' };
            const items = getOrderItems(data);
            expect(items).toEqual([{ id: 'p1', variantId: 'v1', quantity: 2 }]);
        });

        it('should extract items from multi product order', () => {
            const data = { products: [{ id: 'p1', quantity: 1 }, { id: 'p2', variantId: 'v2', quantity: 3 }] };
            const items = getOrderItems(data);
            expect(items).toEqual([
                { id: 'p1', variantId: undefined, quantity: 1 },
                { id: 'p2', variantId: 'v2', quantity: 3 }
            ]);
        });
    });

    describe('calculateStockDeltas', () => {
        it('should calculate restock correctly (Active -> Cancelled)', () => {
            const oldData = { status: ORDER_STATUS.RECEIVED, articleId: 'p1', quantity: 2 };
            const newData = { status: ORDER_STATUS.CANCELLED, articleId: 'p1', quantity: 2 };
            
            const deltas = calculateStockDeltas(oldData, newData);
            // Expect +2 stock for p1
            expect(deltas['p1']).toEqual([{ id: 'p1', variantId: undefined, netChange: 2 }]);
        });

        it('should calculate deduct correctly (Cancelled -> Active)', () => {
            const oldData = { status: ORDER_STATUS.CANCELLED, articleId: 'p1', quantity: 2 };
            const newData = { status: ORDER_STATUS.RECEIVED, articleId: 'p1', quantity: 2 };
            
            const deltas = calculateStockDeltas(oldData, newData);
            // Expect -2 stock for p1
            expect(deltas['p1']).toEqual([{ id: 'p1', variantId: undefined, netChange: -2 }]);
        });

        it('should calculate diff correctly when quantity changes (Active -> Active)', () => {
            const oldData = { status: ORDER_STATUS.RECEIVED, products: [{ id: 'p1', quantity: 2 }] };
            const newData = { status: ORDER_STATUS.CONFIRMED, products: [{ id: 'p1', quantity: 5 }] };
            
            const deltas = calculateStockDeltas(oldData, newData);
            // Old was 2, New is 5. Net change should be -3 (we need to deduct 3 more)
            expect(deltas['p1']).toEqual([{ id: 'p1', variantId: undefined, netChange: -3 }]);
        });

        it('should return empty object if no net change (Active -> Active, same quantity)', () => {
            const oldData = { status: ORDER_STATUS.RECEIVED, articleId: 'p1', quantity: 2 };
            const newData = { status: ORDER_STATUS.CONFIRMED, articleId: 'p1', quantity: 2 };
            
            const deltas = calculateStockDeltas(oldData, newData);
            expect(deltas).toEqual({});
        });

        it('should handle item removal from active order', () => {
            const oldData = { status: ORDER_STATUS.RECEIVED, products: [{ id: 'p1', quantity: 2 }, { id: 'p2', quantity: 1 }] };
            const newData = { status: ORDER_STATUS.CONFIRMED, products: [{ id: 'p1', quantity: 2 }] }; // p2 removed
            
            const deltas = calculateStockDeltas(oldData, newData);
            // Net change: +1 for p2 (restocked since it was removed)
            expect(deltas['p2']).toEqual([{ id: 'p2', variantId: undefined, netChange: 1 }]);
            expect(deltas['p1']).toBeUndefined();
        });
    });

});

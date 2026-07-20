import { describe, it, expect, vi } from 'vitest';
import { reconcileStoreStats } from './reconcileStats';

// Mock specific Firebase functions
vi.mock('firebase/functions', () => {
    const mockCallable = vi.fn();
    return {
        getFunctions: vi.fn(),
        httpsCallable: vi.fn(() => mockCallable)
    };
});

import { httpsCallable } from 'firebase/functions';

describe('reconcileStoreStats', () => {
    const mockDb = {};
    const storeId = 'store-123';

    it('should successfully invoke backend manualReconciliation', async () => {
        // Prepare a mock response that the frontend expects
        const mockResponse = {
            data: {
                success: true
            }
        };

        const mockCallableFn = vi.fn().mockResolvedValue(mockResponse);
        httpsCallable.mockReturnValue(mockCallableFn);

        const result = await reconcileStoreStats(mockDb, storeId);

        expect(httpsCallable).toHaveBeenCalled();
        expect(mockCallableFn).toHaveBeenCalledWith({ storeId });
        expect(result).toEqual({ success: true });
    });

    it('should throw an error if the backend call fails', async () => {
        const mockError = new Error('Backend failed');
        const mockCallableFn = vi.fn().mockRejectedValue(mockError);
        httpsCallable.mockReturnValue(mockCallableFn);

        await expect(reconcileStoreStats(mockDb, storeId)).rejects.toThrow('Backend failed');
    });
});

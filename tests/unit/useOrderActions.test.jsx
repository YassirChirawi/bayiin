import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useOrderActions } from '../../src/hooks/useOrderActions';
import { authenticateCathedis, createCathedisDelivery } from '../../src/lib/cathedis';
import { getDoc, runTransaction } from 'firebase/firestore';

// Mock contexts
vi.mock('../../src/context/TenantContext', () => ({
    useTenant: () => ({
        store: { id: 'store-123', name: 'Test Store' }
    })
}));

vi.mock('../../src/context/AuthContext', () => ({
    useAuth: () => ({
        user: { uid: 'user-456' }
    })
}));

vi.mock('../../src/hooks/useAudit', () => ({
    useAudit: () => ({
        logAction: vi.fn()
    })
}));

// Mock Cathedis Service
vi.mock('../../src/lib/cathedis', () => ({
    authenticateCathedis: vi.fn(),
    createCathedisDelivery: vi.fn()
}));

// Mock Firestore
vi.mock('firebase/firestore', async (importOriginal) => {
    const actual = await importOriginal();
    return {
        ...actual,
        doc: vi.fn((db, path, ...args) => ({ id: 'mock-doc-id', path: `${path}/${args.join('/')}` })),
        getDoc: vi.fn(),
        runTransaction: vi.fn()
    };
});

// Mock Toast
vi.mock('react-hot-toast', () => ({
    toast: {
        success: vi.fn(),
        error: vi.fn()
    }
}));

// Helper component to test useOrderActions hook
function TestComponent({ actionCallback, orderData }) {
    const actions = useOrderActions();
    
    React.useEffect(() => {
        if (actionCallback) {
            actionCallback(actions);
        }
    }, [actionCallback, actions]);

    return <div>useOrderActions Test</div>;
}

describe('useOrderActions Hook - Cathedis Integration', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('sendToCathedis throws an error if Cathedis credentials are not configured in settings', async () => {
        // Return config document without Cathedis keys
        getDoc.mockResolvedValue({
            exists: () => true,
            data: () => ({})
        });

        let capturedError = null;

        render(
            <TestComponent 
                actionCallback={async (actions) => {
                    try {
                        await actions.sendToCathedis({ id: 'order-123' });
                    } catch (e) {
                        capturedError = e.message;
                    }
                }} 
            />
        );

        await waitFor(() => {
            expect(capturedError).toContain('Cathedis API credentials not configured');
        });
    });

    it('sendToCathedis successfully authenticates, creates delivery, and updates order tracking info', async () => {
        // Return config document with Cathedis keys
        getDoc.mockResolvedValue({
            exists: () => true,
            data: () => ({
                cathedisUsername: 'cathedis_user_test',
                cathedisPassword: 'cathedis_password_test'
            })
        });

        // Mock Cathedis auth and creation
        authenticateCathedis.mockResolvedValue('JSESSIONID=MOCK123456');
        createCathedisDelivery.mockResolvedValue({
            id: 887766,
            deliveryStatus: 'EXPÉDIÉ'
        });

        // Mock Firestore transaction
        const mockTransaction = {
            update: vi.fn()
        };
        runTransaction.mockImplementation((db, callback) => callback(mockTransaction));

        let response = null;

        render(
            <TestComponent 
                actionCallback={async (actions) => {
                    response = await actions.sendToCathedis({ 
                        id: 'order-123',
                        clientName: 'Yassir Chirawi',
                        clientPhone: '0612345678',
                        clientCity: 'Casablanca',
                        clientAddress: 'Maarif Casablanca',
                        price: 500
                    });
                }} 
            />
        );

        await waitFor(() => {
            // Should call authenticateCathedis with credentials
            expect(authenticateCathedis).toHaveBeenCalledWith('cathedis_user_test', 'cathedis_password_test');
            
            // Should call createCathedisDelivery with session token and order
            expect(createCathedisDelivery).toHaveBeenCalledWith('JSESSIONID=MOCK123456', expect.any(Object), expect.any(Object));
            
            // Should update Firestore order with tracking info within a transaction
            expect(runTransaction).toHaveBeenCalled();
            expect(mockTransaction.update).toHaveBeenCalledWith(
                expect.any(Object),
                expect.objectContaining({
                    carrier: 'cathedis',
                    trackingId: '887766',
                    carrierStatus: 'EXPÉDIÉ',
                    status: 'livraison'
                })
            );
            
            // Returns the Cathedis creation output
            expect(response).toEqual({
                id: 887766,
                deliveryStatus: 'EXPÉDIÉ'
            });
        });
    });
});

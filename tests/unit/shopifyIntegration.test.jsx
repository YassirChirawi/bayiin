import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import ShopifyIntegration from '../../src/components/integrations/ShopifyIntegration';
import { db } from '../../src/lib/firebase';
import { getDoc, deleteDoc } from 'firebase/firestore';
import { toast } from 'react-hot-toast';

// Mock Language Context
vi.mock('../../src/context/LanguageContext', () => ({
    useLanguage: () => ({
        t: (key) => key, // Just return key
        language: 'fr'
    })
}));

// Mock Firebase Firestore methods
vi.mock('firebase/firestore', () => ({
    doc: vi.fn(() => ({ id: 'mock-doc-id' })),
    getDoc: vi.fn(),
    deleteDoc: vi.fn()
}));

// Mock Toast
vi.mock('react-hot-toast', () => ({
    toast: {
        success: vi.fn(),
        error: vi.fn(),
        loading: vi.fn(),
        dismiss: vi.fn()
    }
}));

// Mock framer-motion to bypass animations in tests
vi.mock('framer-motion', () => ({
    motion: {
        div: ({ children, ...props }) => <div {...props}>{children}</div>,
        button: ({ children, ...props }) => <button {...props}>{children}</button>
    },
    AnimatePresence: ({ children }) => <>{children}</>
}));

describe('ShopifyIntegration Component', () => {
    const mockStore = { id: 'store-123', name: 'My Test Store' };

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('renders in loading state initially', async () => {
        getDoc.mockImplementation(() => new Promise(() => {})); // Hangs in loading
        render(<ShopifyIntegration store={mockStore} />);
        
        // Should show pulsing skeleton
        expect(screen.queryByText('shopify_title')).toBeNull();
    });

    it('renders unconnected state when no config exists', async () => {
        getDoc.mockResolvedValue({
            exists: () => false
        });

        render(<ShopifyIntegration store={mockStore} />);

        await waitFor(() => {
            expect(screen.getByText('shopify_title')).toBeDefined();
            expect(screen.getByText('Non configuré')).toBeDefined();
            expect(screen.getByPlaceholderText('ma-boutique.myshopify.com')).toBeDefined();
            expect(screen.getByText('shopify_connect')).toBeDefined();
        });
    });

    it('submits domain correctly and formats to myshopify.com', async () => {
        getDoc.mockResolvedValue({
            exists: () => false
        });

        // Mock window.location
        const originalLocation = window.location;
        delete window.location;
        window.location = { href: '' };

        render(<ShopifyIntegration store={mockStore} />);

        await waitFor(() => {
            const input = screen.getByPlaceholderText('ma-boutique.myshopify.com');
            const submitBtn = screen.getByText('shopify_connect');

            fireEvent.change(input, { target: { value: 'cool-shop' } });
            fireEvent.click(submitBtn);

            // Redirection URL should include the formatted domain 'cool-shop.myshopify.com'
            expect(window.location.href).toContain('shop=cool-shop.myshopify.com');
        });

        window.location = originalLocation;
    });

    it('renders connected state when config is active', async () => {
        getDoc.mockResolvedValue({
            exists: () => true,
            data: () => ({
                isActive: true,
                shopifyStoreUrl: 'dev-bayiin.myshopify.com',
                shopifyStoreId: 'sp_1049283',
                connectedAt: {
                    toDate: () => new Date('2026-05-26')
                }
            })
        });

        render(<ShopifyIntegration store={mockStore} />);

        await waitFor(() => {
            expect(screen.getByText('shopify_title')).toBeDefined();
            expect(screen.getByText('Actif')).toBeDefined();
            expect(screen.getByText('dev-bayiin.myshopify.com')).toBeDefined();
            expect(screen.getByText('sp_1049283')).toBeDefined();
            expect(screen.getByText('shopify_disconnect')).toBeDefined();
        });
    });

    it('handles disconnection successfully', async () => {
        getDoc.mockResolvedValue({
            exists: () => true,
            data: () => ({
                isActive: true,
                shopifyStoreUrl: 'dev-bayiin.myshopify.com'
            })
        });
        deleteDoc.mockResolvedValue();
        vi.spyOn(window, 'confirm').mockReturnValue(true);

        render(<ShopifyIntegration store={mockStore} />);

        await waitFor(() => {
            const disconnectBtn = screen.getByText('shopify_disconnect');
            fireEvent.click(disconnectBtn);

            expect(deleteDoc).toHaveBeenCalled();
            expect(toast.success).toHaveBeenCalledWith('Boutique Shopify déconnectée avec succès.');
        });
    });

    it('allows toggling between navigation tabs (Status, Webhooks, Logs)', async () => {
        getDoc.mockResolvedValue({
            exists: () => true,
            data: () => ({
                isActive: true,
                shopifyStoreUrl: 'dev-bayiin.myshopify.com'
            })
        });

        render(<ShopifyIntegration store={mockStore} />);

        await waitFor(() => {
            // Click Webhooks tab
            const webhooksTab = screen.getByText('Webhooks Shopify');
            fireEvent.click(webhooksTab);
            expect(screen.getByText("orders/create")).toBeDefined();

            // Click Logs tab
            const logsTab = screen.getByText('Journal de Sync');
            fireEvent.click(logsTab);
            expect(screen.getByText("orders/updated")).toBeDefined();
        });
    });
});

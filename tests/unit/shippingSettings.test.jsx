import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import ShippingSettings from '../../src/pages/ShippingSettings';
import { getDoc, updateDoc } from 'firebase/firestore';
import { toast } from 'react-hot-toast';

// Mock Tenant Context
vi.mock('../../src/context/TenantContext', () => ({
    useTenant: () => ({
        store: { 
            id: 'store-123', 
            name: 'My Store Name', 
            cathedisUsername: 'cathedis_store_user',
            senditCities: []
        }
    })
}));

// Mock Language Context
vi.mock('../../src/context/LanguageContext', () => ({
    useLanguage: () => ({
        t: (key) => key,
        language: 'fr'
    })
}));

// Mock Firestore (preserving other exports)
vi.mock('firebase/firestore', async (importOriginal) => {
    const actual = await importOriginal();
    return {
        ...actual,
        doc: vi.fn((db, path, ...args) => ({ id: 'mock-doc-id', path: `${path}/${args.join('/')}` })),
        getDoc: vi.fn(),
        updateDoc: vi.fn(),
        setDoc: vi.fn()
    };
});

// Mock Toast
vi.mock('react-hot-toast', () => ({
    toast: {
        success: vi.fn(),
        error: vi.fn()
    }
}));

describe('ShippingSettings Component - Cathedis Integration Card', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('loads and renders stored Cathedis keys from Firestore private config', async () => {
        getDoc.mockResolvedValue({
            exists: () => true,
            data: () => ({
                cathedisUsername: 'saved_cathedis_login',
                cathedisPassword: 'saved_cathedis_password'
            })
        });

        render(<ShippingSettings />);

        await waitFor(() => {
            // Verify loading and setting existing inputs
            expect(screen.getByPlaceholderText('Votre Login Cathedis').value).toBe('saved_cathedis_login');
            expect(screen.getByPlaceholderText('••••••••••••••••').value).toBe('saved_cathedis_password');
            
            // Verify carrier title and description are rendered
            expect(screen.getByText('cathedis_title')).toBeDefined();
            expect(screen.getByText('cathedis_desc')).toBeDefined();
            
            // Verify active badge exists because store.cathedisUsername is truthy
            expect(screen.getByText('Actif')).toBeDefined();
        });
    });

    it('updates Cathedis keys correctly and saves them to private config and public store doc', async () => {
        getDoc.mockResolvedValue({
            exists: () => true,
            data: () => ({
                cathedisUsername: '',
                cathedisPassword: ''
            })
        });

        updateDoc.mockResolvedValue();

        render(<ShippingSettings />);

        await waitFor(async () => {
            const loginInput = screen.getByPlaceholderText('Votre Login Cathedis');
            const passwordInput = screen.getByPlaceholderText('••••••••••••••••');
            const saveBtn = screen.getByRole('button', { name: 'btn_save_keys' });

            // Fire input changes
            fireEvent.change(loginInput, { target: { value: 'brand_new_login' } });
            fireEvent.change(passwordInput, { target: { value: 'brand_new_password' } });
            
            // Submit form
            fireEvent.click(saveBtn);

            // Wait for firestore updates and success toast
            await waitFor(() => {
                expect(updateDoc).toHaveBeenCalledTimes(2);
                
                // First updateDoc call saves to private credentials path
                expect(updateDoc).toHaveBeenNthCalledWith(1, 
                    expect.any(Object),
                    expect.objectContaining({
                        cathedisUsername: 'brand_new_login',
                        cathedisPassword: 'brand_new_password'
                    })
                );
                
                // Second updateDoc call saves to public store path (username indicator only)
                expect(updateDoc).toHaveBeenNthCalledWith(2, 
                    expect.any(Object),
                    expect.objectContaining({
                        cathedisUsername: 'brand_new_login'
                    })
                );

                expect(toast.success).toHaveBeenCalledWith('msg_cathedis_saved');
            });
        });
    });
});

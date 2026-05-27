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

// Mock Firebase Firestore methods (Inspiré exactement de ton test Shopify)
vi.mock('firebase/firestore', async (importOriginal) => {
    const actual = await importOriginal();
    return {
        ...actual,
        doc: vi.fn(() => ({ id: 'mock-doc-id' })),
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

// Mock Lucide-React & Framer-motion pour alléger le Virtual DOM
vi.mock('lucide-react', () => ({
    Save: () => <div data-testid="save-icon" />,
    Truck: () => <div data-testid="truck-icon" />,
    Info: () => <div data-testid="info-icon" />,
    Globe: () => <div data-testid="globe-icon" />,
    RefreshCw: () => <div data-testid="refresh-icon" />,
    ShieldCheck: () => <div data-testid="shield-icon" />,
    Key: () => <div data-testid="key-icon" />
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
            expect(screen.getByPlaceholderText('Votre Login Cathedis').value).toBe('saved_cathedis_login');
            expect(screen.getByPlaceholderText('••••••••••••••••').value).toBe('saved_cathedis_password');
            expect(screen.getByText('cathedis_title')).toBeDefined();
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

        // Alignement sur la méthode de déconnexion de ton modèle (Recherche propre + Clic externe)
        const loginInput = await screen.findByPlaceholderText('Votre Login Cathedis');
        const passwordInput = screen.getByPlaceholderText('••••••••••••••••');
        const saveBtn = screen.getByRole('button', { name: 'btn_save_keys' });

        fireEvent.change(loginInput, { target: { value: 'brand_new_login' } });
        fireEvent.change(passwordInput, { target: { value: 'brand_new_password' } });

        fireEvent.click(saveBtn);

        await waitFor(() => {
            expect(updateDoc).toHaveBeenCalledTimes(2);
            expect(toast.success).toHaveBeenCalledWith('msg_cathedis_saved');
        });
    });
});
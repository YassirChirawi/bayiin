import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import DynamicIcon, { LUCIDE_MAP } from '../../src/builder/components/DynamicIcon';
import IconPicker from '../../src/builder/components/IconPicker';
import ItemsManager from '../../src/builder/components/ItemsManager';
import { LUCIDE_ICON_CATEGORIES } from '../../src/builder/components/iconData';
import { Package } from 'lucide-react';

// Mock Firebase
vi.mock('../../src/lib/firebase', () => ({
    storage: {}
}));
vi.mock('firebase/storage', () => ({
    ref: vi.fn(),
    uploadBytes: vi.fn(),
    getDownloadURL: vi.fn(),
    listAll: vi.fn(() => Promise.resolve({ items: [] }))
}));
vi.mock('../../src/context/TenantContext', () => ({
    useTenant: () => ({ tenant: { id: 'test-store' } })
}));

describe('TEST 1 - DynamicIcon rendu Lucide', () => {
    it('rend le SVG Truck avec la bonne taille', () => {
        const { container } = render(<DynamicIcon icon={{ type: 'lucide', value: 'Truck' }} override={{ size: 32 }} />);
        const svg = container.querySelector('svg');
        expect(svg).not.toBeNull();
        expect(svg.getAttribute('width')).toBe('32');
        expect(svg.getAttribute('height')).toBe('32');
    });

    it('rend le fallback Package si icône invalide', () => {
        const { container } = render(<DynamicIcon icon={{ type: 'lucide', value: 'InvalidIcon' }} />);
        const svg = container.querySelector('svg');
        expect(svg).not.toBeNull();
        expect(svg.classList.contains('lucide-package')).toBe(true);
    });
});

describe('TEST 2 - DynamicIcon rendu Emoji', () => {
    it('rend un span avec le texte emoji', () => {
        const { container } = render(<DynamicIcon icon={{ type: 'emoji', value: '🚚', size: 16 }} />);
        const span = container.querySelector('span');
        expect(span).not.toBeNull();
        expect(span.textContent).toBe('🚚');
        expect(span.style.fontSize).toBe('13.6px'); // 16 * 0.85
    });
});

describe('TEST 3 - DynamicIcon avec background', () => {
    it('ajoute le style de fond', () => {
        const { container } = render(
            <DynamicIcon icon={{ 
                type: 'lucide', 
                value: 'Star', 
                background: { enabled: true, shape: 'circle', color: '#ff0000' } 
            }} />
        );
        const div = container.firstChild;
        expect(div.style.background).toBe('rgb(255, 0, 0)');
        expect(div.style.borderRadius).toBe('50%');
    });

    it('pas de style de fond si non activé', () => {
        const { container } = render(
            <DynamicIcon icon={{ 
                type: 'lucide', 
                value: 'Star', 
                background: { enabled: false } 
            }} />
        );
        const div = container.firstChild;
        expect(div.style.background).toBe('');
    });
});

describe('TEST 4 - LUCIDE_MAP complétude', () => {
    it('contient toutes les icônes des catégories', () => {
        let allValid = true;
        Object.values(LUCIDE_ICON_CATEGORIES).forEach(category => {
            category.forEach(iconName => {
                if (!LUCIDE_MAP[iconName]) {
                    console.error(`Missing icon in map: ${iconName}`);
                    allValid = false;
                }
            });
        });
        expect(allValid).toBe(true);
    });
});

describe('TEST 5 - ItemManager add/remove/duplicate', () => {
    const mockOnChange = vi.fn();
    const initialItems = [{ id: '1', title: 'Item 1' }];

    it('addItem ajoute un élément', () => {
        render(<ItemsManager items={initialItems} onChange={mockOnChange} />);
        const addButton = screen.getByText(/Ajouter un élément/i);
        fireEvent.click(addButton);
        expect(mockOnChange).toHaveBeenCalled();
        const newItems = mockOnChange.mock.calls[0][0];
        expect(newItems.length).toBe(2);
    });
});

describe('TEST 7 - IconPicker search', () => {
    it('filtre les icônes lucide par texte', () => {
        const { container } = render(<IconPicker value={{ type: 'lucide', value: 'Star' }} onChange={() => {}} />);
        const button = container.querySelector('button');
        fireEvent.click(button); // Open picker
        
        const searchInput = screen.getByPlaceholderText(/Chercher une icône/i);
        fireEvent.change(searchInput, { target: { value: 'truck' } });
        
        // Truck should be visible
        expect(screen.getAllByTitle(/Truck/i).length).toBeGreaterThan(0);
    });
});

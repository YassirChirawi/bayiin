import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import CustomerModal from '../../src/components/CustomerModal';
import ConfirmationModal from '../../src/components/ConfirmationModal';
import { BrowserRouter } from 'react-router-dom';

// Mock Language Context
vi.mock('../../src/context/LanguageContext', () => ({
    useLanguage: () => ({
        t: (key) => key, // Just return the key
        language: 'fr'
    })
}));

describe('UI Component Library', () => {

    describe('CustomerModal', () => {
        it('should render correct title for new customer', () => {
            render(
                <BrowserRouter>
                    <CustomerModal isOpen={true} onClose={() => {}} />
                </BrowserRouter>
            );
            expect(screen.getByText('modal_title_new_customer')).toBeDefined();
        });

        it('should call onClose when cancel is clicked', () => {
            const onClose = vi.fn();
            render(
                <BrowserRouter>
                    <CustomerModal isOpen={true} onClose={onClose} />
                </BrowserRouter>
            );
            // The cancel button text in CustomerModal is t('cancel')
            const cancelBtn = screen.getByRole('button', { name: 'cancel' });
            fireEvent.click(cancelBtn);
            expect(onClose).toHaveBeenCalled();
        });
    });

    describe('ConfirmationModal', () => {
        it('should render message and buttons', () => {
            const onConfirm = vi.fn();
            render(
                <ConfirmationModal 
                    isOpen={true} 
                    title="Confirm Delete" 
                    message="Are you sure?" 
                    onConfirm={onConfirm} 
                    onClose={() => {}} 
                />
            );
            expect(screen.getByText('Confirm Delete')).toBeDefined();
            expect(screen.getByText('Are you sure?')).toBeDefined();
            
            // The confirm button text is confirmText || t('confirm_yes') || "Confirmer"
            // Our mock returns 'confirm_yes'
            const confirmBtn = screen.getByRole('button', { name: 'confirm_yes' });
            fireEvent.click(confirmBtn);
            expect(onConfirm).toHaveBeenCalled();
        });
    });
});

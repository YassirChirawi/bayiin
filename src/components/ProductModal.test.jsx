import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import ProductModal from './ProductModal';

// Mock Contexts
const mockStore = { id: 'store-123' };
vi.mock('../context/TenantContext', () => ({
    useTenant: () => ({ store: mockStore })
}));

vi.mock('../context/LanguageContext', () => ({
    useLanguage: () => ({ t: (key) => key }) // Simple translation mock
}));

// Mock Hooks
vi.mock('../hooks/useImageUpload', () => ({
    useImageUpload: () => ({
        uploadImage: vi.fn().mockResolvedValue('http://example.com/image.jpg'),
        uploading: false,
        error: null
    })
}));

describe('ProductModal', () => {
    const mockOnClose = vi.fn();
    const mockOnSave = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should not render when isOpen is false', () => {
        render(<ProductModal isOpen={false} onClose={mockOnClose} onSave={mockOnSave} />);
        expect(screen.queryByText('modal_title_new_product')).not.toBeInTheDocument();
    });

    it('should render form fields when open', () => {
        render(<ProductModal isOpen={true} onClose={mockOnClose} onSave={mockOnSave} />);
        expect(screen.getByText('modal_title_new_product')).toBeInTheDocument();
        expect(screen.getByPlaceholderText('placeholder_product_name')).toBeInTheDocument();
        // label_base_price text checks existence of label text, which is fine
        expect(screen.getByText('label_base_price')).toBeInTheDocument();
    });

    it('should submit form data correctly', async () => {
        render(<ProductModal isOpen={true} onClose={mockOnClose} onSave={mockOnSave} />);

        // Fill Form
        fireEvent.change(screen.getByPlaceholderText('placeholder_product_name'), { target: { value: 'Test Product' } });
        // Price and Stock inputs don't have placeholders in the component code I saw, 
        // wait, let me check ProductModal source again for placeholders.
        // Price input: label='label_base_price', no placeholder? 
        // Let's use getAllByRole('spinbutton') or query selector by name/type/index if needed.
        // Actually, looking at ProductModal.jsx:
        /*
          <Input label={t('label_base_price')} type="number" ... />
          <Input label={t('label_total_stock')} type="number" ... />
        */

        // Since getByLabelText failed, we can try to find them by value or strictly by order. 
        // Or even better, let's fix the Input component to be accessible, which improves the app too.
        // But for now, to be safe and quick, let's target inputs by type/value.

        const inputs = screen.getAllByRole('spinbutton');
        // inputs[0] should be Price, inputs[1] Cost Price (optional), inputs[2] Stock
        // Wait, price is first.

        fireEvent.change(inputs[0], { target: { value: '100' } }); // Price

        // Stock is in a different div (Simple Stock UI).
        // It has type="number".
        // Let's rely on the fact that we can find inputs by display value if we init them? No they are empty.

        // Let's try to find the container with the label text, then find the input inside it.
        // Ideally we should fix accessibility but I'll stick to test fix.

        // Stock input is the 3rd number input (Price, CostPrice, Stock).
        // Let's correct this assumption by checking the rendered order.
        // 1. Price
        // 2. Cost Price
        // 3. Stock

        fireEvent.change(inputs[2], { target: { value: '50' } });

        // Submit
        const saveButton = screen.getByText('btn_save_product');
        // It renders with icon, so text might be nested. getByText should work if text is direct child.
        // Button component: {children}
        fireEvent.click(saveButton);

        await waitFor(() => {
            expect(mockOnSave).toHaveBeenCalled();
            expect(mockOnSave).toHaveBeenCalledWith(expect.objectContaining({
                name: 'Test Product',
                price: 100,
                stock: 50,
                isVariable: false
            }));
        });
    });

    it('should handle variant generation', async () => {
        render(<ProductModal isOpen={true} onClose={mockOnClose} onSave={mockOnSave} />);

        // Fill Required Fields
        fireEvent.change(screen.getByPlaceholderText('placeholder_product_name'), { target: { value: 'Var Product' } });
        fireEvent.change(screen.getAllByRole('spinbutton')[0], { target: { value: '100' } });

        // Switch to Variable Product
        fireEvent.click(screen.getByText('btn_variable_product'));

        // Add Attribute
        fireEvent.click(screen.getByText('btn_add_option'));

        // Fill Attribute Name and Values
        const inputs = screen.getAllByRole('textbox');
        // inputs[0] is Name, inputs[1] is Price... need to find the attribute inputs
        // The modal renders many inputs. Let's rely on placeholders.

        const attrNameInput = screen.getByPlaceholderText('placeholder_option_name');
        const attrValuesInput = screen.getByPlaceholderText('placeholder_option_values');

        fireEvent.change(attrNameInput, { target: { value: 'Size' } });
        fireEvent.change(attrValuesInput, { target: { value: 'S, M' } });

        // Generate
        fireEvent.click(screen.getByText('btn_generate_variants'));

        // Check Variants Table
        expect(screen.getByText('S')).toBeInTheDocument();
        expect(screen.getByText('M')).toBeInTheDocument();

        // Submit and check stock calculation (should be 0 initially as we didn't set stock)
        fireEvent.click(screen.getByText('btn_save_product'));

        await waitFor(() => {
            expect(mockOnSave).toHaveBeenCalled();
            const args = mockOnSave.mock.calls[0][0];
            console.log('ProductModal onSave args:', JSON.stringify(args, null, 2));

            expect(args.isVariable).toBe(true);
            expect(args.stock).toBe(0);
        });
    });
});

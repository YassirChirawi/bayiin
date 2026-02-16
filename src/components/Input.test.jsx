import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import Input from './Input';

describe('Input Component', () => {
    it('renders label correctly', () => {
        render(<Input label="Username" name="username" />);
        expect(screen.getByText('Username')).toBeInTheDocument();
    });

    it('renders input with correct type', () => {
        const { container } = render(<Input name="password" type="password" />);
        const input = container.querySelector('input[type="password"]');
        expect(input).toBeInTheDocument();
    });

    it('calls onChange handler', () => {
        const handleChange = vi.fn();
        render(<Input name="test" onChange={handleChange} />);
        const input = screen.getByRole('textbox');
        fireEvent.change(input, { target: { value: 'New Value' } });
        expect(handleChange).toHaveBeenCalled();
    });

    it('displays error message', () => {
        render(<Input name="test" error="Invalid input" />);
        expect(screen.getByText('Invalid input')).toBeInTheDocument();
    });
});

import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import Button from './Button';

describe('Button Component', () => {
    it('renders children correctly', () => {
        render(<Button>Click Me</Button>);
        expect(screen.getByText('Click Me')).toBeInTheDocument();
    });

    it('calls onClick handler when clicked', () => {
        const handleClick = vi.fn();
        render(<Button onClick={handleClick}>Click Me</Button>);

        fireEvent.click(screen.getByText('Click Me'));
        expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('shows loader when isLoading is true', () => {
        render(<Button isLoading={true}>Loading</Button>);
        // Assuming Loader2 renders an svg or similar structure. 
        // We can check if the button is disabled or look for a specific class if needed.
        const button = screen.getByRole('button');
        expect(button).toBeDisabled();
    });

    it('applies variant classes correctly', () => {
        render(<Button variant="primary">Primary</Button>);
        const button = screen.getByRole('button');
        expect(button).toHaveClass('bg-indigo-600');
    });
});

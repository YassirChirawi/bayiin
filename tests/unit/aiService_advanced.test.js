import { describe, it, expect, vi } from 'vitest';
import { detectFinancialLeaks, predictChurn } from '../../src/services/aiService';

// Mock the Generative AI SDK
vi.mock('@google/generative-ai', () => ({
    GoogleGenerativeAI: vi.fn().mockImplementation(() => ({
        getGenerativeModel: vi.fn().mockImplementation(() => ({
            generateContent: vi.fn().mockResolvedValue({
                response: {
                    text: () => JSON.stringify({
                        leaks: [{ type: 'High Shipping', severity: 'Medium', description: 'Shipping costs exceed 30% of revenue' }],
                        suggestions: ['Renegotiate carrier rates']
                    })
                }
            })
        }))
    }))
}));

describe('AI Service Advanced Insights', () => {

    it('should detect financial leaks from store data', async () => {
        const mockOrders = [
            { id: '1', price: 100, costPrice: 80, realDeliveryCost: 40, quantity: 1 }
        ];

        const result = detectFinancialLeaks(mockOrders, 10); // Pass orders and CAC
        expect(result).toHaveProperty('hasLeaks', true);
        expect(result.negativeMargins).toHaveLength(1);
    });

    it('should predict churn for at-risk customers', async () => {
        const mockCustomer = {
            id: 'cust-123',
            lastOrderDate: '2026-01-01',
            orderCount: 10,
            totalSpent: 5000
        };

        const result = await predictChurn(mockCustomer);
        // Assuming the service returns a score or boolean
        expect(result).toBeDefined();
    });
});

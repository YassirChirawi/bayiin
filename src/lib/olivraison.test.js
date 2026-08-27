import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { authenticateOlivraison, createOlivraisonPackage, getOlivraisonCities } from './olivraison';

describe('Olivraison Service', () => {
    const mockToken = 'test-token-123';
    const mockApiKey = 'api-key';
    const mockSecretKey = 'secret-key';

    beforeEach(() => {
        global.fetch = vi.fn();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe('authenticateOlivraison', () => {
        it('should return token on success', async () => {
            global.fetch.mockResolvedValue({
                ok: true,
                json: async () => ({ token: mockToken }),
            });

            const token = await authenticateOlivraison(mockApiKey, mockSecretKey);
            expect(token).toBe(mockToken);
            expect(global.fetch).toHaveBeenCalledWith(
                expect.stringContaining('/auth/login'),
                expect.objectContaining({
                    method: 'POST',
                    body: JSON.stringify({ apiKey: mockApiKey, secretKey: mockSecretKey }),
                })
            );
        });

        it('should throw error on failure', async () => {
            global.fetch.mockResolvedValue({
                ok: false,
                json: async () => ({ description: 'Invalid keys' }),
            });

            await expect(authenticateOlivraison(mockApiKey, mockSecretKey)).rejects.toThrow('Invalid keys');
        });
    });

    describe('createOlivraisonPackage', () => {
        const mockOrder = {
            orderNumber: 'ORD-001',
            price: 100,
            quantity: 2,
            productName: 'Test Product',
            note: 'Fragile',
            clientName: 'Client 1',
            clientPhone: '0600000000',
            city: 'Casablanca',
            address: '123 Street'
        };
        const mockStore = {
            name: 'My Store',
            phone: '0500000000',
            address: 'Store Address',
            email: 'store@test.com'
        };

        it('should create package successfully', async () => {
            const mockResponse = {
                status: 'CREATED',
                trackingID: 'TRACK-999'
            };

            global.fetch.mockResolvedValue({
                ok: true,
                json: async () => mockResponse,
            });

            const result = await createOlivraisonPackage(mockToken, mockOrder, mockStore);
            expect(result.trackingID).toBe('TRACK-999');

            // Verify Payload mapping
            expect(global.fetch).toHaveBeenCalledWith(
                expect.stringContaining('/package'),
                expect.objectContaining({
                    method: 'POST',
                    headers: expect.objectContaining({
                        'Authorization': `Bearer ${mockToken}`
                    }),
                    body: expect.stringMatching(/"price":200/) // 100 * 2
                })
            );
        });
    });

    describe('getOlivraisonCities', () => {
        it('should return cities list', async () => {
            const mockCities = [{ id: 1, name: 'Casablanca' }];
            global.fetch.mockResolvedValue({
                ok: true,
                json: async () => mockCities,
            });

            const cities = await getOlivraisonCities(mockToken);
            expect(cities).toHaveLength(1);
            expect(cities[0].name).toBe('Casablanca');
        });
    });
});

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock Firebase dependencies
vi.mock('./firebase', () => ({
    db: {},
    auth: {},
    storage: {}
}));

import senditService from './sendit';

describe('senditService', () => {
    const mockToken = 'mock-token';
    const mockPublicKey = 'public-key';
    const mockSecretKey = 'secret-key';

    beforeEach(() => {
        global.fetch = vi.fn();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe('getToken', () => {
        it('should return a token on successful authentication', async () => {
            const mockResponse = {
                ok: true,
                json: async () => ({ token: mockToken }),
            };
            global.fetch.mockResolvedValue(mockResponse);

            // Use a unique key to avoid cache hits from other tests
            const uniqueKey = 'pk_' + Date.now();
            const token = await senditService.getToken(uniqueKey, mockSecretKey);

            expect(token).toBe(mockToken);
        });

        it('should throw an error if authentication fails', async () => {
            const mockResponse = {
                ok: false,
                status: 401,
                json: async () => ({ message: 'Unauthorized' }),
            };
            global.fetch.mockResolvedValue(mockResponse);

            // Use a unique key to ensure we hit the API
            const uniqueKey = 'pk_fail_' + Date.now();
            await expect(senditService.getToken(uniqueKey, mockSecretKey)).rejects.toThrow('Unauthorized');
        });
    });

    describe('getAllDistricts', () => {
        it('should return a list of districts', async () => {
            const mockDistricts = [
                { id: 1, name: 'Casablanca', price: 10 },
                { id: 2, name: 'Rabat', price: 15 },
            ];

            // First call returns data
            global.fetch.mockResolvedValueOnce({
                ok: true,
                json: async () => mockDistricts,
            });

            // Second call returns empty to stop pagination
            global.fetch.mockResolvedValueOnce({
                ok: true,
                json: async () => [],
            });

            const districts = await senditService.getAllDistricts(mockToken);

            expect(districts).toHaveLength(2);
            expect(districts[0].name).toBe('Casablanca');
        });
    });

    describe('createPackage', () => {
        const mockOrder = {
            deliveryValues: { districtId: 1 },
            clientName: 'John Doe',
            clientPhone: '0600000000',
            clientAddress: '123 Street',
            price: 100,
            quantity: 1,
            shippingCost: 20,
            orderNumber: 'ORD-123',
            items: [{ article: 'Item 1', quantity: 1 }]
        };
        const mockStore = {
            senditPickupCityId: 1
        };

        it('should create a package successfully', async () => {
            const mockResponse = {
                ok: true,
                json: async () => ({
                    data: {
                        code: 'TRACK-123',
                        status: 'PENDING',
                        label_url: 'http://example.com/label.pdf'
                    }
                }),
            };
            global.fetch.mockResolvedValue(mockResponse);

            const result = await senditService.createPackage(mockToken, mockOrder, mockStore);

            expect(result.trackingID).toBe('TRACK-123');
            expect(result.status).toBe('PENDING');
            expect(result.trackingUrl).toBe('http://example.com/label.pdf');

            expect(global.fetch).toHaveBeenCalledWith(
                expect.stringContaining('/deliveries'),
                expect.objectContaining({
                    method: 'POST',
                    headers: expect.objectContaining({ Authorization: `Bearer ${mockToken}` }),
                    body: expect.stringContaining('"district_id":1'),
                })
            );
        });
    });

    describe('getInvoices', () => {
        it('should return a list of invoices', async () => {
            const mockInvoices = [
                { id: 1, reference: 'INV-001', amount: 1000, status: 'PAID' },
                { id: 2, reference: 'INV-002', amount: 500, status: 'PENDING' }
            ];

            global.fetch.mockResolvedValue({
                ok: true,
                json: async () => ({ data: mockInvoices })
            });

            const invoices = await senditService.getInvoices(mockToken, { startDate: '2023-01-01', endDate: '2023-01-31' });

            expect(invoices).toHaveLength(2);
            expect(invoices[0].reference).toBe('INV-001');

            expect(global.fetch).toHaveBeenCalledWith(
                expect.stringContaining('/invoices?startDate=2023-01-01&endDate=2023-01-31'),
                expect.objectContaining({
                    method: 'GET',
                    headers: expect.objectContaining({ Authorization: `Bearer ${mockToken}` })
                })
            );
        });

        it('should throw an error if fetching invoices fails', async () => {
            global.fetch.mockResolvedValue({
                ok: false,
                status: 500,
                json: async () => ({ message: 'Internal Server Error' })
            });

            await expect(senditService.getInvoices(mockToken)).rejects.toThrow('Internal Server Error');
        });
    });
});

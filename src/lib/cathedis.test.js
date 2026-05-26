import { describe, it, expect, vi, beforeEach } from 'vitest';
import { authenticateCathedis, createCathedisDelivery, getCathedisCities } from './cathedis';

describe('Cathedis Service', () => {
    beforeEach(() => {
        vi.restoreAllMocks();
    });

    describe('authenticateCathedis', () => {
        it('should return JSESSIONID from headers if present', async () => {
            const mockHeaders = new Headers();
            mockHeaders.set('set-cookie', 'JSESSIONID=AB0F65D4501D61B24D8C2E8442C11565; Path=/; HttpOnly');

            vi.spyOn(global, 'fetch').mockResolvedValue({
                ok: true,
                headers: mockHeaders,
                json: async () => ({})
            });

            const jsession = await authenticateCathedis('my_login', 'my_pass');
            expect(jsession).toBe('AB0F65D4501D61B24D8C2E8442C11565');
        });

        it('should return fallback if no JSESSIONID in headers but returned in body', async () => {
            const mockHeaders = new Headers();

            vi.spyOn(global, 'fetch').mockResolvedValue({
                ok: true,
                headers: mockHeaders,
                json: async () => ({ jsessionid: 'BODY_TOKEN_123' })
            });

            const jsession = await authenticateCathedis('my_login', 'my_pass');
            expect(jsession).toBe('BODY_TOKEN_123');
        });

        it('should throw error if response is not ok', async () => {
            vi.spyOn(global, 'fetch').mockResolvedValue({
                ok: false
            });

            await expect(authenticateCathedis('my_login', 'my_pass')).rejects.toThrow('Authentication failed');
        });
    });

    describe('createCathedisDelivery', () => {
        const mockOrder = {
            id: 'ord123',
            orderNumber: 'CMD-55412',
            clientName: 'Reda BENNANI',
            clientPhone: '0633751714',
            city: 'Rabat',
            address: 'Agdal, Rabat',
            price: 220.33,
            quantity: 1,
            articleName: 'T-Shirt',
            note: 'Urgent'
        };

        const mockStore = {
            name: 'BayIIn Shop',
            phone: '0600000000',
            address: 'Casablanca'
        };

        it('should send the mapped payload and return the delivery object on success', async () => {
            const mockDeliveryResponse = {
                status: 0,
                data: [
                    {
                        values: {
                            delivery: {
                                id: 536382,
                                nomOrder: 'CMD-55412',
                                recipient: 'Reda BENNANI',
                                amount: 220.33,
                                deliveryStatus: 'En Attente Ramassage'
                            }
                        }
                    }
                ]
            };

            vi.spyOn(global, 'fetch').mockResolvedValue({
                ok: true,
                json: async () => mockDeliveryResponse
            });

            const result = await createCathedisDelivery('AB0F65D4501D61B24D8C2E8442C11565', mockOrder, mockStore);
            expect(result.id).toBe(536382);
            expect(result.nomOrder).toBe('CMD-55412');
            expect(result.recipient).toBe('Reda BENNANI');
        });

        it('should throw error if status is not 0', async () => {
            vi.spyOn(global, 'fetch').mockResolvedValue({
                ok: true,
                json: async () => ({ status: -1, description: 'Secteur introuvable' })
            });

            await expect(createCathedisDelivery('AB0F65D4501D61B24D8C2E8442C11565', mockOrder, mockStore))
                .rejects.toThrow('Cathedis API returned an error status');
        });
    });

    describe('getCathedisCities', () => {
        it('should fetch and return a list of public cities', async () => {
            const mockCitiesResponse = {
                status: 0,
                data: [
                    { id: 10, name: 'Agadir', active: true },
                    { id: 3, name: 'Rabat', active: true }
                ]
            };

            vi.spyOn(global, 'fetch').mockResolvedValue({
                ok: true,
                json: async () => mockCitiesResponse
            });

            const cities = await getCathedisCities();
            expect(cities).toHaveLength(2);
            expect(cities[0].name).toBe('Agadir');
            expect(cities[1].name).toBe('Rabat');
        });
    });
});

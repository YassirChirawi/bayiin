/**
 * Tests unitaires pour le moteur financier de Beya3
 * @vitest-environment node
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createRequire } from 'node:module';

// financialEngine est un module CommonJS (les Cloud Functions sont en CJS) et il
// capture getFirestore par destructuration AU CHARGEMENT :
//     const { getFirestore } = require('firebase-admin/firestore');
//
// `vi.mock` n'intercepte pas les `require` CJS : ils passent par le loader Node
// et non par le graphe de modules de Vite. C'est pour cette raison que la suite
// avait ete neutralisee par un `describe.skip` plutot que corrigee, laissant le
// moteur financier de Beya3 sans aucune couverture.
//
// On remplace donc getFirestore sur l'objet exports AVANT de charger le moteur :
// la destructuration capture alors le stub. L'ordre est essentiel.
const mockGet = vi.fn();
const mockWhere = vi.fn();
const mockCollection = vi.fn();

// Le depot embarque DEUX installations de firebase-admin : node_modules/ a la
// racine et functions/node_modules/. Un require depuis ce fichier resoudrait
// celle de la racine, alors que financialEngine charge celle de functions/ :
// deux instances distinctes, et le stub ne s'appliquerait pas.
// createRequire ancre la resolution sur le moteur lui-meme.
const requireFromEngine = createRequire(
    new URL('../../functions/copilot/financialEngine.js', import.meta.url)
);

const firestoreModule = requireFromEngine('firebase-admin/firestore');
firestoreModule.getFirestore = () => ({ collection: mockCollection });

const {
    calculateNetProfit,
    detectFinancialAnomalies,
    predictStockRunout,
} = requireFromEngine('./financialEngine');

describe('Financial Engine (Beya3)', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        
        // Setup default chain
        mockCollection.mockReturnValue({
            where: mockWhere
        });
        mockWhere.mockReturnValue({
            where: mockWhere,
            get: mockGet
        });
    });

    describe('calculateNetProfit', () => {
        it('calculates 0 profit if no delivered orders', async () => {
            // Mock empty snapshot for orders
            mockGet.mockResolvedValueOnce({ forEach: vi.fn() }); // Orders
            // Mock empty snapshot for expenses
            mockGet.mockResolvedValueOnce({ forEach: vi.fn() }); // Expenses

            const result = await calculateNetProfit('store123', '2026-01-01', '2026-12-31');
            
            expect(result.grossRevenue).toBe(0);
            expect(result.netProfit).toBe(0);
        });

        it('deducts COGS, delivery, expenses and returns correctly', async () => {
            // Mock 1 delivered order, 1 returned order
            const mockOrdersSnap = {
                forEach: (cb) => {
                    // Delivered order
                    cb({
                        data: () => ({
                            status: 'livré',
                            // Depuis BAY-104 la compta est en CAISSE RÉALISÉE : une commande
                            // livrée mais non encaissée ne produit aucun revenu. C'est le
                            // modèle COD. Sans isPaid, cette commande vaudrait 0.
                            isPaid: true,
                            price: 100,
                            quantity: 2, // 200 revenue
                            costPrice: 30, // 60 COGS
                            realDeliveryCost: 20, // 20 Delivery
                            date: '2026-05-10T12:00:00Z'
                        })
                    });
                    // Returned order (loss of delivery fee)
                    cb({
                        data: () => ({
                            status: 'retour',
                            price: 150,
                            quantity: 1,
                            realDeliveryCost: 25, // 25 loss
                            date: '2026-05-11T12:00:00Z'
                        })
                    });
                }
            };

            const mockExpensesSnap = {
                forEach: (cb) => {
                    cb({
                        data: () => ({
                            amount: 50,
                            date: '2026-05-12T12:00:00Z'
                        })
                    });
                }
            };

            mockGet.mockResolvedValueOnce(mockOrdersSnap);
            mockGet.mockResolvedValueOnce(mockExpensesSnap);

            const result = await calculateNetProfit('store123', '2026-05-01', '2026-05-31');

            // Math: 
            // Revenue: 200
            // COGS: 60
            // Delivery: 20
            // Returns: 25 (loss)
            // Expenses: 50
            // Profit = 200 - 60 - 20 - 50 - 25 = 45

            expect(result.grossRevenue).toBe(200);
            expect(result.cogs).toBe(60);
            // deliveryCosts agrège TOUTE livraison engagée, retour compris : 20 + 25.
            expect(result.deliveryCosts).toBe(45);
            // returnImpact est une ventilation informative du coût ci-dessus, pas
            // une charge supplémentaire — il n'entre pas dans netProfit.
            expect(result.returnImpact).toBe(25);
            expect(result.expenses).toBe(50);
            // 200 - 60 - 45 - 50 = 45. Le retour n'est déduit qu'une seule fois.
            expect(result.netProfit).toBe(45);
            expect(result.margin).toBe(22.5); // (45 / 200) * 100
        });
    });

    describe('ventilation des retours', () => {
        it("le coût de livraison d'un retour n'est déduit qu'une seule fois", async () => {
            // returnImpact restait bloqué à 0 : le brief quotidien annonçait
            // « retours : 0 » même après une journée de retours. Il est désormais
            // alimenté, mais comme VENTILATION de deliveryCosts — le repasser dans
            // netProfit le compterait deux fois.
            mockGet.mockResolvedValueOnce({
                forEach: (cb) => cb({
                    data: () => ({
                        status: 'retour',
                        price: 150,
                        quantity: 1,
                        realDeliveryCost: 25,
                        date: '2026-05-11T12:00:00Z',
                    }),
                }),
            });
            mockGet.mockResolvedValueOnce({ forEach: vi.fn() });

            const r = await calculateNetProfit('store123', '2026-05-01', '2026-05-31');
            expect(r.returnImpact).toBe(25);
            expect(r.deliveryCosts).toBe(25);
            expect(r.netProfit).toBe(-25); // et non -50
        });
    });

    describe('modèle COD — caisse réalisée', () => {
        it('une commande livrée mais NON encaissée ne produit aucun revenu', async () => {
            // Règle métier centrale du COD marocain : la livraison ne vaut pas
            // encaissement. Ce test existe parce que l'ancienne version de la
            // suite supposait l'inverse et comptait le revenu à la livraison.
            mockGet.mockResolvedValueOnce({
                forEach: (cb) => cb({
                    data: () => ({
                        status: 'livré',
                        price: 100,
                        quantity: 2,
                        costPrice: 30,
                        date: '2026-05-10T12:00:00Z',
                    }),
                }),
            });
            mockGet.mockResolvedValueOnce({ forEach: vi.fn() });

            const result = await calculateNetProfit('store123', '2026-05-01', '2026-05-31');
            expect(result.grossRevenue).toBe(0);
        });

        it('la même commande encaissée produit bien le revenu', async () => {
            mockGet.mockResolvedValueOnce({
                forEach: (cb) => cb({
                    data: () => ({
                        status: 'livré',
                        isPaid: true,
                        price: 100,
                        quantity: 2,
                        costPrice: 30,
                        date: '2026-05-10T12:00:00Z',
                    }),
                }),
            });
            mockGet.mockResolvedValueOnce({ forEach: vi.fn() });

            const result = await calculateNetProfit('store123', '2026-05-01', '2026-05-31');
            expect(result.grossRevenue).toBe(200);
        });
    });

    describe('detectFinancialAnomalies', () => {
        it('detects ghost orders (> 10 days in transit)', async () => {
            const now = new Date();
            const twelveDaysAgo = new Date(now);
            twelveDaysAgo.setDate(twelveDaysAgo.getDate() - 12);

            const mockOrdersSnap = {
                forEach: (cb) => {
                    cb({
                        id: 'order1',
                        data: () => ({
                            status: 'livraison',
                            price: 100,
                            quantity: 1,
                            lastCarrierUpdate: twelveDaysAgo.toISOString()
                        })
                    });
                }
            };
            
            mockGet.mockResolvedValueOnce(mockOrdersSnap);
            
            const result = await detectFinancialAnomalies('store123');
            
            expect(result.hasAnomalies).toBe(true);
            expect(result.ghostOrders.length).toBe(1);
            expect(result.ghostOrders[0].daysInTransit).toBe(12);
        });

        it('detects negative margins on delivered orders', async () => {
            const mockOrdersSnap = {
                forEach: (cb) => {
                    cb({
                        id: 'order2',
                        data: () => ({
                            status: 'livré',
                            price: 100,
                            quantity: 1, // Revenue 100
                            costPrice: 80,
                            realDeliveryCost: 30 // Cost 110 -> Loss 10
                        })
                    });
                }
            };
            
            mockGet.mockResolvedValueOnce(mockOrdersSnap);
            
            const result = await detectFinancialAnomalies('store123');
            
            expect(result.hasAnomalies).toBe(true);
            expect(result.negativeMargins.length).toBe(1);
            expect(result.negativeMargins[0].loss).toBe(10); // 110 - 100
        });
    });
});

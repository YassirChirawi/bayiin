/**
 * Tests de functions/stockLogic.js — la mutation de stock SERVEUR.
 *
 * `stockManagement.test.js` couvre déjà src/utils/orderLogic, mais ce n'est que
 * le miroir client. Le module testé ici est celui qui écrit réellement en base,
 * dans une transaction, et il n'avait aucune couverture. C'est pourtant lui qui
 * décide du stock réel d'un marchand : une erreur y vend des produits qui
 * n'existent plus, ou en immobilise qui existent.
 *
 * @vitest-environment node
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { createRequire } from 'node:module';

const requireFromFunctions = createRequire(
    new URL('../../functions/stockLogic.js', import.meta.url)
);
const { applyStockUpdates } = requireFromFunctions('./stockLogic');

/**
 * Firestore simulé, réduit à ce que le module utilise :
 *   db.collection('warehouses').where().get()  → entrepôts du store
 *   db.collection('products').doc(id)          → référence
 *   db.runTransaction(fn)                      → t.get / t.update enregistrés
 */
function makeDb({ products = {}, warehouses = [] } = {}) {
    const updates = [];
    const db = {
        collection(name) {
            return {
                doc: (id) => ({ __col: name, __id: id }),
                where: () => ({
                    get: async () => ({
                        docs: warehouses.map((w) => ({ id: w.id, data: () => w })),
                    }),
                }),
            };
        },
        async runTransaction(fn) {
            const t = {
                get: async (ref) => ({
                    exists: Object.prototype.hasOwnProperty.call(products, ref.__id),
                    data: () => products[ref.__id],
                }),
                update: (ref, payload) => updates.push({ id: ref.__id, payload }),
            };
            return fn(t);
        },
    };
    return { db, updates, byId: (id) => updates.find((u) => u.id === id)?.payload };
}

const order = (over = {}) => ({
    storeId: 'S1', status: 'reçu', articleId: 'P1', quantity: 2, ...over,
});

describe('applyStockUpdates — déduction et restockage', () => {
    let ctx;
    beforeEach(() => {
        ctx = makeDb({ products: { P1: { stock: 10 } } });
    });

    it('déduit le stock à la création d\'une commande', async () => {
        await applyStockUpdates(ctx.db, null, order());
        expect(ctx.byId('P1')).toEqual({ stock: 8 });
    });

    it('restocke à l\'annulation', async () => {
        // 'annulé' est un statut inactif : les articles ne sont plus déduits,
        // donc le delta rend les 2 unités.
        await applyStockUpdates(ctx.db, order(), order({ status: 'annulé' }));
        expect(ctx.byId('P1')).toEqual({ stock: 12 });
    });

    it('n\'écrit rien quand le stock ne bouge pas', async () => {
        // Deux statuts ACTIFS : les articles restent déduits des deux côtés.
        await applyStockUpdates(ctx.db, order(), order({ status: 'livraison' }));
        expect(ctx.updates).toHaveLength(0);
    });

    it('ne descend jamais sous zéro', async () => {
        const c = makeDb({ products: { P1: { stock: 1 } } });
        await applyStockUpdates(c.db, null, order({ quantity: 5 }));
        expect(c.byId('P1')).toEqual({ stock: 0 });
    });

    it('ignore un produit absent de la base', async () => {
        const c = makeDb({ products: {} });
        await applyStockUpdates(c.db, null, order());
        expect(c.updates).toHaveLength(0);
    });
});

describe('applyStockUpdates — entrepôts', () => {
    it('impute le mouvement à l\'entrepôt par défaut quand aucun n\'est choisi', async () => {
        const c = makeDb({
            products: { P1: { stock: 10, warehouseStocks: { W1: 6 } } },
            warehouses: [{ id: 'W1', isDefault: true }, { id: 'W2' }],
        });
        await applyStockUpdates(c.db, null, order());
        expect(c.byId('P1')).toEqual({ stock: 8, 'warehouseStocks.W1': 4 });
    });

    it('respecte l\'entrepôt explicitement choisi sur la commande', async () => {
        const c = makeDb({
            products: { P1: { stock: 10, warehouseStocks: { W1: 6, W2: 3 } } },
            warehouses: [{ id: 'W1', isDefault: true }, { id: 'W2' }],
        });
        await applyStockUpdates(c.db, null, order({ warehouseId: 'W2' }));
        expect(c.byId('P1')).toEqual({ stock: 8, 'warehouseStocks.W2': 1 });
    });

    it('n\'ajuste que le stock total si aucun entrepôt n\'est configuré', async () => {
        const c = makeDb({ products: { P1: { stock: 10 } }, warehouses: [] });
        await applyStockUpdates(c.db, null, order());
        expect(c.byId('P1')).toEqual({ stock: 8 });
    });
});

describe('applyStockUpdates — variantes', () => {
    it('déduit de la bonne variante ET du bon entrepôt (BAY-106)', async () => {
        // Régression connue : le delta partait systématiquement au premier
        // entrepôt du produit, ce qui faisait dériver les stocks multi-articles.
        const c = makeDb({
            products: {
                P1: {
                    stock: 10, isVariable: true,
                    variants: [
                        { id: 'V1', stock: 5, warehouseStocks: { W1: 3, W2: 2 } },
                        { id: 'V2', stock: 4, warehouseStocks: { W1: 4 } },
                    ],
                },
            },
            warehouses: [{ id: 'W1', isDefault: true }, { id: 'W2' }],
        });
        await applyStockUpdates(c.db, null, order({ variantId: 'V1', warehouseId: 'W2', quantity: 2 }));

        const u = c.byId('P1');
        expect(u.stock).toBe(8);
        const v1 = u.variants.find((v) => v.id === 'V1');
        const v2 = u.variants.find((v) => v.id === 'V2');
        expect(v1.stock).toBe(3);
        expect(v1.warehouseStocks).toEqual({ W1: 3, W2: 0 }); // W1 intact
        expect(v2).toEqual({ id: 'V2', stock: 4, warehouseStocks: { W1: 4 } }); // inchangée
    });

    it('borne aussi le stock d\'une variante à zéro', async () => {
        const c = makeDb({
            products: { P1: { stock: 1, isVariable: true, variants: [{ id: 'V1', stock: 1 }] } },
        });
        await applyStockUpdates(c.db, null, order({ variantId: 'V1', quantity: 9 }));
        expect(c.byId('P1').variants[0].stock).toBe(0);
    });
});

describe('applyStockUpdates — lots FEFO', () => {
    it('déduit d\'abord le lot dont la péremption est la plus proche', async () => {
        const c = makeDb({
            products: {
                P1: {
                    stock: 10,
                    inventoryBatches: [
                        { id: 'B_loin', quantity: 5, expiryDate: '2027-01-01' },
                        { id: 'B_proche', quantity: 3, expiryDate: '2026-09-01' },
                    ],
                },
            },
        });
        await applyStockUpdates(c.db, null, order({ quantity: 4 }));

        const b = c.byId('P1').inventoryBatches;
        expect(b.find((x) => x.id === 'B_proche').quantity).toBe(0); // vidé en premier
        expect(b.find((x) => x.id === 'B_loin').quantity).toBe(4);   // puis 1 pris ici
    });

    it('remet le restockage dans le lot le plus proche de la péremption', async () => {
        const c = makeDb({
            products: {
                P1: {
                    stock: 8,
                    inventoryBatches: [
                        { id: 'B_loin', quantity: 5, expiryDate: '2027-01-01' },
                        { id: 'B_proche', quantity: 1, expiryDate: '2026-09-01' },
                    ],
                },
            },
        });
        await applyStockUpdates(c.db, order({ quantity: 3 }), order({ quantity: 3, status: 'annulé' }));

        const b = c.byId('P1').inventoryBatches;
        expect(b.find((x) => x.id === 'B_proche').quantity).toBe(4); // 1 + 3
        expect(b.find((x) => x.id === 'B_loin').quantity).toBe(5);
    });

    it('ne mute pas le tableau de lots reçu', async () => {
        const batches = [{ id: 'B1', quantity: 5, expiryDate: '2027-01-01' }];
        const c = makeDb({ products: { P1: { stock: 10, inventoryBatches: batches } } });
        await applyStockUpdates(c.db, null, order({ quantity: 2 }));
        expect(batches[0].quantity).toBe(5); // l'original est intact
    });
});

describe('applyStockUpdates — bundles', () => {
    it('déduit les composants proportionnellement à leur quantité', async () => {
        const c = makeDb({
            products: {
                PACK: { stock: 10, isBundle: true, bundleItems: [{ productId: 'C1', qty: 3 }] },
                C1: { stock: 20 },
            },
        });
        await applyStockUpdates(c.db, null, order({ articleId: 'PACK', quantity: 2 }));

        expect(c.byId('PACK').stock).toBe(8);
        expect(c.byId('C1').stock).toBe(14); // 20 - (2 x 3)
    });

    it('borne les composants à zéro', async () => {
        const c = makeDb({
            products: {
                PACK: { stock: 5, isBundle: true, bundleItems: [{ productId: 'C1', qty: 4 }] },
                C1: { stock: 3 },
            },
        });
        await applyStockUpdates(c.db, null, order({ articleId: 'PACK', quantity: 2 }));
        expect(c.byId('C1').stock).toBe(0);
    });
});

describe('applyStockUpdates — commandes multi-articles', () => {
    it('agrège les deltas du même produit présent plusieurs fois', async () => {
        const c = makeDb({ products: { P1: { stock: 10 } } });
        await applyStockUpdates(c.db, null, {
            storeId: 'S1', status: 'reçu',
            products: [{ id: 'P1', quantity: 2 }, { id: 'P1', quantity: 3 }],
        });
        expect(c.byId('P1')).toEqual({ stock: 5 }); // une seule écriture, delta cumulé
        expect(c.updates).toHaveLength(1);
    });

    it('ne restocke pas une commande supprimée deux fois', async () => {
        const c = makeDb({ products: { P1: { stock: 10 } } });
        const deleted = order({ deleted: true });
        await applyStockUpdates(c.db, deleted, deleted);
        expect(c.updates).toHaveLength(0);
    });
});

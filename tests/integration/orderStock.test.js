/**
 * Tests d'intégration du moteur de stock serveur (functions/stockLogic.js),
 * exécutés contre l'émulateur Firestore.
 *
 * C'est précisément l'absence de ces tests qui avait laissé passer la régression
 * `productsToFetch is not defined` : le trigger throwait à chaque écriture de
 * commande, donc le stock n'était plus jamais ajusté.
 *
 * Lancement :  npm run test:integration
 */
import { createRequire } from 'module';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { beforeAll, afterAll, describe, it, expect } from 'vitest';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');

process.env.FIRESTORE_EMULATOR_HOST = process.env.FIRESTORE_EMULATOR_HOST || '127.0.0.1:8080';

// IMPORTANT : firebase-admin ET stockLogic doivent être résolus depuis functions/
// pour partager la MÊME instance du SDK. Sinon les sentinelles FieldValue.increment
// créées par stockLogic ne sont pas reconnues par le Firestore du test
// (« Couldn't serialize object of type NumericIncrementTransform »).
const requireFromFunctions = createRequire(resolve(ROOT, 'functions/package.json'));
const { initializeApp, deleteApp } = requireFromFunctions('firebase-admin/app');
const { getFirestore } = requireFromFunctions('firebase-admin/firestore');
const { applyStockUpdates } = requireFromFunctions('./stockLogic.js');

let app, db;

const seedProduct = async (id, data) => { await db.collection('products').doc(id).set(data); };
const stockOf = async (id) => (await db.collection('products').doc(id).get()).data();

beforeAll(async () => {
  app = initializeApp({ projectId: 'bayiin-trigger-test' }, `trigger-test-${Date.now()}`);
  db = getFirestore(app);
});

afterAll(async () => { if (app) await deleteApp(app); });

describe('applyStockUpdates — cycle de vie de la commande', () => {
  it('décrémente le stock à la création d\'une commande', async () => {
    await seedProduct('p1', { storeId: 's1', name: 'P1', price: 10, stock: 10 });
    await applyStockUpdates(db, null, { status: 'reçu', articleId: 'p1', quantity: 3 });
    expect((await stockOf('p1')).stock).toBe(7);
  });

  it('restitue le stock à la suppression de la commande', async () => {
    await seedProduct('p2', { storeId: 's1', name: 'P2', price: 10, stock: 7 });
    await applyStockUpdates(db, { status: 'reçu', articleId: 'p2', quantity: 3 }, null);
    expect((await stockOf('p2')).stock).toBe(10);
  });

  it('restitue le stock quand la commande passe à annulé', async () => {
    await seedProduct('p3', { storeId: 's1', name: 'P3', price: 10, stock: 7 });
    await applyStockUpdates(
      db,
      { status: 'reçu', articleId: 'p3', quantity: 3 },
      { status: 'annulé', articleId: 'p3', quantity: 3 },
    );
    expect((await stockOf('p3')).stock).toBe(10);
  });

  it('applique uniquement le delta quand la quantité change', async () => {
    await seedProduct('p4', { storeId: 's1', name: 'P4', price: 10, stock: 10 });
    await applyStockUpdates(
      db,
      { status: 'reçu', articleId: 'p4', quantity: 2 },
      { status: 'reçu', articleId: 'p4', quantity: 5 },
    );
    // +2 restitués puis -5 déduits => -3 net
    expect((await stockOf('p4')).stock).toBe(7);
  });

  it('ne consomme aucun stock pour un statut inactif', async () => {
    await seedProduct('p7', { storeId: 's1', name: 'P7', price: 10, stock: 10 });
    await applyStockUpdates(db, null, { status: 'annulé', articleId: 'p7', quantity: 3 });
    expect((await stockOf('p7')).stock).toBe(10);
  });
});

describe('applyStockUpdates — commandes multi-produits et bundles', () => {
  it('décrémente chaque produit d\'une commande multi-produits', async () => {
    await seedProduct('p5', { storeId: 's1', name: 'P5', price: 10, stock: 10 });
    await seedProduct('p6', { storeId: 's1', name: 'P6', price: 10, stock: 10 });
    await applyStockUpdates(db, null, {
      status: 'reçu',
      products: [{ id: 'p5', quantity: 2 }, { id: 'p6', quantity: 4 }],
    });
    expect((await stockOf('p5')).stock).toBe(8);
    expect((await stockOf('p6')).stock).toBe(6);
  });

  it('décrémente les composants d\'un bundle proportionnellement', async () => {
    await seedProduct('comp1', { storeId: 's1', name: 'Composant', price: 5, stock: 10 });
    await seedProduct('b1', {
      storeId: 's1', name: 'Bundle', price: 30, stock: 5,
      isBundle: true, bundleItems: [{ productId: 'comp1', qty: 2 }],
    });
    await applyStockUpdates(db, null, { status: 'reçu', articleId: 'b1', quantity: 3 });
    expect((await stockOf('b1')).stock).toBe(2);      // 5 - 3
    expect((await stockOf('comp1')).stock).toBe(4);   // 10 - (3 × 2)
  });

  it('décrémente le stock par entrepôt quand un entrepôt est précisé', async () => {
    await seedProduct('p8', {
      storeId: 's1', name: 'P8', price: 10, stock: 10,
      warehouseStocks: { wh1: 6, wh2: 4 },
    });
    await applyStockUpdates(db, null, { status: 'reçu', articleId: 'p8', quantity: 2, warehouseId: 'wh1' });
    const p8 = await stockOf('p8');
    expect(p8.stock).toBe(8);
    expect(p8.warehouseStocks.wh1).toBe(4);
    expect(p8.warehouseStocks.wh2).toBe(4);
  });
});

describe('applyStockUpdates — lots FEFO (BAY-79)', () => {
  const batches = () => [
    { batchNumber: 'FAR', quantity: 10, expiryDate: '2027-12-31' },
    { batchNumber: 'NEAR', quantity: 5, expiryDate: '2026-01-31' },
  ];

  it('déduit d\'abord du lot dont la péremption est la plus proche (FEFO)', async () => {
    await seedProduct('pb1', { storeId: 's1', name: 'PB1', price: 10, stock: 15, inventoryBatches: batches() });
    await applyStockUpdates(db, null, { status: 'reçu', articleId: 'pb1', quantity: 3 });
    const b = (await stockOf('pb1')).inventoryBatches;
    const near = b.find((x) => x.batchNumber === 'NEAR');
    const far = b.find((x) => x.batchNumber === 'FAR');
    expect(near.quantity).toBe(2); // 5 - 3, épuisé en premier
    expect(far.quantity).toBe(10); // intact
  });

  it('déborde sur le lot suivant quand le plus proche est épuisé', async () => {
    await seedProduct('pb2', { storeId: 's1', name: 'PB2', price: 10, stock: 15, inventoryBatches: batches() });
    await applyStockUpdates(db, null, { status: 'reçu', articleId: 'pb2', quantity: 7 });
    const b = (await stockOf('pb2')).inventoryBatches;
    expect(b.find((x) => x.batchNumber === 'NEAR').quantity).toBe(0); // 5 → 0
    expect(b.find((x) => x.batchNumber === 'FAR').quantity).toBe(8);  // 10 - 2 restants
  });

  it('borne le stock à 0 : une commande > stock ne rend pas le stock négatif', async () => {
    await seedProduct('pneg', { storeId: 's1', name: 'PNEG', price: 10, stock: 3, warehouseStocks: { wh1: 3 } });
    await applyStockUpdates(db, null, { status: 'reçu', articleId: 'pneg', quantity: 5, warehouseId: 'wh1' });
    const p = await stockOf('pneg');
    expect(p.stock).toBe(0);
    expect(p.warehouseStocks.wh1).toBe(0);
  });

  it('restock (annulation) réalimente le lot le plus proche de la péremption', async () => {
    await seedProduct('pb3', { storeId: 's1', name: 'PB3', price: 10, stock: 15, inventoryBatches: batches() });
    await applyStockUpdates(
      db,
      { status: 'reçu', articleId: 'pb3', quantity: 3 },
      { status: 'annulé', articleId: 'pb3', quantity: 3 },
    );
    const b = (await stockOf('pb3')).inventoryBatches;
    // Le stock restitué revient sur le lot à péremption la plus proche (NEAR), pas le plus lointain.
    expect(b.find((x) => x.batchNumber === 'NEAR').quantity).toBe(8); // 5 + 3
    expect(b.find((x) => x.batchNumber === 'FAR').quantity).toBe(10);
  });
});

describe('applyStockUpdates — variante × entrepôt (BAY-106)', () => {
  it('déduit le BON entrepôt de la variante commandée (pas le premier)', async () => {
    await seedProduct('pvar', {
      storeId: 's1', name: 'PVAR', price: 10, stock: 9, isVariable: true,
      variants: [
        { id: 'v1', stock: 5, warehouseStocks: { wh1: 2, wh2: 3 } },
        { id: 'v2', stock: 4, warehouseStocks: { wh1: 4 } },
      ],
    });
    // Commande de la variante v1 depuis l'entrepôt wh2.
    await applyStockUpdates(db, null, { status: 'reçu', articleId: 'pvar', variantId: 'v1', quantity: 2, warehouseId: 'wh2' });

    const p = await stockOf('pvar');
    const v1 = p.variants.find((v) => v.id === 'v1');
    const v2 = p.variants.find((v) => v.id === 'v2');
    expect(p.stock).toBe(7);                     // 9 - 2
    expect(v1.stock).toBe(3);                    // 5 - 2
    expect(v1.warehouseStocks.wh2).toBe(1);      // 3 - 2 (le bon entrepôt)
    expect(v1.warehouseStocks.wh1).toBe(2);      // intact
    expect(v2.stock).toBe(4);                    // variante non commandée intacte
  });
});

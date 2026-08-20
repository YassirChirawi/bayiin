/**
 * Tests de la liaison CRM des commandes (functions/customerLink.js) — BAY-112.
 * Émulateur Firestore (comme orderStock.test.js).  Lancement : npm run test:integration
 */
import { createRequire } from 'module';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { beforeAll, afterAll, beforeEach, describe, it, expect } from 'vitest';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
process.env.FIRESTORE_EMULATOR_HOST = process.env.FIRESTORE_EMULATOR_HOST || '127.0.0.1:8080';

const requireFromFunctions = createRequire(resolve(ROOT, 'functions/package.json'));
const { initializeApp, deleteApp } = requireFromFunctions('firebase-admin/app');
const { getFirestore } = requireFromFunctions('firebase-admin/firestore');
const { linkOrderCustomer } = requireFromFunctions('./customerLink.js');

let app, db;
const orderRef = (id) => db.collection('orders').doc(id);
const customersOf = async (storeId) =>
    (await db.collection('customers').where('storeId', '==', storeId).get()).docs.map((d) => ({ id: d.id, ...d.data() }));

beforeAll(async () => {
    app = initializeApp({ projectId: 'bayiin-crmlink-test' }, `crm-test-${Date.now()}`);
    db = getFirestore(app);
});
afterAll(async () => { if (app) await deleteApp(app); });
beforeEach(async () => {
    // Nettoyage minimal : on utilise des ids/storeId distincts par test.
});

describe('linkOrderCustomer — BAY-112', () => {
    it('crée une fiche client pour une commande catalogue sans customerId', async () => {
        await orderRef('o1').set({ storeId: 'sA', clientName: 'Sara', clientPhone: '0600000001', clientCity: 'Casa', status: 'pending_catalog', date: '2026-08-20' });
        await linkOrderCustomer(db, 'o1');

        const order = (await orderRef('o1').get()).data();
        expect(order.customerId).toBeTruthy();
        const custs = await customersOf('sA');
        expect(custs).toHaveLength(1);
        expect(custs[0].phone).toBe('0600000001');
        expect(custs[0].orderCount).toBe(1);
        expect(custs[0].customerNumber).toBe(5001); // amorce 5000 + 1
    });

    it('dédup : deux commandes même téléphone → une seule fiche, orderCount incrémenté', async () => {
        await orderRef('o2a').set({ storeId: 'sB', clientName: 'Ali', clientPhone: '0611111111', status: 'pending_catalog' });
        await orderRef('o2b').set({ storeId: 'sB', clientName: 'Ali', clientPhone: '0611111111', status: 'pending_catalog' });
        await linkOrderCustomer(db, 'o2a');
        await linkOrderCustomer(db, 'o2b');

        const custs = await customersOf('sB');
        expect(custs).toHaveLength(1);
        expect(custs[0].orderCount).toBe(2);
        const oa = (await orderRef('o2a').get()).data();
        const ob = (await orderRef('o2b').get()).data();
        expect(oa.customerId).toBe(custs[0].id);
        expect(ob.customerId).toBe(custs[0].id); // même client
    });

    it('même téléphone mais AUTRE boutique → fiches séparées (isolation tenant)', async () => {
        await orderRef('o3a').set({ storeId: 'sC', clientPhone: '0622222222', clientName: 'X', status: 'pending_catalog' });
        await orderRef('o3b').set({ storeId: 'sD', clientPhone: '0622222222', clientName: 'X', status: 'pending_catalog' });
        await linkOrderCustomer(db, 'o3a');
        await linkOrderCustomer(db, 'o3b');

        expect(await customersOf('sC')).toHaveLength(1);
        expect(await customersOf('sD')).toHaveLength(1);
    });

    it('idempotent : commande déjà liée → aucune nouvelle fiche', async () => {
        await orderRef('o4').set({ storeId: 'sE', clientPhone: '0633333333', customerId: 'existing-123', status: 'reçu' });
        await linkOrderCustomer(db, 'o4');
        expect(await customersOf('sE')).toHaveLength(0);
        expect((await orderRef('o4').get()).data().customerId).toBe('existing-123');
    });

    it('sans téléphone → non éligible, aucune fiche', async () => {
        await orderRef('o5').set({ storeId: 'sF', clientName: 'Anon', status: 'pending_catalog' });
        await linkOrderCustomer(db, 'o5');
        expect(await customersOf('sF')).toHaveLength(0);
    });

    it('réutilise un client EXISTANT (créé manuellement) au lieu d\'en créer un', async () => {
        await db.collection('customers').doc('cust-pre').set({ storeId: 'sG', phone: '0644444444', name: 'Pré', orderCount: 3, customerNumber: 5050 });
        await orderRef('o6').set({ storeId: 'sG', clientPhone: '0644444444', clientName: 'Pré', status: 'pending_catalog' });
        await linkOrderCustomer(db, 'o6');

        const custs = await customersOf('sG');
        expect(custs).toHaveLength(1);
        expect(custs[0].orderCount).toBe(4); // 3 + 1
        expect((await orderRef('o6').get()).data().customerId).toBe('cust-pre');
    });
});

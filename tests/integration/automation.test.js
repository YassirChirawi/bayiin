/**
 * Tests du moteur d'automatisation SERVEUR (functions/automation/engine.js) — BAY-105.
 *
 * Logique pure (conditions, total, rendu de message) : sans émulateur.
 * runAutomations / executeAction : contre l'émulateur Firestore (comme orderStock.test.js).
 *
 * Lancement :  npm run test:integration
 */
import { createRequire } from 'module';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { beforeAll, afterAll, describe, it, expect } from 'vitest';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
process.env.FIRESTORE_EMULATOR_HOST = process.env.FIRESTORE_EMULATOR_HOST || '127.0.0.1:8080';

const requireFromFunctions = createRequire(resolve(ROOT, 'functions/package.json'));
const { initializeApp, deleteApp } = requireFromFunctions('firebase-admin/app');
const { getFirestore } = requireFromFunctions('firebase-admin/firestore');
const engine = requireFromFunctions('./automation/engine.js');
const { runAutomations, evaluateCondition, orderTotal, renderMessage } = engine;

let app, db;

const seedAutomation = (id, data) => db.collection('stores/s1/automations').doc(id).set(data);
const tasksIn = async (sub) => (await db.collection(`stores/s1/${sub}`).get()).docs.map((d) => d.data());

beforeAll(async () => {
  app = initializeApp({ projectId: 'bayiin-automation-test' }, `auto-test-${Date.now()}`);
  db = getFirestore(app);
});
afterAll(async () => { if (app) await deleteApp(app); });

describe('logique pure', () => {
  it('orderTotal privilégie total, sinon price×quantity', () => {
    expect(orderTotal({ total: 250 })).toBe(250);
    expect(orderTotal({ price: 100, quantity: 3 })).toBe(300);
    expect(orderTotal({ price: 100 })).toBe(100); // quantity défaut 1
  });

  it('evaluateCondition status_equals / total_greater', () => {
    expect(evaluateCondition({ id: 'status_equals', config: { status: 'livré' } }, { status: 'livré' })).toBe(true);
    expect(evaluateCondition({ id: 'status_equals', config: { status: 'livré' } }, { status: 'reçu' })).toBe(false);
    expect(evaluateCondition({ id: 'total_greater', config: { amount: 200 } }, { price: 100, quantity: 3 })).toBe(true);
    expect(evaluateCondition({ id: 'total_greater', config: { amount: 500 } }, { price: 100, quantity: 3 })).toBe(false);
  });

  it('renderMessage interpole les variables', () => {
    const m = renderMessage('Bonjour {name}, {product} à {total}', { clientName: 'Ali', articleName: 'Montre', price: 50, quantity: 2 }, { name: 'X' });
    expect(m).toBe('Bonjour Ali, Montre à 100 DH');
  });
});

describe('runAutomations — exécution serveur (émulateur)', () => {
  it('action immédiate send_whatsapp → crée une whatsapp_task', async () => {
    await seedAutomation('a1', {
      status: 'active', triggerType: 'order_created',
      nodes: [
        { type: 'trigger' },
        { type: 'action', id: 'send_whatsapp', config: { message: 'Salut {name}' } },
      ],
    });
    await runAutomations(db, 's1', 'order_created', { id: 'o1', clientName: 'Sara', clientPhone: '0600000000' }, { name: 'Boutique' });
    const tasks = await tasksIn('whatsapp_tasks');
    const mine = tasks.filter((t) => t.orderId === 'o1');
    expect(mine).toHaveLength(1);
    expect(mine[0].message).toBe('Salut Sara');
    expect(mine[0].status).toBe('pending');
  });

  it('action à délai → planifiée dans automation_tasks avec runAt futur (pas exécutée tout de suite)', async () => {
    await seedAutomation('a2', {
      status: 'active', triggerType: 'order_updated',
      nodes: [
        { type: 'trigger' },
        { type: 'delay', config: { days: 2 } },
        { type: 'action', id: 'send_whatsapp', config: { message: 'Relance {name}' } },
      ],
    });
    const t0 = Date.now();
    await runAutomations(db, 's1', 'order_updated', { id: 'o2', clientName: 'Karim' }, {});
    const scheduled = (await tasksIn('automation_tasks')).filter((t) => t.payload && t.payload.id === 'o2');
    expect(scheduled).toHaveLength(1);
    expect(scheduled[0].status).toBe('scheduled');
    expect(scheduled[0].runAt.toMillis()).toBeGreaterThan(t0 + 86400000); // > 1 jour dans le futur
    // pas de whatsapp_task immédiate pour o2
    expect((await tasksIn('whatsapp_tasks')).filter((t) => t.orderId === 'o2')).toHaveLength(0);
  });

  it('condition non remplie → aucune action', async () => {
    await seedAutomation('a3', {
      status: 'active', triggerType: 'order_updated',
      nodes: [
        { type: 'trigger' },
        { type: 'condition', id: 'status_equals', config: { status: 'livré' } },
        { type: 'action', id: 'send_whatsapp', config: { message: 'Merci {name}' } },
      ],
    });
    await runAutomations(db, 's1', 'order_updated', { id: 'o3', status: 'reçu', clientName: 'Nadia' }, {});
    expect((await tasksIn('whatsapp_tasks')).filter((t) => t.orderId === 'o3')).toHaveLength(0);
  });

  it('automatisation inactive → ignorée', async () => {
    // Store dédié s2 pour isoler (sur s1, a1 active se déclencherait aussi sur order_created).
    await db.collection('stores/s2/automations').doc('a4').set({
      status: 'inactive', triggerType: 'order_created',
      nodes: [{ type: 'trigger' }, { type: 'action', id: 'send_whatsapp', config: { message: 'x' } }],
    });
    await runAutomations(db, 's2', 'order_created', { id: 'o4', clientName: 'Z' }, {});
    const s2Tasks = (await db.collection('stores/s2/whatsapp_tasks').get()).docs;
    expect(s2Tasks).toHaveLength(0);
  });
});

/**
 * Tests de functions/copilot/actionExecutor.js — l'exécution des actions de Beya3
 * avec rollback transactionnel.
 *
 * Ce module n'avait aucune couverture alors qu'il est le plus sensible du
 * copilote : il laisse l'IA écrire dans les données du marchand, et la seule
 * protection est le snapshot pris avant l'écriture. Si le rollback est cassé,
 * une action erronée devient définitive.
 *
 * @vitest-environment node
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createRequire } from 'node:module';

const requireFromModule = createRequire(
    new URL('../../functions/copilot/actionExecutor.js', import.meta.url)
);

// Le module capture getFirestore par destructuration au chargement : on le
// substitue AVANT de le charger (même approche que financialEngine.test.js, et
// même precaution sur les deux installations de firebase-admin du depot).
//
// FieldValue n'est PAS substitue : la propriete est en lecture seule, et le vrai
// serverTimestamp() se contente de renvoyer un jeton, sans app initialisee.
const firestoreModule = requireFromModule('firebase-admin/firestore');
let currentDb = null;
firestoreModule.getFirestore = () => currentDb;

const { executeWithRollback, rollbackLastAction } = requireFromModule('./actionExecutor');

/** Firestore simulé, réduit à ce que le module utilise. */
function makeDb({ docs = {}, logs = [] } = {}) {
    const writes = { set: [], update: [], delete: [] };
    let autoId = 0;

    const makeQuery = (collectionDocs) => {
        const q = {
            where: () => q,
            orderBy: () => q,
            limit: () => q,
            get: async () => ({
                empty: collectionDocs.length === 0,
                docs: collectionDocs.map((d) => ({ id: d.id, data: () => d })),
            }),
        };
        return q;
    };

    const db = {
        doc: (path) => ({ __path: path }),
        collection: (path) => ({
            doc: (id) => {
                const ref = { __path: `${path}/${id || `auto${++autoId}`}`, id: id || `auto${autoId}` };
                ref.get = async () => {
                    const found = logs.find((l) => l.id === id);
                    return { exists: !!found, id, data: () => found };
                };
                ref.set = async (payload) => { writes.set.push({ path: ref.__path, payload }); };
                ref.update = async (payload) => { writes.update.push({ path: ref.__path, payload }); };
                return ref;
            },
            ...makeQuery(logs),
        }),
        batch: () => ({
            set: (ref, payload) => writes.set.push({ path: ref.__path, payload }),
            delete: (ref) => writes.delete.push({ path: ref.__path }),
            commit: async () => {},
        }),
        runTransaction: async (fn) => fn({
            get: async (ref) => ({
                exists: Object.prototype.hasOwnProperty.call(docs, ref.__path),
                data: () => docs[ref.__path],
            }),
            set: (ref, payload) => writes.set.push({ path: ref.__path, payload }),
            update: (ref, payload) => writes.update.push({ path: ref.__path, payload }),
        }),
    };
    return { db, writes };
}

const inOneHour = () => new Date(Date.now() + 30 * 60 * 1000);
const anHourAgo = () => new Date(Date.now() - 2 * 60 * 60 * 1000);

describe('executeWithRollback', () => {
    beforeEach(() => vi.restoreAllMocks());

    it('capture l\'état AVANT d\'exécuter, et journalise l\'action', async () => {
        const ctx = makeDb({ docs: { 'stores/S1/orders/O1': { status: 'reçu', price: 100 } } });
        currentDb = ctx.db;

        const res = await executeWithRollback(
            'S1',
            { actionType: 'bulk_update_orders', userId: 'u1', affectedDocuments: ['stores/S1/orders/O1'] },
            async () => 'fait'
        );

        expect(res.success).toBe(true);
        expect(res.isReversible).toBe(true);

        const log = ctx.writes.set.find((w) => w.path.includes('beya3_action_log'));
        expect(log).toBeTruthy();
        expect(log.payload.status).toBe('executed');
        // Le snapshot doit contenir l'état d'ORIGINE, pas l'état après action.
        expect(log.payload.rollbackData['stores/S1/orders/O1']).toEqual({
            exists: true,
            data: { status: 'reçu', price: 100 },
        });
    });

    it('marque l\'action irréversible quand elle ne touche aucun document', async () => {
        const ctx = makeDb();
        currentDb = ctx.db;
        const res = await executeWithRollback('S1', { actionType: 'analyze' }, async () => 'ok');
        expect(res.isReversible).toBe(false);
    });

    it('note qu\'un document inexistant devra être SUPPRIMÉ au rollback', async () => {
        const ctx = makeDb({ docs: {} }); // le document n'existe pas encore
        currentDb = ctx.db;
        await executeWithRollback(
            'S1',
            { actionType: 'draft_expense', affectedDocuments: ['stores/S1/expenses/E1'] },
            async () => 'créé'
        );
        const log = ctx.writes.set.find((w) => w.path.includes('beya3_action_log'));
        expect(log.payload.rollbackData['stores/S1/expenses/E1']).toEqual({ exists: false, data: null });
    });

    it('propage l\'erreur et journalise l\'échec si l\'action échoue', async () => {
        const ctx = makeDb();
        currentDb = ctx.db;
        vi.spyOn(console, 'error').mockImplementation(() => {});

        await expect(executeWithRollback(
            'S1',
            { actionType: 'bulk_update_orders' },
            async () => { throw new Error('quota dépassé'); }
        )).rejects.toThrow('quota dépassé');

        const failure = ctx.writes.set.find((w) => w.payload?.status === 'failed');
        expect(failure).toBeTruthy();
        expect(failure.payload.error).toBe('quota dépassé');
    });
});

describe('rollbackLastAction — refus légitimes', () => {
    beforeEach(() => vi.restoreAllMocks());

    it('refuse quand aucune action réversible n\'existe', async () => {
        currentDb = makeDb({ logs: [] }).db;
        const r = await rollbackLastAction('S1', 'u1');
        expect(r.error).toMatch(/Aucune action/);
    });

    it('refuse une action déjà annulée', async () => {
        currentDb = makeDb({ logs: [{ id: 'A1', status: 'rolled_back' }] }).db;
        const r = await rollbackLastAction('S1', 'u1');
        expect(r.error).toMatch(/déjà dans l'état/);
    });

    it('refuse au-delà de la fenêtre d\'une heure', async () => {
        currentDb = makeDb({
            logs: [{ id: 'A1', status: 'executed', rollbackDeadline: anHourAgo(), rollbackData: { d: {} } }],
        }).db;
        const r = await rollbackLastAction('S1', 'u1');
        expect(r.error).toMatch(/Délai d'annulation dépassé/);
    });

    it('refuse quand le snapshot est absent', async () => {
        currentDb = makeDb({
            logs: [{ id: 'A1', status: 'executed', rollbackDeadline: inOneHour(), rollbackData: {} }],
        }).db;
        const r = await rollbackLastAction('S1', 'u1');
        expect(r.error).toMatch(/rollback non disponibles/);
    });

    it('accepte un Timestamp Firestore comme échéance, pas seulement une Date', async () => {
        const ctx = makeDb({
            logs: [{
                id: 'A1', status: 'executed',
                rollbackDeadline: { toDate: () => inOneHour() }, // forme Firestore
                rollbackData: { 'stores/S1/orders/O1': { exists: true, data: { status: 'reçu' } } },
            }],
        });
        currentDb = ctx.db;
        const r = await rollbackLastAction('S1', 'u1');
        expect(r.success).toBe(true);
    });
});

describe('rollbackLastAction — restauration', () => {
    beforeEach(() => vi.restoreAllMocks());

    it('réécrit un document existant et supprime celui qui n\'existait pas', async () => {
        const ctx = makeDb({
            logs: [{
                id: 'A1', actionType: 'bulk_update_orders', status: 'executed',
                rollbackDeadline: inOneHour(),
                rollbackData: {
                    'stores/S1/orders/O1': { exists: true, data: { status: 'reçu' } },
                    'stores/S1/expenses/E1': { exists: false, data: null },
                },
            }],
        });
        currentDb = ctx.db;

        const r = await rollbackLastAction('S1', 'u1');

        expect(r.success).toBe(true);
        expect(r.restoredCount).toBe(2);
        // L'état d'origine est réécrit tel quel.
        expect(ctx.writes.set).toContainEqual({
            path: 'stores/S1/orders/O1', payload: { status: 'reçu' },
        });
        // Le document créé par l'action est supprimé.
        expect(ctx.writes.delete).toContainEqual({ path: 'stores/S1/expenses/E1' });
    });

    it('trace qui a annulé et quand, pour l\'audit', async () => {
        const ctx = makeDb({
            logs: [{
                id: 'A1', actionType: 'draft_expense', status: 'executed',
                rollbackDeadline: inOneHour(),
                rollbackData: { 'stores/S1/expenses/E1': { exists: false, data: null } },
            }],
        });
        currentDb = ctx.db;

        await rollbackLastAction('S1', 'yassir');

        const audit = ctx.writes.update.find((w) => w.path.includes('beya3_action_log'));
        expect(audit.payload.status).toBe('rolled_back');
        expect(audit.payload.rolledBackBy).toBe('yassir');
    });
});

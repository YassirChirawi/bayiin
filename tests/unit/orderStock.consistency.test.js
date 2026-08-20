/**
 * orderStock.consistency.test.js (BAY-109)
 *
 * Verrou anti-divergence des deux modules miroirs de la sémantique stock :
 *   client ESM  src/utils/orderStock.js  ↔  serveur CJS  functions/shared/orderStock.js
 * Ils ne peuvent pas être un seul fichier (ESM Vite vs CommonJS Functions) → on exécute les mêmes
 * fixtures dans les deux et on échoue à la moindre divergence. Verrouille aussi le comportement de
 * getActiveItems / computeNetDeltas (base du journal d'audit ET de la mutation stock serveur).
 */
import { createRequire } from 'module';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { describe, it, expect } from 'vitest';

import * as client from '../../src/utils/orderStock.js';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const requireFromFunctions = createRequire(resolve(ROOT, 'functions/package.json'));
const server = requireFromFunctions('./shared/orderStock.js');

const ORDERS = [
    { articleId: 'p1', quantity: 3, status: 'reçu', warehouseId: 'w1' },
    { articleId: 'p1', quantity: 3, status: 'annulé', warehouseId: 'w1' },
    { products: [{ id: 'a', quantity: 2, variantId: 'v1' }, { id: 'b', quantity: 1 }], status: 'livré', warehouseId: 'w2' },
    { articleId: 'p2', quantity: 5, status: 'pending_catalog' },
    null,
];

describe('miroir client ↔ serveur (équivalence)', () => {
    it('getActiveItems produit le même résultat des deux côtés', () => {
        for (const o of ORDERS) {
            expect(client.getActiveItems(o)).toStrictEqual(server.getActiveItems(o));
        }
    });
    it('computeNetDeltas produit le même résultat des deux côtés', () => {
        const pairs = [
            [null, ORDERS[0]],
            [ORDERS[0], { articleId: 'p1', quantity: 3, status: 'annulé', warehouseId: 'w1' }],
            [{ articleId: 'p1', quantity: 2, status: 'reçu', warehouseId: 'w1' }, { articleId: 'p1', quantity: 5, status: 'reçu', warehouseId: 'w1' }],
            [{ articleId: 'p1', quantity: 2, status: 'reçu', warehouseId: 'w1' }, { articleId: 'p1', quantity: 2, status: 'reçu', warehouseId: 'w2' }],
        ];
        for (const [b, a] of pairs) {
            expect(client.computeNetDeltas(b, a)).toStrictEqual(server.computeNetDeltas(b, a));
        }
    });
});

describe('getActiveItems — statuts', () => {
    it('commande inactive → aucun item', () => {
        for (const status of ['retour', 'annulé', 'pending_catalog', 'pas de réponse']) {
            expect(client.getActiveItems({ articleId: 'p', quantity: 1, status })).toEqual([]);
        }
    });
    it('commande supprimée → aucun item', () => {
        expect(client.getActiveItems({ articleId: 'p', quantity: 1, status: 'reçu', deleted: true })).toEqual([]);
    });
    it('commande active mono + multi-produits', () => {
        expect(client.getActiveItems({ articleId: 'p', quantity: 2, status: 'livraison' })).toHaveLength(1);
        expect(client.getActiveItems({ products: [{ id: 'a', quantity: 1 }, { id: 'b', quantity: 1 }], status: 'reçu' })).toHaveLength(2);
    });
});

describe('computeNetDeltas — cycle de vie', () => {
    it('création (null → actif) : déduction du stock', () => {
        const d = client.computeNetDeltas(null, { articleId: 'p1', quantity: 3, status: 'reçu', warehouseId: 'w1' });
        expect(d.p1[0].netChange).toBe(-3);
        expect(d.p1[0].warehouseId).toBe('w1');
    });
    it('annulation (actif → annulé) : restitution', () => {
        const d = client.computeNetDeltas({ articleId: 'p1', quantity: 3, status: 'reçu', warehouseId: 'w1' }, { articleId: 'p1', quantity: 3, status: 'annulé', warehouseId: 'w1' });
        expect(d.p1[0].netChange).toBe(3);
    });
    it('changement de quantité : seul le delta', () => {
        const d = client.computeNetDeltas({ articleId: 'p1', quantity: 2, status: 'reçu', warehouseId: 'w1' }, { articleId: 'p1', quantity: 5, status: 'reçu', warehouseId: 'w1' });
        expect(d.p1[0].netChange).toBe(-3); // +2 restitués, -5 déduits
    });
    it('changement d\'entrepôt : restitue l\'ancien, déduit le nouveau', () => {
        const d = client.computeNetDeltas({ articleId: 'p1', quantity: 2, status: 'reçu', warehouseId: 'w1' }, { articleId: 'p1', quantity: 2, status: 'reçu', warehouseId: 'w2' });
        const w1 = d.p1.find((x) => x.warehouseId === 'w1');
        const w2 = d.p1.find((x) => x.warehouseId === 'w2');
        expect(w1.netChange).toBe(2);   // restitué à l'ancien entrepôt
        expect(w2.netChange).toBe(-2);  // déduit du nouveau
    });
    it('statut inactif → inactif : aucun mouvement', () => {
        const d = client.computeNetDeltas({ articleId: 'p1', quantity: 3, status: 'annulé' }, { articleId: 'p1', quantity: 3, status: 'retour' });
        expect(Object.keys(d)).toHaveLength(0);
    });
});

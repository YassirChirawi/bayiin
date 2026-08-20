/**
 * money.consistency.test.js (BAY-104)
 *
 * Verrou anti-divergence des DEUX modules miroirs (client ESM src/utils/money.js ↔ serveur CJS
 * functions/shared/money.js). Ils ne peuvent pas être un seul fichier (ESM Vite vs CommonJS
 * Functions), donc ce test exécute les mêmes fixtures dans les deux et échoue si un résultat diffère.
 * - Vérifie que les deux exposent les mêmes fonctions.
 * - Verrouille les valeurs des primitives, y compris les cas qui divergeaient avant :
 *   (a) paymentStatus 'remitted' = payé, (b) somme products[] pour le multi-produits.
 */
import { createRequire } from 'module';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { describe, it, expect } from 'vitest';

import * as client from '../../src/utils/money.js';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const requireFromFunctions = createRequire(resolve(ROOT, 'functions/package.json'));
const server = requireFromFunctions('./shared/money.js');

describe('pont client ↔ source serveur (équivalence)', () => {
  const FNS = ['orderValue', 'orderCOGS', 'isOrderPaid', 'collectedValue', 'isRealized',
    'deliveryCostIncurred', 'orderDeliveryCost', 'tvaFromTTC', 'netProfit'];

  it('le pont expose les mêmes fonctions que le module CJS canonique', () => {
    for (const fn of FNS) {
      expect(typeof client[fn]).toBe('function');
      expect(typeof server[fn]).toBe('function');
    }
  });

  // Deux fichiers miroirs (client ESM ↔ serveur CJS) : pas d'identité de référence. On verrouille
  // l'équivalence de COMPORTEMENT sur un échantillon représentatif : toute divergence casse ici.
  it('produit des sorties identiques sur des commandes représentatives', () => {
    const orders = [
      { price: 100, quantity: 2, isPaid: true, costPrice: 40, status: 'livré', realDeliveryCost: 25 },
      { products: [{ price: 50, quantity: 3, costPrice: 20 }, { price: 80, quantity: 1, costPrice: 30 }], paymentStatus: 'remitted', status: 'retour', realDeliveryCost: 15 },
      { price: 300, quantity: 1, amountPaid: 120, status: 'confirmation' },
      { price: 500, quantity: 1, status: 'reçu' },
      { price: 999, quantity: 1, source: 'public_catalog', isPaid: 'true', status: 'annulé' },
    ];
    for (const o of orders) {
      for (const fn of ['orderValue', 'orderCOGS', 'isOrderPaid', 'collectedValue', 'isRealized', 'orderDeliveryCost']) {
        expect(client[fn](o)).toStrictEqual(server[fn](o));
      }
    }
    expect(client.tvaFromTTC(1200)).toStrictEqual(server.tvaFromTTC(1200));
    const np = { realizedRevenue: 1000, cogs: 300, delivery: 100, expenses: 200, refunds: 50 };
    expect(client.netProfit(np)).toStrictEqual(server.netProfit(np));
  });
});

describe('orderValue — multi-produits vs mono', () => {
  it('somme les lignes products[] (multi-produits)', () => {
    expect(client.orderValue({ products: [{ price: 100, quantity: 2 }, { price: 50, quantity: 3 }] })).toBe(350);
  });
  it('mono-produit : price × quantity', () => {
    expect(client.orderValue({ price: 120, quantity: 4 })).toBe(480);
  });
  it('commande catalogue (quantity=1, price=total)', () => {
    expect(client.orderValue({ price: 999, quantity: 1, source: 'public_catalog' })).toBe(999);
  });
  it('quantité manquante → 1', () => {
    expect(client.orderValue({ price: 75 })).toBe(75);
  });
});

describe('isOrderPaid — union canonique', () => {
  it('isPaid booléen', () => expect(client.isOrderPaid({ isPaid: true })).toBe(true));
  it('isPaid chaîne "true"', () => expect(client.isOrderPaid({ isPaid: 'true' })).toBe(true));
  it('paymentStatus remitted (divergence historique) → payé', () => {
    expect(client.isOrderPaid({ paymentStatus: 'remitted' })).toBe(true);
  });
  it('non payé', () => expect(client.isOrderPaid({ isPaid: false, paymentStatus: 'pending' })).toBe(false));
});

describe('collectedValue — cash réalisé', () => {
  it('amountPaid partiel prioritaire', () => {
    expect(client.collectedValue({ amountPaid: 150, price: 300, quantity: 1, isPaid: true })).toBe(150);
  });
  it('amountPaid = 0 explicite (aucun cash) prime sur isPaid', () => {
    expect(client.collectedValue({ amountPaid: 0, price: 300, quantity: 1, isPaid: true })).toBe(0);
  });
  it('payée sans amountPaid → plein montant', () => {
    expect(client.collectedValue({ isPaid: true, price: 200, quantity: 2 })).toBe(400);
  });
  it('remitted sans amountPaid → plein montant', () => {
    expect(client.collectedValue({ paymentStatus: 'remitted', price: 100, quantity: 3 })).toBe(300);
  });
  it('non payée → 0', () => {
    expect(client.collectedValue({ price: 500, quantity: 1 })).toBe(0);
  });
});

describe('isRealized', () => {
  it('encaissement partiel → réalisé', () => expect(client.isRealized({ amountPaid: 10 })).toBe(true));
  it('payée sans montant → réalisé', () => expect(client.isRealized({ isPaid: true, price: 50 })).toBe(true));
  it('non payée → non réalisé', () => expect(client.isRealized({ price: 50 })).toBe(false));
});

describe('coûts de livraison', () => {
  it('imputée pour livré/retour/livraison/ramassage/retour en cours', () => {
    for (const status of ['livré', 'retour', 'retour en cours', 'livraison', 'ramassage']) {
      expect(client.orderDeliveryCost({ status, realDeliveryCost: 30 })).toBe(30);
    }
  });
  it('non imputée pour reçu/annulé', () => {
    expect(client.orderDeliveryCost({ status: 'reçu', realDeliveryCost: 30 })).toBe(0);
    expect(client.orderDeliveryCost({ status: 'annulé', realDeliveryCost: 30 })).toBe(0);
  });
});

describe('TVA & résultat net', () => {
  it('TVA 20% extraite du TTC', () => {
    expect(client.tvaFromTTC(1200)).toBeCloseTo(200, 5); // 1200 - 1000
  });
  it('TVA de 0 → 0', () => expect(client.tvaFromTTC(0)).toBe(0));
  it('netProfit soustrait tous les postes', () => {
    expect(client.netProfit({ realizedRevenue: 1000, cogs: 300, delivery: 100, expenses: 200, refunds: 50, importFees: 25 })).toBe(325);
  });
});

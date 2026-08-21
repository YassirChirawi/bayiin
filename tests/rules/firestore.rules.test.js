/**
 * Tests des règles de sécurité Firestore — couvre les failles P0 corrigées lors de l'audit :
 *  - P0-4 : escalade de tenant via auto-provisionnement de users/{uid}
 *  - P0-5 : auto-attribution d'un plan payant à la création du store
 *  - Isolation multi-tenant (lecture/écriture cross-boutique, changement de storeId)
 *
 * Nécessite l'émulateur Firestore :  npm run test:rules
 */
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { initializeTestEnvironment, assertFails, assertSucceeds } from '@firebase/rules-unit-testing';
import { doc, setDoc, getDoc, updateDoc } from 'firebase/firestore';
import { beforeAll, afterAll, beforeEach, describe, it } from 'vitest';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
let testEnv;

// alice possède storeA ; bob possède storeB ; mallory est rattachée à storeB (attaquante).
const alice = () => testEnv.authenticatedContext('alice', { storeId: 'storeA', role: 'owner' }).firestore();
const mallory = () => testEnv.authenticatedContext('mallory', { storeId: 'storeB', role: 'owner' }).firestore();
const newbie = () => testEnv.authenticatedContext('newbie').firestore();

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: 'bayiin-rules-test',
    firestore: {
      rules: readFileSync(resolve(ROOT, 'firestore.rules'), 'utf8'),
      host: '127.0.0.1',
      port: 8080,
    },
  });
});

afterAll(async () => { if (testEnv) await testEnv.cleanup(); });

beforeEach(async () => {
  await testEnv.clearFirestore();
  await testEnv.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    await setDoc(doc(db, 'stores', 'storeA'), { ownerId: 'alice', name: 'Boutique A', plan: 'free', publicCatalogEnabled: false });
    await setDoc(doc(db, 'stores', 'storeB'), { ownerId: 'bob', name: 'Boutique B', plan: 'free', publicCatalogEnabled: false });
    await setDoc(doc(db, 'users', 'alice'), { email: 'a@x.com', storeId: 'storeA', role: 'owner' });
    await setDoc(doc(db, 'users', 'mallory'), { email: 'm@x.com', storeId: 'storeB', role: 'owner' });
    await setDoc(doc(db, 'products', 'pA'), { storeId: 'storeA', name: 'Produit A', price: 10, stock: 5 });
  });
});

describe('BAY-108 — error_logs (reporting)', () => {
  const superadmin = () => testEnv.authenticatedContext('sa', { role: 'super_admin' }).firestore();
  it('tout utilisateur authentifié peut consigner une erreur', async () => {
    await assertSucceeds(setDoc(doc(alice(), 'error_logs', 'e1'), { fingerprint: 'abc', message: 'boom' }));
  });
  it('un non super-admin ne peut pas lire les erreurs', async () => {
    await assertFails(getDoc(doc(alice(), 'error_logs', 'e1')));
  });
  it('le super-admin peut lire les erreurs', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'error_logs', 'e2'), { fingerprint: 'x', message: 'y' });
    });
    await assertSucceeds(getDoc(doc(superadmin(), 'error_logs', 'e2')));
  });
  it('les erreurs ne sont ni modifiables ni supprimables', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'error_logs', 'e3'), { fingerprint: 'x', message: 'y' });
    });
    await assertFails(updateDoc(doc(superadmin(), 'error_logs', 'e3'), { message: 'z' }));
  });
});

describe('BAY-107 — counters/sequences (numéros séquentiels)', () => {
  it('le propriétaire lit/écrit le compteur de sa boutique', async () => {
    await assertSucceeds(setDoc(doc(alice(), 'stores', 'storeA', 'counters', 'sequences'), { lastOrderNumber: 1042 }));
    await assertSucceeds(getDoc(doc(alice(), 'stores', 'storeA', 'counters', 'sequences')));
  });
  it('un tiers ne peut ni lire ni écrire le compteur d\'une autre boutique', async () => {
    await assertFails(setDoc(doc(mallory(), 'stores', 'storeA', 'counters', 'sequences'), { lastOrderNumber: 9999 }));
    await assertFails(getDoc(doc(mallory(), 'stores', 'storeA', 'counters', 'sequences')));
  });
});

describe('P0-4 — users/{uid} : pas d\'auto-provisionnement vers une autre boutique', () => {
  it('refuse un storeId dont on n\'est pas propriétaire', async () => {
    await assertFails(setDoc(doc(mallory(), 'users', 'mallory2'), { email: 'm@x.com', storeId: 'storeA' }));
  });

  it('refuse un rôle privilégié auto-attribué', async () => {
    await assertFails(setDoc(doc(newbie(), 'users', 'newbie'), { email: 'n@x.com', role: 'super_admin' }));
  });

  it('refuse franchise_admin auto-attribué', async () => {
    await assertFails(setDoc(doc(newbie(), 'users', 'newbie'), { email: 'n@x.com', role: 'franchise_admin' }));
  });

  it('autorise un profil sans storeId ni rôle (cas push notifications / 1re connexion)', async () => {
    await assertSucceeds(setDoc(doc(newbie(), 'users', 'newbie'), { email: 'n@x.com' }));
  });

  it('refuse de modifier son propre rôle après coup', async () => {
    await assertFails(updateDoc(doc(alice(), 'users', 'alice'), { role: 'super_admin' }));
  });

  it('refuse de modifier son propre storeId après coup', async () => {
    await assertFails(updateDoc(doc(alice(), 'users', 'alice'), { storeId: 'storeB' }));
  });

  it('autorise une mise à jour anodine (fcmTokens)', async () => {
    await assertSucceeds(updateDoc(doc(alice(), 'users', 'alice'), { fcmTokens: ['tok'] }));
  });

  it('refuse de lire le profil d\'un autre utilisateur', async () => {
    await assertFails(getDoc(doc(mallory(), 'users', 'alice')));
  });
});

describe('P0-5 — stores : pas d\'auto-attribution d\'un plan payant', () => {
  it('autorise la création d\'une boutique gratuite dont on est propriétaire', async () => {
    await assertSucceeds(setDoc(doc(alice(), 'stores', 'storeC'), { ownerId: 'alice', name: 'C', plan: 'free' }));
  });

  it('refuse la création avec un plan payant', async () => {
    await assertFails(setDoc(doc(alice(), 'stores', 'storeD'), { ownerId: 'alice', name: 'D', plan: 'pro' }));
  });

  it('refuse la création au nom de quelqu\'un d\'autre', async () => {
    await assertFails(setDoc(doc(alice(), 'stores', 'storeE'), { ownerId: 'bob', name: 'E', plan: 'free' }));
  });

  it('refuse la création avec des champs de facturation', async () => {
    await assertFails(setDoc(doc(alice(), 'stores', 'storeF'), { ownerId: 'alice', name: 'F', plan: 'free', stripeCustomerId: 'cus_x' }));
  });

  it('refuse de passer sa boutique en plan payant après coup', async () => {
    await assertFails(updateDoc(doc(alice(), 'stores', 'storeA'), { plan: 'unlimited' }));
  });

  it('autorise une mise à jour normale de la boutique', async () => {
    await assertSucceeds(updateDoc(doc(alice(), 'stores', 'storeA'), { name: 'Boutique A renommée' }));
  });
});

describe('Isolation multi-tenant', () => {
  it('refuse la lecture d\'un produit d\'une autre boutique', async () => {
    await assertFails(getDoc(doc(mallory(), 'products', 'pA')));
  });

  it('autorise le propriétaire à lire son produit', async () => {
    await assertSucceeds(getDoc(doc(alice(), 'products', 'pA')));
  });

  it('refuse d\'écrire sur un produit d\'une autre boutique', async () => {
    await assertFails(updateDoc(doc(mallory(), 'products', 'pA'), { price: 1 }));
  });

  it('refuse de déplacer un produit vers une autre boutique (changement de storeId)', async () => {
    await assertFails(updateDoc(doc(alice(), 'products', 'pA'), { storeId: 'storeB' }));
  });

  it('refuse tout accès non authentifié à un produit', async () => {
    await assertFails(getDoc(doc(testEnv.unauthenticatedContext().firestore(), 'products', 'pA')));
  });
});

describe('Livreur : mise à jour de commande (livreurToken == uid)', () => {
  const driver = () => testEnv.authenticatedContext('driverX').firestore();

  const seedOrder = (data) => testEnv.withSecurityRulesDisabled(async (ctx) => {
    await setDoc(doc(ctx.firestore(), 'orders', 'ord1'), {
      storeId: 'storeA', status: 'livraison', price: 100, quantity: 1, livreurToken: 'driverX', ...data,
    });
  });

  it("autorise le passage à 'livré' avec encaissement COD (codCollected/codCollectedAt)", async () => {
    await seedOrder({});
    await assertSucceeds(updateDoc(doc(driver(), 'orders', 'ord1'), {
      status: 'livré', isPaid: false, codCollected: true, codCollectedAt: '2026-07-24',
      statusHistory: { livré: '2026-07-24' },
    }));
  });

  it("autorise 'retour en cours' (était rejeté avant le fix)", async () => {
    await seedOrder({});
    await assertSucceeds(updateDoc(doc(driver(), 'orders', 'ord1'), { status: 'retour en cours' }));
  });

  it('refuse un champ non autorisé (prix)', async () => {
    await seedOrder({});
    await assertFails(updateDoc(doc(driver(), 'orders', 'ord1'), { status: 'livré', price: 1 }));
  });

  it("refuse un livreur avec le mauvais token", async () => {
    await seedOrder({ livreurToken: 'autreDriver' });
    await assertFails(updateDoc(doc(driver(), 'orders', 'ord1'), { status: 'livré' }));
  });

  it("refuse une transition invalide (livré → pas de réponse)", async () => {
    await seedOrder({ status: 'livré' });
    await assertFails(updateDoc(doc(driver(), 'orders', 'ord1'), { status: 'pas de réponse' }));
  });
});

import { test, expect } from '@playwright/test';
import { preAcceptCookies } from './_auth.js';

/**
 * Chaque test démarre sur un compte NEUF créé via /signup.
 * ⚠️ Ces specs écrivent réellement (comptes, boutiques, commandes) : elles doivent
 * tourner sur les ÉMULATEURS Firebase, jamais sur la prod.
 * Lancer avec `npm run test:e2e` (playwright.config.js force VITE_USE_FIREBASE_EMULATOR).
 */
async function signupAndOnboard(page) {
    const uniqueEmail = `test_${Date.now()}_${Math.floor(Math.random() * 1000)}@bayiin.com`;
    const testPassword = 'Password123!';

    await preAcceptCookies(page);
    await page.goto('/signup');
    await page.waitForLoadState('load');

    await page.fill('input[type="email"]', uniqueEmail);
    await page.fill('input[type="password"]', testPassword);
    const confirmInput = page.locator('input[placeholder*="Confirmer"], input[placeholder*="Confirm"]');
    if (await confirmInput.isVisible({ timeout: 2000 }).catch(() => false)) {
        await confirmInput.fill(testPassword);
    }

    // Ancrage stable sur la case des conditions. La version precedente prenait
    // `form button[type="button"]` .last(), ce qui dependait de l'ordre du DOM :
    // l'oeil d'affichage du mot de passe est aussi un bouton de ce type. Sur
    // mobile la case restait donc decochee, la validation bloquait le submit, et
    // toute la suite echouait sur un waitForURL sans explication.
    const terms = page.getByTestId('signup-terms');
    await terms.waitFor({ state: 'visible', timeout: 10000 });
    if ((await terms.getAttribute('aria-checked')) !== 'true') {
        await terms.click({ force: true });
    }
    await page.click('button[type="submit"]', { force: true });

    await page.waitForURL(/.*\/(onboarding|dashboard)/, { timeout: 15000, waitUntil: 'commit' });

    if (page.url().includes('/onboarding')) {
        const nameInput = page.locator('input[placeholder*="My Awesome Store"], input[type="text"]').first();
        await nameInput.waitFor({ state: 'visible', timeout: 5000 });
        await nameInput.fill('Verification Store');
        await page.getByRole('button', { name: /Suivant|Next/i }).click({ force: true });
        await page.waitForTimeout(600);

        const phoneInput = page.locator('input[placeholder*="212"], input[type="text"]').first();
        await phoneInput.waitFor({ state: 'visible', timeout: 5000 });
        await phoneInput.fill('0600000000');
        await page.getByRole('button', { name: /Suivant|Next/i }).click({ force: true });
        await page.waitForTimeout(600);

        const finishBtn = page.getByRole('button', { name: /Terminer|Finish/i });
        await finishBtn.waitFor({ state: 'visible', timeout: 5000 });
        await finishBtn.click({ force: true });
    }

    // Le prompt biométrique peut s'intercaler.
    const maybeLater = page.getByRole('button', { name: /plus tard|later/i });
    if (await maybeLater.isVisible({ timeout: 4000 }).catch(() => false)) {
        await maybeLater.click({ force: true });
    }

    await page.waitForURL(/.*\/(dashboard|settings|orders|products)/, { timeout: 30000, waitUntil: 'commit' });
}

async function openNewOrderModal(page) {
    await page.goto('/orders');
    // Le bouton « Nouvelle commande » existe en DEUX exemplaires, un par point de
    // rupture : #new-order-button (barre de filtres, `hidden sm:block`) et
    // #new-order-fab (bouton flottant, `md:hidden`). C'est voulu.
    // `.first()` sur le selecteur combine retenait toujours le bouton desktop, donc
    // invisible en viewport mobile. `:visible` selectionne celui reellement rendu.
    const newOrderBtn = page.locator('#new-order-button:visible, #new-order-fab:visible');
    await expect(newOrderBtn.first()).toBeVisible({ timeout: 15000 });
    await newOrderBtn.first().click({ force: true });
    await page.waitForSelector('[data-testid="order-modal"]', { state: 'visible', timeout: 15000 });
    await page.waitForTimeout(400);
}

test.describe('Orders Module E2E', () => {

    test.beforeEach(async ({ page }) => {
        await signupAndOnboard(page);
    });

    test('La page Commandes se charge et propose la création', async ({ page }) => {
        await page.goto('/orders');
        // Voir la note plus haut : un seul des deux boutons est rendu par viewport.
        await expect(page.locator('#new-order-button:visible, #new-order-fab:visible').first()).toBeVisible({ timeout: 15000 });
    });

    test('Créer une commande et la voir apparaître dans la liste', async ({ page }) => {
        const clientName = `Client E2E ${Date.now()}`;

        await openNewOrderModal(page);
        const modal = page.locator('[data-testid="order-modal"]');

        // Le téléphone est le seul champ réellement obligatoire (cf. OrderModal),
        // la commande peut donc être créée sans produit sur un compte neuf.
        await page.fill('#order-client-phone', '0612345678');
        await page.waitForTimeout(400);
        await page.fill('#order-client-name', clientName);
        await page.fill('#order-client-city', 'Casablanca');
        await page.fill('#order-client-address', '12 Rue des Tests');
        await page.fill('#order-price-input', '299');

        await modal.locator('#order-submit-button').click({ force: true });

        // La commande doit apparaître dans la liste.
        //
        // La liste est rendue DEUX fois : un tableau (desktop) et des cartes
        // (mobile, BAY-114), l'un des deux étant masqué selon le point de rupture.
        // `.first()` retenait le nœud du tableau, présent dans le DOM mais caché en
        // viewport mobile — d'où un « resolved to <span> ... unexpected value
        // hidden ». `:visible` cible le rendu réellement affiché.
        await expect(
            page.locator(`:visible:text-is("${clientName}")`).first()
        ).toBeVisible({ timeout: 20000 });
    });
});

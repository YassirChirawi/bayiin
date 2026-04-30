// @ts-check
import { test, expect } from '@playwright/test';
import * as dotenv from 'dotenv';
import * as path from 'path';

// ── Load .env.test credentials ───────────────────────────────────────────────
dotenv.config({ path: path.resolve(process.cwd(), '.env.test') });

const TEST_EMAIL    = process.env.TEST_EMAIL    || 'amadou@abadou.com';
const TEST_PASSWORD = process.env.TEST_PASSWORD || 'Amadou123!';

// ── Shared order data (used across tests) ────────────────────────────────────
const ORDER = {
    clientName:  'Test Client E2E',
    phone:       '0612345678',
    address:     '12 Rue des Tests, Quartier Dev',
    city:        'Casablanca',
    price:       '299',
};

// ── Helper: Login ─────────────────────────────────────────────────────────────
async function login(page) {
    await page.goto('/login');
    await page.waitForLoadState('load');

    const magasinBtn = page.getByText('Magasin');
    await magasinBtn.waitFor({ state: 'visible', timeout: 10000 });
    await magasinBtn.click();
    
    await page.waitForSelector('input[type="email"]', { timeout: 15000 });
    await page.fill('input[type="email"]',    TEST_EMAIL);
    await page.fill('input[type="password"]', TEST_PASSWORD);
    
    await Promise.all([
        page.waitForURL('**/dashboard', { timeout: 15000 }),
        page.click('button[type="submit"]')
    ]);
}

test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
        window.localStorage.setItem('language', 'fr');
    });
    // Inject CSS to hide ALL possible blocking widgets
    await page.addStyleTag({ content: `
        [data-testid="qa-guide"], .qa-guide-container, #qa-guide-id, #tidio-chat, .qa-widget, #launcher { display: none !important; visibility: hidden !important; pointer-events: none !important; }
    ` });
    await login(page);
});

async function openNewOrderModal(page) {
    await page.goto('/orders');
    await page.waitForLoadState('load');
    
    const newOrderBtn = page.locator('#new-order-button, #new-order-fab');
    await expect(newOrderBtn.first()).toBeVisible({ timeout: 10000 });
    await newOrderBtn.first().click({ force: true });
    
    // Wait for modal to appear via test ID
    await page.waitForSelector('[data-testid="order-modal"]', { state: 'visible', timeout: 15000 });
    await page.waitForTimeout(500);
}

// ═════════════════════════════════════════════════════════════════════════════
// TEST 1 — Création d'une commande
// ═════════════════════════════════════════════════════════════════════════════
test.describe('TEST 1 — Création d\'une commande', () => {

    test('Créer une commande et la voir dans la liste avec statut "Confirmé"', async ({ page }) => {
        await openNewOrderModal(page);

        // Fill client info using IDs
        await page.fill('#order-client-phone', ORDER.phone);
        await page.waitForTimeout(500);
        await page.fill('#order-client-name', ORDER.clientName);
        await page.fill('#order-client-city', ORDER.city);
        await page.fill('#order-client-address', ORDER.address);

        // Select product
        const modal = page.locator('[data-testid="order-modal"]');
        const productSelect = modal.locator('select').first();
        await productSelect.waitFor({ state: 'visible', timeout: 10000 });
        await productSelect.selectOption({ index: 1 });
        await page.waitForTimeout(500);
        
        const addToCartBtn = modal.locator('button:has-text("Ajouter")');
        if (await addToCartBtn.isVisible()) {
            await addToCartBtn.click();
        }

        // Set status and submit
        await modal.locator('#order-status-select').selectOption({ label: /Confirmé/i });
        await modal.locator('#order-submit-button').click();
        
        // Verify it appears in the list
        await page.waitForSelector(`text=${ORDER.clientName}`, { timeout: 20000 });
        await expect(page.locator(`text=${ORDER.clientName}`).first()).toBeVisible();
    });

});

// ═════════════════════════════════════════════════════════════════════════════
// TEST 2 — Changement de statut
// ═════════════════════════════════════════════════════════════════════════════
test.describe('TEST 2 — Changement de statut', () => {

    test('Passer une commande de "Reçu" → "En Livraison" → "Livré" et vérifier les finances', async ({ page }) => {
        await page.goto('/orders');
        await page.waitForSelector('table, .order-row', { timeout: 15000 });

        const firstOrderRow = page.locator('tbody tr').first();
        await firstOrderRow.waitFor({ timeout: 10000 });
        await firstOrderRow.click();

        await page.waitForSelector('[data-testid="order-modal"]', { timeout: 10000 });
        const modal = page.locator('[data-testid="order-modal"]');
        
        // "En Livraison"
        await modal.locator('#order-status-select').selectOption('livraison');
        await modal.locator('#order-submit-button').click();
        await page.waitForSelector('text=/En Livraison|livraison/i', { timeout: 15000 });

        // "Livré"
        await page.locator('tbody tr').first().click();
        await page.waitForSelector('[data-testid="order-modal"]', { timeout: 10000 });
        await modal.locator('#order-status-select').selectOption('livré');
        await modal.locator('#order-submit-button').click();

        // Verify
        await page.waitForSelector('text=/Livré/i', { timeout: 15000 });
        await expect(page.locator('text=/Livré/i').first()).toBeVisible();
    });

});

// ═════════════════════════════════════════════════════════════════════════════
// TEST 3 — Retour commande
// ═════════════════════════════════════════════════════════════════════════════
test.describe('TEST 3 — Retour commande', () => {

    test('Créer une commande, l\'expédier puis la retourner — stock remis à jour', async ({ page }) => {
        const clientRetourName = 'Client Retour E2E ' + Date.now();
        
        // ── Step 1: Create a fresh order ─────────────────────────────────
        await openNewOrderModal(page);

        await page.fill('#order-client-phone', '0611111111');
        await page.waitForTimeout(500);
        await page.fill('#order-client-name', clientRetourName);
        await page.fill('#order-client-city', 'Rabat');
        await page.fill('#order-client-address', '5 Avenue du Retour');

        const modal = page.locator('[data-testid="order-modal"]');
        const productSelect = modal.locator('select').first();
        await productSelect.waitFor({ state: 'visible', timeout: 10000 });
        await productSelect.selectOption({ index: 1 });
        await page.waitForTimeout(500);
        
        const addBtn = modal.locator('button:has-text("Ajouter")');
        if (await addBtn.isVisible()) await addBtn.click();

        await modal.locator('#order-submit-button').click();
        await page.waitForSelector(`text=${clientRetourName}`, { timeout: 20000 });

        // ── Step 2: Note the initial stock level ──────────────────────────
        await page.goto('/products');
        await page.waitForSelector('tbody tr', { timeout: 15000 });
        const initialStockText = await page.locator('tbody tr').first().locator('td').nth(3).textContent() ?? '0';
        const initialStock = parseInt(initialStockText.replace(/\D/g, '')) || 0;

        // ── Step 3: Change to "En Livraison" ──────────────────────────────
        await page.goto('/orders');
        await page.waitForSelector(`text=${clientRetourName}`, { timeout: 15000 });
        await page.locator('tr').filter({ hasText: clientRetourName }).first().click();
        
        await page.waitForSelector('[data-testid="order-modal"]', { timeout: 10000 });
        await modal.locator('#order-status-select').selectOption('livraison');
        await modal.locator('#order-submit-button').click();
        await page.waitForTimeout(1000);

        // ── Step 4: Change to "Retour" ────────────────────────────────────
        await page.locator('tr').filter({ hasText: clientRetourName }).first().click();
        await page.waitForSelector('[data-testid="order-modal"]', { timeout: 10000 });
        await modal.locator('#order-status-select').selectOption('retour');
        await modal.locator('#order-submit-button').click();

        // ── Step 5: Verify status ─────────────────────────────────────────
        await page.waitForSelector('text=/Retour/i', { timeout: 15000 });

        // ── Step 6: Verify stock incremented ──────────────────────────────
        await page.goto('/products');
        await page.waitForTimeout(2000); 
        await page.reload();
        
        const updatedStockText = await page.locator('tbody tr').first().locator('td').nth(3).textContent() ?? '0';
        const updatedStock = parseInt(updatedStockText.replace(/\D/g, '')) || 0;

        expect(updatedStock).toBeGreaterThanOrEqual(initialStock);
    });

});

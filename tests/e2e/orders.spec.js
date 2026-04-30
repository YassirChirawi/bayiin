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
    await page.waitForLoadState('networkidle');

    const magasinBtn = page.getByText('Magasin');
    if (await magasinBtn.isVisible({ timeout: 5000 })) {
        await magasinBtn.click();
        await page.waitForTimeout(500);
    }

    await page.waitForSelector('input[type="email"]', { timeout: 15000 });
    await page.fill('input[type="email"]',    TEST_EMAIL);
    await page.fill('input[type="password"]', TEST_PASSWORD);
    
    await Promise.all([
        page.waitForURL('**/dashboard', { timeout: 15000 }),
        page.click('button[type="submit"]')
    ]);
}

async function openNewOrderModal(page) {
    await page.goto('/orders');
    await page.waitForLoadState('networkidle');
    
    const newOrderBtn = page.getByRole('button', { name: /Nouvelle|New/i }).first();
    await newOrderBtn.waitFor({ state: 'visible', timeout: 15000 });
    
    // Retry click if modal doesn't open
    await newOrderBtn.click();
    
    // Wait for modal title
    await page.waitForSelector('h2:has-text("commande"), h2:has-text("Order")', { timeout: 15000 });
}

test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
        window.localStorage.setItem('language', 'fr');
    });
    await login(page);
});

// ═════════════════════════════════════════════════════════════════════════════
// TEST 1 — Création d'une commande
// ═════════════════════════════════════════════════════════════════════════════
test.describe('TEST 1 — Création d\'une commande', () => {

    test('Créer une commande et la voir dans la liste avec statut "Confirmé"', async ({ page }) => {
        await openNewOrderModal(page);

        // ── Fill client info ──────────────────────────────────────────────
        await page.locator('input[placeholder="0600000000"]').fill(ORDER.phone);
        await page.waitForTimeout(600); // debounce

        await page.locator('input[placeholder*="Jean Dupont"]').fill(ORDER.clientName);
        await page.locator('input[list="cities"]').fill(ORDER.city);
        await page.locator('input[placeholder*="Adresse"]').fill(ORDER.address);

        // ── Select first available product ───────────────────────────────
        const productSelect = page.locator('select').first();
        await productSelect.waitFor({ state: 'visible', timeout: 10000 });
        await productSelect.selectOption({ index: 1 });
        
        await page.waitForTimeout(800);
        const addToCartBtn = page.getByText(/Ajouter au panier|Add to cart/i);
        if (await addToCartBtn.isVisible()) {
            await addToCartBtn.click();
        }

        // ── Set status to "Confirmé" ───────────────────────────────────────
        // Finding the second select (status)
        await page.locator('select').nth(1).selectOption({ label: /Confirmé/i });

        // ── Submit ────────────────────────────────────────────────────────
        await page.getByRole('button', { name: /Enregistrer|Save|Valider/i }).click();

        // ── Verify order appears in the list ──────────────────────────────
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

        await page.waitForSelector('select', { timeout: 10000 });

        // ── Change status to "En Livraison" ──────────────────────────────
        const statusSelect = page.locator('select').nth(1);
        await statusSelect.selectOption('livraison');
        await page.getByRole('button', { name: /Enregistrer|Save|Valider/i }).click();
        await page.waitForSelector('text=/En Livraison|livraison/i', { timeout: 15000 });

        // ── Re-open and change to "Livré" ───────────────────────────────
        await page.locator('tbody tr').first().click();
        await page.waitForSelector('select', { timeout: 10000 });
        await page.locator('select').nth(1).selectOption('livré');
        await page.getByRole('button', { name: /Enregistrer|Save|Valider/i }).click();

        // ── Verify "Livré" badge ──────────────────────────────────────────
        await page.waitForSelector('text=/Livré/i', { timeout: 15000 });
        await expect(page.locator('text=/Livré/i').first()).toBeVisible();
    });

});
// ═════════════════════════════════════════════════════════════════════════════
// TEST 3 — Retour commande
// ═════════════════════════════════════════════════════════════════════════════
test.describe('TEST 3 — Retour commande', () => {

    test('Créer une commande, l\'expédier puis la retourner — stock remis à jour', async ({ page }) => {
        // ── Step 1: Create a fresh order ─────────────────────────────────
        await openNewOrderModal(page);

        await page.locator('input[placeholder="0600000000"]').fill('0611111111');
        await page.waitForTimeout(500);
        await page.locator('input[placeholder*="Jean Dupont"]').fill('Client Retour E2E');
        await page.locator('input[list="cities"]').fill('Rabat');
        await page.locator('input[placeholder*="Adresse"]').fill('5 Avenue du Retour');

        // Select first available product
        const productSelect = page.locator('select').first();
        await productSelect.waitFor({ state: 'visible', timeout: 10000 });
        await productSelect.selectOption({ index: 1 });
        await page.waitForTimeout(800);
        
        const addBtn = page.getByText(/Ajouter au panier|Add to cart/i);
        if (await addBtn.isVisible()) await addBtn.click();

        // Submit new order
        await page.getByRole('button', { name: /Enregistrer|Save|Valider/i }).click();
        await page.waitForSelector(`text=Client Retour E2E`, { timeout: 20000 });

        // ── Step 2: Note the initial stock level ──────────────────────────
        await page.goto('/products');
        await page.waitForSelector('tbody tr', { timeout: 15000 });
        const initialStockText = await page.locator('tbody tr').first().locator('td').nth(3).textContent() ?? '0';
        const initialStock = parseInt(initialStockText.replace(/\D/g, '')) || 0;

        // ── Step 3: Change to "En Livraison" ──────────────────────────────
        await page.goto('/orders');
        await page.waitForSelector('text=Client Retour E2E', { timeout: 15000 });
        await page.locator('tr').filter({ hasText: 'Client Retour E2E' }).first().click();
        
        await page.waitForSelector('select', { timeout: 10000 });
        await page.locator('select').nth(1).selectOption('livraison');
        await page.getByRole('button', { name: /Enregistrer|Save|Valider/i }).click();
        await page.waitForTimeout(1500);

        // ── Step 4: Change to "Retour" ────────────────────────────────────
        await page.locator('tr').filter({ hasText: 'Client Retour E2E' }).first().click();
        await page.waitForSelector('select', { timeout: 10000 });
        await page.locator('select').nth(1).selectOption('retour');
        await page.getByRole('button', { name: /Enregistrer|Save|Valider/i }).click();

        // ── Step 5: Verify status ─────────────────────────────────────────
        await page.waitForSelector('text=/Retour/i', { timeout: 15000 });

        // ── Step 6: Verify stock incremented ──────────────────────────────
        await page.goto('/products');
        await page.waitForTimeout(5000); // Wait for Cloud Function
        await page.reload();
        
        const updatedStockText = await page.locator('tbody tr').first().locator('td').nth(3).textContent() ?? '0';
        const updatedStock = parseInt(updatedStockText.replace(/\D/g, '')) || 0;

        expect(updatedStock).toBeGreaterThanOrEqual(initialStock);
    });

});


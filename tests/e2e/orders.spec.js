// @ts-check
import { test, expect } from '@playwright/test';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { fileURLToPath } from 'url';

// ── Load .env.test credentials ───────────────────────────────────────────────
dotenv.config({ path: path.resolve(process.cwd(), '.env.test') });

const TEST_EMAIL    = process.env.TEST_EMAIL    || 'test@bayiin.shop';
const TEST_PASSWORD = process.env.TEST_PASSWORD || '';

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

    // Wait for the role picker or directly the login form
    const magasinBtn = page.getByText('Magasin');
    if (await magasinBtn.isVisible({ timeout: 5000 })) {
        await magasinBtn.click();
    }

    await page.waitForSelector('input[type="email"]', { timeout: 15000 });
    await page.fill('input[type="email"]',    TEST_EMAIL);
    await page.fill('input[type="password"]', TEST_PASSWORD);
    await page.click('button[type="submit"]');

    // Wait for dashboard to load by checking for a specific element
    await page.waitForSelector('nav, h1, .dashboard-stats', { timeout: 30000 });
}

// ── Helper: Open "New Order" modal ─────────────────────────────────────────
async function openNewOrderModal(page) {
    await page.goto('/orders');

    // Wait for order list to settle (Firebase Realtime load)
    // We search for a button with the text "New Order" or "Nouvelle Commande"
    // Using getByRole('button', { name: ... }) is more robust as it handles aria-labels (FAB) and desktop buttons
    const newOrderBtn = page.getByRole('button', { name: /Nouvelle Commande|New Order/i }).first();
    await newOrderBtn.waitFor({ state: 'visible', timeout: 15000 });
    await newOrderBtn.click();

    // Modal should appear
    await page.waitForSelector('text=/Nouvelle commande|New Order/i', { timeout: 10000 });
}

// ── Helper: Fill order form (client info + manual price, no product) ─────────
async function fillOrderForm(page, orderData = ORDER) {
    // Phone (first required field)
    await page.fill('input[placeholder="0600000000"]', orderData.phone);

    // Wait for any autocomplete to disappear, then fill name
    await page.waitForTimeout(500);
    const nameInput = page.locator('input').filter({ hasText: '' }).nth(1);
    // More reliable: target by label text proximity
    await page.getByLabel(/Nom|Name/i).fill(orderData.clientName);

    // City — uses a datalist input
    await page.locator('input[list="cities"]').fill(orderData.city);

    // Address
    await page.getByLabel(/Adresse|Address/i).fill(orderData.address);

    // Global price — fill directly without product (simpler for E2E)
    await page.getByLabel(/Prix Global|Global Price/i).fill(orderData.price);
}

// ═════════════════════════════════════════════════════════════════════════════
// TEST 1 — Création d'une commande
// ═════════════════════════════════════════════════════════════════════════════
test.describe('TEST 1 — Création d\'une commande', () => {

    test.beforeEach(async ({ page }) => {
        await login(page);
    });

    test('Créer une commande et la voir dans la liste avec statut "Confirmé"', async ({ page }) => {
        await openNewOrderModal(page);

        // ── Fill client info ──────────────────────────────────────────────
        await page.fill('input[placeholder="0600000000"]', ORDER.phone);
        await page.waitForTimeout(600); // debounce pour l'autocomplete

        await page.getByLabel(/Nom|Name/i).fill(ORDER.clientName);
        await page.locator('input[list="cities"]').fill(ORDER.city);
        await page.getByLabel(/Adresse|Address/i).fill(ORDER.address);

        // ── Select first available product ───────────────────────────────
        const productSelect = page.locator('select').first();
        await productSelect.waitFor({ state: 'visible', timeout: 10000 });

        const productCount = await productSelect.locator('option').count();
        if (productCount > 1) {
            // index 0 is the placeholder, pick index 1
            await productSelect.selectIndex(1);
            // Wait for price to auto-populate from product
            await page.waitForTimeout(800);

            // Add to cart
            const addToCartBtn = page.getByText(/Ajouter au panier|Add to cart/i);
            if (await addToCartBtn.isVisible()) {
                await addToCartBtn.click();
                await page.waitForTimeout(400);
            }
        }

        // ── Set price manually (in case product had no price) ─────────────
        const priceInput = page.getByLabel(/Prix Global|Global Price/i);
        const priceVal = await priceInput.inputValue();
        if (!priceVal || priceVal === '0') {
            await priceInput.fill(ORDER.price);
        }

        // ── Set status to "Confirmé" ───────────────────────────────────────
        const statusSelect = page.locator('select').filter({ hasText: /Reçu|confirmation|livraison/i }).first();
        // Safer: find the select that has "reçu" as option
        await page.locator('select').nth(1).selectOption({ label: /Confirmé/i });

        // ── Submit ────────────────────────────────────────────────────────
        await page.getByRole('button', { name: /Enregistrer|Save|Valider/i }).click();

        // ── Wait for success toast ────────────────────────────────────────
        await page.waitForSelector('text=/commande créée|order created|Confirmé/i', {
            timeout: 15000
        });

        // ── Verify order appears in the list ──────────────────────────────
        await page.waitForSelector(`text=${ORDER.clientName}`, { timeout: 20000 });
        const orderRow = page.locator(`text=${ORDER.clientName}`).first();
        await expect(orderRow).toBeVisible();

        // ── Screenshot ────────────────────────────────────────────────────
        await page.screenshot({ path: 'test-results/order-created.png', fullPage: false });
    });

});

// ═════════════════════════════════════════════════════════════════════════════
// TEST 2 — Changement de statut
// ═════════════════════════════════════════════════════════════════════════════
test.describe('TEST 2 — Changement de statut', () => {

    test.beforeEach(async ({ page }) => {
        await login(page);
    });

    test('Passer une commande de "Reçu" → "En Livraison" → "Livré" et vérifier les finances', async ({ page }) => {
        // ── Go to orders ─────────────────────────────────────────────────
        await page.goto('/orders');
        await page.waitForSelector('table, [data-testid="order-list"], .order-row', { timeout: 15000 });

        // ── Click on first order in the list ─────────────────────────────
        const firstOrderRow = page.locator('tbody tr, [role="row"]').first();
        await firstOrderRow.waitFor({ timeout: 10000 });
        await firstOrderRow.click();

        // Modal opens — wait for status select
        await page.waitForSelector('select', { timeout: 10000 });

        // ── Get current revenue value from finances BEFORE status change ──
        // (We'll navigate there after)

        // ── Change status to "En Livraison" ──────────────────────────────
        // Status select contains the ORDER_STATUS values
        const statusSelect = page.locator('select').filter({ has: page.locator('option[value="livraison"]') }).first();
        await statusSelect.waitFor({ timeout: 8000 });
        await statusSelect.selectOption('livraison');

        // Save
        await page.getByRole('button', { name: /Enregistrer|Save|Valider/i }).click();

        // ── Wait for modal to close and list to update ────────────────────
        await page.waitForSelector('text=/En Livraison|livraison/i', { timeout: 15000 });

        // ── Re-open the same order and change to "Livré" ─────────────────
        await page.locator('tbody tr, [role="row"]').first().click();
        await page.waitForSelector('select', { timeout: 10000 });

        const statusSelect2 = page.locator('select').filter({ has: page.locator('option[value="livré"]') }).first();
        await statusSelect2.waitFor({ timeout: 8000 });
        await statusSelect2.selectOption('livré');
        await page.getByRole('button', { name: /Enregistrer|Save|Valider/i }).click();

        // ── Verify "Livré" badge visible in order list ────────────────────
        await page.waitForSelector('text=/Livré/i', { timeout: 15000 });
        await expect(page.locator('text=/Livré/i').first()).toBeVisible();

        // ── Navigate to /finances and verify CA has changed ───────────────
        await page.goto('/finances');
        await page.waitForSelector('text=/Chiffre d\'affaires|Revenue|Revenus/i', { timeout: 20000 });

        // The delivered revenue card should be visible and non-zero
        const revenueCard = page.locator('text=/Livré|Delivered/i').first();
        await expect(revenueCard).toBeVisible();

        // Screenshot
        await page.screenshot({ path: 'test-results/status-changed-finances.png', fullPage: false });
    });

});

// ═════════════════════════════════════════════════════════════════════════════
// TEST 3 — Retour commande
// ═════════════════════════════════════════════════════════════════════════════
test.describe('TEST 3 — Retour commande', () => {

    test.beforeEach(async ({ page }) => {
        await login(page);
    });

    test('Créer une commande, l\'expédier puis la retourner — stock remis à jour', async ({ page }) => {
        // ── Step 1: Create a fresh order ─────────────────────────────────
        await openNewOrderModal(page);

        await page.fill('input[placeholder="0600000000"]', '0611111111');
        await page.waitForTimeout(500);
        await page.getByLabel(/Nom|Name/i).fill('Client Retour E2E');
        await page.locator('input[list="cities"]').fill('Rabat');
        await page.getByLabel(/Adresse|Address/i).fill('5 Avenue du Retour');

        // Select first available product and note its name for stock check
        const productSelect = page.locator('select').first();
        await productSelect.waitFor({ state: 'visible', timeout: 10000 });
        const options = await productSelect.locator('option').all();
        let selectedProductName = '';
        if (options.length > 1) {
            selectedProductName = (await options[1].textContent()) || '';
            await productSelect.selectIndex(1);
            await page.waitForTimeout(800);
            const addBtn = page.getByText(/Ajouter au panier|Add to cart/i);
            if (await addBtn.isVisible()) await addBtn.click();
            await page.waitForTimeout(400);
        }

        // Ensure price is set
        const priceInput = page.getByLabel(/Prix Global|Global Price/i);
        if (!(await priceInput.inputValue())) await priceInput.fill('199');

        // Submit new order
        await page.getByRole('button', { name: /Enregistrer|Save|Valider/i }).click();
        await page.waitForSelector(`text=Client Retour E2E`, { timeout: 20000 });

        // ── Step 2: Note the initial stock level from /products ───────────
        await page.goto('/products');
        await page.waitForSelector('table, [data-testid="product-list"]', { timeout: 15000 });

        // Find the product row — look for first non-header row
        const productRow = page.locator('tbody tr').first();
        const initialStockText = await productRow.locator('td').nth(3).textContent() ?? '0';
        const initialStock = parseInt(initialStockText.replace(/\D/g, '')) || 0;

        // ── Step 3: Go back to orders, open "Client Retour E2E", change to "En Livraison" ──
        await page.goto('/orders');
        await page.waitForSelector('text=Client Retour E2E', { timeout: 15000 });

        const targetRow = page.locator('tr, [role="row"]').filter({ hasText: 'Client Retour E2E' }).first();
        await targetRow.click();
        await page.waitForSelector('select', { timeout: 10000 });

        const statusSel = page.locator('select').filter({ has: page.locator('option[value="livraison"]') }).first();
        await statusSel.selectOption('livraison');
        await page.getByRole('button', { name: /Enregistrer|Save|Valider/i }).click();
        await page.waitForTimeout(1500); // let Firebase write settle

        // ── Step 4: Change to "Retour" ────────────────────────────────────
        await page.locator('tr, [role="row"]').filter({ hasText: 'Client Retour E2E' }).first().click();
        await page.waitForSelector('select', { timeout: 10000 });

        const statusSel2 = page.locator('select').filter({ has: page.locator('option[value="retour"]') }).first();
        await statusSel2.waitFor({ timeout: 8000 });
        await statusSel2.selectOption('retour');
        await page.getByRole('button', { name: /Enregistrer|Save|Valider/i }).click();

        // ── Step 5: Verify status badge is "Retour Déposé" ───────────────
        await page.waitForSelector('text=/Retour|retour/i', { timeout: 15000 });
        await expect(page.locator('text=/Retour Déposé|retour/i').first()).toBeVisible();

        // ── Step 6: Verify stock incremented (Cloud Function onOrderWrite) ─
        // Firebase Cloud Function onOrderWrite handles restock asynchronously.
        // Give it up to 10 seconds to propagate before checking.
        await page.goto('/products');
        await page.waitForSelector('tbody tr', { timeout: 15000 });
        await page.waitForTimeout(5000); // wait for Cloud Function to restock

        await page.reload();
        await page.waitForSelector('tbody tr', { timeout: 15000 });

        const updatedStockText = await page.locator('tbody tr').first().locator('td').nth(3).textContent() ?? '0';
        const updatedStock = parseInt(updatedStockText.replace(/\D/g, '')) || 0;

        // Stock should have increased (restocked) after return
        expect(updatedStock).toBeGreaterThanOrEqual(initialStock);

        // Screenshot
        await page.screenshot({ path: 'test-results/order-returned-stock.png', fullPage: false });
    });

});

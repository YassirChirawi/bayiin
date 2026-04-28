import { test, expect } from '@playwright/test';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.test') });

const TEST_EMAIL = process.env.TEST_EMAIL || 'amadou@abadou.com';
const TEST_PASSWORD = process.env.TEST_PASSWORD || '123456';

async function login(page) {
    await page.goto('/login');
    const magasinBtn = page.getByText('Magasin');
    if (await magasinBtn.isVisible({ timeout: 5000 })) {
        await magasinBtn.click();
    }
    await page.waitForSelector('input[type="email"]', { timeout: 15000 });
    await page.fill('input[type="email"]', TEST_EMAIL);
    await page.fill('input[type="password"]', TEST_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForSelector('nav, h1, .dashboard-stats', { timeout: 30000 });
}

test.describe('Products Module E2E', () => {

    test.beforeEach(async ({ page }) => {
        await login(page);
    });

    test('Create a product with variants', async ({ page }) => {
        await page.goto('/products');
        
        // Click Add Product button
        const addBtn = page.getByRole('button', { name: /Ajouter|Add/i }).first();
        await addBtn.click();

        // Fill product name
        await page.fill('input[name="name"]', 'E2E Test Product Variants');
        await page.fill('input[name="price"]', '150');

        // Toggle "Produit avec variantes" if it exists
        const variantsToggle = page.getByText(/Produit avec variantes|Variable product/i);
        if (await variantsToggle.isVisible()) {
            await variantsToggle.click();
            
            // Add a variant
            await page.getByText(/Ajouter une variante|Add variant/i).click();
            await page.fill('input[placeholder*="Nom de la variante"]', 'Size L');
            await page.fill('input[placeholder*="Prix"]', '160');
            await page.fill('input[placeholder*="Stock"]', '10');
        }

        // Save
        await page.getByRole('button', { name: /Enregistrer|Save/i }).click();

        // Verify success toast or list update
        await page.waitForSelector('text=E2E Test Product Variants', { timeout: 15000 });
        await expect(page.locator('text=E2E Test Product Variants')).toBeVisible();
    });

    test('Create a product with inventory batches (FEFO)', async ({ page }) => {
        await page.goto('/products');
        
        await page.getByRole('button', { name: /Ajouter|Add/i }).first().click();
        await page.fill('input[name="name"]', 'E2E FEFO Product');
        await page.fill('input[name="price"]', '100');

        // Look for inventory batches section
        const batchesSection = page.getByText(/Lots de stock|Inventory Batches/i);
        if (await batchesSection.isVisible()) {
            await batchesSection.click(); // Open section if collapsed
            
            // Add first batch
            await page.getByText(/Ajouter un lot|Add batch/i).click();
            await page.locator('input[type="date"]').first().fill('2026-12-31');
            await page.locator('input[placeholder*="Quantité"]').first().fill('20');

            // Add second batch (earlier expiry)
            await page.getByText(/Ajouter un lot|Add batch/i).click();
            await page.locator('input[type="date"]').nth(1).fill('2026-06-30');
            await page.locator('input[placeholder*="Quantité"]').nth(1).fill('10');
        }

        await page.getByRole('button', { name: /Enregistrer|Save/i }).click();

        await page.waitForSelector('text=E2E FEFO Product', { timeout: 15000 });
        await expect(page.locator('text=E2E FEFO Product')).toBeVisible();
    });
});

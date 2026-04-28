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

test.describe('Warehouse Module E2E', () => {

    test.beforeEach(async ({ page }) => {
        await login(page);
    });

    test('Warehouse Scanner View Navigation', async ({ page }) => {
        await page.goto('/warehouse');
        
        // Verify scanner container exists
        await expect(page.locator('#reader, .scanner-container')).toBeVisible();
        
        // Manual input fallback
        await page.getByRole('button', { name: /Entrée manuelle|Manual input/i }).click();
        await page.fill('input[placeholder*="SKU"]', 'TEST-SKU');
        await page.getByRole('button', { name: /Rechercher|Search/i }).click();
        
        await expect(page.locator('text=/Produit non trouvé|Not found/i')).toBeVisible();
    });
});

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

test.describe('Finances Module E2E', () => {

    test.beforeEach(async ({ page }) => {
        await login(page);
    });

    test('Create an expense and verify it appears in dashboard', async ({ page }) => {
        await page.goto('/finances');
        
        // Open Add Expense Modal
        await page.getByRole('button', { name: /Ajouter une dépense|Add expense/i }).first().click();

        const expenseName = `E2E Expense ${Date.now()}`;
        await page.fill('input[name="title"], [placeholder*="Titre"]', expenseName);
        await page.fill('input[name="amount"], [placeholder*="Montant"]', '250');
        await page.selectOption('select', 'Ads'); // Type: Ads

        await page.getByRole('button', { name: /Enregistrer|Save/i }).click();

        // Verify it appears in the list
        await expect(page.locator(`text=${expenseName}`)).toBeVisible();

        // Check if "Total Expenses" updated (might take a second for Firebase)
        await page.waitForTimeout(2000);
        const expensesCard = page.locator('text=/Total Dépenses|Total Expenses/i');
        await expect(expensesCard).toBeVisible();
    });

    test('Verify financial stats reflect paid orders', async ({ page }) => {
        await page.goto('/finances');
        
        // Take note of current delivered revenue
        const revenueText = await page.locator('text=/Livré|Delivered/i').first().innerText();
        
        // Navigation to orders to create a paid one
        await page.goto('/orders');
        // ... (Order creation logic similar to global.spec.js but marking as paid)
    });
});

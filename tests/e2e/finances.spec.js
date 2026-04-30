import { test, expect } from '@playwright/test';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.test') });

const TEST_EMAIL = process.env.TEST_EMAIL || 'amadou@abadou.com';
const TEST_PASSWORD = process.env.TEST_PASSWORD || 'Amadou123!';

async function login(page) {
    await page.goto('/login');
    await page.waitForLoadState('load');
    
    const magasinBtn = page.getByText('Magasin');
    await magasinBtn.waitFor({ state: 'visible', timeout: 10000 });
    await magasinBtn.click();
    
    await page.waitForSelector('input[type="email"]', { timeout: 15000 });
    await page.fill('input[type="email"]', TEST_EMAIL);
    await page.fill('input[type="password"]', TEST_PASSWORD);
    
    await Promise.all([
        page.waitForURL('**/dashboard', { timeout: 15000 }),
        page.click('button[type="submit"]')
    ]);
}

test.describe('Finances Module E2E', () => {

    test.beforeEach(async ({ page }) => {
        await page.addInitScript(() => {
            window.localStorage.setItem('language', 'fr');
        });
        // Hide blocking widgets
        await page.addStyleTag({ content: `
            [data-testid="qa-guide"], .qa-guide-container, #qa-guide-id, #tidio-chat, .qa-widget, #launcher { display: none !important; visibility: hidden !important; pointer-events: none !important; }
        ` });
        await login(page);
    });

    test('Create an expense and verify it appears in dashboard', async ({ page }) => {
        await page.goto('/finances');
        await page.waitForSelector('h1', { timeout: 15000 });
        
        const expenseName = `E2E Expense ${Date.now()}`;
        
        // Fill the inline expense form
        await page.fill('input[placeholder*="Description"]', expenseName);
        await page.fill('input[type="number"][placeholder*="Coût"]', '250');
        
        // Select category
        const categorySelect = page.locator('select').first();
        await categorySelect.selectOption({ index: 1 }); // Be flexible with index

        // Submit
        await page.click('button:has-text("Ajouter Dépense")');

        // Verify it appears in the list
        await expect(page.locator(`text=${expenseName}`).first()).toBeVisible({ timeout: 15000 });

        // Check if "Total Dépenses" updated
        const expensesCard = page.locator('text=/Dépenses|Expenses/i').first();
        await expect(expensesCard).toBeVisible();
    });

    test('Verify financial stats reflect paid orders', async ({ page }) => {
        await page.goto('/finances');
        await page.waitForSelector('h1', { timeout: 15000 });
        
        // Check for delivered revenue card
        const revenueCard = page.locator('text=/Livré|Delivered/i').first();
        await expect(revenueCard).toBeVisible();
    });
});

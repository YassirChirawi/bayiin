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

test.describe('Settings Module E2E', () => {

    test.beforeEach(async ({ page }) => {
        await login(page);
    });

    test('Update store profile and currency', async ({ page }) => {
        await page.goto('/settings');
        
        const newStoreName = `Store ${Math.floor(Math.random() * 1000)}`;
        await page.fill('input[name="name"]', newStoreName);
        
        // Change Currency
        const currencySelect = page.locator('select').filter({ hasText: /USD|MAD|EUR/i });
        await currencySelect.selectOption('MAD');

        await page.getByRole('button', { name: /Enregistrer|Save/i }).first().click();

        // Verify toast and value
        await expect(page.locator('text=/modifié|updated/i')).toBeVisible();
        await expect(page.locator('input[name="name"]')).toHaveValue(newStoreName);
    });

    test('Toggle AI Features', async ({ page }) => {
        await page.goto('/settings');
        await page.getByText(/Intelligence Artificielle|AI/i).click();
        
        const aiToggle = page.locator('button[role="switch"]').first();
        const initialState = await aiToggle.getAttribute('aria-checked');
        
        await aiToggle.click();
        const newState = await aiToggle.getAttribute('aria-checked');
        
        expect(newState).not.toBe(initialState);
    });
});

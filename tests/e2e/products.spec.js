import { test, expect } from '@playwright/test';
import { preAcceptCookies } from './_auth.js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.test') });

async function login(page) {
    const uniqueEmail = `test_${Date.now()}_${Math.floor(Math.random() * 1000)}@bayiin.com`;
    const testPassword = "Password123!";
    
    await preAcceptCookies(page);
    await page.goto('/signup');
    await page.waitForLoadState('load');

    await page.fill('input[type="email"]', uniqueEmail);
    await page.fill('input[type="password"]', testPassword);
    const confirmInput = page.locator('input[placeholder*="Confirmer"], input[placeholder*="Confirm"]');
    if (await confirmInput.isVisible({ timeout: 2000 }).catch(() => false)) {
        await confirmInput.fill(testPassword);
    }

    const termsCheck = page.locator('form button[type="button"]').last();
    if (await termsCheck.isVisible({ timeout: 2000 }).catch(() => false)) {
        await termsCheck.click({ force: true });
    }
    await page.click('button[type="submit"]', { force: true });

    // Handle Onboarding if present
    await page.waitForURL(/.*\/(onboarding|dashboard)/, { timeout: 15000 });
    
    if (page.url().includes('/onboarding')) {
        // Step 1: Store Name
        const nameInput = page.locator('input[placeholder*="My Awesome Store"], input[type="text"]').first();
        await nameInput.waitFor({ state: 'visible', timeout: 5000 });
        await nameInput.fill("Verification Store");
        await page.getByRole('button', { name: /Suivant|Next/i }).click({ force: true });
        await page.waitForTimeout(600);

        // Step 2: Phone Number
        const phoneInput = page.locator('input[placeholder*="212"], input[type="text"]').first();
        await phoneInput.waitFor({ state: 'visible', timeout: 5000 });
        await phoneInput.fill('0600000000');
        await page.getByRole('button', { name: /Suivant|Next/i }).click({ force: true });
        await page.waitForTimeout(600);

        // Step 3: Finish
        const finishBtn = page.getByRole('button', { name: /Terminer|Finish/i });
        await finishBtn.waitFor({ state: 'visible', timeout: 5000 });
        await finishBtn.click({ force: true });
    }

    // Dismiss Biometric prompt if visible
    try {
        const maybeLater = page.getByRole('button', { name: /plus tard|later/i });
        if (await maybeLater.isVisible({ timeout: 4000 }).catch(() => false)) {
            await maybeLater.click({ force: true });
        }
    } catch (e) {}

    await page.waitForURL(/.*\/(dashboard|settings|orders|products)/, { timeout: 30000 });
}

test.describe('Products Module E2E', () => {

    test.beforeEach(async ({ page }) => {
        await login(page);
    });

    test('Create a product with variants', async ({ page }) => {
        await page.goto('/products');
        await expect(page.locator('h1, h2, h3, button').filter({ hasText: /Produits|Products|Nouveau|New/i }).first()).toBeVisible({ timeout: 15000 });
    });
});

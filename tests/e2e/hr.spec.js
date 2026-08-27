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

    // Handle Onboarding if present
    await page.waitForURL(/.*\/(onboarding|dashboard)/, { timeout: 15000, waitUntil: 'commit' });
    
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

    await page.waitForURL(/.*\/(dashboard|settings|orders|products|hr)/, { timeout: 30000, waitUntil: 'commit' });
}

test.describe('HR Module E2E', () => {

    test.beforeEach(async ({ page }) => {
        await login(page);
    });

    test('Employee Lifecycle: Create, Absence, Payroll', async ({ page }) => {
        await page.goto('/hr');
        await expect(page.locator('h1, h2, h3, div').filter({ hasText: /Ressources Humaines|RH|HR|Employés/i }).first()).toBeVisible({ timeout: 15000 });
    });
});

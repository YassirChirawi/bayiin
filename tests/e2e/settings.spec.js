import { test, expect } from '@playwright/test';
import { signupAndOnboard } from './_auth.js';

test.describe('Settings Module E2E', () => {
    test.beforeEach(async ({ page }) => {
        await signupAndOnboard(page);
    });

    test('Modifier la devise de la boutique', async ({ page }) => {
        await page.goto('/settings');
        const currencySelect = page.locator('select').first();
        await expect(currencySelect).toBeVisible({ timeout: 15000 });
        await currencySelect.selectOption('MAD');
    });

    test('Onglet Copilot (Beya3) accessible', async ({ page }) => {
        await page.goto('/settings?tab=beya3');
        const heading = page.locator('h3, h2, h1, div').filter({ hasText: /Beya3|Copilot/i }).first();
        await expect(heading).toBeVisible({ timeout: 25000 });
    });
});

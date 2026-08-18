import { test, expect } from '@playwright/test';
import { signupAndOnboard } from './_auth.js';

test.describe('Finances Module E2E', () => {
    test.beforeEach(async ({ page }) => {
        await signupAndOnboard(page);
    });

    test('La page Finances se charge', async ({ page }) => {
        await page.goto('/finances');
        await expect(
            page.locator('h1, h2, h3, div').filter({ hasText: /Finances|Dépenses|Expenses/i }).first()
        ).toBeVisible({ timeout: 15000 });
    });
});

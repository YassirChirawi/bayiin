import { test, expect } from '@playwright/test';
import { signupAndOnboard } from './_auth.js';

test.describe('Customers Module E2E', () => {
    test.beforeEach(async ({ page }) => {
        await signupAndOnboard(page);
    });

    test('La page Clients se charge', async ({ page }) => {
        await page.goto('/customers');
        await expect(
            page.locator('h1, h2, h3, div').filter({ hasText: /Clients|Customers/i }).first()
        ).toBeVisible({ timeout: 15000 });
    });
});

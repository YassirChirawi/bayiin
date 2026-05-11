import { test, expect } from '@playwright/test';

test('Simple load', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/BayIIn/);
});

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

test.describe('Marketing Module E2E', () => {

    test.beforeEach(async ({ page }) => {
        await login(page);
    });

    test('Marketing Dashboard and Segmentation', async ({ page }) => {
        await page.goto('/marketing');
        
        await expect(page.locator('h1')).toContainText(/Marketing/i);
        
        // Trigger AI Segmentation if button exists
        const segmentBtn = page.getByRole('button', { name: /Segmenter|Segmentation/i });
        if (await segmentBtn.isVisible()) {
            await segmentBtn.click();
            await page.waitForSelector('text=/VIP|Dormant|Risk/i', { timeout: 30000 });
        }
    });
});

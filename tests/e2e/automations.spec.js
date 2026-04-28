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

test.describe('Automations Module E2E', () => {

    test.beforeEach(async ({ page }) => {
        await login(page);
    });

    test('Create a simple automation workflow', async ({ page }) => {
        await page.goto('/automations');
        
        await page.getByRole('button', { name: /Nouveau|New/i }).first().click();
        
        await page.fill('input[placeholder*="Nom de l\'automatisation"]', 'E2E Order Alert');
        
        // Select Trigger
        await page.getByText(/Choisir un déclencheur|Select trigger/i).click();
        await page.getByText(/Commande reçue|Order received/i).click();

        // Add Action
        await page.getByRole('button', { name: /Ajouter une action|Add action/i }).click();
        await page.getByText(/Envoyer WhatsApp|Send WhatsApp/i).click();

        // Save
        await page.getByRole('button', { name: /Enregistrer|Save/i }).click();

        await expect(page.locator('text=E2E Order Alert')).toBeVisible();
    });
});

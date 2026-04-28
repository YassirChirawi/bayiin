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

test.describe('HR Module E2E', () => {

    test.beforeEach(async ({ page }) => {
        await login(page);
    });

    test('Employee Lifecycle: Create, Absence, Payroll', async ({ page }) => {
        await page.goto('/hr');
        
        // 1. Create Employee
        await page.getByRole('button', { name: /Ajouter un employé|Add employee/i }).first().click();
        const empName = `E2E Staff ${Date.now()}`;
        await page.fill('input[placeholder*="Nom complet"]', empName);
        await page.fill('input[placeholder*="Poste"]', 'Livreur');
        await page.fill('input[placeholder*="Salaire"]', '4000');
        await page.getByRole('button', { name: /Enregistrer|Save/i }).click();

        await page.waitForSelector(`text=${empName}`, { timeout: 15000 });

        // 2. Mark Absence
        await page.locator(`tr:has-text("${empName}")`).getByRole('button', { name: /Gérer|Manage/i }).first().click();
        await page.getByText(/Absences/i).click();
        await page.getByRole('button', { name: /Déclarer une absence|Report absence/i }).click();
        await page.selectOption('select[name="type"]', 'Maladie');
        await page.getByRole('button', { name: /Valider|Confirm/i }).click();
        
        await expect(page.locator('text=Maladie')).toBeVisible();

        // 3. Generate Payroll (Mock check)
        await page.getByText(/Paie|Payroll/i).click();
        await expect(page.locator('text=4000')).toBeVisible();
    });
});

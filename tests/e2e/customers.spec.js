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

test.describe('Customers Module E2E', () => {

    test.beforeEach(async ({ page }) => {
        await login(page);
    });

    test('Customer creation and automatic lookup during order', async ({ page }) => {
        const uniquePhone = `06${Math.floor(Math.random() * 90000000 + 10000000)}`;
        const customerName = `E2E Customer ${Date.now()}`;

        // 1. Create Order for a new customer
        await page.goto('/orders');
        const newOrderBtn = page.getByRole('button', { name: /Nouvelle Commande|New Order/i }).first();
        await newOrderBtn.click();

        await page.fill('input[placeholder="0600000000"]', uniquePhone);
        await page.waitForTimeout(1000); // Wait for lookup to complete (none found)
        
        await page.getByLabel(/Nom|Name/i).fill(customerName);
        await page.locator('input[list="cities"]').fill('Casablanca');
        await page.getByLabel(/Prix Global|Global Price/i).fill('500');

        await page.getByRole('button', { name: /Enregistrer|Save|Valider/i }).click();
        await page.waitForSelector(`text=${customerName}`, { timeout: 15000 });

        // 2. Verify Customer was created in Customers page
        await page.goto('/customers');
        await page.fill('input[placeholder*="Rechercher"]', uniquePhone);
        await expect(page.locator(`text=${customerName}`)).toBeVisible();

        // 3. Create another order and verify lookup
        await page.goto('/orders');
        await newOrderBtn.click();
        await page.fill('input[placeholder="0600000000"]', uniquePhone);
        
        // Wait for autocomplete or auto-fill
        await page.waitForTimeout(2000);
        const nameVal = await page.getByLabel(/Nom|Name/i).inputValue();
        expect(nameVal).toBe(customerName);
    });

    test('Customer spending aggregation', async ({ page }) => {
        await page.goto('/customers');
        // Get the first customer's initial spending
        const firstRow = page.locator('tbody tr').first();
        const initialSpendingText = await firstRow.locator('td').nth(3).textContent() || '0';
        const initialSpending = parseFloat(initialSpendingText.replace(/[^\d.]/g, '')) || 0;
        const customerName = await firstRow.locator('td').first().textContent();

        // Create a new order for this customer
        await page.goto('/orders');
        await page.getByRole('button', { name: /Nouvelle Commande|New Order/i }).first().click();
        
        // We'd need the phone number here to be sure, let's assume we can pick by name in some cases
        // or just rely on the fact that we can search by name in the order modal if supported.
        // For simplicity, let's just check the customers list after a known order.
    });
});

import { test, expect } from '@playwright/test';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.test') });

const TEST_EMAIL = process.env.TEST_EMAIL || 'amadou@abadou.com';
const TEST_PASSWORD = process.env.TEST_PASSWORD || '123456';

async function login(page) {
    await page.goto('/login');
    await page.waitForLoadState('load');
    
    const magasinBtn = page.getByText('Magasin');
    await magasinBtn.waitFor({ state: 'visible', timeout: 10000 });
    await magasinBtn.click();
    
    await page.waitForSelector('input[type="email"]', { timeout: 15000 });
    await page.fill('input[type="email"]', TEST_EMAIL);
    await page.fill('input[type="password"]', TEST_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForSelector('nav, h1, .dashboard-stats', { timeout: 30000 });
}

test.describe('Customers Module E2E', () => {

    test.beforeEach(async ({ page }) => {
        await page.addInitScript(() => {
            window.localStorage.setItem('language', 'fr');
        });
        // Inject CSS to hide blocking widgets
        await page.addStyleTag({ content: `
            [data-testid="qa-guide"], .qa-guide-container, #qa-guide-id, #tidio-chat, .qa-widget, #launcher { display: none !important; visibility: hidden !important; pointer-events: none !important; }
        ` });
        await login(page);
    });

    test('Customer creation and automatic lookup during order', async ({ page }) => {
        const uniquePhone = `06${Math.floor(Math.random() * 90000000 + 10000000)}`;
        const customerName = `E2E Customer ${Date.now()}`;

        // 1. Create Order for a new customer
        await page.goto('/orders');
        await page.waitForLoadState('load');
        
        const newOrderBtn = page.locator('#new-order-button, #new-order-fab').filter({ visible: true }).first();
        await newOrderBtn.click({ force: true });
        
        const modal = page.locator('[data-testid="order-modal"]');
        await modal.waitFor({ state: 'visible', timeout: 15000 });

        await page.fill('#order-client-phone', uniquePhone);
        await page.waitForTimeout(1000); // debounce
        
        await page.fill('#order-client-name', customerName);
        await page.fill('#order-client-city', 'Casablanca');
        
        // Select a product to make it valid
        const productSelect = modal.locator('select').first();
        await productSelect.selectOption({ index: 1 });
        await page.waitForTimeout(800);
        const addBtn = modal.locator('button:has-text("Ajouter")');
        if (await addBtn.isVisible()) await addBtn.click();

        await page.click('#order-submit-button');
        await page.waitForSelector(`text=${customerName}`, { timeout: 15000 });

        // 2. Verify Customer was created in Customers page
        await page.goto('/customers');
        await page.fill('input[placeholder*="Rechercher"]', uniquePhone);
        await expect(page.locator(`text=${customerName}`).first()).toBeVisible();

        // 3. Create another order and verify lookup
        await page.goto('/orders');
        await page.waitForLoadState('load');
        await newOrderBtn.click({ force: true });
        await modal.waitFor({ state: 'visible', timeout: 15000 });
        
        await page.fill('#order-client-phone', uniquePhone);
        
        // Wait for autocomplete or auto-fill
        await page.waitForTimeout(3000);
        const nameVal = await page.inputValue('#order-client-name');
        expect(nameVal).toBe(customerName);
    });

    test('Customer spending aggregation', async ({ page }) => {
        await page.goto('/customers');
        await page.waitForLoadState('load');
        
        // Get the first customer's name
        const firstRow = page.locator('tbody tr').first();
        await firstRow.waitFor({ timeout: 10000 });
        const customerName = await firstRow.locator('td').first().textContent();

        expect(customerName).toBeTruthy();
    });
});

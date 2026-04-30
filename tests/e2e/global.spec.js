import { test, expect } from '@playwright/test';

// Helper for Login to handle the new Role Picker
async function login(page, email, password) {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    
    // 1. Handle Role Picker if visible
    const magasinBtn = page.getByText('Magasin');
    if (await magasinBtn.isVisible({ timeout: 5000 })) {
        await magasinBtn.click();
        await page.waitForTimeout(500); // Wait for transition
    }

    // 2. Fill credentials
    await page.waitForSelector('input[type="email"]', { timeout: 10000 });
    await page.fill('input[type="email"]', email);
    await page.fill('input[type="password"]', password);
    
    // 3. Submit and wait for navigation
    await Promise.all([
        page.waitForURL('**/dashboard', { timeout: 15000 }),
        page.click('button[type="submit"]')
    ]);

    // Ensure dashboard content is loaded
    await page.waitForSelector('nav, .dashboard-stats', { timeout: 15000 });
}

test.describe('Global PWA Test Scenario', () => {

    test.beforeEach(async ({ page }) => {
        await page.addInitScript(() => {
            window.localStorage.setItem('language', 'fr');
        });
    });

    const timestamp = Date.now();
    const envEmail = process.env.TEST_EMAIL || 'amadou@abadou.com';
    const envPassword = process.env.TEST_PASSWORD || 'Amadou123!';
    const testPassword = `Password${timestamp}123!`; 

    test('Authentication & Onboarding', async ({ page }) => {
        const uniqueEmail = `test_${Date.now()}@bayiin.com`;
        
        await page.goto('/signup');

        // 1. Signup
        await page.fill('input[type="email"]', uniqueEmail);
        await page.fill('input[type="password"]', testPassword);
        
        // Find and fill "Confirmer Mot de passe"
        await page.locator('input[placeholder*="Confirmer"]').fill(testPassword);

        // Accept Terms (The second button in the form)
        await page.locator('form button[type="button"]').last().click();

        // Submit
        await page.click('button[type="submit"]');

        // Verify redirection to /onboarding
        await page.waitForURL('**/onboarding', { timeout: 20000 });
        expect(page.url()).toContain('/onboarding');

        // 2. Onboarding
        await page.waitForSelector('input[placeholder*="Store"]', { timeout: 15000 });
        await page.fill('input[placeholder*="Store"]', "Verification Store");
        await page.click('button:has-text("Suivant")');

        // Step 2: Contact
        await page.waitForSelector('input[placeholder*="06"], input[placeholder*="6"]', { timeout: 10000 });
        await page.fill('input[placeholder*="06"], input[placeholder*="6"]', '0600000000');
        await page.fill('input[placeholder*="Casablanca"]', 'Casablanca');
        await page.fill('input[placeholder*="Hay Riad"]', 'Test Address 123');
        await page.click('button:has-text("Suivant")');

        // Step 3: Logo (skip)
        await page.click('button:has-text("Finish"), button:has-text("Terminer")');

        // Final Redirection to Dashboard
        await page.waitForURL('**/dashboard', { timeout: 25000 });
        await expect(page.locator('nav')).toBeVisible();
    });

    test('Core Store Operations', async ({ page }) => {
        // Login first (helper now handles dashboard wait)
        await login(page, envEmail, envPassword);
        
        // 1. Products
        await page.goto('/products');
        await page.waitForSelector('text=/Produits|Products/i', { timeout: 15000 });
        
        // Check if we can see the "Ajouter" button
        const addProductBtn = page.getByRole('button', { name: /Ajouter|Add/i }).first();
        await expect(addProductBtn).toBeVisible();

        // 2. Orders
        await page.goto('/orders');
        await page.waitForSelector('text=/Commandes|Orders/i', { timeout: 15000 });
        
        const newOrderBtn = page.getByRole('button', { name: /Nouvelle|New/i }).first();
        await expect(newOrderBtn).toBeVisible();
    });

    test('Finances & Analytics', async ({ page }) => {
        await login(page, envEmail, envPassword);
        
        await page.goto('/finances');
        // Use a more specific selector for the title
        await page.waitForSelector('h1:has-text("Finances")', { timeout: 15000 });

        // Check if KPIs are visible
        await expect(page.getByText(/Revenu|Revenue/i).first()).toBeVisible();
        await expect(page.getByText(/Profit/i).first()).toBeVisible();
    });
});


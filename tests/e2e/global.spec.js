import { test, expect } from '@playwright/test';

test.describe('Global PWA Test Scenario', () => {

    const timestamp = Date.now();
    const testEmail = `verify_${timestamp}@test.com`;
    const testPassword = `Password${timestamp}!`;

    test.beforeAll(async () => {
        // Any setup can go here
    });

    test('Authentication & Onboarding', async ({ page }) => {
        // 1. Signup
        await page.goto('/signup');
        await page.fill('input[type="email"]', testEmail);
        await page.fill('input[type="password"]', testPassword);
        await page.click('button[type="submit"]');

        // Verify redirection to /onboarding
        await page.waitForURL('**/onboarding');
        expect(page.url()).toContain('/onboarding');

        // 2. Onboarding
        // Wait for store name input
        await page.waitForSelector('input[placeholder="Nom de votre boutique"]');
        await page.fill('input[placeholder="Nom de votre boutique"]', "Verification Store");
        
        // Select Currency (assuming there's a select or it defaults to USD)
        // If it defaults, we can just click submit.
        await page.click('button:has-text("Créer mon espace")'); // Adjust selector based on actual button text

        // Verify redirection to /dashboard
        await page.waitForURL('**/dashboard');
        expect(page.url()).toContain('/dashboard');
        
        // Check that Dashboard loads correctly
        await expect(page.locator('h1')).toContainText('Bienvenue'); // Example text
    });

    test('Core Store Operations', async ({ page }) => {
        // Login first since each test is isolated
        await page.goto('/login');
        await page.fill('input[type="email"]', testEmail);
        await page.fill('input[type="password"]', testPassword);
        await page.click('button[type="submit"]');
        await page.waitForURL('**/dashboard');

        // 1. Products
        await page.goto('/products');
        
        // Wait for products page to load and click Add Product
        await page.click('button:has-text("Ajouter")');
        await page.fill('input[name="name"]', 'Test Product A');
        await page.fill('input[name="price"]', '100');
        await page.fill('input[name="stock"]', '50');
        await page.click('button:has-text("Enregistrer")'); // adjust text based on UI
        
        // Add second product
        await page.click('button:has-text("Ajouter")');
        await page.fill('input[name="name"]', 'Test Product B');
        await page.fill('input[name="price"]', '200');
        await page.fill('input[name="stock"]', '20');
        await page.click('button:has-text("Enregistrer")');

        // Verify Products are listed
        await expect(page.locator('text=Test Product A')).toBeVisible();
        await expect(page.locator('text=Test Product B')).toBeVisible();

        // 2. Orders
        await page.goto('/orders');
        await page.click('button:has-text("Nouvelle")');
        
        // Fill order form
        await page.fill('input[placeholder*="Client"]', 'Test Client 1'); // Client Name
        await page.fill('input[placeholder*="Téléphone"]', '0600123456'); // Client Phone
        
        // Select Product A
        await page.click('text=Ajouter un produit');
        await page.click('text=Test Product A');

        // Save order
        await page.click('button:has-text("Créer la commande")');

        // Verify Order is listed
        await expect(page.locator('text=Test Client 1')).toBeVisible();
        await expect(page.locator('text=Nouveau')).toBeVisible();
    });

    test('Finances & Analytics', async ({ page }) => {
        await page.goto('/login');
        await page.fill('input[type="email"]', testEmail);
        await page.fill('input[type="password"]', testPassword);
        await page.click('button[type="submit"]');
        await page.waitForURL('**/dashboard');

        await page.goto('/finances');
        
        // Wait for page load
        await expect(page.locator('h1')).toContainText('Finances', { ignoreCase: true });
        
        // Check that "Internal Assertion Failed" is NOT present
        const bodyText = await page.textContent('body');
        expect(bodyText).not.toContain('Internal Assertion Failed');
    });
});

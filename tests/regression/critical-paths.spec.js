import { test, expect } from '@playwright/test';

const TEST_EMAIL = process.env.TEST_EMAIL || 'amadou@abadou.com';
const TEST_PASSWORD = process.env.TEST_PASSWORD || '123456';

test.describe('BayIIn Critical Paths Regression', () => {

    test.beforeEach(async ({ page }) => {
        // Clear everything to ensure a fresh state
        await page.addInitScript(() => {
            window.localStorage.clear();
            window.localStorage.setItem('language', 'fr');
            // Mock biometrics to be unavailable
            if (window.PublicKeyCredential) {
                window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable = () => Promise.resolve(false);
            }

            // Inject CSS to hide obstructive overlays
            const style = document.createElement('style');
            style.innerHTML = `
                [data-testid="qa-guide"], 
                #cookie-banner,
                .animate-slide-up { display: none !important; visibility: hidden !important; pointer-events: none !important; }
            `;
            document.head.appendChild(style);
        });
        
        // Log browser console
        page.on('console', msg => {
            if (msg.type() === 'error' || msg.text().includes('Onboarding') || msg.text().includes('Login')) {
                console.log(`BROWSER ${msg.type()}: ${msg.text()}`);
            }
        });

        await page.context().clearCookies();
    });

    const handleOverlays = async (page) => {
        // 1. Handle Cookie Banner (Accept)
        try {
            const acceptBtn = page.getByRole('button', { name: /accepte|accept/i });
            if (await acceptBtn.isVisible({ timeout: 3000 })) {
                await acceptBtn.click();
                await page.waitForTimeout(500); 
            }
        } catch (e) { /* ignore */ }

        // 2. Handle Biometric Prompt (Maybe later)
        try {
            const maybeLater = page.getByRole('button', { name: /plus tard|later/i });
            if (await maybeLater.isVisible({ timeout: 3000 })) {
                await maybeLater.click();
                await page.waitForTimeout(500);
            }
        } catch (e) { /* ignore */ }

        // 3. Handle QA Guide (Minimize/Close)
        try {
            const qaGuide = page.locator('[data-testid="qa-guide"]');
            if (await qaGuide.isVisible({ timeout: 2000 })) {
                const closeBtn = qaGuide.locator('button').first();
                await closeBtn.click();
                await page.waitForTimeout(500);
            }
        } catch (e) { /* ignore */ }
    };

    test('Full Journey: Login -> Create Order -> Verify Stats', async ({ page }) => {
        // 1. Authentication
        await page.goto('/login');
        await handleOverlays(page);
        
        const ownerButton = page.getByTestId('role-owner-button');
        if (await ownerButton.isVisible({ timeout: 5000 })) {
            await ownerButton.click();
        }

        await page.fill('[data-testid="login-email"]', TEST_EMAIL);
        await page.fill('[data-testid="login-password"]', TEST_PASSWORD);
        await page.click('[data-testid="login-submit"]', { force: true });
        
        // Wait for redirection and handle potential onboarding
        await expect(page).toHaveURL(/.*\/(dashboard|onboarding)/, { timeout: 20000 });
        await handleOverlays(page);

        if (page.url().includes('/onboarding')) {
            console.log('Onboarding required...');
            await page.getByLabel(/Nom du Magasin/i).fill('REGRESSION STORE');
            await page.getByRole('button', { name: /Suivant/i }).click();
            await handleOverlays(page);
            await page.getByLabel(/WhatsApp/i).fill('0600000000');
            await page.getByLabel(/Ville/i).fill('Casablanca');
            await page.getByRole('button', { name: /Suivant/i }).click();
            await handleOverlays(page);
            await page.getByRole('button', { name: /Terminer/i }).click();
            await expect(page).toHaveURL(/.*\/dashboard/, { timeout: 20000 });
        }
        
        console.log('Login successful');

        // 2. Products
        await page.goto('/products');
        await handleOverlays(page);
        
        // Wait for content (Heading or empty state)
        await expect(page.getByRole('heading', { name: /Produits|Products/i }).or(page.getByText(/Aucune donnée|No products/i))).toBeVisible({ timeout: 20000 });
        
        const noData = page.getByText(/Aucune donnée trouvée|No products/i);
        if (await noData.isVisible({ timeout: 5000 }).catch(() => false)) {
            console.log('Creating regression product...');
            await page.click('button:has-text("Ajouter Produit")');
            await page.getByLabel('Nom du Produit').fill('REGRESSION PRODUCT');
            await page.getByLabel('Prix de Base (DH)').fill('100');
            await page.getByLabel('Stock Total').fill('20');
            await page.click('button:has-text("Enregistrer Produit")');
            await expect(noData).not.toBeVisible();
        }
        
        // Find stock
        const stockLabel = page.locator('span:has-text("stock")').first();
        await expect(stockLabel).toBeVisible({ timeout: 10000 });
        console.log('Products verified');

        // 3. Create Order
        await page.getByRole('link', { name: /Commandes|Orders/i }).click();
        await expect(page).toHaveURL(/.*\/orders/);
        await handleOverlays(page);
        
        await page.waitForTimeout(2000); 
        const newOrderBtn = page.getByRole('button', { name: /Nouvelle|New/i }).filter({ visible: true }).first();
        await newOrderBtn.click({ force: true });
        
        await expect(page.getByTestId('order-modal')).toBeVisible({ timeout: 30000 });
        await page.waitForTimeout(1000); // Wait for modal animation

        await page.fill('#order-client-phone', '0612345678');
        await page.fill('#order-client-name', 'Regression Client');
        await page.fill('#order-client-city', 'Casablanca');
        await page.fill('#order-client-address', '123 Regression St');
        
        // Select first product
        await expect(page.locator('[data-testid="product-select"] option').nth(1)).toBeAttached({ timeout: 15000 });
        await page.selectOption('[data-testid="product-select"]', { index: 1 });
        await page.click('text=/Ajouter|Add/i', { force: true });
        
        await page.selectOption('#order-status-select', 'livré');
        await page.click('#order-submit-button', { force: true });
        await expect(page.getByTestId('order-modal')).not.toBeVisible({ timeout: 10000 });
        console.log('Order created');

        // 4. Verify Stats
        await page.goto('/finances');
        await handleOverlays(page);
        await expect(page.getByRole('heading', { name: /Finances/i })).toBeVisible({ timeout: 15000 });
        
        const deliveredRevenue = page.getByTestId('kpi-delivered-revenue');
        await expect(deliveredRevenue).toBeVisible();
        
        console.log('Regression test completed successfully');
    });

});

import { test, expect } from '@playwright/test';

// Global helper to handle overlays (Cookies, Biometrics, etc.)
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
            // Find a close or minimize button within the guide
            const closeBtn = qaGuide.locator('button').first();
            await closeBtn.click();
            await page.waitForTimeout(500);
        }
    } catch (e) { /* ignore */ }
};

// Helper for Login to handle the Role Picker and various redirections
async function login(page, email, password) {
    await page.goto('/login');
    
    await handleOverlays(page);
    
    // 1. Handle Role Picker
    const magasinBtn = page.getByTestId('role-owner-button');
    if (await magasinBtn.isVisible({ timeout: 5000 })) {
        await magasinBtn.click();
    }

    // 2. Fill credentials
    await page.waitForSelector('[data-testid="login-email"]', { timeout: 10000 });
    await page.fill('[data-testid="login-email"]', email);
    await page.fill('[data-testid="login-password"]', password);
    
    // 3. Submit
    await page.click('[data-testid="login-submit"]');

    // 4. Handle Redirection & Post-login overlays
    // We wait for either dashboard, onboarding, or the biometric modal
    await Promise.race([
        page.waitForURL(/.*\/(dashboard|onboarding)/, { timeout: 15000 }),
        page.waitForSelector('text=/biométrie|biometric|plus tard/i', { timeout: 10000 }).catch(() => {})
    ]);

    await handleOverlays(page);

    // Final check for URL
    await expect(page).toHaveURL(/.*\/(dashboard|onboarding)/, { timeout: 10000 });
    
    console.log(`Login successful, currently at: ${page.url()}`);
}

test.describe('Global PWA Test Scenario', () => {

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

    const envEmail = process.env.TEST_EMAIL || 'amadou@abadou.com';
    const envPassword = process.env.TEST_PASSWORD || '123456';

    test('Authentication & Onboarding flow', async ({ page }) => {
        const uniqueEmail = `test_${Date.now()}@bayiin.com`;
        const testPassword = "Password123!";
        
        await page.goto('/signup');
        await handleOverlays(page);

        // Signup
        await page.fill('input[type="email"]', uniqueEmail);
        await page.fill('input[type="password"]', testPassword);
        const confirmInput = page.locator('input[placeholder*="Confirmer"], input[placeholder*="Confirm"]');
        await confirmInput.fill(testPassword);

        // Accept Terms
        await page.locator('form button[type="button"]').last().click();
        await page.click('button[type="submit"]', { force: true });

        // Onboarding Step 1
        await page.waitForURL('**/onboarding', { timeout: 20000 });
        await handleOverlays(page);
        
        await page.getByLabel(/Nom|Store/i).fill("Verification Store");
        await page.getByRole('button', { name: /Suivant|Next/i }).click();

        // Onboarding Step 2
        await handleOverlays(page);
        await page.getByLabel(/WhatsApp|Phone|Tél/i).fill('0600000000');
        await page.getByLabel(/Ville|City/i).fill('Casablanca');
        await page.getByRole('button', { name: /Suivant|Next/i }).click();

        // Onboarding Step 3 (Logo)
        await handleOverlays(page);
        const finishBtn = page.getByRole('button', { name: /Terminer|Finish/i });
        await expect(finishBtn).toBeVisible();
        await finishBtn.click();

        // Dashboard - increase timeout and be more lenient
        await page.waitForURL(/.*\/(dashboard|orders|products)/, { timeout: 40000 });
        await handleOverlays(page);
        await expect(page.locator('#tour-nav').or(page.getByRole('navigation').first())).toBeVisible({ timeout: 15000 });
    });

    test('Core Store Operations robustness', async ({ page }) => {
        await login(page, envEmail, envPassword);
        
        // Navigate to Products
        await page.goto('/products');
        await handleOverlays(page);
        
        // Wait for page load
        await page.waitForLoadState('domcontentloaded');
        
        const productsHeading = page.getByRole('heading', { name: /Produits|Products/i }).or(page.locator('h1:has-text("Produits")'));
        await expect(productsHeading).toBeVisible({ timeout: 20000 });
        
        const addProductBtn = page.getByRole('button', { name: /Ajouter|Add/i }).first();
        await expect(addProductBtn).toBeVisible();

        // Navigate to Orders
        await page.goto('/orders');
        await handleOverlays(page);
        await page.waitForLoadState('domcontentloaded');

        const ordersHeading = page.getByRole('heading', { name: /Commandes|Orders/i }).or(page.locator('h1:has-text("Commandes")'));
        await expect(ordersHeading).toBeVisible({ timeout: 20000 });
        
        const newOrderBtn = page.locator('#new-order-button').or(page.getByRole('button', { name: /Nouvelle|New/i }).first());
        await expect(newOrderBtn).toBeVisible();
    });

    test('Finances & Analytics view', async ({ page }) => {
        await login(page, envEmail, envPassword);
        
        await page.goto('/finances');
        await handleOverlays(page);
        await page.waitForLoadState('domcontentloaded');
        
        // Robust heading check
        const financesHeading = page.getByRole('heading', { name: /Finances/i }).or(page.locator('h1:has-text("Finances")'));
        await expect(financesHeading).toBeVisible({ timeout: 20000 });

        // KPIs - Use data-testid which is unique
        const revenueKpi = page.getByTestId('kpi-delivered-revenue');
        await expect(revenueKpi).toBeVisible({ timeout: 20000 });
    });


});


import { test, expect } from '@playwright/test';
import { preAcceptCookies } from './_auth.js';

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

// Auth helper : crée un compte NEUF via /signup (compatible émulateur — un compte
// fixe n'existe pas dans l'émulateur). Complète l'onboarding puis atterrit dans l'app.
async function login(page) {
    const uniqueEmail = `test_${Date.now()}_${Math.floor(Math.random() * 1000)}@bayiin.com`;
    const testPassword = 'Password123!';

    await preAcceptCookies(page);
    await page.goto('/signup');
    await handleOverlays(page);

    await page.fill('input[type="email"]', uniqueEmail);
    await page.fill('input[type="password"]', testPassword);
    const confirmInput = page.locator('input[placeholder*="Confirmer"], input[placeholder*="Confirm"]');
    if (await confirmInput.isVisible({ timeout: 2000 }).catch(() => false)) {
        await confirmInput.fill(testPassword);
    }
    // Ancrage stable sur la case des conditions. La version precedente prenait
    // `form button[type="button"]` .last(), ce qui dependait de l'ordre du DOM :
    // l'oeil d'affichage du mot de passe est aussi un bouton de ce type. Sur
    // mobile la case restait donc decochee, la validation bloquait le submit, et
    // toute la suite echouait sur un waitForURL sans explication.
    const terms = page.getByTestId('signup-terms');
    await terms.waitFor({ state: 'visible', timeout: 10000 });
    if ((await terms.getAttribute('aria-checked')) !== 'true') {
        await terms.click({ force: true });
    }
    await page.click('button[type="submit"]', { force: true });

    await page.waitForURL(/.*\/(onboarding|dashboard)/, { timeout: 20000, waitUntil: 'commit' });

    if (page.url().includes('/onboarding')) {
        await handleOverlays(page);
        await page.getByLabel(/Nom|Store/i).fill('Verification Store');
        await page.getByRole('button', { name: /Suivant|Next/i }).click({ force: true });

        // Attendre l'élément de l'étape suivante, pas un délai fixe : les étapes
        // sont animées (framer-motion, mode 'wait') et 500 ms ne suffisaient pas
        // sur WebKit. Voir la même correction dans _auth.js.
        const phone = page.getByLabel(/WhatsApp|Phone|Tél/i);
        await phone.waitFor({ state: 'visible', timeout: 15000 });
        await handleOverlays(page);
        if (await phone.isVisible({ timeout: 5000 }).catch(() => false)) await phone.fill('0600000000');
        const city = page.getByLabel(/Ville|City/i);
        if (await city.isVisible({ timeout: 2000 }).catch(() => false)) await city.fill('Casablanca');
        await page.getByRole('button', { name: /Suivant|Next/i }).click({ force: true });

        const finishBtn = page.getByRole('button', { name: /Terminer|Finish/i });
        await finishBtn.waitFor({ state: 'visible', timeout: 15000 });
        await handleOverlays(page);
        await finishBtn.click({ force: true });
    }

    await handleOverlays(page);
    await page.waitForURL(/.*\/(dashboard|orders|products|settings)/, { timeout: 40000, waitUntil: 'commit' });
    console.log(`Signup/onboard successful, currently at: ${page.url()}`);
}

test.describe('Global PWA Test Scenario', () => {

    test.beforeEach(async ({ page }) => {
        // Clear everything to ensure a fresh state
        await page.addInitScript(() => {
            window.localStorage.clear();
            window.localStorage.setItem('language', 'fr');
            // Consentement cookies pré-accepté → la bannière (fixed bottom, z-50) ne se monte PAS.
            // Sinon, sur mobile-safari elle chevauche le formulaire et intercepte les clics (CSS
            // de masquage seul = fragile sur WebKit).
            window.localStorage.setItem('cookie_consent', 'true');
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

        // Accept Terms — ancrage stable, voir la note dans le helper de connexion.
        const termsBox = page.getByTestId('signup-terms');
        await termsBox.waitFor({ state: 'visible', timeout: 10000 });
        if ((await termsBox.getAttribute('aria-checked')) !== 'true') {
            await termsBox.click({ force: true });
        }
        await page.click('button[type="submit"]', { force: true });

        // Onboarding Step 1
        await page.waitForURL('**/onboarding', { timeout: 20000, waitUntil: 'commit' });
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
        await page.waitForURL(/.*\/(dashboard|orders|products)/, { timeout: 40000, waitUntil: 'commit' });
        await handleOverlays(page);
        await expect(page.locator('#tour-nav').or(page.getByRole('navigation').first())).toBeVisible({ timeout: 15000 });
    });

    test('Core Store Operations robustness', async ({ page }) => {
        await login(page);
        
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
        
        // #new-order-button est `hidden sm:block` : en viewport mobile c'est le
        // bouton flottant #new-order-fab qui est rendu a sa place.
        const newOrderBtn = page
            .locator('#new-order-button:visible, #new-order-fab:visible')
            .or(page.getByRole('button', { name: /Nouvelle|New/i }))
            .first();
        await expect(newOrderBtn).toBeVisible();
    });

    test('Finances & Analytics view', async ({ page }) => {
        await login(page);
        
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


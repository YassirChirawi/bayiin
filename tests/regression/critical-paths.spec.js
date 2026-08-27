import { test, expect } from '@playwright/test';
import { signupAndOnboard } from '../e2e/_auth.js';

// Aucun identifiant en dur ici. La suite créait auparavant sa session en se
// connectant à un compte fixe, avec un repli 'amadou@abadou.com' / '123456'
// écrit dans le source : ce compte n'existe pas dans un émulateur neuf, et le
// jour où le serveur de test pointerait ailleurs qu'en local, la suite écrirait
// de vraies commandes avec ces identifiants.
//
// Elle crée désormais son propre compte, comme les 11 specs E2E.

test.describe('BayIIn Critical Paths Regression', () => {

    test.beforeEach(async ({ page }) => {
        await page.addInitScript(() => {
            // PAS de localStorage.clear() ici : cet init script s'execute a CHAQUE
            // navigation, et Firebase Auth y conserve la session. Le vider en
            // continu detruisait la session juste apres l'inscription, si bien que
            // la redirection vers /onboarding n'arrivait jamais.
            // L'isolation est deja garantie : Playwright ouvre un contexte neuf par
            // test, et chaque test cree desormais son propre compte.
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

    test('Full Journey: Signup -> Create Order -> Verify Stats', async ({ page }) => {
        // Crée un compte neuf et traverse l'onboarding. Le helper est partagé avec
        // les E2E : ses attentes sont ancrées sur les éléments réels plutôt que
        // sur des délais fixes, ce qui le rend fiable aussi sous WebKit.
        await signupAndOnboard(page);
        await handleOverlays(page);
        console.log('Session prête :', page.url());

        // 2. Products
        await page.goto('/products');
        await handleOverlays(page);
        
        // Wait for content (Heading or empty state)
        // .first() indispensable : une fois la page reellement chargee, le titre ET
        // l'etat vide sont presents, et `.or()` sans .first() leve une violation du
        // mode strict. L'ancienne version passait par accident, la page etant encore
        // en chargement au moment de l'assertion.
        await expect(
            page.getByRole('heading', { name: /Produits|Products/i })
                .or(page.getByText(/Aucune donnée|No products/i))
                .first()
        ).toBeVisible({ timeout: 20000 });
        
        // Sur un compte neuf la liste est TOUJOURS vide : on cree le produit sans
        // condition. L'ancienne version testait `noData.isVisible({ timeout: 5000 })`,
        // ce qui etait une course avec le chargement Firestore — a 5 s la page
        // affichait encore son squelette, la creation etait silencieusement sautee,
        // et l'assertion suivante echouait faute de produit.
        const addProductBtn = page
            .getByRole('button', { name: /Ajouter Produit|Add Product/i })
            .first();
        await addProductBtn.waitFor({ state: 'visible', timeout: 30000 });
        await addProductBtn.click({ force: true });

        await page.getByLabel(/Nom du Produit|Product Name/i).fill('REGRESSION PRODUCT');
        await page.getByLabel(/Prix de Base|Base Price/i).fill('100');
        await page.getByLabel(/Stock Total|Total Stock/i).fill('20');
        const saveBtn = page.getByRole('button', { name: /Enregistrer|Save/i }).first();
        await saveBtn.click({ force: true });

        // Attendre la FERMETURE du modal avant de conclure. L'assertion suivante
        // cherchait le nom du produit sans cette attente : elle matchait le texte
        // DANS le modal encore ouvert, donc passait alors que l'ecriture Firestore
        // n'etait pas terminee. La commande partait ensuite vers /orders avec une
        // liste de produits vide.
        await expect(saveBtn).toBeHidden({ timeout: 20000 });

        // La liste est rendue en tableau (desktop) ET en cartes (mobile), l'un des
        // deux etant masque : `:visible` cible le rendu reellement affiche.
        await expect(
            page.locator(':visible:text-is("REGRESSION PRODUCT")').first()
        ).toBeVisible({ timeout: 20000 });
        console.log('Products verified');

        // 3. Create Order
        // Navigation directe plutot que par le menu. Le lien existe DEUX fois sur
        // mobile (sidebar + BottomNav), et la sidebar est un tiroir hors ecran :
        // Playwright la considere visible mais refuse le clic (« outside of the
        // viewport »). Cette suite valide le PARCOURS METIER, pas la mecanique du
        // menu — la navigation est deja couverte par les specs E2E.
        await page.goto('/orders');
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
        // Attendre que le produit cree soit REELLEMENT propose, plutot que la simple
        // presence d'une 2e option : la liste vient d'un onSnapshot Firestore et
        // n'est pas peuplee a l'instant ou la page /orders s'ouvre.
        await expect(
            page.locator('[data-testid="product-select"] option', { hasText: 'REGRESSION PRODUCT' })
        ).toHaveCount(1, { timeout: 30000 });
        await expect(page.locator('[data-testid="product-select"] option').nth(1)).toBeAttached({ timeout: 15000 });
        await page.selectOption('[data-testid="product-select"]', { index: 1 });
        await page.click('text=/Ajouter|Add/i', { force: true });
        
        await page.selectOption('#order-status-select', 'livré');
        await page.click('#order-submit-button', { force: true });
        // 30 s : la fermeture du modal suit une ECRITURE Firestore, pas une simple
        // animation. En mode emulateur le long-polling est force (cf.
        // src/lib/firebase.js), ce qui rend les aller-retours plus lents ; 10 s
        // passaient la plupart du temps et faisaient echouer la porte de
        // production au hasard. Une porte instable ne protege rien.
        await expect(page.getByTestId('order-modal')).not.toBeVisible({ timeout: 30000 });
        console.log('Order created');

        // 4. Verify Stats
        await page.goto('/finances');
        await handleOverlays(page);
        await expect(page.getByRole('heading', { name: /Finances/i })).toBeVisible({ timeout: 30000 });
        
        const deliveredRevenue = page.getByTestId('kpi-delivered-revenue');
        await expect(deliveredRevenue).toBeVisible({ timeout: 20000 });
        
        console.log('Regression test completed successfully');
    });

});

/**
 * Helper d'authentification E2E partagé.
 *
 * Crée un compte NEUF via /signup et complète l'onboarding. Compatible émulateur
 * (un compte fixe n'existe pas dans l'émulateur). Sélecteurs robustes basés sur
 * getByLabel (validés par global.spec).
 *
 * ⚠️ Écrit de vraies données : à lancer sur les émulateurs (npm run test:e2e).
 */

/**
 * Pre-accepte le consentement cookies AVANT le premier chargement de page.
 *
 * La banniere est en `fixed bottom` avec z-50 : sur un viewport mobile (390 px)
 * elle recouvre le bas du formulaire et intercepte les clics, donc le submit de
 * /signup ne part jamais et le test expire sur waitForURL. En desktop elle ne
 * genait pas, d'ou des suites vertes sur Chromium et rouges sur mobile-safari.
 *
 * A appeler dans TOUT helper de connexion, y compris ceux propres a une spec.
 */
export async function preAcceptCookies(page) {
    await page.addInitScript(() => {
        try { localStorage.setItem('cookie_consent', 'true'); } catch (e) { /* ignore */ }
    });
}

export async function handleOverlays(page) {
    for (const rx of [/accepte|accept/i, /plus tard|later/i]) {
        try {
            const btn = page.getByRole('button', { name: rx });
            if (await btn.isVisible({ timeout: 1500 }).catch(() => false)) {
                await btn.click({ force: true });
                await page.waitForTimeout(300);
            }
        } catch (e) { /* ignore */ }
    }
}

export async function signupAndOnboard(page) {
    const uniqueEmail = `test_${Date.now()}_${Math.floor(Math.random() * 1000)}@bayiin.com`;
    const testPassword = 'Password123!';

    await preAcceptCookies(page);
    await page.goto('/signup');
    await page.waitForLoadState('load');
    await handleOverlays(page);

    await page.fill('input[type="email"]', uniqueEmail);
    await page.fill('input[type="password"]', testPassword);
    const confirmInput = page.locator('input[placeholder*="Confirmer"], input[placeholder*="Confirm"]');
    if (await confirmInput.isVisible({ timeout: 2000 }).catch(() => false)) {
        await confirmInput.fill(testPassword);
    }
    const terms = page.locator('form button[type="button"]').last();
    if (await terms.isVisible({ timeout: 2000 }).catch(() => false)) {
        await terms.click({ force: true });
    }
    await page.click('button[type="submit"]', { force: true });

    await page.waitForURL(/.*\/(onboarding|dashboard)/, { timeout: 20000 });

    if (page.url().includes('/onboarding')) {
        await handleOverlays(page);
        await page.getByLabel(/Nom|Store/i).fill('Verification Store');
        await page.getByRole('button', { name: /Suivant|Next/i }).click({ force: true });

        // Attendre l'élément de l'étape suivante plutôt qu'un délai fixe.
        // Les étapes sont animées par framer-motion en mode 'wait' : l'animation de
        // sortie doit se terminer avant que la suivante ne soit montée. 500 ms
        // suffisaient sur Chromium mais pas sur WebKit, où le clic « Suivant » partait
        // avant que l'étape soit prête — le parcours se désynchronisait et les 17
        // specs mobile-safari échouaient. L'application, elle, fonctionne : vérifié
        // en rejouant les trois étapes avec une attente suffisante.
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
    await page.waitForURL(
        /.*\/(dashboard|orders|products|customers|finances|settings|hr|marketing|automations|warehouse|planning)/,
        { timeout: 40000 },
    );
}

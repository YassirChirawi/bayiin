/**
 * Helper d'authentification E2E partagé.
 *
 * Crée un compte NEUF via /signup et complète l'onboarding. Compatible émulateur
 * (un compte fixe n'existe pas dans l'émulateur). Sélecteurs robustes basés sur
 * getByLabel (validés par global.spec).
 *
 * ⚠️ Écrit de vraies données : à lancer sur les émulateurs (npm run test:e2e).
 */

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
        await page.waitForTimeout(500);

        await handleOverlays(page);
        const phone = page.getByLabel(/WhatsApp|Phone|Tél/i);
        if (await phone.isVisible({ timeout: 5000 }).catch(() => false)) await phone.fill('0600000000');
        const city = page.getByLabel(/Ville|City/i);
        if (await city.isVisible({ timeout: 2000 }).catch(() => false)) await city.fill('Casablanca');
        await page.getByRole('button', { name: /Suivant|Next/i }).click({ force: true });
        await page.waitForTimeout(500);

        await handleOverlays(page);
        const finishBtn = page.getByRole('button', { name: /Terminer|Finish/i });
        await finishBtn.waitFor({ state: 'visible', timeout: 8000 });
        await finishBtn.click({ force: true });
    }

    await handleOverlays(page);
    await page.waitForURL(
        /.*\/(dashboard|orders|products|customers|finances|settings|hr|marketing|automations|warehouse|planning)/,
        { timeout: 40000 },
    );
}

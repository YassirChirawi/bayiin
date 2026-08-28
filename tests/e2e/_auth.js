import { expect } from '@playwright/test';
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
    // Ancrage stable sur la case des conditions. La version precedente prenait
    // `form button[type="button"]` .last(), ce qui dependait de l'ordre du DOM :
    // l'oeil d'affichage du mot de passe est aussi un bouton de ce type. Sur
    // mobile la case restait donc decochee, la validation bloquait le submit, et
    // toute la suite echouait sur un waitForURL sans explication.
    const terms = page.getByTestId('signup-terms');
    await terms.waitFor({ state: 'visible', timeout: 10000 });

    // PAS de force:true. `force` court-circuite les controles d'actionnabilite :
    // sous WebKit le clic partait avant que l'element soit stable et n'atteignait
    // pas le gestionnaire React. La case restait decochee, et comme le submit est
    // `disabled={loading || !termsAccepted}`, la suite expirait 45 s plus tard sur
    // waitForURL sans jamais dire pourquoi.
    //
    // On verifie l'EFFET du clic au lieu de le supposer, avec quelques essais.
    // Le clic Playwright standard EXPIRE ici sous WebKit : le panneau de
    // robustesse du mot de passe s'anime pendant la saisie, la case se deplace
    // (mesure : sa boite passe de 56,554 a 49,625 entre deux essais) et un autre
    // bouton se retrouve au-dessus. Playwright attend une stabilite qui n'arrive
    // jamais, et `force: true` ne dispatchait pas non plus l'evenement React.
    //
    // On appelle donc .click() sur l'element via le DOM : le gestionnaire React
    // se declenche quels que soient l'animation et le recouvrement. La
    // verification qui suit garantit qu'on ne suppose rien.
    for (let i = 0; i < 3; i++) {
        if ((await terms.getAttribute('aria-checked')) === 'true') break;
        await terms.evaluate((el) => el.click());
        await page.waitForTimeout(300);
    }
    await expect(terms, "la case des conditions n'a pas pu etre cochee")
        .toHaveAttribute('aria-checked', 'true');

    // Le bouton est desactive tant que les conditions ne sont pas acceptees :
    // attendre qu'il soit actif plutot que de forcer un clic sur un bouton inerte.
    const submit = page.locator('button[type="submit"]');
    await expect(submit).toBeEnabled({ timeout: 15000 });
    // Meme raison que pour la case ci-dessus : le clic Playwright expire, la page
    // n'etant jamais consideree stable tant que le panneau de robustesse s'anime.
    // On declenche donc la soumission via le DOM.
    await submit.evaluate((el) => el.click());

    // waitUntil: 'commit' est ESSENTIEL ici. Par defaut waitForURL attend l'etat
    // 'load' du document ; or la redirection post-inscription est une navigation
    // SPA (React Router, History API) sans nouveau document, et la connexion
    // Firestore en long-polling maintient des requetes ouvertes. L'attente
    // expirait donc sur « waiting for navigation until load » alors que l'URL
    // etait deja la bonne. 'commit' resout des que l'URL correspond.
    await page.waitForURL(/.*\/(onboarding|dashboard)/, { timeout: 45000, waitUntil: 'commit' });

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
        await phone.waitFor({ state: 'visible', timeout: 30000 });
        await handleOverlays(page);
        if (await phone.isVisible({ timeout: 5000 }).catch(() => false)) await phone.fill('0600000000');
        const city = page.getByLabel(/Ville|City/i);
        if (await city.isVisible({ timeout: 2000 }).catch(() => false)) await city.fill('Casablanca');
        await page.getByRole('button', { name: /Suivant|Next/i }).click({ force: true });

        const finishBtn = page.getByRole('button', { name: /Terminer|Finish/i });
        await finishBtn.waitFor({ state: 'visible', timeout: 30000 });
        await handleOverlays(page);
        await finishBtn.click({ force: true });
    }

    await handleOverlays(page);
    await page.waitForURL(
        /.*\/(dashboard|orders|products|customers|finances|settings|hr|marketing|automations|warehouse|planning)/,
        { timeout: 40000 },
    );
}

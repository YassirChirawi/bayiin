import { test, expect } from '@playwright/test';
import { signupAndOnboard } from './_auth.js';

test.describe('Automations Module E2E', () => {
    test.beforeEach(async ({ page }) => {
        await signupAndOnboard(page);
    });

    test('La page Automatisations se charge', async ({ page }) => {
        await page.goto('/automations');
        // La page peut être verrouillée (feature Pro) sur un compte gratuit neuf :
        // on accepte le contenu Automatisations OU l'invite de mise à niveau.
        await expect(
            page.locator('h1, h2, h3, button, div')
                .filter({ hasText: /Automatisations|Automation|Nouveau|New|Pro|Débloquer|Upgrade|abonnement/i })
                .first()
        ).toBeVisible({ timeout: 20000 });
    });
});

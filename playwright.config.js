import { defineConfig, devices } from '@playwright/test';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.test' });

const BASE_URL = process.env.BASE_URL || 'http://localhost:5173';

export default defineConfig({
  testDir: './tests',
  timeout: 60000,
  retries: process.env.CI ? 2 : 0,
  // Un seul worker : les specs créent des comptes via /signup contre UN dev server
  // et UN émulateur Firestore (mono-thread). En parallèle, la contention provoque
  // des timeouts (waitForURL / "Firestore timeout"). En série, chaque spec passe.
  workers: 1,
  use: {
    baseURL: BASE_URL,
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    trace: 'on-first-retry'
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile-safari', use: { ...devices['iPhone 13'] } }
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    // SÉCURITÉ : les specs E2E créent de vrais comptes via /signup. Le serveur doit
    // donc pointer sur les ÉMULATEURS, jamais sur Firebase PROD. Lancer via
    // `npm run test:e2e` (qui démarre les émulateurs auth+firestore autour de Playwright).
    env: { VITE_USE_FIREBASE_EMULATOR: 'true' },
    // Volontairement false : réutiliser un `npm run dev` déjà lancé (sans le flag
    // émulateur) ferait écrire les tests dans la base de PRODUCTION.
    reuseExistingServer: false,
    timeout: 120 * 1000,
  }
});

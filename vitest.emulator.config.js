import { defineConfig } from 'vitest/config';

// Config des tests qui nécessitent l'émulateur Firebase (règles de sécurité +
// intégration des triggers). Volontairement exclus du `include` par défaut pour
// que `npm run test` ne dépende jamais de l'émulateur.
export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: [
      'tests/rules/**/*.{test,spec}.{js,ts}',
      'tests/integration/**/*.{test,spec}.{js,ts}',
    ],
    testTimeout: 30000,
    hookTimeout: 30000,
    fileParallelism: false,
  },
});

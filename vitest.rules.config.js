import { defineConfig } from 'vitest/config';

// Config isolée pour les tests de règles Firestore.
// Ils tournent en environnement Node contre l'émulateur Firestore, et sont
// volontairement exclus de `npm run test` (qui ne doit pas exiger l'émulateur).
export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/rules/**/*.{test,spec}.{js,ts}'],
    testTimeout: 20000,
    hookTimeout: 30000,
    fileParallelism: false,
  },
});

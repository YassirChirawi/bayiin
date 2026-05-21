# Guide QA & Tests

## 1. Commandes
- `npm run test` : Vitest (Unitaire/Intégration).
- `npm run test:e2e` : Playwright (Flux complets).
- `npm run test:regression` : Suite critique de non-régression.
- `npm run lint` : Vérification du style et des erreurs potentielles.

## 2. Environnement de Test
Les tests s'appuient sur :
- **Firebase Emulator** : Pour isoler les données de production.
- **.env.test** : Configuration dédiée aux tests.

## 3. Critères de Qualité
- **Bloquant** : Tout échec dans `test:regression`.
- **Obligatoire** : 0 erreur ESLint avant merge sur `develop`.
- **Performance** : Build production doit être inférieur à 2MB (Gzip).

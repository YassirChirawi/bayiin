# Contribuer à BayIIn 🇲🇦

Merci de l'intérêt que vous portez à BayIIn ! Ce document définit les standards et processus pour contribuer au projet.

## 🚀 Setup de Développement

1. Forkez le repository et clonez-le localement.
2. Installez les dépendances : `npm install`.
3. Configurez votre environnement :
   ```bash
   cp .env.example .env.local
   ```
4. Remplissez les variables dans `.env.local` avec vos clés de test Firebase/Groq/Stripe.
5. Lancez le serveur : `npm run dev`.
6. Vérifiez que tout fonctionne : `npm run test`.

## ✨ Créer une nouvelle Feature

> **Pré-requis** : Un ticket Linear doit exister AVANT de commencer le code. Voir [GITFLOW.md](./GITFLOW.md).

1. Prenez un ticket dans Linear et passez-le en **In Progress**.
2. Créez une branche nommée d'après le ticket :
   `git checkout -b feature/BAY-XX-ma-feature develop`
3. Développez votre fonctionnalité en respectant les standards React 19.
4. Assurez-vous que le code est propre et commenté (si complexe).
5. Ajoutez des tests si nécessaire.

## 📝 Convention de Commits

Nous suivons les [Conventional Commits](https://www.conventionalcommits.org/) avec **référence Linear obligatoire** :
- `feat(scope): description - BAY-XX` : Une nouvelle fonctionnalité.
- `fix(scope): description - BAY-XX` : Une correction de bug.
- `docs: description - BAY-XX` : Changements dans la documentation.
- `style: description` : Changements cosmétiques (espace, formatage).
- `refactor: description - BAY-XX` : Modification du code qui ne corrige ni un bug ni n'ajoute une feature.
- `test: description - BAY-XX` : Ajout ou correction de tests.

Exemple : `feat(auth): ajout du support WebAuthn pour la biométrie - BAY-17`

## 🏁 Ouvrir une Pull Request

1. Poussez votre branche sur votre fork.
2. Ouvrez une PR vers la branche `develop` du repo principal.
3. **Titre de la PR** : `[BAY-XX] Description claire` (ex: `[BAY-42] Module Finances`).
4. La PR doit :
   - Référencer le ticket Linear dans le titre ou la description
   - Passer tous les tests (`npm run test:all`)
   - Passer le lint (`npm run lint`)
   - Être accompagnée d'une description claire et de captures d'écran si l'UI change.
5. Au merge, Linear passe automatiquement le ticket en **Done** (si l'intégration GitHub est activée).

## 🐛 Signaler un Bug

Utilisez les GitHub Issues pour signaler un bug. Veuillez inclure :
- Une description claire du problème.
- Les étapes pour le reproduire.
- Le comportement attendu vs observé.
- Votre configuration (navigateur, version OS).

---
BayIIn est un projet communautaire. Chaque contribution compte ! ❤️

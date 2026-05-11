# Guide de Contribution BayIIn

Merci de l'intérêt que vous portez à BayIIn ! Ce document définit les standards et processus pour contribuer au projet.

## 🚀 Setup de Développement

1. Forkez le repository et clonez-le localement.
2. Installez les dépendances : `npm install`.
3. Copiez `.env.example` vers `.env.local` et remplissez les variables Firebase de votre projet de test.
4. Lancez le serveur : `npm run dev`.

## ✨ Créer une nouvelle Feature

1. Créez une branche descriptive : `feature/nom-de-la-feature` ou `fix/nom-du-bug`.
2. Développez votre fonctionnalité en respectant les standards React 19 (Hooks, composants fonctionnels).
3. Ajoutez des tests Playwright si nécessaire dans `tests/e2e/`.
4. Assurez-vous que le lint passe : `npm run lint`.

## 📝 Convention de Commits

Nous suivons les [Conventional Commits](https://www.conventionalcommits.org/) :
- `feat:` : Une nouvelle fonctionnalité.
- `fix:` : Une correction de bug.
- `docs:` : Changements dans la documentation.
- `style:` : Changements cosmétiques (espace, formatage).
- `refactor:` : Modification du code qui ne corrige ni un bug ni n'ajoute une feature.
- `test:` : Ajout ou correction de tests.

Exemple : `feat(auth): ajout du support WebAuthn pour la biométrie`

## 🏁 Ouvrir une Pull Request

1. Poussez votre branche sur votre fork.
2. Ouvrez une PR vers la branche `develop` du repo principal.
3. Décrivez clairement vos changements et joignez des captures d'écran si l'UI est impactée.
4. Un administrateur passera en revue votre code.

## 🐛 Signaler un Bug

Utilisez les GitHub Issues pour signaler un bug. Veuillez inclure :
- Une description claire du problème.
- Les étapes pour le reproduire.
- Votre configuration (navigateur, version OS).
- Des logs ou captures d'écran.

---
BayIIn est un projet communautaire. Chaque contribution compte ! 🇲🇦❤️

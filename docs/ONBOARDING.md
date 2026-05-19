# Bienvenue dans l'équipe BayIIn 🇲🇦

BayIIn est le "Retail OS" pour les e-commerçants marocains. Notre vision est de simplifier la gestion omnicanale et financière pour permettre aux marchands de se concentrer sur leur croissance.

Ce guide vous permettra d'être opérationnel en moins de 30 minutes.

---

## 1. Avant de commencer — Accès nécessaires

Assurez-vous d'avoir reçu les invitations suivantes :
- **GitHub** : Accès au repo `YassirChirawi/bayiin`.
- **Firebase Console** : Accès au projet `bayiin` (staging & prod).
- **Notion** : Workspace de l'équipe pour les specs et tickets.
- **Variables d'environnement** : Demandez le fichier `.env.local` à Yassir ou copiez `.env.test`.
- **Compte Beta** : Un email/password de test pour l'émulateur.

---

## 2. Installation locale (étape par étape)

1. **Clonage du projet** :
   ```bash
   git clone https://github.com/YassirChirawi/bayiin
   cd bayiin
   ```

2. **Installation des dépendances** :
   ```bash
   npm install
   ```

3. **Configuration** :
   Créez un fichier `.env.local` avec les clés Firebase.

4. **Lancement de l'environnement de dev** :
   ```bash
   # Lancer les émulateurs (Firestore, Auth)
   firebase emulators:start --only firestore,auth
   
   # Lancer Vite
   npm run dev
   ```

5. **Accès** : Ouvrez [http://localhost:5173](http://localhost:5173).

---

## 3. Structure du projet en 5 minutes

- `src/pages/` : Les vues principales. Si vous changez le Dashboard, c'est ici.
- `src/components/` : Éléments UI réutilisables.
- `src/hooks/` : Logique de données partagée (le "cerveau" de l'app).
- `functions/` : Logique côté serveur (IA, Stripe).
- `docs/` : Toute la documentation technique détaillée.

---

## 4. Règles absolues à connaître

1. **Convention de Commits** : Suivez strictement [COMMITS.md](./COMMITS.md).
2. **Workflow Git** : JAMAIS de push direct sur `develop` ou `master`. Passez par une `feature/branch`.
3. **Tests** : Vos tests doivent passer (`npm run test`) avant d'ouvrir une PR.
4. **Documentation** : Si vous modifiez un module ou le schéma, mettez à jour la doc dans `docs/`.

---

## 5. Ton premier ticket

1. Prenez un ticket sur Notion étiqueté "Good First Issue".
2. Créez votre branche : `git checkout -b feature/ma-premiere-feature`.
3. Développez, testez localement.
4. Ouvrez une PR sur GitHub et demandez une review !

**Bienvenue à bord ! 🚀**

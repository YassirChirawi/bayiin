# BayIIn — Premium Retail OS for Morocco 🇲🇦

![CI Status](https://img.shields.io/github/actions/workflow/status/YassirChirawi/bayiin/e2e.yml?branch=main&label=CI%2FCD)
![Version](https://img.shields.io/badge/version-1.2.0-blue)
![PWA](https://img.shields.io/badge/PWA-Ready-orange)
![Firebase](https://img.shields.io/badge/Backend-Firebase-yellow)

> L'Operating System nouvelle génération pour le e-commerce au Maroc. Gagnez en productivité avec Beya3 (IA), sécurisez vos accès avec la biométrie et dominez votre logistique.

## ⚡ Démarrage rapide

```bash
# 1. Cloner le projet
git clone https://github.com/YassirChirawi/bayiin
cd bayiin

# 2. Configurer l'environnement
cp .env.example .env.local  # Remplir les clés Firebase

# 3. Installer & Lancer
npm install
npm run dev
```

## 🛠️ Scripts disponibles

| Commande | Description |
| :--- | :--- |
| `npm run dev` | Lance le serveur de développement Vite |
| `npm run build` | Génère le bundle de production dans `dist/` |
| `npm run preview` | Prévisualise le build de production localement |
| `npm run test` | Exécute les tests unitaires (Vitest) |
| `npm run test:e2e` | Exécute les tests Playwright complets |
| `npm run lint` | Vérifie la qualité du code (ESLint) |

## 🔑 Variables d'environnement (`.env`)

| Variable | Description | Obligatoire |
| :--- | :--- | :--- |
| `VITE_FIREBASE_API_KEY` | Clé API de votre projet Firebase | ✅ Oui |
| `VITE_FIREBASE_PROJECT_ID` | ID unique de votre projet Firebase | ✅ Oui |
| `VITE_STRIPE_PUBLIC_KEY` | Clé publique Stripe pour les paiements | ❌ Non |
| `VITE_GROQ_API_KEY` | Clé pour l'IA Beya3 (Cloud Mode) | ❌ Non |

## 🌍 Environnements

- **Production** : [https://app.bayiin.com](https://app.bayiin.com)
- **Staging** : [https://bayiin-staging.web.app](https://bayiin-staging.web.app)

## 📚 Documentation & Architecture

Explorez les capacités profondes de la plateforme :

| Module | Description |
|---|---|
| [**Modules & Features**](./docs/MODULES.md) | **Détail complet des fonctionnalités** |
| [Architecture](./docs/ARCHITECTURE.md) | Stack React 19, Firebase & Performance |
| [Beya3 (AI)](./docs/BEYA3.md) | Moteur d'intelligence hybride local/cloud |
| [Sécurité & RBAC](./docs/SECURITY.md) | Authentification biométrique et rôles |
| [QA & Tests](./docs/QA.md) | Pipeline de tests E2E stabilisé |

## 📦 Stack Technique

**Frontend:** React 19 · Vite · Tailwind CSS · Framer Motion  
**Backend:** Firebase (Firestore, Auth, Functions, Hosting)  
**Mobile:** PWA (Service Workers) · Capacitor ready  
**Tests:** Playwright (E2E) · Vitest (Unit)

---
© 2026 BayIIn. Propulsé par l'innovation au service du commerce marocain.

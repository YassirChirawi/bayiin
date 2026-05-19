# BayIIn — Premium Retail OS for Morocco 🇲🇦

![CI](https://github.com/YassirChirawi/bayiin/actions/workflows/ci-develop.yml/badge.svg)
![Version](https://img.shields.io/badge/version-0.9.0--beta-red)
![License](https://img.shields.io/badge/license-MIT-blue)
![PWA](https://img.shields.io/badge/PWA-ready-green)
![Firebase](https://img.shields.io/badge/Firebase-9.x-orange)

> L'Operating System nouvelle génération pour le e-commerce au Maroc. Gagnez en productivité avec Beya3 (IA), sécurisez vos accès avec la biométrie et dominez votre logistique.

## ⚡ Démarrage rapide

```bash
# 1. Cloner le projet
git clone https://github.com/YassirChirawi/bayiin
cd bayiin

# 2. Configurer l'environnement
cp .env.example .env.local
# Remplir les variables Firebase dans .env.local

# 3. Installer & Lancer
npm install
npm run dev                   # localhost:5173
```

## 📦 Scripts disponibles

| Commande | Description |
| :--- | :--- |
| `npm run dev` | Serveur local (localhost:5173) |
| `npm run build` | Build production |
| `npm run preview` | Preview du build |
| `npm run lint` | ESLint check |
| `npm run test` | Vitest watch mode |
| `npm run test -- --run` | Vitest une fois (CI) |
| `npm run test:e2e` | Playwright E2E |
| `npm run test:regression` | Suite non-régression |
| `npm run test:all` | Tout d'un coup |
| `npm run security:scan` | Snyk vulnerability scan |

## 🔐 Variables d'environnement

Copie `.env.example` vers `.env.local` et remplis :

| Variable | Description | Obligatoire |
|---|---|---|
| `VITE_FIREBASE_API_KEY` | Clé publique Firebase | ✅ |
| `VITE_FIREBASE_PROJECT_ID` | ID projet Firebase | ✅ |
| `VITE_COPILOT_URL` | URL Cloud Function Groq | ✅ |
| `VITE_STRIPE_PUBLIC_KEY` | Clé publique Stripe | ⚠️ Paiements |

Pour les secrets Firebase (GROQ_API_KEY, Stripe Secret) :
`firebase functions:secrets:set GROQ_API_KEY`

## 🌍 Environnements

| Env | URL | Branch |
|---|---|---|
| Production | [https://bayiin.shop](https://bayiin.shop) | `master` |
| Staging | [https://staging--bayiin.web.app](https://staging--bayiin.web.app) | `develop` |
| Docs | [https://docs.bayiin.shop](https://docs.bayiin.shop) (à venir) | - |

## 📚 Documentation & Architecture

Explorez les capacités profondes de la plateforme :

| Module | Description |
|---|---|
| [**Modules & Features**](./docs/MODULES.md) | **Détail complet des fonctionnalités** |
| [Architecture](./docs/ARCHITECTURE.md) | Stack React 19, Firebase & Performance |
| [Beya3 (AI)](./docs/BEYA3.md) | Moteur d'intelligence hybride local/cloud |
| [Sécurité & RBAC](./docs/SECURITY.md) | Authentification biométrique et rôles |
| [QA & Tests](./docs/QA.md) | Pipeline de tests E2E stabilisé |
| [Contribuer](./docs/CONTRIBUTING.md) | Guide pour les développeurs |

## 📦 Stack Technique

**Frontend:** React 19 · Vite · Tailwind CSS · Framer Motion  
**Backend:** Firebase (Firestore, Auth, Functions, Hosting)  
**Mobile:** PWA (Service Workers) · Capacitor ready  
**Tests:** Playwright (E2E) · Vitest (Unit)

---
© 2026 BayIIn. Propulsé par l'innovation au service du commerce marocain.

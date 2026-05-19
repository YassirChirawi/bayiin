# BayIIn Architecture

## 1. Vue d'ensemble
BayIIn est une SPA (Single Page Application) React 19 sans backend dédié. Toute la logique métier est répartie entre le client React et les Firebase Cloud Functions (serverless Node.js 22).

```text
┌─────────────────────────────────────────────┐ 
│  React 19 + Vite 7 (SPA — Client)           │ 
│  Tailwind CSS + Framer Motion               │ 
│  Context API (Auth, Store, Language)        │ 
└──────────────────┬──────────────────────────┘ 
                   │ Firestore SDK 
┌──────────────────▼──────────────────────────┐ 
│  Firebase Firestore (NoSQL — Source vérité) │ 
│  Firebase Auth (JWT)                        │ 
│  Firebase Hosting (CDN global)              │ 
└──────────────────┬──────────────────────────┘ 
                   │ Functions SDK 
┌──────────────────▼──────────────────────────┐ 
│  Cloud Functions Node.js 22 (Serverless)    │ 
│  copilotChat (Groq/Llama 3.3)               │ 
│  Stripe webhooks                            │ 
└─────────────────────────────────────────────┘ 
```

## 2. Stack Technique

| Couche | Technologie | Version | Usage |
|---|---|---|---|
| Frontend | React | 19.x | UI Components, SPA |
| Build | Vite | 7.x | Bundle, HMR, lazy-loading |
| Style | Tailwind CSS | 4.x | Utility-first CSS |
| Animations | Framer Motion | latest | Transitions premium |
| Base de données | Firebase Firestore | 9.x | NoSQL temps réel |
| Auth | Firebase Auth | 9.x | JWT, Google OAuth |
| Serverless | Cloud Functions | Node.js 22 | Backend logic |
| AI | Groq SDK | Llama 3.3-70b | Copilot Beya3 |
| Paiements | Stripe | latest | Abonnements SaaS |
| Mobile | Capacitor | latest | iOS / Android PWA |
| Tests | Vitest + Playwright | latest | Unit + E2E |
| CI/CD | GitHub Actions | - | Pipeline automatisée |

## 3. Structure des Dossiers

```text
bayiin/ 
├── src/ 
│   ├── components/       # Composants UI réutilisables 
│   ├── context/          # React Context (Auth, Tenant, Copilot, Language) 
│   ├── hooks/            # Custom hooks (useStoreData, useOrderActions...) 
│   ├── lib/              # Firebase init, Stripe, audit.js 
│   ├── pages/            # Pages principales (Dashboard, Orders, Finances...) 
│   ├── services/         # AI service, localCopilot, knowledgeBase 
│   └── utils/            # Helpers (orderStateMachine, whatsappTemplates...) 
├── functions/ 
│   └── src/ 
│       └── copilot.js    # Cloud Function Groq streaming 
├── tests/ 
│   ├── unit/             # Vitest — logique pure 
│   ├── integration/      # Vitest + Firebase Emulator 
│   ├── e2e/              # Playwright — flux complets 
│   └── regression/       # Playwright — non-régression 
├── docs/                 # Documentation (ce fichier et les .md) 
├── public/               # Assets statiques, robots.txt, sitemap.xml 
├── .github/workflows/    # CI/CD GitHub Actions 
├── firebase.json         # Config Firebase Hosting + Functions 
├── firestore.rules       # Règles de sécurité Firestore 
└── vite.config.js        # Config build Vite 
```

# BayIIn — Contexte Claude Code

> Ce fichier est chargé automatiquement par Claude Code à chaque session.
> Il contient tout le contexte architectural, les conventions et les décisions
> prises durant le développement de BayIIn.

---

## 🎯 Vision du Projet

BayIIn est le **Retail OS** des e-commerçants marocains.
Plateforme SaaS tout-en-un : Commandes · Stock · Finances · Livraison · WhatsApp · IA.
Concurrent local à Shopify/Odoo, conçu pour le marché COD marocain.

**URL prod :** https://bayiin.shop
**Repo :** github.com/YassirChirawi/bayiin
**Fondateur :** Yassir Chirawi

---

## 🏗️ Stack Technique

| Couche | Technologie | Notes |
|---|---|---|
| Frontend | React 19 + Vite 7 | SPA, lazy loading, bundle split |
| Style | Tailwind CSS v4 | Utility-first, CSS vars pour le thème |
| Animations | Framer Motion | Micro-interactions premium |
| Base de données | Firebase Firestore | NoSQL temps réel, source de vérité |
| Auth | Firebase Auth | JWT, Google OAuth |
| Serverless | Cloud Functions Node.js 22 | Backend logic |
| AI | Groq SDK (Llama 3.3-70b) | Copilot Beya3 |
| Paiements | Stripe + YouCan Managed Billing | SaaS subscriptions |
| Mobile | Capacitor | iOS/Android PWA |
| Tests | Vitest + Playwright | Unit + E2E |
| CI/CD | GitHub Actions | 3 workflows : feature/develop/master |

---

## 📁 Structure du Projet

```
bayiin/
├── src/
│   ├── components/          # Composants UI réutilisables
│   ├── context/             # React Context (Auth, Tenant, Copilot, Language)
│   ├── hooks/               # Custom hooks (useStoreData, useOrderActions...)
│   ├── lib/                 # Firebase init, Stripe, audit.js
│   ├── pages/               # Pages principales
│   ├── services/            # AI service, localCopilot, knowledgeBase
│   ├── utils/               # Helpers (orderStateMachine, whatsappTemplates...)
│   └── builder/             # StoreBuilder (registry.js, BlockRenderer.jsx...)
├── functions/
│   └── src/
│       ├── copilot.js       # Cloud Function Groq streaming (2-pass ReAct)
│       ├── copilot/
│       │   ├── financialEngine.js    # Moteur financier déterministe
│       │   ├── memoryService.js      # Mémoire long terme TF-IDF
│       │   ├── proactiveAgent.js     # Daily brief + anomaly scanner
│       │   ├── reactAgent.js         # ReAct loop (max 5 iterations)
│       │   ├── actionExecutor.js     # Actions avec rollback transactionnel
│       │   ├── benchmarkService.js   # Benchmark marché anonymisé
│       │   └── multiAgent.js         # CFO/COO/CMO/CTO agents
│       ├── youcan.js         # Intégration YouCan OAuth + webhooks
│       ├── youcanBilling.js  # YouCan Managed Billing (99 MAD/mois)
│       ├── whatsapp.js       # Bot WhatsApp COD autonome
│       ├── whatsappSender.js # Envoi automatique notifications
│       ├── emailService.js   # Resend (factures, alertes stock, rapports)
│       └── shopify.js        # Shopify webhooks backend
├── tests/
│   ├── unit/               # Vitest — logique pure
│   ├── integration/        # Vitest + Firebase Emulator
│   ├── e2e/                # Playwright — flux complets
│   └── regression/         # Playwright — non-régression
├── docs/                   # Documentation technique
│   ├── ARCHITECTURE.md
│   ├── MODULES.md
│   ├── FIRESTORE_SCHEMA.md
│   ├── COMMITS.md
│   ├── GITFLOW.md
│   ├── RELEASE.md
│   ├── SECURITY.md
│   ├── BEYA3.md
│   ├── QA.md
│   ├── ONBOARDING.md
│   ├── SCALABILITY.md
│   └── WHATSAPP_SETUP.md
├── .github/workflows/      # CI/CD GitHub Actions
│   ├── ci-feature.yml      # Push feature/* → lint + unit + build + preview
│   ├── ci-develop.yml      # Push develop → unit + E2E + Snyk + SonarCloud + staging
│   └── ci-master.yml       # Push master → régression + sécurité + tag + prod
├── firestore.rules         # Sécurité Firestore (RBAC multi-tenant)
├── sonar-project.properties
└── playwright.config.js
```

---

## 🌿 Stratégie GitFlow

```
master  (production — toujours stable)
  └── develop  (intégration — base de toutes les features)
        ├── feature/[description-en-kebab-case]
        ├── feature/[autre-feature]
        └── hotfix/[description]  ← depuis master directement
```

**Règles absolues :**
- Jamais de push direct sur `develop` ou `master`
- PR obligatoire avec CI qui passe
- Une feature = une branche
- Hotfix depuis `master` → merge dans `master` ET `develop`

---

## 📝 Convention de Commits (Obligatoire)

Format : `<type>(<scope>): <description> [BAY-XXX]`

**Types :**
```
feat     → Nouvelle fonctionnalité (MINOR)
fix      → Correction bug (PATCH)
security → Correctif sécurité (PATCH)
perf     → Performance (PATCH)
refactor → Refactoring sans ajout ni fix
test     → Tests uniquement
docs     → Documentation uniquement
chore    → Dépendances, config, build
ci       → Pipeline CI/CD
revert   → Annulation commit précédent
```

**Scopes disponibles :**
```
orders · products · finances · customers · copilot
logistics · auth · rules · pwa · stripe · youcan
whatsapp · builder · ci · deps · seo
```

**Exemples valides :**
```bash
feat(orders): ajout matrice de transitions d'états [BAY-42]
fix(stock): correction double déduction bundle [BAY-67]
feat(copilot)!: migration Gemini vers Groq [BAY-89]
security(rules): fix isStoreOwner sans argument [BAY-12]
```

**Validation automatique :** Commitlint + Husky configurés.
Un commit invalide est rejeté avant le push.

---

## 🔐 RBAC — Rôles et Permissions

| Rôle | Accès |
|---|---|
| Owner | Tout — commandes, finances, settings, staff, drivers |
| Staff | Commandes + Produits + Clients (pas finances globales) |
| Driver | Ses commandes assignées uniquement |
| Super Admin | Multi-tenant lecture maintenance |

**Règle Firestore critique :** Isolation stricte par `storeId`.
Un tenant ne peut jamais lire les données d'un autre.

---

## 🛒 Machine d'États Commandes

Transitions valides uniquement (src/utils/orderStateMachine.js) :

```
reçu         → confirmation · packing · annulé
confirmation → packing · livraison · annulé
packing      → livraison · annulé
livraison    → livré · retour · annulé · pas de réponse
livré        → retour
annulé       → (aucune)
retour       → (aucune)
pas de réponse → confirmation · annulé
```

**Effets automatiques :**
- `annulé` ou `retour` → restock automatique du produit
- `livré` → incrémente stats/sales (transaction atomique)
- Tout changement → audit_log écrit

---

## 🗃️ Schéma Firestore — Collections principales

```
stores/{storeId}
  ├── orders/{orderId}
  ├── products/{productId}
  ├── customers/{customerId}
  ├── expenses/{expenseId}
  ├── refunds/{refundId}
  ├── members/{userId}
  ├── audit_logs/{logId}          # Append-only, jamais modifiable
  ├── stats/sales                 # Compteurs pré-calculés (performance)
  ├── youcan_integration/config   # Tokens OAuth YouCan
  ├── youcan_orders/{youcanId}    # Mapping YouCan ↔ BayIIn
  ├── whatsapp_conversations/{phone}
  ├── whatsapp_logs/{logId}
  ├── beya3_memory/{memoryId}     # Mémoire long terme TF-IDF
  ├── beya3_conversations/{id}
  ├── beya3_action_log/{actionId} # Audit actions IA + rollback data
  └── beya3_scheduled_insights/{id}

/market_benchmarks/{segment}/{date}  # Agrégats anonymisés (jamais de storeId)
```

---

## 🤖 Beya3 — Agent IA Hybride

### Architecture (4 couches)

```
1. Interface (CopilotWidget.jsx)
   Chat + Streaming + Confirmation 60s + Rollback + Voice

2. Orchestrateur (copilot.js)
   NLP Router (Groq) → Tool Selector → Response Formatter

3. Moteur Déterministe (financialEngine.js)
   calculateNetProfit · predictStockRunout · detectAnomalies
   analyzeReturnPatterns · calculateRFMScore · getPendingCashflow

4. Mémoire (memoryService.js)
   TF-IDF + récence + fréquence → retrieval sémantique léger
```

### 25 Tools disponibles (Groq Function Calling)

```
Lecture : analyze_profit · get_cashflow_status · compare_periods
          get_inventory_intelligence · analyze_customers
          analyze_return_patterns · get_orders_status
          detect_anomalies · predict_stock_runout
          get_market_benchmark · generate_performance_report

Actions (nécessitent confirmation) :
          draft_expense · draft_purchase_order
          bulk_update_orders · send_whatsapp_campaign
          rollback_last_action

Mémoire : store_memory · retrieve_memory
```

### ReAct Loop (max 5 itérations)
Questions complexes → THINK → ACT → OBSERVE → répète jusqu'à ANSWER
Questions simples → bypass ReAct (latence minimale)

### Agents spécialisés (multiAgent.js)
- CFO : finances, profit, cashflow
- COO : opérations, commandes, livraisons
- CMO : marketing, clients, WhatsApp
- CTO : stocks, prédictions, anomalies

---

## 📱 Bot WhatsApp COD (whatsapp.js)

Machine d'états pour les clients finaux :

```
order_created → awaiting_confirmation → confirmed / refused / rescheduled
             ↓ (timeout 2h)
             no_answer → statut 'pas de réponse' + restock
```

**NLU Darija/Français :**
- Confirmation : oui · ok · واخا · ayeh · mzyan
- Refus : non · لا · annule · ma bghitsh
- Reporter : demain · غدا · lboukra
- Humain : agent · واحد · shi had

**Envoi automatique :**
- À la création commande (délai 2 min) → template confirmation
- Au passage → 'livraison' → template tracking
- Handoff marchand → notification WhatsApp + badge dashboard

---

## 🎨 StoreBuilder (builder/)

**Architecture :**
```
registry.js          → Catalogue de tous les blocs (type + variantes)
BlockRenderer.jsx    → Rendu dynamique selon type/variant
HybridStoreBuilder.jsx → Panneau latéral + preview temps réel
PublicCatalog.jsx    → Vitrine publique (lecture seule)
```

**Blocs disponibles :**
Hero (Modern/Split/Video/Moroccan) · Features (Glass/Minimal/Numbered) ·
ProductGrid · ProductCarousel · Testimonials · FAQ · Newsletter ·
CountdownTimer · Gallery · CODReassurance · TrustBadges · ContactForm ·
RichText · Spacer · Divider · WhatsAppFloat · ImageText · VideoSection

**DnD :** @dnd-kit/core + @dnd-kit/sortable
**Mémoire états :** Immer.js (undo/redo 30 niveaux)
**Thème :** CSS Custom Properties injectées dans :root

---

## 🔌 Intégrations externes

### YouCan (Embedded App — review en cours)
- OAuth flow : youcanInstall → OAuth → youcanCallback
- Callback redirige vers `seller-area.youcan.shop/admin/apps/bayiin`
- Billing : YouCan Managed Billing (99 MAD/mois, 30j trial)
- Webhooks : order.create · inventory.low · app.subscription_cancelled
- Scopes : orders:read/write · products:read/write · customers:read · inventory:read/write

### Shopify
- Webhooks backend : orders/create · orders/updated · products/update · app/uninstalled
- Vérification HMAC-SHA256 obligatoire
- Mapping statuts Shopify → BayIIn

### WhatsApp Business (Meta Cloud API v21.0)
- Endpoint : graph.facebook.com/v21.0/{PHONE_ID}/messages
- Templates approuvés Meta obligatoires (catégorie UTILITY)
- Vérification webhook : x-youcan-signature HMAC

### Transporteurs
- Sendit : token API + génération tracking
- O-Livraison : clé API/Secret + trackingId
- Cathedis : Username/Password API

### Emails
- Resend (resend.com) — 3000 emails/mois gratuits
- Factures auto (isPaid:true) · Alertes stock · Rapport hebdo lundi 8h

---

## 🛡️ Sécurité

**Firestore Rules critiques :**
- `isStoreOwner(storeId)` → toujours avec argument (bug connu à éviter)
- `audit_logs` → create only, jamais update ni delete
- Champs Stripe/YouCan → modifiables uniquement par Cloud Functions (Admin SDK)
- Driver → update uniquement status vers livré/retour/pas de réponse

**Secrets Firebase (jamais dans le code) :**
```
GROQ_API_KEY · WHATSAPP_TOKEN · WHATSAPP_PHONE_ID
WHATSAPP_VERIFY_TOKEN · YOUCAN_CLIENT_SECRET
YOUCAN_APP_HANDLE · RESEND_API_KEY · SNYK_TOKEN
SONAR_TOKEN · TEST_EMAIL · TEST_PASSWORD
```

**Audit Trail :** Chaque action critique → `stores/{id}/audit_logs`
avec userId, userEmail, action, from, to, timestamp.

---

## 🧪 Tests

```bash
npm run test              # Vitest watch
npm run test -- --run     # Vitest CI (une fois)
npm run test:coverage     # Rapport couverture (seuil 60%)
npm run test:e2e          # Playwright E2E
npm run test:regression   # Suite non-régression
npm run test:all          # Tout
npm run security:scan     # Snyk
```

**Variables d'env de test :**
```
TEST_EMAIL=beta@bayiin.shop
TEST_PASSWORD=[voir Notion Accès & Secrets]
BASE_URL=http://localhost:5173
```

**239 tests passent** sur la branche feature/beya3-cfo-coo.

---

## 🚀 Pipeline CI/CD

| Branch | Tests | Sécurité | Deploy |
|---|---|---|---|
| `feature/*` | Unit + Build | ❌ | Preview Firebase |
| `develop` | Unit + E2E + SonarCloud | Snyk High+ | Staging |
| `master` | Régression complète | Snyk Medium+ bloquant | Production |

**Secrets GitHub requis :**
FIREBASE_TOKEN · SNYK_TOKEN · SONAR_TOKEN · TEST_EMAIL · TEST_PASSWORD · GITHUB_TOKEN

---

## 📋 Linear — Gestion des tickets

**Format :** `BAY-[numéro]`
**Labels :** orders · products · finances · customers · copilot ·
             logistics · auth · rules · pwa · stripe · youcan ·
             whatsapp · builder · ci · security · tests · docs

**Story Points :** XS(1h) · S(demi-j) · M(1j) · L(2-3j) · XL(1sem→découper)

**Référencer dans les commits :** `[BAY-42]` en fin de message

---

## ⚡ Commandes utiles

```bash
# Dev
npm run dev                        # localhost:5173
npm run build                      # Build prod
npm run lint                       # ESLint

# Firebase
firebase emulators:start           # Emulator local
firebase deploy --only functions   # Deploy functions
firebase functions:secrets:set KEY # Ajouter secret

# Secrets à configurer
firebase functions:secrets:set GROQ_API_KEY
firebase functions:secrets:set WHATSAPP_TOKEN
firebase functions:secrets:set YOUCAN_CLIENT_SECRET
firebase functions:secrets:set RESEND_API_KEY

# Tests
npm run test:e2e -- --headed       # Playwright visible
npx playwright show-report        # Rapport dernier run
```

---

## 🌍 Environnements

| Env | URL | Branch | Config |
|---|---|---|---|
| Production | https://bayiin.shop | master | .env.production |
| Staging | https://staging--bayiin.web.app | develop | .env.staging |
| Preview | https://feature-xxx--bayiin.web.app | feature/* | .env.development |

---

## 📚 Documentation complète

Tous les fichiers sont dans `/docs/` :
- Architecture détaillée → `ARCHITECTURE.md`
- Schéma Firestore → `FIRESTORE_SCHEMA.md`
- Convention commits → `COMMITS.md`
- Plan de release → `RELEASE.md`
- Sécurité & RBAC → `SECURITY.md`
- Guide Beya3 → `BEYA3.md`
- Guide QA → `QA.md`
- Onboarding dev → `ONBOARDING.md`
- Setup WhatsApp → `WHATSAPP_SETUP.md`
- Scalabilité serverless → `SCALABILITY.md`

Documentation business → Notion BayIIn Workspace

---

*Dernière mise à jour : Août 2026 — Yassir Chirawi*

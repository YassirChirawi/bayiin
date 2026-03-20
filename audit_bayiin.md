# Audit Exhaustif — BayIIn Commerce SaaS
**Date :** 19 mars 2026 · Auditeur : Antigravity (IA)

---

## Table des Matières
1. [Résumé Exécutif](#1-résumé-exécutif)
2. [Stack Technique](#2-stack-technique)
3. [Architecture Globale](#3-architecture-globale)
4. [Analyse Fonctionnelle des Modules](#4-analyse-fonctionnelle-des-modules)
5. [Backend & Cloud Functions](#5-backend--cloud-functions)
6. [Sécurité Firestore](#6-sécurité-firestore)
7. [Intégrations Externes](#7-intégrations-externes)
8. [Qualité du Code](#8-qualité-du-code)
9. [Tests](#9-tests)
10. [Performance & PWA](#10-performance--pwa)
11. [Problèmes Critiques identifiés](#11-problèmes-critiques-identifiés)
12. [Recommandations Prioritaires](#12-recommandations-prioritaires)

---

## 1. Résumé Exécutif

BayIIn est un **ERP SaaS multi-tenant** conçu pour le commerce de détail marocain (E-commerce + boutiques physiques). L'application est orientée mobile-first (PWA + Android/iOS via Capacitor), avec une stack moderne et un périmètre fonctionnel très étendu pour la taille du projet.

### Points Forts
- Architecture multi-tenant propre via `TenantContext` + Firestore security rules
- Transactions FEFO (First Expired First Out) correctement implémentées côté client ET backend
- Moteur d'automatisation visuel (triggers → conditions → actions → délais)
- Intégration native avec 3 opérateurs logistiques marocains (Sendit, O-Livraison, WooCommerce)
- Audit log asynchrone non-bloquant dans `stores/{id}/audit_logs`
- Tests unitaires présents pour les modules financiers et utilitaires critiques

### Points Faibles / Risques
- **Clé API Firebase hardcodée** dans [firebase.js](file:///c:/Users/Yassir%20Chirawi/.gemini/antigravity/scratch/commerce-saas/src/lib/firebase.js) (risque de sécurité)
- Doublonnage de logique stock entre le Cloud Function `onOrderWrite` et [useOrderActions.js](file:///c:/Users/Yassir%20Chirawi/.gemini/antigravity/scratch/commerce-saas/src/hooks/useOrderActions.js)
- Persistence offline Firestore commentée / désactivée
- Absence de rate limiting sur les webhooks Cloud Functions
- Rôle `super_admin` vérifié uniquement via document Firestore (pas de Custom Claims JWT)

---

## 2. Stack Technique

| Catégorie | Technologie | Version |
|---|---|---|
| Framework UI | React | 19.x |
| Build Tool | Vite | 7.x |
| Langage | JavaScript (JSX) | ES Module |
| CSS | TailwindCSS | v4.x |
| Routing | React Router DOM | v7.x |
| State (auth) | Context API | natif |
| Base de données | Cloud Firestore (named: `comsaas`) | Firebase SDK 11.x |
| Auth | Firebase Authentication | Email/Pwd + Google OAuth |
| Stockage | Firebase Storage | — |
| Backend | Firebase Cloud Functions | v1 (Gen1 + Gen2 mix) |
| IA | Google Generative AI SDK | `@google/generative-ai` |
| Mobile | Capacitor | 8.x (Android + iOS) |
| PWA | vite-plugin-pwa | — |
| Paiement | Stripe | stripe-js |
| PDF | jsPDF + jspdf-autotable | — |
| Charts | Recharts | v3.x |
| Scanner | html5-qrcode | v2.3 |
| Animations | Framer Motion | v12 |
| Notifications | react-hot-toast | — |
| Tests | Vitest + Testing Library | — |

---

## 3. Architecture Globale

```
┌─────────── React SPA (Vite) ───────────────┐
│                                             │
│  HelmetProvider > LanguageProvider          │
│    > AuthProvider > TenantProvider          │
│      > CopilotProvider > NotificationProvider│
│        > BrowserRouter                     │
│                                             │
│  Routes (/dashboard, /orders, /finances...) │
│  ProtectedRoute > BiometricLock > Layout    │
└────────────────┬────────────────────────────┘
                 │ Firestore SDK
        ┌────────▼───────────┐
        │  Cloud Firestore   │   (named DB: comsaas)
        │  15+ collections   │
        └────────┬───────────┘
                 │ Cloud Functions (Functions SDK)
        ┌────────▼───────────────────────────────┐
        │  4 Cloud Functions                     │
        │  - onOrderWrite (Aggregation + Stock)  │
        │  - stripeWebhook (Subscriptions)       │
        │  - senditWebhook (Carrier status sync) │
        │  - handleWooCommerceOrder (E-commerce) │
        │  - syncStockToWooCommerce (Bi-direc.)  │
        └────────────────────────────────────────┘
```

### Gestion Multi-Tenant
- Chaque store est isolé par `storeId` dans chaque collection
- `TenantContext` charge : store actif, liste des stores (own + staff), données franchise
- Sélection du store actif persistée dans `localStorage` (`lastStoreId`)
- Support `StoreSwitcher` pour multi-boutiques sans reconnexion

### Rôles & Permissions
| Rôle | Accès |
|---|---|
| `owner` | Full access à son store |
| `staff` | Accès partiel (via `allowed_users`) |
| `franchise_admin` | Lecture transversale de tous les stores de la franchise |
| `super_admin` | Accès total + admin dashboard |

---

## 4. Analyse Fonctionnelle des Modules

### 4.1 Dashboard (`/dashboard`)
- KPIs temps réel : CA réalisé, taux de livraison, retours, marge
- Graphiques Recharts : évolution revenus, statuts commandes
- Alerte période d'essai (trial expiration banner) avec bouton upgrade Stripe
- Widgets `ForecastingWidget`, `Beya3Insights`, `CFOSimulator`
- Statistiques agrégées côté backend (lecture unique de `stores/{id}/stats/sales`)
- **✅ Bien conçu** : utilise les stats précalculées par `onOrderWrite` pour éviter les lectures massives Firestore

### 4.2 Produits (`/products`)
- CRUD complet avec variantes, collections, images (Firebase Storage)
- Système SKU propriétaire KUO'S (`DREN001`, `DSVP001`, format `D[LINE][000]`)
- Gestion des lots de stock (inventoryBatches avec dates d'expiration)
- Import CSV multi-format (WooCommerce, Odoo, personnalisé)
- Export PDF catalogue
- Partage catalogue public `/catalog/:storeId` (public sans auth)
- Code QR pour chaque produit (`react-qr-code`)
- **⚠️ Risque** : `allow read: if true` sur la collection `products` = catalogue entier exposé publiquement, intentionnel mais à documenter

### 4.3 Commandes (`/orders` + [useOrderActions.js](file:///c:/Users/Yassir%20Chirawi/.gemini/antigravity/scratch/commerce-saas/src/hooks/useOrderActions.js))
- Pipeline : reçu → confirmation → packing → ramassage → livraison → livré/retour/annulé
- Multi-produits par commande (tableau `products[]`)
- Transactions Firestore atomiques : stock + customer + order en un seul `runTransaction`
- FEFO automatique lors de la déduction de stock sur batch
- Intégration livreur automatique (Sendit + O-Livraison) avec mise à jour tracking
- Dispatching livreur interne via token (`/delivery/:token`, sans authentification)
- Impression étiquettes PDF, QR tracking, export CSV
- Actions en masse : statut, export, suppression ([useOrderBulkActions.js](file:///c:/Users/Yassir%20Chirawi/.gemini/antigravity/scratch/commerce-saas/src/hooks/useOrderBulkActions.js))
- **⚠️ Bug potentiel** : Le logique de stock entre `onOrderWrite` (Cloud Function) et [useOrderActions.js](file:///c:/Users/Yassir%20Chirawi/.gemini/antigravity/scratch/commerce-saas/src/hooks/useOrderActions.js) peut sur/sous-déduire dans certains edge cases (mise à jour via webhook WooCommerce + update manuel simultané)

### 4.4 Clients (`/customers`)
- Création automatique à la création de commande (lookup par téléphone)
- Compteurs cumulatifs : `totalSpent`, `orderCount`, `lastOrderDate`
- Segmentation IA : [aiSegmentation.js](file:///c:/Users/Yassir%20Chirawi/.gemini/antigravity/scratch/commerce-saas/src/utils/aiSegmentation.js) calcule score VIP, Dormant, At-Risk
- Fiche client détaillée : historique commandes, tags, notes, suivi
- Export CSV
- **✅ Feature avancée** : détection AI des clients à risque de churn

### 4.5 Finances (`/finances`)
- Calculs centralisés dans [financials.js](file:///c:/Users/Yassir%20Chirawi/.gemini/antigravity/scratch/commerce-saas/src/utils/financials.js) (sans dépendance UI)
- Métriques : CA réalisé, COGS, livraison réelle, dépenses, résultat net, marge
- TVA 20% marocaine calculée sur le CA livré
- ROAS et CAC calculés sur les dépenses de type `Ads`
- Ratio frais de port
- Module rapprochement Sendit ([InvoiceTable.jsx](file:///c:/Users/Yassir%20Chirawi/.gemini/antigravity/scratch/commerce-saas/src/components/InvoiceTable.jsx) + [useReconciliation.js](file:///c:/Users/Yassir%20Chirawi/.gemini/antigravity/scratch/commerce-saas/src/hooks/useReconciliation.js))
- Export PDF et CSV financier
- **✅ Excellent** : logique financière propre, testée via [financials.test.js](file:///c:/Users/Yassir%20Chirawi/.gemini/antigravity/scratch/commerce-saas/src/utils/financials.test.js)

### 4.6 RH (`/hr`)
- Gestion employés : profil, poste, contrat, salaire de base
- Gestion présences / absences (sous-collection `absences`)
- Historique paie (sous-collection `payroll_history`)
- Interface candidats (offres d'emploi) avec options télétravail/hybride
- **⚠️** Module le plus volumineux (61 KB) → risque de performance du bundle

### 4.7 Drivers & Livraison (`/drivers` + `DeliveryApp`)
- CRUD chauffeurs avec statut, zones, évaluations
- Application livreur dédiée `/delivery/:token` — sans authentification (token comme secret)
- Biométrico sur `DriverAuth.jsx` (TouchID/FaceID via Capacitor Biometrics)
- Mise à jour statut livraison en temps réel avec suivi timeline
- Application de candidature publique `/apply/driver/:storeId`

### 4.8 Automations (`/automations`)
- Constructeur visuel de workflows : Trigger → Condition → Délai → Action
- Actions disponibles : `create_delivery` (Sendit), `send_whatsapp`, `request_pickup`
- Délais : actions programmées via `followUpDate` sur la commande (pas de job queue réel)
- Conditions : `status_equals`, `total_greater`
- Stockées dans `stores/{id}/automations`
- **⚠️ Limitation** : WhatsApp s'ouvre via `window.open()` — nécessite interaction utilisateur, bloqué en background
- **⚠️ Limitation** : Pas de vrai scheduling (pas de Cloud Scheduler ou task queue) — les "délais" créent uniquement un `followUpDate` dans la commande

### 4.9 Warehouse (`/warehouse`)
- Scanner code-barres et QR via `html5-qrcode` (caméra mobile)
- Actions rapides : marquer commande comme expédiée, mettre à jour stock produit
- Conçu pour mobile uniquement

### 4.10 Achats / Purchases (`/purchases`)
- Bons de commande fournisseurs
- Réceptions partielles (sous-collection `receptions`)
- Mise à jour stock à la réception
- Gestion fournisseurs

### 4.11 Retours SAV (`/returns`)
- Gestion des retours clients
- Lien avec commande d'origine
- Mise à jour stock au retour

### 4.12 Marketing (`/marketing`)
- Segmentation clients (IA)
- Templates WhatsApp (`whatsappTemplates.js`) : 10+ templates prédéfinis
- Newsletter (liste d'abonnés)
- Export campagne

### 4.13 Franchise (`/franchise`)
- Vue consolidée multi-stores
- Alertes taux de retour > 25% (configuré dans `NotificationContext`)
- Lecture des stats de chaque store de la franchise en parallèle

### 4.14 Planning (`/planning`)
- Calendrier événements personnalisés
- CRUD événements Firestore (`/events`)

### 4.15 Assets (`/assets`)
- Gestion patrimoine matériel (ordinateurs, équipements…)
- Règles Firestore : `isStoreOwner() || isSuperAdmin()`
- **⚠️ Bug règle Firestore** : `isStoreOwner()` appelée sans argument `storeId` dans les collections `assets` et `incidents` (lignes 184-190 de `firestore.rules`)

### 4.16 Admin Dashboard (`/admin`)
- Protégé par `RoleProtectedRoute` + `BiometricLock`
- Gestion de tous les stores (subscription, plan)
- Annonces système (collection `system/announcements`)

---

## 5. Backend & Cloud Functions

### 5.1 `onOrderWrite` — Agrégation + Stock
- **Trigger** : toute écriture sur `orders/{orderId}` (base `comsaas`)
- **Fait** : met à jour `stores/{id}/stats/sales` (totaux, quotidiens, compteurs statuts, revenus réalisés)
- **Fait** : ajuste le stock produit (`products/{id}.stock`) via un batch séparé
- **✅ Excellent** : utilise FieldValue.increment pour éviter les conflits d'écriture concurrente
- **⚠️ Risque de double-déduction** : le Cloud Function ET `useOrderActions.js` déduisent le stock. En cas de création d'ordre web + trigger Cloud Function simultanément sur la même commande, le stock peut être déduit deux fois.
  - La fonction côté client met à jour le stock directement dans la transaction de création
  - Le Cloud Function réagit à l'écriture et tente aussi de faire des ajustements
  - Ces deux mécanismes ne sont pas mutuellement exclusifs

### 5.2 `handleWooCommerceOrder` — Connecteur WooCommerce
- Vérification signature HMAC via `wooService.verifySignature()`
- Transaction Firestore : déduction FEFO + création commande BayIIn
- Mapping automatique par SKU
- **✅ Bien sécurisé** : vérification signature avant traitement
- **⚠️** `storeId` passé en query param (URL prévisible, non authentifiée au-delà de la signature)

### 5.3 `stripeWebhook` — Abonnements
- Écoute `checkout.session.completed`
- Mise à jour `subscriptionStatus`, `plan`, `stripeCustomerId`
- Distingue starter (79 MAD) vs pro par `amount_total`
- **⚠️ Risque** : si `endpointSecret` absent, l'event n'est pas vérifié et `event = req.body` est accepté directement — possibilité d'injection de données

### 5.4 `senditWebhook` — Mise à jour carrier
- Mapping statuts Sendit → statuts internes BayIIn (table de mapping complète)
- Batch update idempotent (ne met à jour que si changement)
- Retourne toujours 200 pour éviter les renvois inutiles

### 5.5 `syncStockToWooCommerce` — Sync stock bidirectionnel
- Trigger sur écriture `products/{productId}`
- Envoie la mise à jour de stock vers WooCommerce si `wooUrl` configuré
- **✅ Propre conditionnellement** : ne tourne que si WooCommerce activé

---

## 6. Sécurité Firestore

### Collections & Règles

| Collection | Lecture | Écriture | Risques |
|---|---|---|---|
| `users` | Propre user ou super_admin | Propre user (sans modifier `role`) ou super_admin | ✅ |
| `stores` | **Public (true)** | Owner + staff + super_admin | ⚠️ Toutes les configs de stores lisibles publiquement |
| `products` | **Public (true)** | Owner + staff + super_admin | Intentionnel pour catalogue public |
| `orders` | Auth + owner/staff/franchise/token | Owner + staff + webhook catalog | ⚠️ `allow read: if resource.data.livreurToken != null` sans auth = n'importe qui peut lire si token |
| `customers` | Auth + storeId | Auth + storeId | ✅ |
| `expenses` | Auth + storeId | Auth + storeId | ✅ |
| `employees` | Auth + storeId + franchise | Owner + staff | ✅ |
| `assets` / `incidents` | `isStoreOwner()` sans arg | `isStoreOwner()` sans arg | 🔴 **Bug** : fonction appelée sans `storeId` |
| `leads` | Auth + storeId | **Public (true)** | ✅ Intentionnel |
| `driverApplications` | Auth | **Public (true)** | ✅ Intentionnel |
| `franchises` | Super_admin + franchise_admin | Super_admin only | ✅ |
| `system/announcements` | **Public (true)** | Super_admin only | ✅ |

### Problèmes de Sécurité Identifiés

| Sévérité | Problème | Localisation |
|---|---|---|
| 🔴 CRITIQUE | Firebase API Key hardcodée dans le code source | `src/lib/firebase.js` L8 |
| 🔴 CRITIQUE | `isStoreOwner()` appelée sans param dans `assets` et `incidents` | `firestore.rules` L184-190 |
| 🟡 MOYEN | Store data complète accessible publiquement (inclut config API keys ?) | `firestore.rules` L93 |
| 🟡 MOYEN | `stripeWebhook` accepte events non vérifiés si `endpointSecret` absent | `functions/index.js` L27-29 |
| 🟡 MOYEN | Rôle `super_admin` vérifié via document Firestore (getUserData()) — pas de Custom Claims | `firestore.rules` L59-61 |
| 🟢 FAIBLE | Orders lisibles par token sans auth Firebase | `firestore.rules` L132 |
| 🟢 FAIBLE | `console.log` présents en production (firebase config révélée dans la console) | `src/lib/firebase.js` L17-21 |

---

## 7. Intégrations Externes

### 7.1 Sendit (Livraison)
- Auth Bearer avec cache token (23h) en mémoire
- Gestion districts avec cache in-memory (`cachedDistricts`)
- Opérations : create package, get status, request pickup, request return, get labels PDF, get invoices
- Webhook bidirectionnel (Cloud Function `senditWebhook`)
- **⚠️** Cache en mémoire perdu au rechargement de page — auth systématique si token expiré

### 7.2 O-Livraison (Livraison alternative)
- Service similaire à Sendit, API différente
- Tests dans `olivraison.test.js` (5 tests)

### 7.3 WooCommerce (E-commerce)
- Connecteur webhook entrant (Cloud Function)
- Sync stock bidirectionnel automatique (Cloud Function trigger)
- Vérification HMAC signature
- Config stockée dans document Firestore du store (`wooUrl`, `wooConsumerKey`, etc.)
- **⚠️ Risque** : les credentials WooCommerce sont dans Firestore — si règles `stores` permissives, exposition possible

### 7.4 Stripe (Paiements)
- Checkout session via `stripeService.js`
- Webhook Cloud Function pour mise à jour subscription
- SKU produit = `starter` (79 MAD) ou `pro`

### 7.5 Google Generative AI
- `aiService.js` : analyse des commandes, scoring, détection anomalies financières
- `productAdvisorService.js` : conseils produits IA
- `Copilot.jsx` : assistant IA conversationnel
- `knowledge.js` : base de connaissance pour le copilot

---

## 8. Qualité du Code

### Points Positifs
- ✅ Separation of concerns claire : hooks, services, utils, components bien séparés
- ✅ Custom hooks pour les opérations complexes (`useOrderActions`, `useOrderBulkActions`, `useFranchiseData`)
- ✅ Consistent error handling dans les services avec try/catch et propagation d'erreurs
- ✅ Utilisation de `FieldValue.increment` (pas de read-modify-write pour les compteurs)
- ✅ Validation des données au niveau des règles Firestore (`isValidProduct`, `isValidOrder`)
- ✅ Système de log d'audit asynchrone non-bloquant
- ✅ `ErrorBoundary` présent au niveau racine

### Points Négatifs
- ⚠️ **Taille des fichiers** : plusieurs pages dépassent 30-60 KB (`HR.jsx` = 61KB, `Finances.jsx` = 50KB, `Automations.jsx` = 47KB, `Drivers.jsx` = 46KB) — absence de code splitting
- ⚠️ **Doublonnage logique stock** entre `useOrderActions.js` et Cloud Function `onOrderWrite`
- ⚠️ **Imports en vrac dans App.jsx** : `import Marketing from "./pages/Marketing"` utilisé dans les routes sans être importé dans la liste officielle des imports (ligne 174)
- ⚠️ La logique de `useAudit.js` appelle `logAction` mais la signature de `logActivity` dans `logger.js` prend `(db, storeId, user, action, details, metadata)` — possible désynchronisation
- ⚠️ **Console.log** non supprimés en production (Firebase config, automations, etc.)
- ⚠️ `tailwind.config.js.old` présent à la racine (fichier obsolète)
- ⚠️ `sendit_api.json` et `sendit_api_full.json` (218KB chacun) commités dans le repo — exposent la spec API Sendit

---

## 9. Tests

| Fichier | Type | Couverture |
|---|---|---|
| `Button.test.jsx` | Composant UI | Render, click |
| `Input.test.jsx` | Composant UI | Render, value |
| `ProductModal.test.jsx` | Composant métier | Form validation, submit |
| `financials.test.js` | Logic unitaire | calculateFinancialStats |
| `notificationUtils.test.js` | Logic unitaire | Formatage alertes |
| `pricing.test.js` | Logic unitaire | Calculs prix |
| `reconcileStats.test.js` | Logic unitaire | Rapprochement Sendit |
| `aiService.test.js` | Service IA | detectFinancialLeaks |
| `olivraison.test.js` | Service externe | Authentification, création colis |
| `sendit.test.js` | Service externe | Auth, districts, package |

**✅ Bon** : la logique métier critique est testée (financement, prix, réconciliation, IA)  
**⚠️** Couverture des pages principales et hooks = 0%  
**⚠️** Pas de tests E2E (Playwright/Cypress)  

---

## 10. Performance & PWA

### PWA
- Configuré via `vite-plugin-pwa` (`autoUpdate`)
- Manifest : BayIIn, portrait, standalone, theme `#4f46e5`
- Max file cache size : 4 MB (risque si chunks >4MB)
- Service Worker : `registerType: 'autoUpdate'` (rechargement transparent)
- Icônes : `pwa-192x192.png`, `pwa-512x512.png`

### Performance
- **Code splitting manquant** : `HR.jsx` (61KB), `Finances.jsx` (50KB) chargés au démarrage sans lazy import
- **Persistence Offline désactivée** : `enableIndexedDbPersistence` commentée
- **Pagination** : `usePaginatedStoreData.js` implémenté (`InfiniteScrollTrigger.jsx`) — ✅
- **Caching Sendit** : cache token + districts en mémoire — ✅ mais perdu au rechargement
- **Stats pré-calculées** : lecture unique pour le dashboard (pas d'agrégation client-side) — ✅ excellente décision

### Mobile (Capacitor)
- Android (`android/`) + iOS (`ios/`) configurés
- `haptics.js` pour retours tactiles
- `useBiometrics.js` pour TouchID/FaceID
- `capacitor.config.ts` configuré

---

## 11. Problèmes Critiques Identifiés

### 🔴 Critiques (à corriger immédiatement)

1. **Firebase API Key hardcodée** dans `src/lib/firebase.js` L8  
   → Note : les clés Firebase côté client ne sont pas secrètes (elles sont publiques), mais le fichier contient un commentaire `TEMP FIX` qui indique que ce n'est pas intentionnel. La vraie menace est que les règles Firestore doivent être la vraie barrière.

2. **Bug règle Firestore `isStoreOwner()`** dans `assets` et `incidents` (L184-190)  
   → La fonction attend `storeId` en paramètre mais est appelée sans argument → comportement indéfini (probablement toujours faux → assets inaccessibles)

3. **Double déduction stock** potentielle entre `useOrderActions.js` et `onOrderWrite` Cloud Function  
   → Pour les commandes BayIIn normales, la déduction côté client + le Cloud Function créent un double mouvement de stock

### 🟡 Moyens (à corriger rapidement)

4. **`stripeWebhook` non sécurisé** si `STRIPE_WEBHOOK_SECRET` absent  
   → En production cette variable DOIT être configurée

5. **Modules Marketing et SupportAI** importés dans App.jsx (L174, L168) sans import statement au top du fichier → erreur de compilation potentielle

6. **Console.log** révélant la config Firebase en production

7. **Règles `stores` public read** : si la config du store inclut des clés API tierces, elles sont exposées publiquement

### 🟢 Faibles (améliorations)

8. Automatisations avec délai → pas de vrai scheduling (seulement `followUpDate` dans la commande)
9. Fichiers JSON Sendit API (436KB total) commités inutilement
10. Absence de lazy loading sur les grosses pages

---

## 12. Recommandations Prioritaires

### Priorité 1 — Sécurité

```javascript
// 1. Déplacer vers .env.local (NE PAS commiter)
// src/lib/firebase.js — utiliser variables Vite
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  // ...
};

// 2. Corriger les règles Firestore assets/incidents
match /assets/{assetId} {
  allow read: if request.auth != null && (isStoreOwner(resource.data.storeId) || isSuperAdmin());
  allow write: if request.auth != null && (isStoreOwner(resource.data.storeId) || isSuperAdmin());
}

// 3. Stripe webhook — toujours vérifier la signature
if (!endpointSecret) {
  return res.status(500).send("Webhook secret not configured");
}
```

### Priorité 2 — Stock (Éviter double déduction)

Choisir UNE stratégie :
- **Option A** : Supprimer la déduction stock dans `onOrderWrite` Cloud Function, ne garder que `useOrderActions.js`
- **Option B** : Supprimer la déduction dans `useOrderActions.js`, faire confiance uniquement au Cloud Function (plus robuste mais ajoute latence)
- **Option B recommandée** pour la cohérence multi-sources (WooCommerce, catalogue public, admin)

### Priorité 3 — Performance

```javascript
// Lazy loading des grosses pages
const HR = lazy(() => import('./pages/HR'));
const Finances = lazy(() => import('./pages/Finances'));
const Automations = lazy(() => import('./pages/Automations'));
// Wrapping avec <Suspense fallback={<Skeleton />}>
```

### Priorité 4 — Automatisations avancées

Pour les délais d'automation vrais, utiliser Cloud Tasks ou Cloud Scheduler :
```
Client → Stores automation config → Cloud Scheduler → Cloud Function → WhatsApp/Sendit
```

### Priorité 5 — Rôle super_admin via Custom Claims

```javascript
// Dans Cloud Function à la création d'utilisateur
admin.auth().setCustomUserClaims(uid, { role: 'super_admin' });

// Dans firestore.rules
function isSuperAdmin() {
  return request.auth.token.role == 'super_admin'; // JWT, non document
}
```

---

*Audit généré automatiquement le 2026-03-19 par analyse statique du code source.*

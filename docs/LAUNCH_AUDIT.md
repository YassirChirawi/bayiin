# Audit de lancement — informations à fournir

> **À quoi sert ce fichier.** Toutes les informations manquantes ou fictives ont
> été **masquées** dans l'application plutôt que supprimées. L'UI dégrade
> proprement : rien de faux n'est affiché, et le formulaire de contact reste le
> canal joignable en toutes circonstances.
>
> Chaque entrée dit **où** renseigner la vraie valeur pour rallumer la
> fonctionnalité. Aucune ne demande de toucher au code métier : ce sont des
> constantes de configuration et des drapeaux.
>
> Deux fichiers concentrent tout : [`src/config/brand.js`](../src/config/brand.js)
> (identité, contact, légal) et [`src/config/features.js`](../src/config/features.js)
> (modules non livrés).
>
> Dernière mise à jour : 2026-08-26

---

## ✅ Règles Firestore — déployées et vérifiées (2026-08-26)

**Découvert le 2026-08-26, en tentant le déploiement.**

> **Résolu le 2026-08-26.** Les deux bases portent désormais le ruleset du dépôt,
> et `ci-master` les publie puis les vérifie à chaque release. Le reste de cette
> section documente la panne pour qu'elle ne se reproduise pas.

`firebase deploy --only firestore:rules` affiche **« Deploy complete! »**
et ne publie **rien**. C'est le même bug de `firebase-tools` en configuration
multi-base que celui documenté dans `scripts/create-firestore-indexes.mjs` pour
les index — il touche aussi les règles, mais sans message d'erreur.

Vérifié via l'API Rules après un déploiement annoncé réussi : le ruleset actif
de la base `comsaas` datait toujours du **2026-08-20**.

### Conséquence : la production a ~85 lignes de retard sur `main`

**6 collections n'ont aucune règle** — tout accès est refusé par défaut :

| Collection | Impact |
|---|---|
| `contact_requests` | Le formulaire de contact est rejeté |
| `error_logs` | Le reporting d'erreurs client n'écrit rien |
| `system_alerts` | Le digest quotidien d'erreurs est illisible |
| `support_actions` | Le journal des actions support n'écrit rien |
| `mrr_snapshots` | L'historique MRR de l'admin est vide |
| `support_notes` | Les notes internes par boutique sont inaccessibles |

**Deux correctifs de sécurité mergés n'ont jamais atteint la production :**

1. **Contournement de paywall.** Les champs `testerMode`, `suspended` et
   `trialEndsAt` ne sont pas protégés sur `stores/{storeId}`. Un propriétaire de
   boutique peut se les auto-attribuer — donc s'octroyer le mode testeur ou
   prolonger son essai. Le correctif est dans `firestore.rules` depuis
   longtemps, il n'est simplement jamais parti.

2. **Escalade de privilèges.** La garde qui contraint les rôles de
   `allowed_users` à `staff` / `manager` est absente en production.

### Correction

Deux scripts contournent le bug, sur le modèle de celui des index :

```bash
node scripts/verify-firestore-rules.mjs           # état réel de chaque base
node scripts/deploy-firestore-rules.mjs           # simulation
node scripts/deploy-firestore-rules.mjs --apply   # publie sur comsaas
node scripts/verify-firestore-rules.mjs           # re-vérifie
```

`verify` sort en code 1 tant qu'une base ne porte pas la règle — utilisable en
CI pour que ce silence ne se reproduise pas.

### La base `(default)`

Son ruleset date du **2026-05-28** et diffère nettement (22 907 caractères
contre 30 503). L'application n'utilise que `comsaas`
(`getFirestore(app, 'comsaas')` côté client, `getFirestore('comsaas')` côté
Functions), donc ce n'est pas bloquant.

Mais `firebase.json` déclare que les deux bases suivent `firestore.rules` :
soit `(default)` est un reliquat à supprimer, soit elle doit être alignée. À
trancher avant de la laisser dériver davantage — le script accepte
`--release cloud.firestore` pour la cibler.

---

## 🔴 Bloquant — avant tout lancement commercial

### 1. Identité légale de l'éditeur

**Où :** `src/config/brand.js`

```js
export const LEGAL_ENTITY  = null;  // → "BayIIn SARL"
export const LEGAL_ICE     = null;  // → 15 chiffres
export const LEGAL_RC      = null;  // → n° Registre de Commerce + ville
export const LEGAL_IF      = null;  // → Identifiant Fiscal
export const LEGAL_ADDRESS = null;  // → adresse du siège social
```

**Avant :** la page Conditions publiait littéralement `ICE : 00XXXXXXXXXXXXX`,
`RC : XXXXXX`, `IF : XXXXXXXX`, sous un titre « Identifiants **(Placeholders)** »
— le mot était affiché aux visiteurs. La raison sociale annoncée était
« BayIIn SARL (en cours de constitution) ».

**Après :** le bloc Identifiants n'apparaît que si au moins une valeur est
réelle. L'éditeur retombe sur « BayIIn », sans mention de forme juridique.

**Pourquoi c'est bloquant :** mentions légales obligatoires pour une activité
commerciale au Maroc, et c'est ce que regardent les partenaires (YouCan, Stripe)
en revue de compte.

---

### 2. Adresse de contact publique

**Où :** `src/config/brand.js` → `SUPPORT_EMAIL`

`contact@bayiin.shop` **n'existe pas**. La constante est à `null`, et les cinq
points d'entrée dégradent vers le formulaire de contact :

| Emplacement | Comportement actuel |
|---|---|
| Landing — section Contact | Le formulaire seul, pas de CTA email mort |
| Page Aide | Carte « Le formulaire, c'est ici → » |
| Footer de l'app | Lien « Nous contacter » |
| Beya3 (copilote) | Renvoie vers **Aide → Nous contacter** |
| Envoi du code beta testeur | « Copiez le code et transmettez-le via Aide » |

**Pour rallumer :** créer la boîte (ou un alias de redirection) chez le
registrar du domaine, puis `SUPPORT_EMAIL = 'contact@bayiin.shop'`.

---

### 3. Délégué à la Protection des Données (DPO)

**Où :** `src/config/brand.js` → `DPO_EMAIL`

`privacy@bayiin.shop` n'existe pas non plus. La page Confidentialité le
présentait comme l'adresse du DPO à **quatre endroits**, dont la procédure
d'exercice des droits.

**Après :** la mention DPO disparaît, l'exercice des droits passe par le
formulaire public.

**Attention :** si tu désignes un DPO, cette adresse doit être relevée et
répondre dans les délais légaux. Ne la renseigne que si c'est tenable.

---

### 4. Déclaration CNDP

**Où :** `src/config/brand.js` → `CNDP_DECLARED` (actuellement `false`)

**Avant :** la page Confidentialité affirmait « Ce traitement a fait l'objet
d'une déclaration auprès de la CNDP ».

**C'est le point le plus grave de cet audit.** Affirmer une déclaration non
déposée est une fausse déclaration sur une page légale publique. La phrase est
masquée tant que le drapeau est `false`.

**Pour rallumer :** déposer le dossier auprès de la CNDP (loi 09-08), obtenir le
récépissé, puis passer le drapeau à `true`.

---

## 🟠 Important — crédibilité commerciale

### 5. Ligne WhatsApp support

**Où :** `src/config/brand.js` → `SUPPORT_WHATSAPP`

Le numéro `+212 6 00 00 00 00` était codé en dur dans **sept endroits**, dont
deux servis au **client final du marchand** (page de remerciement après achat,
footer de vitrine).

**Pour rallumer :** `SUPPORT_WHATSAPP = '212XXXXXXXXX'` (international, sans `+`
ni espaces). Un seul endroit à modifier — les sept points d'entrée se rallument
ensemble, et un test de non-régression empêche tout retour d'un numéro fictif.

---

### 6. Réseaux sociaux

**Où :** `src/config/brand.js` → `SOCIALS` et `TWITTER_HANDLE`

Le footer de la landing affichait trois icônes (Facebook, Instagram, LinkedIn)
en `href="#"`, et la meta `twitter:site` pointait vers `@bayiin`.

**Après :** les icônes n'apparaissent que si une URL est renseignée. La balise
`twitter:site` est omise tant que `TWITTER_HANDLE` est `null`.

**À vérifier :** que le compte `@bayiin` existe et t'appartienne avant de le
déclarer.

Trois entrées de menu ont été **supprimées** faute de destination : « App
Livreurs », « Beya3 IA », « Nouveautés », « Blog E-commerce », « Tutoriels
vidéo », « API & Intégrations », « À propos ». Les recréer le jour où les pages
existent.

---

### 7. Témoignages clients

**Où :** `src/config/features.js` → `landingTestimonials` (`false`)

Trois témoignages **inventés** — « Karim M., Argan Beauty », « Yassine B.,
Sneakerz MA », « Salma R., Hijab Style » — avec des photos générées par
`i.pravatar.cc`.

**Pour rallumer :** remplacer le contenu de
`src/components/Landing/Testimonials.jsx` par de vrais clients ayant donné leur
**accord écrit**, avec de vraies photos hébergées localement, puis passer le
drapeau à `true`. Les faux avis clients sont un risque juridique autant qu'un
risque de crédibilité.

---

### 8. Chiffres de la landing

**Où :** `src/config/features.js` → `landingStats` (`false`)

Le bandeau annonçait **99 % d'uptime** et un support **24/7**. Aucun des deux
n'est adossé à quoi que ce soit : pas de status page, et le 24/7 contredisait
les horaires « Lundi – Samedi, 9h – 20h » que le produit annonce ailleurs.

**Pour rallumer :** soit une status page réelle et un support effectivement
24/7, soit des chiffres vérifiables (commandes traitées, boutiques actives).

Le délai de réponse annoncé est centralisé dans `brand.js → SUPPORT_SLA`
(« sous 24h ouvrées »). Le tenir ou l'ajuster.

---

## 🟡 Modules non livrés — décision produit

**Où :** `src/config/features.js`

Ces modules **ne sont plus rendus du tout** : ni carte grisée, ni overlay
« Bientôt Disponible ». Le code reste en place ; passer le drapeau à `true` les
remet en ligne.

| Drapeau | Module | Reste à faire |
|---|---|---|
| `youcanIntegration` | Intégration YouCan | Fin de revue côté YouCan |
| `shopifyIntegration` | Intégration Shopify | Valider l'UI ; `shopify_integration/config` n'a **aucune règle Firestore** — écriture refusée en l'état |
| `carrierCathedis` | Transporteur Cathedis | Tester l'API avec de vrais identifiants |
| `carrierAmana` / `carrierTawssil` | Amana, Tawssil | Aucune implémentation — cartes supprimées |
| `builderConversionKit` | Preuve sociale, FOMO | À implémenter |
| `builderLocalization` | RTL vitrine | À implémenter |
| `builderTrackingPixels` | Pixels Meta / TikTok / Snapchat | À implémenter |
| `postPurchaseUpsell` | Upsell post-achat | Nécessite un catalogue d'offres paramétrable |

### Sur l'upsell post-achat

La page de remerciement affichait **par défaut** un produit entièrement inventé
— « Sérum Anti-âge à l'Acide Hyaluronique », 99 MAD au lieu de 250, image
Unsplash, bandeau clignotant « Ne fermez pas cette page ! » — à **tous les
clients finaux de tous les marchands**, juste après un achat réel.

Ne rallumer qu'adossé à un vrai moteur d'offres.

### Non touché : le verrou du StoreBuilder

`HybridStoreBuilder.jsx` reste protégé par un code promo. Ce n'est pas un
overlay cosmétique mais un vrai contrôle d'accès protégeant un builder inachevé.
Le retirer revient à livrer le builder — décision produit, pas technique.

---

## ⚙️ Configuration serveur

### Alertes email de contact — désactivées

**Où :** `functions/.env` → `SUPPORT_INBOX_EMAIL` (non défini)

Le canal de contact fonctionne **sans email** : les demandes arrivent dans
`contact_requests` et remontent dans **Admin → 📬 Contacts**, avec un badge
temps réel (`onSnapshot`).

Le trigger `onContactRequestCreated` est déployable mais **inerte** : sans la
variable il retourne `disabled` et ne touche pas au document — pas de marqueur
d'erreur rouge, puisque rien n'est cassé.

**Pour rallumer :** une ligne, **sans redéploiement de code** :

```
SUPPORT_INBOX_EMAIL=<adresse réellement relevée>
```

Cette adresse est **privée** : jamais affichée dans l'application. Elle peut
donc être personnelle, indépendamment de `SUPPORT_EMAIL`.

### Domaine Resend

Les emails transactionnels partent de `alerts@bayiin.shop` et
`orders@bayiin.shop` (alertes stock, factures). L'envoi exige que le **domaine**
soit vérifié chez Resend — pas que les boîtes existent.

**À vérifier :** que `bayiin.shop` est bien vérifié (SPF + DKIM), sinon toutes
les notifications transactionnelles sont muettes. Et que les réponses adressées
à `orders@` aboutissent quelque part, sinon un client qui répond à sa facture
écrit dans le vide.

### Nettoyage `.env`

Ces deux variables ne servent plus — les credentials Shopify ont été retirées du
bundle client :

```
VITE_SHOPIFY_API_KEY        ← à supprimer
VITE_SHOPIFY_ACCESS_TOKEN   ← à supprimer
```

`LINEAR_API_KEY` est dans le même fichier. Sans préfixe `VITE_`, elle n'est pas
dans le bundle — pas de fuite. Mais un `.env` de front n'est pas sa place.

---

## 🔒 Sécurité — hors périmètre de cette branche

### `/qa` accessible à tout marchand connecté

**Où :** `src/App.jsx` → `<Route path="/qa" element={<QA />} />`

La route est dans le layout protégé mais **sans `FeatureProtectedRoute` ni
contrôle super admin**. N'importe quel client connecté peut ouvrir `/qa` et
injecter de faux clients dans **sa boutique de production** (« Yassir Chirawi »,
« Amine Bennani », « Sara El Fassi »), passer son store en plan PRO et écrire
des clés de livraison de test.

**À faire :** envelopper la route dans un garde super admin.

### `shopify_integration/config` sans règle Firestore

Aucun `match` ne couvre `stores/{storeId}/shopify_integration/**`. Les écritures
sont refusées par défaut. À traiter avec la livraison de l'intégration Shopify.

---

## 🔧 Dette technique identifiee — CI et qualite

### La CI ne verifiait plus rien (corrige)

`npm run lint` sortait en code 1 sur 219 erreurs, donc le job **CI Develop
s'arretait a l'etape ESLint** : les E2E, Snyk, SonarCloud et le deploiement
staging n'ont jamais tourne. C'est ce silence qui a laisse passer le fait que
les regles Firestore n'etaient plus deployees.

Deux defauts aggravants ont ete corriges au passage :

- l'etape de tests portait `continue-on-error: true` : elle etait purement
  decorative, les tests pouvaient echouer sans rien bloquer ;
- `npm run test:rules` n'etait cable dans aucun workflow, alors que la suite
  existait et couvre precisement les gardes de securite absentes de la
  production (35 tests, tous verts).

### Diagnostics du React Compiler a traiter

23 diagnostics sont retrogrades en `warn` dans `eslint.config.js`. Ce ne sont
pas des bugs averes : ils signalent des composants que le compilateur React ne
pourra pas memoiser. Les laisser bloquants revenait a n'avoir aucune CI, ce qui
est strictement pire — mais ils restent a traiter.

Repartition : 13 `set-state-in-effect`, 5 `purity`, 2 `immutability`, plus
`static-components`, `error-boundaries` et `preserve-manual-memoization`.
Les plus structurants sont dans `CartContext`, `PWAContext`, `useStoreStats` et
`Layout`.

`npx eslint . 2>&1 | grep react-hooks` donne la liste a jour.

---

## 🌐 Traductions — arabe inachevé, mais DORMANT

**639 des ~900 valeurs arabes** sont de l'anglais suffixé « (AR) » —
`btn_upgrade: "Upgrade (AR)"`, `btn_next: "Next (AR)"`… Le fichier l'annonce
lui-même : `// Generated Fallbacks`.

**Correction d'une affirmation antérieure de ce document :** l'arabe n'est PAS
proposé aux utilisateurs. Il n'existe que deux appels à `setLanguage` dans tout
`src/` — `['fr', 'en']` dans la Sidebar et, depuis cette passe, `['fr', 'en']`
sur la landing. `ar` est inatteignable autrement qu'en écrivant à la main dans
le `localStorage`.

Le RTL et les vérifications `language === 'ar'` existent bien dans le code, mais
aucun chemin d'interface n'y mène. C'est du travail préparatoire, pas un défaut
servi aux marchands.

**Conséquence : ce n'est pas un blocage de lancement.** Priorité basse, à
traiter le jour où l'arabe sera réellement ouvert. Le faire traduire par un
locuteur natif (darija commerciale) reste la seule voie — les 639 chaînes ne
peuvent pas être inventées sans relecture native.

Il manque aussi **34 clés en anglais** et 10 en arabe par rapport au français,
qui sert de référence. L'anglais retombe sur le français, donc l'interface EN
affiche du français par endroits.

`tests/unit/i18nCompleteness.test.js` verrouille l'état actuel — les seuils sont
des garde-fous de non-régression, à faire baisser au fil des traductions.

### Sept arbitrages de traduction en attente

La déduplication des clés a révélé des chaînes qui en écrasaient d'autres. Deux
étaient des régressions et ont été corrigées (`ar.actions` affichait « Actions »
au lieu de « العمليات » ; `fr.btn_generate_variants` affichait « Gérer Variantes »
alors que le bouton génère). Les sept autres sont défendables dans les deux sens,
la valeur active est conservée :

| Clé | Valeur inactive supprimée | Valeur active conservée |
|---|---|---|
| `btn_finish_setup` | Terminer | Terminer la Configuration |
| `title_inventory` | Gestion du Stock | Inventaire |
| `btn_simple_product` | Simple | Produit Simple |
| `btn_variable_product` | Variable | Produit avec Variantes |
| `btn_bundle_product` | Pack (Bundle) | Pack / Bundle |
| `label_sizes_optional` | Tailles (Optionnel) | Tailles (Optionnel, Affichage seul) |
| `placeholder_sizes` | S, M, L, XL | S, M, L... |

---

## 🧱 Bloc StoreBuilder non rendu

`SectionBlocksManager` propose `addBlock('FeatureCard')`, mais `HeroBlocks.jsx`
n'a pas de `case 'FeatureCard'` : le bloc est ajoutable dans l'editeur et
n'apparait jamais sur la vitrine.

Le meme defaut existait pour le bloc `HTML` — son code de rendu etait present
mais l'etiquette `case` manquait, il a suffi de la restaurer. `FeatureCard` n'a
en revanche aucun code de rendu : `getDefaultSettingsForType` lui donne
`{ title, text, icon }`, il reste a ecrire le composant.

---

## ⚠️ Non-régression : deux assertions restantes

`npm run test:regression` est la porte de `ci-master` vers la production. Elle
était structurellement cassée et ne pouvait pas passer (BAY-140) : pas
d'émulateur démarré, identifiants en dur, session Firebase détruite à chaque
navigation. Ces quatre défauts sont corrigés.

**Le parcours complet passe désormais sur Chromium** : inscription, onboarding,
création de produit, création de commande, vérification du KPI Finances.

Deux assertions restent à traiter avant de pouvoir merger vers `main` :

1. **Liste déroulante des produits du modal de commande**
   `[data-testid="product-select"] option` n'a toujours qu'une option après
   15 s. Le produit vient d'être créé sur la page Produits, mais la liste
   reçue par OrderModal n'est pas encore rafraîchie. À confirmer : attendre le
   produit par son nom dans la liste plutôt qu'un délai fixe.

2. **Inscription > 30 s sous WebKit, dans cette suite uniquement**
   Les 34 specs E2E utilisent le même helper `signupAndOnboard` et passent en
   ~10 s. La différence tient donc au `beforeEach` propre à cette suite
   (injection CSS, hook console, simulation biométrique) — piste à instrumenter.

Tant que ces deux points ne sont pas résolus, un merge `develop → main`
échouera à l'étape de non-régression, AVANT tout déploiement. La production
n'est donc pas exposée — mais rien ne part non plus.

---

## ✅ Garde-fous en place

`tests/unit/contactChannel.test.js` balaie tout `src/` et **échoue en nommant
`fichier:ligne`** si l'un de ces défauts réapparaît :

- un numéro de support fictif codé en dur
- un lien `wa.me` en dur hors de `config/brand.js`
- une adresse `@bayiin.shop` en dur hors config et pages légales
- une variable `VITE_*` de type `SECRET` / `TOKEN` / `PASSWORD` lue côté client
- une credential Shopify en dur
- un module du registre activé sans implémentation livrée

Il vérifie aussi qu'**au moins un canal de contact reste joignable** en
permanence, quels que soient les drapeaux.

Les placeholders d'input (`placeholder="+212 6 00 00 00 00"`) et les repères
visibles uniquement dans l'éditeur du StoreBuilder sont exclus : ce sont des
aides à la saisie, pas des informations servies.

`tests/unit/i18nCompleteness.test.js` verrouille de son côté l'absence de clés
dupliquées et la complétude des traductions.

`scripts/verify-firestore-rules.mjs` sort en code 1 si la production dérive du
dépôt. Il est branché dans `ci-develop` (informatif) et `ci-master` (bloquant,
après un déploiement automatique des règles qui n'existait pas auparavant).

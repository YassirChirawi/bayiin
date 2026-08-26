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

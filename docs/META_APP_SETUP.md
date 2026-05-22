# Configuration de l'Application Meta (Embedded Signup / BYON)

Cette documentation décrit les étapes **obligatoires** pour que les marchands BayIIn puissent connecter leur propre numéro WhatsApp Business à la plateforme (modèle Bring Your Own Number).

L'intégration utilise le flux **Meta Embedded Signup** (Facebook Login for Business).

---

## 1. Création de l'App Meta

1. Va sur [Meta for Developers](https://developers.facebook.com/).
2. Créé une nouvelle application de type **Business** (Entreprise).
3. Lie cette application à ton compte Facebook Business Manager (BayIIn).

## 2. Configuration des Produits

### A. Facebook Login for Business
1. Ajoute le produit **"Facebook Login for Business"**.
2. Dans ses paramètres (Settings), ajoute les domaines autorisés pour les redirections OAuth :
   - `https://app.bayiin.shop` (ou ton domaine de production)
   - `http://localhost:5173` (pour le développement local)

### B. WhatsApp
1. Ajoute le produit **"WhatsApp"**.
2. Dans **Configuration de l'API**, configure le Webhook central :
   - **Callback URL** : L'URL de ta fonction `whatsappWebhook` déployée (ex: `https://us-central1-bayiin.cloudfunctions.net/whatsappWebhook`).
   - **Verify Token** : Un mot de passe secret de ton choix (à mettre dans `WHATSAPP_VERIFY_TOKEN`).
   - **Champs d'abonnement** : Coche impérativement `messages`.

## 3. Configuration de l'Embedded Signup

Dans le tableau de bord de ton app Meta, cherche la section "WhatsApp" > "Embedded Signup".
1. Crée un **Configuration ID** (Config ID).
2. Ce Config ID te permet de définir ce que l'utilisateur verra dans la popup Facebook (Nom de ton app, permissions demandées, etc.).
3. Récupère ce Config ID.

## 4. Permissions et "App Review" (CRITIQUE ⚠️)

Pour que **n'importe quel marchand** puisse lier son compte (et pas seulement toi), ton application DOIT passer une validation (App Review) par Meta.

Tu dois demander et faire approuver les permissions suivantes :
1. `whatsapp_business_management` : Obligatoire pour récupérer le WABA ID et lier le compte.
2. `whatsapp_business_messaging` : Obligatoire pour envoyer/recevoir des messages.

> **Note pendant le développement :** Tant que ton app n'est pas "Live" (approuvée), le bouton "Connecter avec Facebook" ne fonctionnera que pour les comptes Facebook que tu as ajoutés manuellement comme "Testeurs" ou "Développeurs" dans les paramètres de ton App Meta.

## 5. Variables d'Environnement (.env)

Mets à jour tes fichiers d'environnement.

### Frontend (`.env`)
```env
VITE_FACEBOOK_APP_ID=1234567890123456
VITE_FACEBOOK_CONFIG_ID=config_id_recupere_etape_3
VITE_API_URL=https://us-central1-bayiin.cloudfunctions.net
```

### Backend (Firebase Secret Manager ou `.env`)
```env
FACEBOOK_APP_ID=1234567890123456
FACEBOOK_APP_SECRET=ton_app_secret_depuis_meta
WHATSAPP_VERIFY_TOKEN=ton_verify_token_webhook
GROQ_API_KEY=ta_cle_api_groq
```

*Note : `WHATSAPP_TOKEN` et `WHATSAPP_PHONE_ID` ne sont plus nécessaires en variables globales, car ils sont désormais récupérés dynamiquement depuis le document `store` du marchand.*

## 6. Approbation des Templates de Messages

Comme chaque marchand utilise son propre numéro, il doit techniquement faire approuver les templates (`order_confirmation_fr`, `order_shipped_fr`) sur son propre Business Manager. 

**Solution SaaS (via Meta API) :**
Lorsque tu récupères l'accès via l'Embedded Signup, BayIIn (Backend) a les droits pour créer automatiquement ces templates dans le compte du client via l'API Meta :
`POST /v21.0/{waba_id}/message_templates`

*Ceci peut être ajouté ultérieurement dans la fonction `connectWhatsApp` pour un onboarding 100% transparent.*

# WhatsApp Cloud API — Guide de Configuration BayIIn

Ce guide détaille la configuration complète de l'intégration WhatsApp Cloud API (Meta) pour BayIIn.

## Prérequis

- Un compte Facebook personnel
- Un numéro de téléphone dédié pour le Business WhatsApp (pas déjà lié à un compte WhatsApp personnel)
- Accès à [Meta for Developers](https://developers.facebook.com)

---

## Étape 1 — Créer un compte Meta for Developers

1. Rendez-vous sur [developers.facebook.com](https://developers.facebook.com)
2. Connectez-vous avec votre compte Facebook
3. Acceptez les conditions développeur si c'est votre première connexion

## Étape 2 — Créer une App Meta

1. Cliquez sur **"Créer une application"** (Create App)
2. Type d'application : **Business**
3. Renseignez :
   - Nom de l'app : `BayIIn WhatsApp`
   - Email de contact : votre email professionnel
   - Business Account : créez-en un ou sélectionnez un existant

## Étape 3 — Ajouter le produit WhatsApp

1. Dans le Dashboard de l'app, section **"Ajouter des produits"**
2. Trouvez **WhatsApp** et cliquez **"Configurer"**
3. Suivez l'assistant de configuration

## Étape 4 — Récupérer les identifiants API

Dans **WhatsApp > API Setup**, récupérez :

| Identifiant | Description | Où le trouver |
|-------------|-------------|---------------|
| **Phone Number ID** | L'ID interne Meta de votre numéro (pas le numéro lui-même) | WhatsApp > API Setup > Phone Number ID |
| **WhatsApp Business Account ID** | L'ID de votre compte business | WhatsApp > API Setup > WABA ID |
| **Access Token** | Token temporaire (puis permanent) | WhatsApp > API Setup > Temporary token |

> ⚠️ **Le token temporaire expire après 24h.** Vous devez générer un token système permanent :
> 1. Allez dans **Paramètres du Business** > **Utilisateurs système**
> 2. Créez un utilisateur système (type Admin)
> 3. Générez un token avec les permissions : `whatsapp_business_messaging`, `whatsapp_business_management`
> 4. Ce token ne expire pas

## Étape 5 — Configurer le Webhook

1. Dans **WhatsApp > Configuration** (ou **Webhooks**)
2. **Callback URL** :
   ```
   https://us-central1-bayiin.cloudfunctions.net/whatsappWebhook
   ```
3. **Verify Token** : Une chaîne secrète que vous choisissez (ex: `bayiin_whatsapp_verify_2024`)
4. Cliquez **"Vérifier et enregistrer"**

### Événements à souscrire

Cochez les événements suivants :
- ✅ `messages` — Messages entrants des clients
- ✅ `message_deliveries` — Confirmations de livraison
- ✅ `message_reads` — Confirmations de lecture

## Étape 6 — Stocker les secrets dans Firebase

Exécutez ces commandes dans votre terminal :

```bash
# Token permanent WhatsApp API
firebase functions:secrets:set WHATSAPP_TOKEN

# Phone Number ID (pas le numéro, l'ID Meta)
firebase functions:secrets:set WHATSAPP_PHONE_ID

# Verify Token (la chaîne secrète choisie à l'étape 5)
firebase functions:secrets:set WHATSAPP_VERIFY_TOKEN
```

> 💡 Chaque commande vous demandera de saisir la valeur du secret de manière interactive.

## Étape 7 — Configurer le Store dans Firestore

Dans le document `stores/{storeId}`, ajoutez les champs suivants :

```json
{
  "whatsappPhoneNumberId": "VOTRE_PHONE_NUMBER_ID",
  "whatsappNumber": "212XXXXXXXXX",
  "whatsappEnabled": true
}
```

Ceci permet au webhook de retrouver la boutique associée à un numéro WhatsApp.

## Étape 8 — Déployer les Cloud Functions

```bash
firebase deploy --only functions:whatsappWebhook,functions:sendOrderConfirmationRequest,functions:sendShippingNotification
```

## Étape 9 — Tester

1. Envoyez un message depuis votre téléphone au numéro WhatsApp Business
2. Vérifiez les logs : `firebase functions:log --only whatsappWebhook`
3. Vérifiez la collection Firestore `stores/{storeId}/whatsapp_conversations/`

---

## Architecture

```
Client WhatsApp
      ↓ message
Meta Cloud API
      ↓ webhook POST
whatsappWebhook (Cloud Function)
      ↓ parse + route
handleIncomingMessage
      ↓ state machine
handleConversationState
  ├── Confirmation → updateOrder + reply
  ├── Refus → cancel + reply
  ├── Report → reschedule + notify merchant
  ├── Question → Beya3 AI (Groq)
  └── Humain → handoff + notify merchant
```

## Limites de l'API WhatsApp

| Limite | Détail |
|--------|--------|
| **Fenêtre 24h** | Réponses en texte libre uniquement dans les 24h suivant le dernier message du client |
| **Templates** | Hors fenêtre 24h, seuls les templates approuvés peuvent être envoyés |
| **Opt-in** | Les templates UTILITY ne nécessitent pas d'opt-in explicite |
| **Rate Limits** | Tier 1 : 1 000 messages/jour → augmente avec le temps |
| **Media** | Le bot ne traite que le texte. Images/audio → message d'information |

## Dépannage

| Problème | Solution |
|----------|----------|
| Webhook ne se vérifie pas | Vérifiez que le WHATSAPP_VERIFY_TOKEN correspond exactement |
| Messages non reçus | Vérifiez la souscription aux événements `messages` dans Meta |
| Erreur 401 | Token expiré → régénérez un token permanent |
| Template rejeté | Vérifiez les guidelines Meta pour les templates UTILITY |

# Configuration de l'Application Publique YouCan

Pour publier l'intégration **BayIIn WhatsApp Bot** sur le *YouCan App Store*, vous devez configurer l'application dans votre tableau de bord **YouCan Partners**.

## 1. Création de l'application
1. Connectez-vous sur [YouCan Partners](https://partners.youcan.shop).
2. Créez une nouvelle application.
3. Donnez un nom (ex: "BayIIn WhatsApp Bot") et une description de l'app.

## 2. Configuration OAuth et URLs
L'application BayIIn est une **Embedded App** qui utilise le SDK Qantra.

- **App URL** : `https://app.bayiin.shop/auth/youcan`
  *C'est l'URL d'entrée de l'application. YouCan chargera cette page dans un Iframe avec des paramètres de session.*
- Vous n'avez plus besoin de configurer les URLs de redirection de Cloud Functions (`youcanAppInstall`, `youcanCallback`) car le flux est maintenant natif et se fait directement via le frontend.

## 3. Scopes Requis (Permissions)
Lors de la configuration OAuth, l'application demandera un accès global par défaut (`*` dans le code actuel), mais il est recommandé de spécifier les scopes exacts dans l'interface YouCan :
- `read_orders` : Pour synchroniser et écouter les nouvelles commandes.
- `write_orders` : Si l'on souhaite ajouter des tags ou notes.
- `read_store_info` : Pour obtenir le nom, l'email et l'URL du store.

## 4. Webhooks (Optionnel depuis l'interface)
L'application BayIIn enregistre automatiquement le webhook `order.create` via l'API. Cependant, si vous devez le configurer manuellement, l'URL est :
`https://us-central1-<VOTRE_PROJECT_ID>.cloudfunctions.net/youcanWebhook`

## 5. Facturation (Billing API)
La monétisation est gérée via le système YouCan App Billing.
Pour l'instant, BayIIn configure automatiquement le compte avec le statut `subscriptionStatus: 'active'`. L'intégration précise des endpoints de Billing (Application Charges) est prévue dans `functions/youcanBilling.js` dès la documentation officielle disponible.

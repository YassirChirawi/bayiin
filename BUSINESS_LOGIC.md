# BayIIn — Documentation des Circuits Logiques & Fonctionnalités

Ce document détaille le fonctionnement interne de la plateforme BayIIn, ses automatisations et la logique métier appliquée aux données.

---

## 1. Cycle de Vie des Commandes (Order Lifecycle)

La gestion des commandes suit un flux d'états précis qui déclenche des actions sur le stock et les finances.

### États de Commande (Statuses)
- **Reçu (`reçu`)** : État initial. Le stock est déduit dès la création.
- **Confirmé (`confirmation`)** : Le marchand a validé la commande par téléphone.
- **Packing (`packing`)** : En cours de préparation au warehouse.
- **En Livraison (`livraison`)** : Le colis est chez le transporteur (O-Livraison, Sendit ou livreur interne).
- **Livré (`livré`)** : Le client a reçu le colis.
- **Annulé (`annulé`) / Retour (`retour`)** : Déclenche automatiquement le **réapprovisionnement (restock)** du produit.

### Logique de Stock
- **Déduction** : Se fait à la création de la commande ou lors du passage d'un état "Inactif" (Annulé) à "Actif".
- **Restockage** : Se fait automatiquement si la commande passe à `Annulé`, `Retour` ou `Pas de réponse`.
- **Bundles** : Si un produit est un "Bundle", la logique déduit/restocke chaque composant individuellement.
- **Transferts Inter-Warehouse** : Si une commande change de warehouse, le système restocke automatiquement l'ancien warehouse et déduit du nouveau pour maintenir une intégrité totale du stock physique.


---

## 2. Moteur Financier (Financial Engine)

### Calcul du Profit
Le profit par commande est calculé comme suit :
`Profit = (Prix de Vente * Quantité) - (Coût d'Achat * Quantité) - Frais de Livraison Réels`

### Réconciliation des Stats
La plateforme maintient un document `stats/sales` par boutique qui agrège :
- **Revenue Réalisé** : Somme des commandes marquées `isPaid: true`.
- **Revenue Livré** : Somme des commandes au statut `Livré`.
- **COGS (Cost of Goods Sold)** : Somme des coûts d'achat des produits vendus.
- **Dépenses** : Somme des dépenses enregistrées manuellement (Ads, loyer, etc.).
- **Remboursements (Refunds)** : Déduits du profit net pour refléter la rentabilité réelle.
- **Profit Net Réel** : `(CA - COGS - Livraison - Dépenses - Remboursements)`.


---

## 3. Intelligence Artificielle (Beya3 Copilot)

Beya3 est un moteur heuristique local (sans API externe pour la logique métier) qui analyse le `businessContext`.

### Capacités
- **Brief Quotidien** : Génère un résumé des alertes (ruptures, retours élevés, commandes en attente > 24h) à l'ouverture du chat.
- **Rapports Hebdo** : Calcule les tendances de vente semaine N vs N-1.
- **Conseils Experts** : Base de connaissance intégrée sur le marketing (ROAS), la logistique (taux de retour) et le CRO spécifique au Maroc.
- **Action Triggering** : Capable de détecter l'intention de créer une dépense, d'expédier un colis ou d'envoyer un message WhatsApp.

---

## 4. Logistique & Expédition

### Intégrations API
- **O-Livraison** : Authentification par clé API/Secret. Création automatique de colis et récupération du tracking ID.
- **Sendit** : Intégration native. La plateforme capture automatiquement le `trackingId` et le lien de suivi lors de la création automatisée via le moteur d'automatisation.
- **WhatsApp** : Génération de liens `wa.me` avec templates dynamiques (Confirmation, Suivi, Relance).


---

## 5. CRM & Fidélisation

### Fiche Client
Chaque commande est rattachée à un client (via son numéro de téléphone). La plateforme calcule :
- **Total Spent** : Valeur à vie du client (LTV).
- **Order Count** : Nombre de commandes passées.
- **Statut de Fidélité** : Mis à jour à chaque transaction réussie.

---

## 6. Sécurité & Rôles (RBAC)

La plateforme utilise des **Firebase Security Rules** granulaires :
- **Propriétaire (Owner)** : Accès total à sa boutique.
- **Staff** : Accès limité aux commandes et au stock (ne voit pas forcément les stats de profit global).
- **Super Admin** : Accès multi-tenant pour la maintenance système.

---

## 7. Automatisation (Événements)

Le système écoute des événements clés :
- `order_created` -> Déclenche les notifications PWA et les webhooks potentiels.
- `low_stock` -> Alerte le marchand via le Copilot.
- `payment_remitted` -> Met à jour la trésorerie réelle dans les stats financières.

---

## 8. Mode SaaS & Abonnements

### État de l'Abonnement
- **Actif** : Accès complet.
- **Expiré** : La plateforme passe en **Lecture Seule**. Un bandeau de blocage apparaît, et les actions de modification (création commande, modification produit) sont désactivées côté client.
- **Grace Period** : 7 jours de tolérance avant le passage en lecture seule après un défaut de paiement Stripe.


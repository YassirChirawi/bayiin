# Schéma Firestore BayIIn

Toutes les collections sont scopées par `storeId`. Aucun accès cross-store n'est permis par les Firestore Rules.

## 1. Collection : `stores/{storeId}`
| Champ | Type | Description |
|---|---|---|
| name | string | Nom de la boutique |
| plan | string | 'free' | 'pro' |
| subscriptionStatus | string | 'active' | 'past_due' | 'canceled' |
| currentPeriodEnd | timestamp | Date d'expiration Stripe |
| whatsappNumber | string | Numéro WhatsApp (format international) |
| currency | string | 'MAD' par défaut |
| createdAt | timestamp | Date de création |

## 2. Collection : `stores/{storeId}/orders/{orderId}`
| Champ | Type | Description |
|---|---|---|
| orderNumber | number | Numérotation séquentielle (#1001++) |
| status | string | reçu | confirmation | packing | livraison | livré | annulé | retour | pas de réponse |
| articleName | string | Nom du produit commandé |
| productId | string | Référence vers products/{productId} |
| clientName | string | Nom du client |
| phone | string | Téléphone client (06XXXXXXXX) |
| price | number | Prix de vente en MAD |
| quantity | number | Quantité commandée |
| costPrice | number | Coût d'achat unitaire |
| profit | number | Profit calculé automatiquement |
| shippingCost | number | Frais de livraison réels |
| isPaid | boolean | Paiement COD reçu par l'owner |
| trackingId | string | ID de suivi transporteur |
| carrier | string | 'sendit' | 'olivraison' | 'internal' |
| assignedDriver | string | UID du livreur assigné |
| date | string | Date ISO (YYYY-MM-DD) |
| storeId | string | Référence boutique |
| createdAt | timestamp | Timestamp Firestore |

## 3. Collection : `stores/{storeId}/products/{productId}`
| Champ | Type | Description |
|---|---|---|
| name | string | Nom du produit |
| price | number | Prix de vente en MAD |
| costPrice | number | Coût d'achat en MAD |
| stock | number | Stock disponible |
| lowStockThreshold | number | Seuil d'alerte stock faible |
| isBundle | boolean | True si pack composé |
| components | array | Liste des composants si bundle [{productId, quantity}] |
| isDeleted | boolean | Soft delete |

## 4. Autres collections
| Collection | Description | Champs clés |
|---|---|---|
| customers/{id} | Fiche client CRM | phone, totalSpent, orderCount, lastOrderDate |
| expenses/{id} | Dépenses (pub, emballage...) | label, amount, category, date, storeId |
| refunds/{id} | Remboursements | orderId, amount, reason, date |
| audit_logs/{id} | Journal des modifications | action, from, to, orderId, userId, userEmail, timestamp |
| members/{uid} | Membres de la boutique | role (owner|staff|driver), email, storeId |
| stats/sales | Agrégats financiers | totalRevenue, totalProfit, totalOrders, totalReturns |

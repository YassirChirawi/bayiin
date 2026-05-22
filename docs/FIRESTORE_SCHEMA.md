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

## 5. Collection : `stores/{storeId}/whatsapp_conversations/{phone}`

Conversations WhatsApp actives gérées par Beya3 (bot IA).

| Champ | Type | Description |
|---|---|---|
| phone | string | Numéro client international (212XXXXXXXXX) |
| orderId | string | ID de la commande associée |
| orderNumber | string | Numéro de commande (#1042) |
| state | string | `awaiting_confirmation` \| `confirmed` \| `refused` \| `rescheduled` \| `question` \| `closed` |
| attempts | number | Nb de tentatives de confirmation (max 3) |
| lastMessageAt | timestamp | Dernier message reçu |
| lastBotMessageAt | timestamp | Dernier message envoyé par Beya3 |
| language | string | `fr` \| `darija` \| `ar` |
| handoffRequested | boolean | Client a demandé à parler à un humain |
| handoffAt | timestamp | Date du transfert humain |
| messages | array | Historique [{role, content, timestamp}] |
| createdAt | timestamp | Date de création |

## 6. Collection : `stores/{storeId}/whatsapp_templates/{templateName}`

Registre des templates Meta approuvés pour cette boutique.

| Champ | Type | Description |
|---|---|---|
| name | string | Nom du template Meta approuvé |
| language | string | `fr` \| `ar` |
| variables | array | Noms des variables (`['{{1}}', '{{2}}']`) |
| purpose | string | `confirmation` \| `shipping` \| `delivery` \| `return` |
| isApproved | boolean | Template approuvé par Meta |
| metaTemplateId | string | ID Meta du template |

## 7. Collection : `stores/{storeId}/whatsapp_logs/{logId}`

Journal de tous les messages WhatsApp (entrants et sortants).

| Champ | Type | Description |
|---|---|---|
| direction | string | `inbound` \| `outbound` |
| phone | string | Numéro client |
| messageId | string | ID Meta du message |
| content | string | Contenu du message |
| status | string | `sent` \| `delivered` \| `read` \| `failed` |
| orderId | string | Commande associée |
| timestamp | timestamp | Horodatage |

## 8. Collection : `stores/{storeId}/youcan_integration/config`

Configuration OAuth de l'intégration YouCan (unique document "config").

| Champ | Type | Description |
|---|---|---|
| accessToken | string | Token OAuth YouCan |
| refreshToken | string | Token de rafraîchissement |
| expiresAt | timestamp | Date d'expiration du token |
| youcanStoreId | string | ID boutique sur YouCan |
| connectedAt | timestamp | Date de première connexion |
| isActive | boolean | Intégration active/inactive |
| webhookSubscriptions | object | Map des IDs webhooks YouCan (orderCreate, inventoryLow, upsellAccept) |

## 9. Collection : `stores/{storeId}/youcan_orders/{youcanOrderId}`

Mapping pour prévenir les doublons lors des synchronisations YouCan.

| Champ | Type | Description |
|---|---|---|
| youcanOrderId | string | ID de commande YouCan |
| bayiinOrderId | string | ID de la commande générée côté BayIIn |
| syncedAt | timestamp | Date de synchro |
| syncStatus | string | `synced` \| `pending` \| `error` |
| rawPayload | object | Payload brut de YouCan (historique) |

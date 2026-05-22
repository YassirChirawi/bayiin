# WhatsApp Message Templates — BayIIn / Beya3

Ces templates doivent être créés et soumis pour approbation dans **Meta Business Manager** avant utilisation.

> ⚠️ L'approbation prend généralement **24 à 72 heures**.

---

## Comment soumettre un template

1. Allez dans [Meta Business Manager](https://business.facebook.com)
2. Naviguez vers **WhatsApp Manager > Message Templates**
3. Cliquez **"Créer un template"**
4. Remplissez les informations ci-dessous pour chaque template
5. Soumettez et attendez l'approbation

---

## Template 1 : `order_confirmation_fr`

| Champ | Valeur |
|-------|--------|
| **Nom** | `order_confirmation_fr` |
| **Catégorie** | UTILITY |
| **Langue** | Français (`fr`) |
| **Variables** | `{{1}}` = Nom client, `{{2}}` = N° commande, `{{3}}` = Nom produit, `{{4}}` = Prix |

**Corps du message :**
```
Salam {{1}} 👋

Votre commande *#{{2}}* a bien été reçue !

📦 *{{3}}*
💰 *{{4}} DH* — Paiement à la livraison

Pour *confirmer* votre livraison, répondez simplement *OUI*.
Pour *annuler*, répondez *NON*.

Beya3 🤖 — BayIIn
```

---

## Template 2 : `order_confirmation_darija`

| Champ | Valeur |
|-------|--------|
| **Nom** | `order_confirmation_darija` |
| **Catégorie** | UTILITY |
| **Langue** | Arabe (`ar`) |
| **Variables** | `{{1}}` = Nom client, `{{2}}` = N° commande, `{{3}}` = Nom produit, `{{4}}` = Prix |

**Corps du message :**
```
سلام {{1}} 👋

طلبيتك *#{{2}}* وصلت عندنا !

📦 *{{3}}*
💰 *{{4}} درهم* — الأداء عند التسليم

باش *تأكدي* التوصيل، جاوب *واخا*.
باش *تلغي*، جاوب *لا*.

بياع 🤖 — بايعين
```

---

## Template 3 : `order_shipped_fr`

| Champ | Valeur |
|-------|--------|
| **Nom** | `order_shipped_fr` |
| **Catégorie** | UTILITY |
| **Langue** | Français (`fr`) |
| **Variables** | `{{1}}` = Nom client, `{{2}}` = N° commande, `{{3}}` = N° suivi, `{{4}}` = Transporteur |

**Corps du message :**
```
Salam {{1}} 👋

Bonne nouvelle ! Votre commande *#{{2}}* est en route 🚚

📍 Transporteur : *{{4}}*
🔍 Numéro de suivi : *{{3}}*

Vous serez livré(e) dans les prochaines 24-48h.
Pour toute question, répondez à ce message.

Beya3 🤖 — BayIIn
```

---

## Template 4 : `order_delivered_fr`

| Champ | Valeur |
|-------|--------|
| **Nom** | `order_delivered_fr` |
| **Catégorie** | UTILITY |
| **Langue** | Français (`fr`) |
| **Variables** | `{{1}}` = Nom client, `{{2}}` = N° commande |

**Corps du message :**
```
Salam {{1}} 👋

Votre commande *#{{2}}* a été livrée ! ✅

Nous espérons que vous êtes satisfait(e).
N'hésitez pas à nous donner votre avis 🌟

Merci pour votre confiance !
Beya3 🤖 — BayIIn
```

---

## Bonnes pratiques Meta pour les templates

1. **Pas de contenu promotionnel** dans les templates UTILITY
2. **Variables dynamiques** doivent être pertinentes et non-promotionnelles
3. **Évitez les majuscules excessives** et les points d'exclamation multiples
4. **Le nom du template** doit être en minuscules avec underscores
5. **Testez avec le numéro de test** Meta avant d'utiliser le numéro de production

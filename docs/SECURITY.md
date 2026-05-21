# Sécurité & RBAC BayIIn

## 1. Rôles (RBAC)
| Rôle | Accès |
|---|---|
| **Owner** | Accès total à sa boutique (storeId). |
| **Staff** | Commandes, Produits, Clients. Pas de finances ni settings. |
| **Driver** | Uniquement les commandes qui lui sont assignées. |

## 2. Règles Firestore
Toute la sécurité repose sur les `firestore.rules`.
- Accès restreint par `request.auth.uid`.
- Vérification du rôle via le document `members/{uid}`.
- Validation des schémas de données à l'écriture.

## 3. Gestion des Secrets
- **Firebase Secrets Manager** : Utilisé pour les clés privées (Groq, Stripe).
- **GitHub Secrets** : Utilisé pour la CI/CD (`FIREBASE_TOKEN`, `SNYK_TOKEN`).
- **Vite Env Vars** : Uniquement pour les clés publiques (`VITE_FIREBASE_*`).

## 4. Journal d'Audit
Toute modification critique (statut commande, stock, prix) génère une entrée dans `audit_logs`.
- `userId`, `userEmail`, `action`, `timestamp`.

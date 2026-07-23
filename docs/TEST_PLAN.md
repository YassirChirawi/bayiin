# BayIIn — Plan de tests exhaustif

Référentiel QA couvrant l'ensemble de l'application (OMS, WMS, CRM, finances, COD, IA Beya3, intégrations, plateforme).

**Légende**
- Type : `U` unitaire (Vitest) · `E2E` Playwright · `M` manuel · `SEC` sécurité (règles Firestore / auth) · `INT` intégration
- Priorité : `P0` bloquant (argent, stock, sécurité) · `P1` important · `P2` confort

**Couverture automatisée actuelle** : 257 tests unitaires (`npm run test`) · **27 tests émulateur** (`npm run test:emulator` — 19 règles de sécurité + 8 intégration stock) · **E2E 17/17 verts** (`npm run test:e2e` — sur émulateurs auth+firestore, `workers:1`, helper d'auth partagé `tests/e2e/_auth.js`, ~2.4 min, zéro écriture prod).
**Modules sans E2E (à ajouter)** : Returns, Purchases, Drivers, Planning, FranchiseDashboard, PublicCatalog, Beya3.

> ⚠️ En local, l'app pointe sur **Firebase PROD**. Utiliser une **boutique de test** dédiée pour tout test manuel qui écrit des données.

---

## 0. Tests de non-régression critiques

Bugs corrigés lors de l'audit — **ne doivent jamais réapparaître**.

| # | Test | Type | Prio |
|---|---|---|---|
| 0.1 | Créer/modifier/supprimer une commande avec articles → le **stock est ajusté** et `stores/{id}/stats/sales` mis à jour (le trigger ne throw plus) | INT | P0 |
| 0.2 | Marquer une commande « encaissée » depuis la réconciliation COD → le doc **`orders/{id}`** est bien mis à jour (pas de sous-collection fantôme) | E2E | P0 |
| 0.3 | Sync hors-ligne : commande créée offline puis synchronisée → elle **apparaît** dans la liste (pas perdue) | M | P0 |
| 0.4 | Cathedis : commande `quantity=3` → le payload transporteur porte `amount = prix × 3` | U | P0 |
| 0.5 | Export comptable : TVA **extraite** du TTC (≈16,67%), `Total TTC` = somme des ventes, cohérent avec le KPI TVA de la page | U + M | P0 |
| 0.6 | Réconciliation avec écart de prix → `amountPaid` = montant réellement encaissé (pas la valeur pleine) | U | P0 |
| 0.7 | « Sync Stats » ne gonfle plus `totalSpent` (seules les commandes **livrées** comptent) | INT | P0 |
| 0.8 | Commande catalogue → `price × quantity` **non doublé** dans finances/exports | U + E2E | P0 |
| 0.9 | Un utilisateur ne peut PAS créer `users/{uid}` avec le `storeId` d'autrui ni `role` privilégié | SEC | P0 |
| 0.10 | Un utilisateur ne peut PAS créer un `store` avec `plan:'pro'`/`subscriptionStatus:'active'` | SEC | P0 |
| 0.11 | `connectWhatsApp` / `createYouCanSubscription` sans token → **401/403** | SEC | P0 |
| 0.12 | Webhook WhatsApp sans signature `X-Hub-Signature-256` valide → **rejeté** | SEC | P0 |
| 0.13 | `executeDraft` avec des `orderIds` d'une autre boutique → **aucune** modification cross-tenant | SEC | P0 |
| 0.14 | `functions/index.js` parse (pas de déclaration dupliquée) → `node --check` OK, deploy possible | U | P0 |

---

## 1. Authentification & onboarding

| # | Test | Type | Prio |
|---|---|---|---|
| 1.1 | Inscription email/mot de passe → compte créé, redirection onboarding | E2E | P0 |
| 1.2 | Onboarding : nom boutique + devise → `store` créé avec `ownerId = uid`, `plan='free'` | E2E | P0 |
| 1.3 | Connexion / déconnexion / session persistante après refresh | E2E | P0 |
| 1.4 | Mot de passe oublié → email de réinitialisation | M | P1 |
| 1.5 | Utilisateur connecté sur `/` → redirigé vers `/dashboard` | E2E | P1 |
| 1.6 | Route protégée sans auth → redirection `/login` | E2E | P0 |
| 1.7 | Verrou biométrique : activation, déverrouillage, fallback si non supporté | M | P1 |
| 1.8 | Multi-boutiques : switch de boutique → **toutes** les données changent de contexte | E2E | P0 |

## 2. Sécurité & multi-tenant (SEC)

| # | Test | Type | Prio |
|---|---|---|---|
| 2.1 | Lecture/écriture `orders`, `products`, `customers`, `expenses` d'une **autre** boutique → refusée | SEC | P0 |
| 2.2 | Modification de son propre `role` / `storeId` après création → refusée | SEC | P0 |
| 2.3 | Modification de `plan`/`subscriptionStatus`/`stripeCustomerId` sur son store → refusée | SEC | P0 |
| 2.4 | Changement de `storeId` sur une commande/produit/client existant → refusé | SEC | P0 |
| 2.5 | Rôle `driver` : ne peut pas lire les produits ni les finances | SEC | P0 |
| 2.6 | Rôle `staff` : accès conforme à ses permissions, pas aux réglages sensibles | SEC | P1 |
| 2.7 | `franchise_admin` : accès limité aux boutiques de **sa** franchise | SEC | P1 |
| 2.8 | `super_admin` : accès global (et seul à pouvoir écrire les rôles) | SEC | P1 |
| 2.9 | Écriture directe dans `stores/{id}/stats` par un client → refusée | SEC | P0 |
| 2.10 | Webhooks Stripe/Woo/Shopify/YouCan : signature invalide → rejet | INT | P0 |
| 2.11 | Catalogue public : lecture produits autorisée **uniquement** si `publicCatalogEnabled` | SEC | P1 |
| 2.12 | Aucun secret (`VITE_SHOPIFY_ACCESS_TOKEN`…) exposé dans le bundle client | M | P1 |

## 3. Commandes / OMS

| # | Test | Type | Prio |
|---|---|---|---|
| 3.1 | Créer une commande (produit, client, prix, quantité) → persistée + visible | E2E | P0 |
| 3.2 | Auto-remplissage adresse à partir d'un téléphone client connu | E2E | P1 |
| 3.3 | Transitions valides : `reçu→confirmation→packing→ramassage→livraison→livré` | U + E2E | P0 |
| 3.4 | Transition **invalide** (ex. `livré→pas de réponse`) → refusée (UI + règles) | U + SEC | P0 |
| 3.5 | Bouton « pas de réponse » sur commande livrée → message d'erreur, aucun changement | E2E | P0 |
| 3.6 | Toggle payé/non payé → `isPaid` mis à jour + log d'audit | E2E | P1 |
| 3.7 | Actions groupées : marquer payé (ignore déjà payées) | U | P1 |
| 3.8 | Actions groupées : « encaissé » **ignore** les commandes annulées/retour | U | P0 |
| 3.9 | Actions groupées : changement de statut en masse respecte la machine à états | U | P0 |
| 3.10 | Suppression → corbeille, puis restauration, puis suppression définitive | E2E | P1 |
| 3.11 | Filtres (statut, recherche, date) + recherche par téléphone/nom/n° | E2E | P1 |
| 3.12 | Scroll infini : charge la page suivante sans doublon | M | P2 |
| 3.13 | Import CSV : mapping colonnes, lignes invalides rejetées avec rapport | E2E | P1 |
| 3.14 | Export CSV : montants et statuts corrects (dont commandes catalogue) | U | P1 |
| 3.15 | Lien WhatsApp pré-rempli (produit, prix, total, devise) | U | P1 |
| 3.16 | QR code commande généré et scannable | M | P2 |
| 3.17 | Onglet « Paniers » : commandes `pending_catalog` listées, badge compteur correct | E2E | P1 |
| 3.18 | Nettoyage automatique des vieux paniers | U | P2 |

## 4. Intelligence COD — Bouclier (Beya3 / BAY-90)

| # | Test | Type | Prio |
|---|---|---|---|
| 4.1 | `buildRiskModel` : ignore les commandes non résolues, calcule taux par ville/client | U | P0 |
| 4.2 | Client avec 2/2 échecs en ville à risque → score **100**, reco « appel + acompte » | U | P0 |
| 4.3 | Client fidèle (≥2 livraisons, 0 échec) → delta négatif, score bas | U | P0 |
| 4.4 | Client inconnu > client fidèle (même commande) | U | P1 |
| 4.5 | Score borné 0–100, toujours au moins une raison explicable | U | P1 |
| 4.6 | Badge affiché **uniquement** sur commandes actives et score ≥ 40 | M | P1 |
| 4.7 | Aucun badge sur livré / annulé / retour | M | P1 |
| 4.8 | Tooltip du badge = recommandation d'action | M | P2 |
| 4.9 | Filtre « Bouclier COD » → n'affiche que les actives à risque ≥ 60 | E2E | P1 |
| 4.10 | Modal commande : score cohérent avec le badge de la liste | M | P1 |
| 4.11 | Outil copilot `assess_order_risk` → renvoie résumé + commandes triées + recos | INT | P1 |
| 4.12 | Perf : modèle construit une seule fois (pas de recalcul par ligne) | M | P2 |

## 5. Produits & stock

| # | Test | Type | Prio |
|---|---|---|---|
| 5.1 | CRUD produit simple (nom, SKU, prix, coût, stock, photo) | E2E | P0 |
| 5.2 | Produit **variable** : variantes avec stock propre | E2E | P0 |
| 5.3 | Produit **bundle** : la vente décrémente les composants | INT | P0 |
| 5.4 | Commande créée → stock décrémenté du bon montant | INT | P0 |
| 5.5 | Commande annulée/retour → stock **réintégré** | INT | P0 |
| 5.6 | Modification de quantité sur commande → delta appliqué (pas de double compte) | U | P0 |
| 5.7 | Stock négatif : comportement conforme à la politique retenue (rejet ou backorder) | INT | P0 |
| 5.8 | Concurrence : 2 commandes simultanées sur le dernier article → pas de survente | INT | P0 |
| 5.9 | Lots FEFO : déduction sur le lot **le plus proche de péremption** | U | P1 |
| 5.10 | Restock : réintégration sur le bon lot | U | P1 |
| 5.11 | Multi-entrepôts : décrément sur le bon entrepôt | INT | P0 |
| 5.12 | Transfert entre entrepôts : atomique, refuse si stock source insuffisant | E2E | P1 |
| 5.13 | Transfert d'un produit **à variantes** → `warehouseStocks` par variante cohérent | INT | P1 |
| 5.14 | Génération/unicité SKU | U | P1 |
| 5.15 | Alerte stock bas → email marchand (HTML échappé, pas d'injection) | INT | P1 |
| 5.16 | Prédiction de rupture : produits à risque listés, produits à 0 traités | U | P1 |
| 5.17 | Import/export produits CSV | E2E | P1 |

## 6. Clients / CRM

| # | Test | Type | Prio |
|---|---|---|---|
| 6.1 | CRUD client, fiche 360° (historique commandes, total dépensé) | E2E | P1 |
| 6.2 | `totalSpent` incrémenté **à la livraison** uniquement | INT | P0 |
| 6.3 | Retour après livraison → `totalSpent` décrémenté | INT | P0 |
| 6.4 | Fidélité Nqat : 1 pt / 10 DH, badge VIP > 1000 DH | U | P1 |
| 6.5 | Segmentation IA : segments cohérents | U | P2 |
| 6.6 | Déduplication par téléphone (normalisation des formats) | U | P1 |

## 7. Finances & comptabilité

| # | Test | Type | Prio |
|---|---|---|---|
| 7.1 | Profit net = cash encaissé − COGS − livraison − dépenses − remboursements | U | P0 |
| 7.2 | Paiement **partiel** (`amountPaid`) compté correctement | U | P0 |
| 7.3 | Dashboard (stats stockées) = page Finances (recalcul) = réconciliation | INT | P0 |
| 7.4 | TVA : extraction du TTC, cohérente entre KPI et export | U | P0 |
| 7.5 | Export comptable CSV + PDF : totaux, période, taux de marge | M | P1 |
| 7.6 | Dépenses : ajout/suppression par catégorie → impact immédiat sur le net | E2E | P1 |
| 7.7 | Remboursements pris en compte | U | P1 |
| 7.8 | Filtrage par période et par collection | E2E | P1 |
| 7.9 | Valeurs négatives / NaN / champs vides → pas de crash, valeurs sûres | U | P0 |
| 7.10 | Multi-devises (MAD/DZD/TND) : symbole et formatage partout | M | P1 |
| 7.11 | Génération de facture PDF | M | P2 |

## 8. Réconciliation COD

| # | Test | Type | Prio |
|---|---|---|---|
| 8.1 | Vue « cash dû » par livreur, seuils d'alerte | E2E | P0 |
| 8.2 | Marquer encaissé → `paymentStatus='remitted'`, `isPaid=true` persistés | E2E | P0 |
| 8.3 | Assistant CSV : matching par référence/montant, correspondances proposées | U | P0 |
| 8.4 | Écart de prix → `amountPaid` = montant transporteur, écart tracé | U | P0 |
| 8.5 | Lignes non matchées listées pour traitement manuel | M | P1 |
| 8.6 | `manualReconciliation` recalcule stats + `totalSpent` (livrées uniquement) | INT | P0 |

## 9. Transporteurs & livraison

| # | Test | Type | Prio |
|---|---|---|---|
| 9.1 | Sendit : création colis, `amount = prix × qté + livraison`, tracking retourné | U | P0 |
| 9.2 | O-Livraison : création + montant COD correct | U | P0 |
| 9.3 | Cathedis : montant COD × quantité, auth session | U | P0 |
| 9.4 | Mapping des statuts transporteur → statuts BayIIn | U | P1 |
| 9.5 | Webhook transporteur : met à jour le statut de la bonne commande | INT | P0 |
| 9.6 | Webhook avec token invalide → rejeté | SEC | P0 |
| 9.7 | Erreur API transporteur → message clair, commande non corrompue | M | P1 |
| 9.8 | Demande de ramassage (pickup) | M | P1 |

## 10. App livreur & gestion livreurs

| # | Test | Type | Prio |
|---|---|---|---|
| 10.1 | Accès par token public sans compte → liste des courses du jour | E2E | P0 |
| 10.2 | Token invalide/expiré → accès refusé | SEC | P0 |
| 10.3 | Livreur met à jour un statut → commande + stats mises à jour | INT | P0 |
| 10.4 | Livreur ne voit **que** ses commandes | SEC | P0 |
| 10.5 | Navigation Maps/Waze, appel client | M | P2 |
| 10.6 | Encaissement COD saisi par le livreur remonte en réconciliation | INT | P1 |
| 10.7 | Candidature livreur publique → création de la fiche | E2E | P2 |
| 10.8 | Scoring / présence / wallet livreur | M | P2 |

## 11. Entrepôt (WMS)

| # | Test | Type | Prio |
|---|---|---|---|
| 11.1 | Scan QR/code-barres → commande trouvée et passée en expédition | E2E | P1 |
| 11.2 | Scan d'un code inconnu → erreur claire | M | P1 |
| 11.3 | Journal des mouvements de stock (audit) | E2E | P1 |
| 11.4 | CRUD entrepôts, entrepôt par défaut | E2E | P1 |

## 12. Retours (SAV)

| # | Test | Type | Prio |
|---|---|---|---|
| 12.1 | Créer un retour depuis une commande livrée | E2E | P1 |
| 12.2 | Validation du retour → stock réintégré + finances ajustées | INT | P0 |
| 12.3 | Motifs de retour et statistiques | M | P2 |

## 13. Achats & fournisseurs

| # | Test | Type | Prio |
|---|---|---|---|
| 13.1 | Cycle bon de commande : brouillon → envoyé → partiel → réceptionné | E2E | P1 |
| 13.2 | Réception → **stock incrémenté** (transactionnel) | INT | P0 |
| 13.3 | Import/export Odoo CSV, matching par référence | U | P1 |
| 13.4 | Paiements fournisseurs → dépenses / trésorerie | INT | P1 |

## 14. RH, planning & actifs

| # | Test | Type | Prio |
|---|---|---|---|
| 14.1 | CRUD employé, contrats (CDI/CDD/Stage) | E2E | P1 |
| 14.2 | Upload documents (CIN, RIB, CNSS) → accès restreint au propriétaire | SEC | P0 |
| 14.3 | Scoring performance, présence, paie | M | P2 |
| 14.4 | Planning : commandes + événements au calendrier, création d'événement | E2E | P2 |
| 14.5 | Actifs : registre + alertes de péremption | M | P2 |

## 15. Beya3 — Copilot IA

| # | Test | Type | Prio |
|---|---|---|---|
| 15.1 | Chat : réponse en streaming, historique conservé | M | P1 |
| 15.2 | Appel d'outil natif (`analyze_profit`, `get_cashflow_status`…) → chiffres **exacts** vs données réelles | INT | P0 |
| 15.3 | Fallback texte→outil : **seuls** les outils lecture seule sont acceptés | U | P0 |
| 15.4 | Outil mutant (`draft_expense`, `bulk_update_orders`) → crée un **brouillon**, jamais d'exécution directe | INT | P0 |
| 15.5 | Validation d'un brouillon → exécution + journal + rollback possible | INT | P0 |
| 15.6 | `rollback_last_action` annule bien la dernière action (< 1h) | INT | P1 |
| 15.7 | Isolation tenant : `storeId` ≠ celui de l'utilisateur → 403 | SEC | P0 |
| 15.8 | Injection de prompt via nom client/note de commande → aucune action déclenchée | SEC | P0 |
| 15.9 | Mémoire : préférences retenues entre sessions | M | P1 |
| 15.10 | Benchmarks marché : comparaison au segment | INT | P2 |
| 15.11 | Sans `GROQ_API_KEY` → erreur propre (pas de crash) | INT | P1 |
| 15.12 | Latence acceptable + pas de fuite de PII inutile vers le LLM | M | P1 |

## 16. WhatsApp (bot & notifications)

| # | Test | Type | Prio |
|---|---|---|---|
| 16.1 | Webhook : vérification signature HMAC (valide/invalide) | SEC | P0 |
| 16.2 | Machine à états : confirmer / reporter / annuler par message | INT | P0 |
| 16.3 | Réponse libre → bascule IA | INT | P1 |
| 16.4 | Identification de la boutique par `phoneNumberId` | INT | P0 |
| 16.5 | Templates Meta (confirmation, expédition) envoyés avec les bons paramètres | INT | P1 |
| 16.6 | Connexion WhatsApp (embedded signup) authentifiée + ownership vérifié | SEC | P0 |

## 17. Intégrations e-commerce

| # | Test | Type | Prio |
|---|---|---|---|
| 17.1 | YouCan : OAuth, sync commandes, billing récurrent | INT | P1 |
| 17.2 | Shopify : OAuth multi-tenant, webhook `orders/create` → commande BayIIn | INT | P1 |
| 17.3 | WooCommerce : webhook commande + resync stock | INT | P1 |
| 17.4 | Idempotence : rejouer un webhook ne crée pas de doublon ni de double décrément stock | INT | P0 |
| 17.5 | Stripe : abonnement, changement de plan, annulation, échec de paiement | INT | P0 |
| 17.6 | Gating des features selon le plan (`free`/`pro`/`unlimited`) | E2E | P1 |

## 18. Store builder & catalogue public

| # | Test | Type | Prio |
|---|---|---|---|
| 18.1 | Builder : ajout/réordonnancement/suppression de sections, sauvegarde | E2E | P1 |
| 18.2 | HTML personnalisé **sanitizé** (DOMPurify) → script injecté neutralisé | SEC | P0 |
| 18.3 | Catalogue public accessible sans compte si activé | E2E | P1 |
| 18.4 | Panier + checkout complet → commande `pending_catalog` créée | E2E | P0 |
| 18.5 | Checkout express (1 produit) → commande créée, total correct | E2E | P0 |
| 18.6 | Frais de livraison par ville appliqués | U | P1 |
| 18.7 | Partage du catalogue (lien + QR) | M | P2 |

## 19. Marketing & automatisations

| # | Test | Type | Prio |
|---|---|---|---|
| 19.1 | Création d'une règle : déclencheur → condition → délai → action | E2E | P1 |
| 19.2 | Exécution : writebacks sur la **bonne** collection `orders` | INT | P0 |
| 19.3 | Action « créer livraison » / « envoyer WhatsApp » / « planifier relance » | INT | P1 |
| 19.4 | Règle désactivée → aucune exécution | E2E | P1 |
| 19.5 | Génération de copy publicitaire IA par produit | M | P2 |

## 20. Plateforme (PWA, offline, i18n, admin)

| # | Test | Type | Prio |
|---|---|---|---|
| 20.1 | Installation PWA (Android/iOS/desktop) | M | P1 |
| 20.2 | Mode hors-ligne : création en file, sync au retour réseau, **aucune perte** | M | P0 |
| 20.3 | Prompt de mise à jour du service worker | M | P2 |
| 20.4 | i18n FR/EN/AR : bascule, **RTL** correct en arabe, aucune clé brute affichée | E2E | P1 |
| 20.5 | Aucune chaîne codée en dur hors i18n sur les écrans principaux | M | P2 |
| 20.6 | ErrorBoundary : une erreur de page n'écroule pas toute l'app | M | P1 |
| 20.7 | Admin : vue globale tenants, gestion abonnements, `setUserRole` (super_admin only) | SEC | P0 |
| 20.8 | Franchise : KPIs consolidés, accès limité au réseau | SEC | P1 |
| 20.9 | Notifications push (permission, réception) | M | P2 |

## 21. Transverse — perf, a11y, robustesse

| # | Test | Type | Prio |
|---|---|---|---|
| 21.1 | `npm run build` réussit ; aucun chunk critique non justifié | U | P0 |
| 21.2 | `npm run lint` sans erreur | U | P1 |
| 21.3 | Aucune fuite de listener Firestore (navigation répétée entre pages) | M | P1 |
| 21.4 | Pas de re-souscription en boucle (`useStoreData` avec constraints mémoïsées) | M | P1 |
| 21.5 | Index Firestore présents pour toutes les requêtes multi-champs | M | P1 |
| 21.6 | Navigation clavier + focus trap dans les modals | M | P2 |
| 21.7 | `aria-label` sur les boutons icône, contrastes AA | M | P2 |
| 21.8 | Responsive mobile sur OMS, finances, builder | M | P1 |
| 21.9 | Écrans vides / états de chargement / messages d'erreur explicites | M | P2 |

---

## Commandes

```bash
npm run test              # unitaires (Vitest)
npm run test:e2e          # E2E (Playwright)
npm run test:regression   # suite de non-régression
npm run test:coverage     # couverture
npm run lint              # ESLint
npm run build             # build production
node --check functions/index.js   # syntaxe Cloud Functions
```

## Priorités d'automatisation

1. ✅ **FAIT** — Tests de règles Firestore (`tests/rules/`, 19 tests) : couvre 0.9→0.10, 2.1→2.4 et l'isolation multi-tenant.
2. 🟡 **PARTIEL** — Intégration du moteur de stock (`tests/integration/orderStock.test.js`, 8 tests) : couvre 0.1, 5.4→5.6, 5.11 (création, suppression, annulation, delta quantité, multi-produits, bundles, entrepôts). **Restent** : agrégats `stats/sales` et `totalSpent` (6.2), concurrence/survente (5.8).
3. **P0** — Tests de la réconciliation réelle (le composant, pas une copie) : section 8.
4. **P1** — E2E manquants : Returns, Purchases, Drivers, Planning, Franchise, PublicCatalog.
5. **P1** — Harnais d'évaluation Beya3 (golden set + suite d'injection) : 15.2, 15.3, 15.8.

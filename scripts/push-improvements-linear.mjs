#!/usr/bin/env node
/**
 * push-improvements-linear.mjs — Pousse les chantiers d'amélioration post-audit vers Linear.
 *
 * - Tickets généraux (dette technique / sécurité / intégrité) issus de l'audit.
 * - Un EPIC "Beya3 v2" + ses sous-tickets (copilot IA différenciateur), liés via parentId.
 *
 * Usage:
 *   node scripts/push-improvements-linear.mjs           # Dry run (aperçu)
 *   node scripts/push-improvements-linear.mjs --apply    # Création réelle
 */
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const CONFIG = { teamId: '68babe6e-b1d2-4c69-ac6d-6440963d4c75', apiUrl: 'https://api.linear.app/graphql' };

function loadApiKey() {
  try {
    const env = readFileSync(resolve(ROOT, '.env'), 'utf-8');
    const m = env.match(/^LINEAR_API_KEY=(.+)$/m);
    if (m) return m[1].trim();
  } catch { /* ignore */ }
  if (process.env.LINEAR_API_KEY) return process.env.LINEAR_API_KEY;
  console.error('LINEAR_API_KEY introuvable.'); process.exit(1);
}
const API_KEY = loadApiKey();

async function q(query, variables = {}) {
  const res = await fetch(CONFIG.apiUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: API_KEY },
    body: JSON.stringify({ query, variables }),
  });
  const data = await res.json();
  if (data.errors) { console.error('Linear API error:', JSON.stringify(data.errors, null, 2)); process.exit(1); }
  return data.data;
}
const getIssues = async () => (await q(`{ team(id:"${CONFIG.teamId}"){ issues(first:250){ nodes{ id identifier title } } } }`)).team.issues.nodes;
const getLabels = async () => (await q(`{ team(id:"${CONFIG.teamId}"){ labels{ nodes{ id name } } } }`)).team.labels.nodes;
const getStates = async () => (await q(`{ team(id:"${CONFIG.teamId}"){ states{ nodes{ id name type } } } }`)).team.states.nodes;
async function createLabel(name) {
  return (await q(`mutation($input:IssueLabelCreateInput!){ issueLabelCreate(input:$input){ issueLabel{ id name } } }`,
    { input: { name, teamId: CONFIG.teamId } })).issueLabelCreate.issueLabel;
}
async function createIssue({ title, description, priority, stateId, labelIds, parentId }) {
  const input = { teamId: CONFIG.teamId, title, description, priority, stateId, labelIds };
  if (parentId) input.parentId = parentId;
  return (await q(`mutation($input:IssueCreateInput!){ issueCreate(input:$input){ issue{ id identifier title } } }`, { input })).issueCreate.issue;
}
const P = { none: 0, urgent: 1, high: 2, medium: 3, low: 4 };

// ─────────────────────────────────────────────────────────────────────────────
// EPIC BEYA3 — Copilot IA différenciateur
// ─────────────────────────────────────────────────────────────────────────────
const BEYA3_EPIC = {
  title: 'EPIC — Beya3 v2 : copilot IA différenciateur (COD Maroc)',
  priority: 'high',
  labels: ['Beya3;AI'],
  description: `**Vision.** Transformer Beya3 d'un chatbot à actions en un **copilot IA proactif, agentique et spécialisé COD marocain** — le vrai différenciateur produit face à Shopify/YouCan/Woo.

**Piliers**
1. Architecture agentique robuste (function-calling natif, planification, outils fiables).
2. Grounding sur les données boutique (RAG) — zéro hallucination sur les faits métier.
3. Intelligence COD spécifique Maroc : prédiction livraison/retour, risque client, choix transporteur par zone.
4. Autonomie actionnable avec garde-fous (preview + validation + rollback + audit).
5. Proactivité : briefing, alertes contextuelles, recommandations d'action.
6. Qualité mesurable : harnais d'évaluation + anti-injection.

**Existant à capitaliser :** \`functions/copilot/*\` (reactAgent, actionExecutor, memoryService, financialEngine, benchmarkService, proactiveAgent, visionAgent, mlEngine, kgService), \`src/services/aiRiskService.js\`, \`localCopilot.js\`, \`useVoiceCopilot.js\`.

**Definition of Done de l'épic :** les sous-tickets ci-dessous livrés, avec un harnais d'éval montrant ≥ objectif de qualité et taux d'action réussie mesuré.`,
};

const BEYA3_SUBTICKETS = [
  {
    title: 'Beya3 — Boucle agentique native (function-calling) + planification',
    priority: 'high', labels: ['Beya3;AI'],
    description: `Remplacer le fallback regex "JSON action" par une **vraie boucle tool-use** (function calling natif Groq/LLM), plus une planification multi-étapes.

**Problème actuel :** \`copilot.js\` / \`reactAgent.js\` détectent les actions via regex sur le texte du modèle → fragile, non déterministe, surface d'injection.

**Actions**
- Définir les outils en schéma JSON (function calling) au lieu du parsing texte.
- Boucle plan → exécuter outil → observer → continuer, avec limite d'itérations.
- Gestion d'erreurs d'outil + retries + message utilisateur clair.
- Séparer outils **lecture** (directs, scopés storeId) et **mutation** (via draft).

**Acceptation :** un prompt multi-étapes ("liste les commandes sans réponse à Casa et propose une relance") s'exécute en enchaînant les bons outils, sans regex.`,
  },
  {
    title: 'Beya3 — Grounding RAG sur les données boutique (anti-hallucination)',
    priority: 'high', labels: ['Beya3;AI'],
    description: `Ancrer les réponses sur les données réelles de la boutique via récupération contextuelle.

**Actions**
- Générer des embeddings des produits / politiques / FAQ / commandes récentes (batch + à l'écriture).
- Store vectoriel (Firestore + champ vecteur, ou service dédié) scoping \`storeId\`.
- Récupération top-k injectée dans le contexte avant génération.
- Citer les sources (id commande/produit) dans la réponse.

**Acceptation :** questions factuelles ("combien de stock du produit X ?", "adresse de la commande CMD-1234 ?") répondues exactement, avec citation, sans invention.`,
  },
  {
    title: 'Beya3 — Intelligence COD Maroc : prédiction livraison & risque client',
    priority: 'high', labels: ['Beya3;AI'],
    description: `LE différenciateur. Modèle prédictif spécifique au COD marocain.

**Capacités**
- Score de **probabilité de livraison / risque de retour** par commande (features : ville, historique client, produit, prix, transporteur, jour).
- Score **risque client** (fraude COD, "no-answer") → recommandation : confirmer par appel, exiger acompte, refuser.
- Détection proactive d'anomalies cash/stock.

**Base existante :** \`src/services/aiRiskService.js\`, \`functions/copilot/mlEngine.js\`.

**Actions**
- Feature engineering depuis l'historique commandes.
- Modèle (heuristique v1 → ML v2) + seuils configurables.
- Exposer le score dans l'OMS (badge risque) et via le copilot.

**Acceptation :** chaque commande affiche un score de risque exploitable ; le copilot peut expliquer et recommander une action.`,
  },
  {
    title: 'Beya3 — Choix transporteur optimal par ville/zone',
    priority: 'medium', labels: ['Beya3;AI'],
    description: `Recommander le transporteur (Sendit / O-Livraison / Cathedis) avec le meilleur taux de livraison et coût par ville/zone, à partir de l'historique.

**Actions**
- Agréger taux de livraison réel + délai + coût par transporteur × ville.
- Recommandation à la création de livraison (OMS + Automatisations).
- Réévaluation périodique (fonction planifiée).

**Acceptation :** à l'expédition, Beya3 suggère le meilleur transporteur pour la ville de la commande, avec justification chiffrée.`,
  },
  {
    title: 'Beya3 — Mémoire long terme & personnalisation marchand',
    priority: 'high', labels: ['Beya3;AI'],
    description: `Étendre \`functions/copilot/memoryService.js\` en mémoire durable et personnalisée.

**Actions**
- Mémoire épisodique (conversations) + sémantique (faits marchand : préférences, ton, objectifs).
- Profil marchand consolidé injecté dans le contexte.
- Oubli/expiration + contrôle utilisateur (voir/effacer la mémoire).

**Acceptation :** Beya3 se souvient des préférences et du contexte entre sessions et adapte ses réponses.`,
  },
  {
    title: 'Beya3 — Autonomie actionnable étendue avec garde-fous',
    priority: 'high', labels: ['Beya3;AI'],
    description: `Élargir le catalogue d'outils mutants, tous derrière preview + validation + rollback + audit.

**Nouveaux outils (via draft) :** créer/mettre à jour commande, créer livraison (transporteur), enregistrer dépense, lancer campagne WhatsApp segmentée, créer bon d'achat sur stock bas, planifier relance.

**Garde-fous**
- Politique de confiance graduée (auto pour lecture, validation pour mutation, double-confirm pour irréversible).
- Vérif ownership \`storeId\` à l'exécution (déjà corrigé pour bulk_update_orders — généraliser).
- Journal + rollback systématiques.

**Acceptation :** le copilot peut proposer et, après validation, exécuter des actions métier réelles en toute sûreté.`,
  },
  {
    title: 'Beya3 — Copilot proactif : briefing & alertes contextuelles',
    priority: 'medium', labels: ['Beya3;AI'],
    description: `Rendre Beya3 proactif (il vient à toi), en capitalisant sur \`proactiveAgent.js\` / \`beya3DailyBrief\` / \`hourlyAnomalyScanner\`.

**Actions**
- Briefing quotidien intelligent et actionnable (pas juste des chiffres : "3 relances à faire, 2 ruptures imminentes").
- Alertes contextuelles push ("5 commandes à Casa sans réponse depuis 48h — relancer ?").
- Chaque insight porte une action en un clic.

**Acceptation :** l'utilisateur reçoit chaque jour un brief avec actions suggérées, et des alertes déclenchées par seuils.`,
  },
  {
    title: 'Beya3 — Harnais d\'évaluation & qualité (golden set + métriques)',
    priority: 'high', labels: ['Beya3;AI'],
    description: `Sans mesure, pas d'amélioration fiable du copilot.

**Actions**
- Golden set de conversations/tâches représentatives (FR + Darija).
- Métriques : exactitude factuelle, taux d'action réussie, taux d'hallucination, respect des garde-fous, latence.
- Tests de régression exécutés en CI sur les changements de prompt/outils.
- Suite de tests d'injection (prompt injection, exfiltration, cross-tenant).

**Acceptation :** un rapport d'éval reproductible ; toute régression de qualité bloque le merge.`,
  },
  {
    title: 'Beya3 — Sécurité IA : anti-injection & sanitisation des prompts',
    priority: 'medium', labels: ['Beya3;AI'],
    description: `Durcir la surface d'injection (données client/commande injectées dans les prompts système).

**Actions**
- Sanitiser/encadrer les données non fiables (délimiteurs, échappement, "data not instructions").
- Allow-list stricte des outils mutants ; jamais d'exécution depuis du texte libre.
- Rate limiting par utilisateur/boutique ; gestion PII (minimiser ce qui part au LLM).

**Acceptation :** les cas de la suite d'injection (ticket éval) sont tous neutralisés.`,
  },
  {
    title: 'Beya3 — Multimodal : vision factures & produits',
    priority: 'medium', labels: ['Beya3;AI'],
    description: `Compléter \`visionAgent.js\` / \`processInvoiceOCR\`.

**Actions**
- OCR facture fournisseur → pré-remplissage d'un bon d'achat (module Achats).
- Photo produit → suggestion de fiche (nom, catégorie, prix).
- Bind du secret \`GROQ_API_KEY\` + check ownership \`storeId\` sur \`processInvoiceOCR\`.

**Acceptation :** l'upload d'une facture crée un brouillon d'achat exploitable.`,
  },
  {
    title: 'Beya3 — Voix (Darija/FR) → actions',
    priority: 'medium', labels: ['Beya3;AI'],
    description: `Compléter \`useVoiceCopilot.js\` / \`voiceParserService.js\` pour la commande vocale terrain.

**Actions**
- Reconnaissance vocale FR + Darija → intention → action Beya3.
- UX mains-libres (utile en entrepôt / livraison).

**Acceptation :** dicter "marque la commande CMD-12 comme livrée" exécute l'action (après validation).`,
  },
  {
    title: 'Beya3 — Latence, coût & streaming',
    priority: 'medium', labels: ['Beya3;AI'],
    description: `Rendre le copilot rapide et économe.

**Actions**
- Réponses en **streaming** (perçu instantané).
- Routing de modèle : petit modèle pour intents simples, grand pour raisonnement.
- Cache de prompt / contexte ; budget tokens par requête.

**Acceptation :** première token < objectif ; coût par conversation suivi et maîtrisé.`,
  },
  {
    title: 'Beya3 — Benchmarks marché anonymisés → insights comparatifs',
    priority: 'low', labels: ['Beya3;AI'],
    description: `Exploiter \`benchmarkService.js\` / \`market_benchmarks\` pour des insights comparatifs.

**Actions**
- Comparer les KPIs de la boutique à la moyenne anonymisée de son segment.
- Insights actionnables ("ton taux de livraison est 12% sous ton segment à Marrakech").

**Acceptation :** le brief inclut au moins un insight comparatif pertinent.`,
  },
  {
    title: 'Beya3 — SupportAI : chatbot client final branché sur Beya3',
    priority: 'low', labels: ['Beya3;AI'],
    description: `Compléter le stub \`SupportAI.jsx\` en assistant pour les **clients finaux** du marchand.

**Actions**
- Base de connaissances auto depuis les données boutique (produits, politiques, tracking).
- Réponses tracking/commande ; escalade vers le marchand si incertain.
- Réutiliser l'infra Beya3 (RAG + garde-fous).

**Acceptation :** un client peut suivre sa commande et poser des questions produits via le chatbot.`,
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// CHANTIERS GÉNÉRAUX (dette / sécurité / intégrité) — hors Beya3
// ─────────────────────────────────────────────────────────────────────────────
const GENERAL_TICKETS = [
  {
    title: 'Intégrité — Politique stock négatif (rejet vs backorder)',
    priority: 'high', labels: ['Hardening'],
    description: `\`functions/stockLogic.js\` utilise \`FieldValue.increment\` sans plancher → survente possible sous concurrence.

**Actions**
- Décision produit : rejeter la commande si stock insuffisant, OU autoriser le négatif comme backorder explicite (flag).
- Implémenter la garde read-check-abort dans la transaction stock.
- Aligner les déductions Woo/Shopify sur la même logique.

**Acceptation :** impossible de descendre sous 0 sans intention explicite ; test de concurrence.`,
  },
  {
    title: 'Argent — Source de vérité unique côté serveur',
    priority: 'high', labels: ['Hardening'],
    description: `Trois moteurs calculent l'argent (trigger incrémental, \`manualReconciliation\`, \`financials.js\` client) — alignés mais dupliqués.

**Actions**
- Centraliser la logique (revenu réalisé, COGS, TVA, netProfit) dans un module serveur unique.
- Dashboard / Finances / réconciliation consomment ce résultat.
- Tests couvrant paiement partiel, mismatch, remboursement, TVA TTC.

**Acceptation :** Dashboard = Finances = export = réconciliation, prouvé par tests.`,
  },
  {
    title: 'Sécurité — Finaliser l\'isolation multi-tenant (claim-only)',
    priority: 'high', labels: ['Hardening'],
    description: `La faille d'escalade est fermée (règles + \`onUserWrite\` durci). Reste le durcissement complet.

**Actions**
- Basculer \`belongsToStore\` en **claim-only** (retirer le fallback doc).
- Backfill des custom claims pour tous les utilisateurs existants (script admin).
- S'assurer que le staff obtient un doc \`users\` (bootstrap) pour que \`onUserWrite\` pose le claim.
- Tests \`@firebase/rules-unit-testing\` (attaquant, staff, owner, driver, franchise).

**Acceptation :** suite de tests de règles verte ; aucun accès cross-tenant possible.`,
  },
  {
    title: 'OMS — Unifier l\'écriture de statut derrière un service unique',
    priority: 'medium', labels: ['Hardening'],
    description: `Plusieurs chemins écrivent le statut de commande (Orders.jsx, bulk, DeliveryApp, WhatsApp) — la garde machine à états n'est pas systématique côté client.

**Actions**
- Un seul service \`updateOrderStatus(order, to)\` appliquant \`isValidTransition\` + effets de bord.
- Router tous les chemins d'écriture à travers lui.

**Acceptation :** aucune écriture de statut ne contourne la machine à états.`,
  },
  {
    title: 'Observabilité — Reporting d\'erreurs (Sentry) + ErrorBoundary par route + health checks',
    priority: 'medium', labels: ['Dashboard'],
    description: `L'ErrorBoundary global ne report rien (aucun Sentry). Pas de health check.

**Actions**
- Brancher un vrai reporting (Sentry ou custom Firestore) — l'ErrorBoundary annonce déjà "équipes notifiées".
- Un ErrorBoundary par route (isoler les crashs).
- Health check endpoint + logging structuré dans les Cloud Functions.

**Acceptation :** les erreurs de prod remontent dans un dashboard ; un crash de page n'écroule pas toute l'app.`,
  },
  {
    title: 'Stock — Variantes multi-entrepôts + FEFO restock',
    priority: 'medium', labels: ['Hardening'],
    description: `Deux bugs d'inventaire dans \`stockLogic.js\` / \`LocationSettings.jsx\`.

**Actions**
- Appliquer le delta variante au bon entrepôt (pas seulement le premier).
- Transférer aussi le \`warehouseStocks\` par variante.
- Corriger \`applyBatchLogic\` (restock) : viser le lot d'expiration la plus proche, sans muter les références partagées.

**Acceptation :** stock variante/entrepôt cohérent après commandes et transferts.`,
  },
  {
    title: 'Intégrations — Déductions stock Woo/Shopify via le trigger central',
    priority: 'medium', labels: ['Feature'],
    description: `Les webhooks Woo/Shopify déduisent le stock dans des transactions séparées → risque de double décrément vs \`onOrderWrite\`.

**Actions**
- Faire converger toute déduction de stock par le chemin central.
- Idempotence des webhooks (clé de commande externe).

**Acceptation :** une commande externe déduit le stock exactement une fois.`,
  },
  {
    title: 'Sécurité — Webhooks transporteurs : token en header + auth Cathedis serveur',
    priority: 'medium', labels: ['Hardening'],
    description: `\`senditWebhook\`/\`olivraisonWebhook\` s'authentifient via \`?token=\` (loggé). Cathedis lit un cookie de session illisible en navigateur + fallback codé en dur.

**Actions**
- Passer les tokens webhook en header (pas en query string).
- Refaire l'auth Cathedis côté serveur (Cloud Function) avec vraie session.

**Acceptation :** plus de secret en URL ; Cathedis crée des livraisons de façon fiable.`,
  },
  {
    title: 'Perf — Découper les gros composants (>50KB)',
    priority: 'low', labels: ['Hardening'],
    description: `Settings, AdminDashboard, HR, Finances, Landing, ProductModal, HybridStoreBuilder dépassent 50KB.

**Actions**
- Extraire sous-composants + hooks métier (pattern déjà appliqué à Orders).
- Objectif : aucune page > 30KB ; mesurer le bundle avant/après.`,
  },
  {
    title: 'Infra — Déployer les index Firestore composites',
    priority: 'low', labels: ['Hardening'],
    description: `\`firestore.indexes.json\` est peuplé et câblé à la base \`comsaas\`, mais \`firebase deploy --only firestore:indexes\` plante (bug firebase-tools 15.3.1 sur base nommée : TypeError 'map').

**Actions**
- Upgrader firebase-tools et redéployer, OU créer les index via la console (liens fournis par Firestore à l'échec de requête).

**Acceptation :** les index composites du fichier existent sur la base comsaas.`,
  },
  {
    title: 'Refactor — Unifier context/ + contexts/ et mémoïser les constraints useStoreData',
    priority: 'low', labels: ['Hardening'],
    description: `Deux dossiers de contextes (\`src/context/\` + \`src/contexts/\`). Risque de re-souscriptions Firestore si les constraints passées à \`useStoreData\` ne sont pas mémoïsées.

**Actions**
- Fusionner en un seul dossier de contextes.
- Vérifier que tous les appelants passent des constraints \`useMemo\`-isées.`,
  },
  {
    title: 'Sécurité — Retirer le fallback secret webhook depuis le doc store public',
    priority: 'low', labels: ['Hardening'],
    description: `Les webhooks Woo/Shopify lisent le secret en priorité depuis \`private/config\` mais gardent un fallback sur le doc store public (lisible par les membres).

**Actions**
- Migrer les stores legacy vers \`private/config\`.
- Retirer le fallback public une fois la migration faite.`,
  },
  {
    title: 'Feature — Retour → réintégration stock automatique',
    priority: 'low', labels: ['Feature'],
    description: `Le module Returns est peu relié au stock.

**Actions**
- À la validation d'un retour, réintégrer automatiquement le stock (via le chemin central).
- Traçabilité (audit stock).`,
  },
];

// ─────────────────────────────────────────────────────────────────────────────
async function main() {
  const apply = process.argv.includes('--apply');
  console.log(`\n=== Push améliorations → Linear (${apply ? 'APPLY' : 'DRY RUN'}) ===\n`);

  const [issues, labels, states] = await Promise.all([getIssues(), getLabels(), getStates()]);
  const labelMap = Object.fromEntries(labels.map(l => [l.name, l.id]));
  const stateMap = Object.fromEntries(states.map(s => [s.name, s.id]));
  const todoState = stateMap['Todo'] || states.find(s => s.type === 'unstarted')?.id || states.find(s => s.type === 'backlog')?.id;
  const existing = new Set(issues.map(t => t.title.toLowerCase()));

  async function resolveLabels(names) {
    const ids = [];
    for (const n of names) {
      if (labelMap[n]) { ids.push(labelMap[n]); continue; }
      if (apply) { const l = await createLabel(n); labelMap[n] = l.id; ids.push(l.id); console.log(`  label créé: ${n}`); }
    }
    return ids;
  }
  async function make(t, parentId) {
    if (existing.has(t.title.toLowerCase())) { console.log(`  (skip existant) ${t.title}`); return null; }
    const labelIds = await resolveLabels(t.labels || []);
    if (!apply) { console.log(`  [DRY] ${t.priority.toUpperCase().padEnd(6)} ${parentId ? '↳ ' : ''}${t.title}`); return { id: 'dry' }; }
    const issue = await createIssue({ title: t.title, description: t.description, priority: P[t.priority] ?? P.medium, stateId: todoState, labelIds, parentId });
    console.log(`  ✅ ${issue.identifier}  ${parentId ? '↳ ' : ''}${issue.title}`);
    return issue;
  }

  console.log(`— Chantiers généraux (${GENERAL_TICKETS.length}) —`);
  for (const t of GENERAL_TICKETS) await make(t);

  console.log(`\n— EPIC Beya3 + ${BEYA3_SUBTICKETS.length} sous-tickets —`);
  const epic = await make(BEYA3_EPIC);
  const parentId = epic && epic.id !== 'dry' ? epic.id : undefined;
  for (const t of BEYA3_SUBTICKETS) await make(t, parentId);

  console.log(`\n${apply ? '✅ Terminé.' : 'ℹ️  Dry run. Relancer avec --apply pour créer.'}\n`);
}
main().catch(e => { console.error('Fatal:', e); process.exit(1); });

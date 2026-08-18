#!/usr/bin/env node
/**
 * Pousse vers Linear les items TRANSVERSAUX (passe 2) et DÉCISIONS issus de la
 * décortication module par module — pour tracer ce qui n'a pas été corrigé au fil de l'eau.
 * Usage : node scripts/push-pass2-linear.mjs [--apply]
 */
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const teamId = '68babe6e-b1d2-4c69-ac6d-6440963d4c75';
const key = readFileSync(resolve(ROOT, '.env'), 'utf8').match(/^LINEAR_API_KEY=(.+)$/m)[1].trim();

async function q(query, variables = {}) {
  const r = await fetch('https://api.linear.app/graphql', {
    method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: key },
    body: JSON.stringify({ query, variables }),
  });
  const d = await r.json();
  if (d.errors) { console.error(JSON.stringify(d.errors, null, 2)); process.exit(1); }
  return d.data;
}
const P = { none: 0, urgent: 1, high: 2, medium: 3, low: 4 };

const TICKETS = [
  { title: 'Compta — Double comptage COGS (réception vs vente) : décision A/B', priority: 'high', labels: ['Finances'],
    description: "La réception d'achat crée une dépense COGS alors que le COGS est déjà compté à la vente (realizedCOGS) → le coût du stock est soustrait 2× du net.\n\n**Décision requise :**\n- (A, recommandé) COGS à la vente → la réception ne crée pas de dépense COGS.\n- (B) COGS à l'achat → garder la dépense, ne plus compter le COGS par commande.\n\nFichiers : src/lib/supplierService.js (validateReception), src/utils/financials.js." },
  { title: 'BAY-75 — Moteur argent unique (source de vérité)', priority: 'high', labels: ['Finances'],
    description: "Les définitions du revenu réalisé ont été alignées (client, réconciliation, trigger, copilot) mais le CODE reste dupliqué en 4 endroits. Consolider dans un module partagé + tests de non-régression croisés.\n\nfinancials.js · manualReconciliation (index.js) · onOrderWrite · copilot/financialEngine.js." },
  { title: 'Automations — Moteur serveur (délais exécutés, WhatsApp via API, triggers serveur)', priority: 'high', labels: ['Feature'],
    description: "runAutomations est client-only : (1) les actions à délai ne sont jamais exécutées (juste une note followUpDate), (2) send_whatsapp utilise window.open (non fiable), (3) les commandes créées par webhook/bot ne déclenchent aucune automatisation.\n\nÀ refaire côté serveur : fonction planifiée qui exécute les actions différées + envoi via l'API WhatsApp existante + déclenchement dans onOrderWrite." },
  { title: 'Stock — Corrélation variante × entrepôt (déduction multi-articles serveur)', priority: 'medium', labels: ['Hardening'],
    description: "stockLogic.applyStockUpdates applique le delta d'une variante au PREMIER entrepôt (Object.keys(adj.warehouses)[0]). Correct pour une commande mono-article ; dérive possible sur une commande multi-articles mêlant variantes/entrepôts. Suivre les deltas variante×entrepôt ensemble.\n\n(Le transfert inter-entrepôts a déjà été corrigé : produits à variantes exclus.)" },
  { title: 'OMS — Contention du compteur séquentiel stats/sales.lastOrderNumber', priority: 'medium', labels: ['Hardening'],
    description: "Chaque création de commande lit/écrit stats/sales dans sa transaction pour lastOrderNumber → toutes les créations se sérialisent sur ce doc (point chaud sous charge). Envisager un compteur distribué (sharded) ou des numéros non séquentiels.\n\nsrc/hooks/useOrderActions.js (createOrder)." },
  { title: 'Observabilité — Reporting d\'erreurs réel (ErrorBoundary)', priority: 'medium', labels: ['Dashboard'],
    description: "L'ErrorBoundary n'envoie aucune erreur à un service. Brancher un reporting (Sentry ou log Firestore/Cloud Function + alerte) pour l'observabilité prod. Voir aussi ErrorBoundary par route." },
  { title: 'Stock — Unifier la logique de delta (client audit ↔ serveur)', priority: 'low', labels: ['Hardening'],
    description: "src/utils/orderLogic.calculateStockDeltas (client) duplique la logique de stockLogic.js (serveur) et n'est utilisée que pour le journal d'audit. Risque de divergence → l'audit ne reflète plus la réalité. Idéalement, laisser le serveur écrire le mouvement de stock faisant autorité." },
  { title: 'A11y — aria-labels + focus-trap (boutons icône, modals)', priority: 'low', labels: ['Hardening'],
    description: "~18 boutons icône sans aria-label ; pas de focus-trap dans les gros modals (OrderModal/ProductModal). Audit axe-core + navigation clavier + skip links." },
  { title: 'Perf — Découper les composants > 800 lignes', priority: 'low', labels: ['Hardening'],
    description: "HybridStoreBuilder (1501), AdminDashboard (1078), Finances (1022), HR (994), Drivers (880), Automations (833). Extraire sous-composants + hooks. Objectif : aucune page > 30KB." },
  { title: 'CRM — Backfill normalisation téléphone + lier les clients catalogue', priority: 'low', labels: ['Finances'],
    description: "La normalisation téléphone (0XXXXXXXXX) est appliquée aux nouvelles commandes. (1) Backfill des clients existants (script admin). (2) Les commandes catalogue ne créent/lient pas de fiche client (customerId absent) → brancher au CRM avec dédup." },
];

async function main() {
  const apply = process.argv.includes('--apply');
  console.log(`\n=== Push passe 2 → Linear (${apply ? 'APPLY' : 'DRY RUN'}) ===\n`);
  const data = await q(`{ team(id:"${teamId}"){ issues(first:250){ nodes{ id title } } labels{ nodes{ id name } } states{ nodes{ id name type } } } }`);
  const existing = new Set(data.team.issues.nodes.map((i) => i.title.toLowerCase()));
  const labelMap = Object.fromEntries(data.team.labels.nodes.map((l) => [l.name, l.id]));
  const todo = (data.team.states.nodes.find((s) => s.name === 'Todo') || data.team.states.nodes.find((s) => s.type === 'unstarted') || data.team.states.nodes.find((s) => s.type === 'backlog')).id;

  for (const t of TICKETS) {
    if (existing.has(t.title.toLowerCase())) { console.log(`  (skip existant) ${t.title}`); continue; }
    const labelIds = [];
    for (const n of t.labels || []) {
      if (labelMap[n]) labelIds.push(labelMap[n]);
      else if (apply) { const l = (await q(`mutation($i:IssueLabelCreateInput!){issueLabelCreate(input:$i){issueLabel{id name}}}`, { i: { name: n, teamId } })).issueLabelCreate.issueLabel; labelMap[n] = l.id; labelIds.push(l.id); }
    }
    if (!apply) { console.log(`  [DRY] ${t.priority.toUpperCase().padEnd(6)} ${t.title}`); continue; }
    const issue = (await q(`mutation($i:IssueCreateInput!){issueCreate(input:$i){issue{identifier title}}}`, { i: { teamId, title: t.title, description: t.description, priority: P[t.priority] ?? 3, stateId: todo, labelIds } })).issueCreate.issue;
    console.log(`  ✅ ${issue.identifier}  ${issue.title}`);
  }
  console.log(`\n${apply ? '✅ Terminé.' : 'ℹ️  Dry run. --apply pour créer.'}\n`);
}
main().catch((e) => { console.error('Fatal:', e); process.exit(1); });

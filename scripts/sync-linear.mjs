#!/usr/bin/env node

/**
 * sync-linear.mjs — BayIIn Linear Ticket Sync
 * 
 * Creates missing Linear tickets based on codebase analysis.
 * Detects existing tickets to avoid duplicates.
 * 
 * Usage:
 *   node scripts/sync-linear.mjs              # Dry run (preview only)
 *   node scripts/sync-linear.mjs --apply      # Create tickets for real
 *   node scripts/sync-linear.mjs --list       # List existing tickets
 */

import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

// ─── Configuration ──────────────────────────────────────────────────────────
const CONFIG = {
  teamId: '68babe6e-b1d2-4c69-ac6d-6440963d4c75',
  apiUrl: 'https://api.linear.app/graphql',
};

// Load API key from .env
function loadApiKey() {
  try {
    const envContent = readFileSync(resolve(ROOT, '.env'), 'utf-8');
    const match = envContent.match(/^LINEAR_API_KEY=(.+)$/m);
    if (match) return match[1].trim();
  } catch { /* ignore */ }
  
  // Fallback to environment variable
  if (process.env.LINEAR_API_KEY) return process.env.LINEAR_API_KEY;
  
  console.error('❌ LINEAR_API_KEY not found in .env or environment.');
  process.exit(1);
}

const API_KEY = loadApiKey();

// ─── Linear API Client ─────────────────────────────────────────────────────
async function linearQuery(query, variables = {}) {
  const res = await fetch(CONFIG.apiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': API_KEY,
    },
    body: JSON.stringify({ query, variables }),
  });
  const data = await res.json();
  if (data.errors) {
    console.error('❌ Linear API error:', JSON.stringify(data.errors, null, 2));
    process.exit(1);
  }
  return data.data;
}

// ─── Fetch existing data ────────────────────────────────────────────────────
async function getExistingTickets() {
  const data = await linearQuery(`{
    team(id: "${CONFIG.teamId}") {
      issues(first: 250) {
        nodes { id identifier title state { name } labels { nodes { id name } } priority }
      }
    }
  }`);
  return data.team.issues.nodes;
}

async function getLabels() {
  const data = await linearQuery(`{
    team(id: "${CONFIG.teamId}") {
      labels { nodes { id name } }
    }
  }`);
  return data.team.labels.nodes;
}

async function getStates() {
  const data = await linearQuery(`{
    team(id: "${CONFIG.teamId}") {
      states { nodes { id name type } }
    }
  }`);
  return data.team.states.nodes;
}

// ─── Create label if missing ────────────────────────────────────────────────
async function createLabel(name) {
  const data = await linearQuery(`
    mutation CreateLabel($input: IssueLabelCreateInput!) {
      issueLabelCreate(input: $input) {
        issueLabel { id name }
        success
      }
    }
  `, {
    input: { name, teamId: CONFIG.teamId }
  });
  return data.issueLabelCreate.issueLabel;
}

// ─── Create issue ───────────────────────────────────────────────────────────
async function createIssue({ title, description, priority, stateId, labelIds }) {
  const data = await linearQuery(`
    mutation CreateIssue($input: IssueCreateInput!) {
      issueCreate(input: $input) {
        issue { id identifier title }
        success
      }
    }
  `, {
    input: {
      teamId: CONFIG.teamId,
      title,
      description,
      priority,
      stateId,
      labelIds,
    }
  });
  return data.issueCreate.issue;
}

// ─── Priority mapping ───────────────────────────────────────────────────────
const PRIORITY = {
  none: 0,
  urgent: 1,
  high: 2,
  medium: 3,
  low: 4,
};

// ─── Missing tickets definition ─────────────────────────────────────────────
// These are modules found in the codebase but missing from Linear
const MISSING_TICKETS = [
  {
    title: 'Finances - Module KPIs & Facturation',
    description: `Module complet de gestion financière.

**Fichiers existants:**
- \`src/pages/Finances.jsx\` (60KB)
- \`src/utils/financeUtils.js\`
- \`src/utils/financials.js\`
- \`src/utils/generateInvoice.js\`
- \`src/components/InvoiceTable.jsx\`
- \`src/hooks/useReconciliation.js\`

**Fonctionnalités:**
- Tableau de bord financier avec KPIs
- Génération de factures
- Réconciliation des paiements
- Statistiques de revenus`,
    priority: 'high',
    status: 'Done',
    labels: ['Finances'],
  },
  {
    title: 'Achats - Module Fournisseurs & Approvisionnement',
    description: `Gestion des achats et des fournisseurs.

**Fichiers existants:**
- \`src/pages/Purchases.jsx\` (50KB)

**Fonctionnalités:**
- CRUD fournisseurs
- Gestion des bons de commande fournisseurs
- Suivi des livraisons entrantes
- Historique des achats`,
    priority: 'high',
    status: 'Done',
    labels: ['Catalogue'],
  },
  {
    title: 'Automations - Moteur de Règles Automatisées',
    description: `Système d'automatisation des workflows.

**Fichiers existants:**
- \`src/pages/Automations.jsx\` (48KB)
- \`src/hooks/useAutomations.js\`
- \`src/utils/automationEngine.js\`
- \`src/utils/defaultAutomations.js\`

**Fonctionnalités:**
- Création de règles automatiques (ex: relance WhatsApp après X heures)
- Déclencheurs basés sur les événements (commande, stock bas, etc.)
- Actions automatiques (notifications, changements de statut)
- Règles par défaut préconfigurées`,
    priority: 'high',
    status: 'Done',
    labels: ['Feature'],
  },
  {
    title: 'Marketing - Campagnes & Promotions',
    description: `Module de gestion marketing.

**Fichiers existants:**
- \`src/pages/Marketing.jsx\` (15KB)

**Fonctionnalités:**
- Création de promotions et codes promo
- Suivi des campagnes marketing
- Analytics marketing`,
    priority: 'medium',
    status: 'Done',
    labels: ['Feature'],
  },
  {
    title: 'HR - Gestion des Employés',
    description: `Module RH pour la gestion du personnel.

**Fichiers existants:**
- \`src/pages/HR.jsx\` (65KB)

**Fonctionnalités:**
- Fiches employés
- Gestion des contrats
- Suivi des présences
- Gestion des salaires`,
    priority: 'high',
    status: 'Done',
    labels: ['Feature'],
  },
  {
    title: 'Planning - Calendrier & Événements',
    description: `Système de planification et calendrier.

**Fichiers existants:**
- \`src/pages/Planning.jsx\` (16KB)
- \`src/components/AddEventModal.jsx\` (10KB)

**Fonctionnalités:**
- Vue calendrier des événements
- Création et gestion d'événements
- Planification des livraisons`,
    priority: 'medium',
    status: 'Done',
    labels: ['Feature'],
  },
  {
    title: 'Drivers - Gestion des Livreurs',
    description: `Module d'administration des livreurs (distinct de l'app livreur).

**Fichiers existants:**
- \`src/pages/Drivers.jsx\` (47KB)
- \`src/pages/DriverApplication.jsx\` (10KB)
- \`src/components/DriverAuth.jsx\` (16KB)

**Fonctionnalités:**
- Recrutement et onboarding livreurs
- Gestion des affectations
- Suivi des performances livreurs
- Authentification dédiée livreurs`,
    priority: 'high',
    status: 'Done',
    labels: ['Logistique'],
  },
  {
    title: 'Settings - Configuration Boutique',
    description: `Module de paramétrage complet de la boutique.

**Fichiers existants:**
- \`src/pages/Settings.jsx\` (82KB)
- \`src/pages/ShippingSettings.jsx\` (23KB)

**Fonctionnalités:**
- Configuration générale de la boutique
- Paramétrage des frais de livraison par zone
- Gestion des méthodes de paiement
- Configuration des notifications
- Gestion du thème et branding`,
    priority: 'high',
    status: 'Done',
    labels: ['Feature'],
  },
  {
    title: 'QA - Module Qualité Intégré',
    description: `Tableau de bord qualité intégré dans l'application.

**Fichiers existants:**
- \`src/pages/QA.jsx\` (39KB)
- \`src/components/QAGuide.jsx\` (10KB)

**Fonctionnalités:**
- Dashboard de qualité avec métriques
- Guide QA interactif pour les équipes
- Suivi des anomalies`,
    priority: 'medium',
    status: 'Done',
    labels: ['Feature'],
  },
  {
    title: 'Franchise - Système Multi-Magasins',
    description: `Système franchise pour la gestion multi-magasins.

**Fichiers existants:**
- \`src/pages/FranchiseDashboard.jsx\` (41KB)
- \`src/pages/FranchiseApplication.jsx\` (14KB)
- \`src/hooks/useFranchiseData.js\` (8KB)

**Fonctionnalités:**
- Dashboard agrégé multi-magasins
- Formulaire de candidature franchise
- KPIs consolidés par franchisé
- Gestion centralisée du réseau`,
    priority: 'high',
    status: 'Done',
    labels: ['Feature'],
  },
  {
    title: 'Admin - Super Admin Dashboard',
    description: `Panel d'administration globale (Super Admin).

**Fichiers existants:**
- \`src/pages/AdminDashboard.jsx\` (82KB)
- \`src/hooks/useAdminData.js\` (5KB)
- \`src/components/admin/\` (sous-composants)

**Fonctionnalités:**
- Vue globale sur tous les tenants
- Gestion des abonnements
- Métriques plateforme
- Gestion des utilisateurs`,
    priority: 'high',
    status: 'Done',
    labels: ['Dashboard'],
  },
  {
    title: 'Onboarding - Parcours d\'Inscription',
    description: `Flux complet d'inscription et d'onboarding des marchands.

**Fichiers existants:**
- \`src/pages/Landing.jsx\` (56KB)
- \`src/pages/Onboarding.jsx\` (15KB)
- \`src/pages/Signup.jsx\` (21KB)
- \`src/pages/Login.jsx\` (23KB)
- \`src/pages/Demo.jsx\` (7KB)
- \`src/components/DemoTour.jsx\` (5KB)

**Fonctionnalités:**
- Landing page marketing
- Inscription avec choix de plan
- Onboarding guidé post-inscription
- Mode démo interactif
- Tour produit`,
    priority: 'high',
    status: 'Done',
    labels: ['Feature'],
  },
  {
    title: 'RBAC - Contrôle d\'Accès par Rôle',
    description: `Système de permissions et contrôle d'accès.

**Fichiers existants:**
- \`src/utils/rolePermissions.js\` (3.5KB)
- \`src/components/RoleProtectedRoute.jsx\` (1.6KB)
- \`src/components/ProFeatureGuard.jsx\` (1.8KB)

**Fonctionnalités:**
- 3 rôles : Owner, Staff, Driver
- Routes protégées par rôle
- Feature guard pour les fonctions Pro
- Vérification des permissions au niveau composant`,
    priority: 'high',
    status: 'Done',
    labels: ['Feature'],
  },
  {
    title: 'WhatsApp - Templates de Notifications',
    description: `Système de notifications WhatsApp pour le suivi des commandes.

**Fichiers existants:**
- \`src/utils/whatsappTemplates.js\` (8KB)
- \`src/utils/notificationUtils.js\` (2KB)
- \`src/hooks/usePushNotifications.jsx\` (3KB)

**Fonctionnalités:**
- Templates de messages WhatsApp (confirmation, expédition, livraison, relance)
- Génération automatique de liens WhatsApp
- Système de notifications push
- Relance "No Answer"`,
    priority: 'medium',
    status: 'Done',
    labels: ['Feature'],
  },
  {
    title: 'AI - Risk Service (Smart COD Shield)',
    description: `Service IA d'évaluation du risque pour les commandes COD.

**Fichiers existants:**
- \`src/services/aiRiskService.js\` (2KB)
- \`src/services/productAdvisorService.js\` (5KB)

**Fonctionnalités:**
- Scoring de risque par commande
- Détection de fraude COD
- Conseils produit par IA
- Heuristiques basées sur l'historique client`,
    priority: 'medium',
    status: 'Done',
    labels: ['Beya3;AI'],
  },
  {
    title: 'Team - Gestion d\'Équipe',
    description: `Module de gestion des membres de l'équipe.

**Fichiers existants:**
- \`src/pages/Team.jsx\` (10KB)

**Fonctionnalités:**
- Invitation et gestion des membres
- Attribution des rôles
- Vue d'ensemble de l'équipe`,
    priority: 'medium',
    status: 'Done',
    labels: ['Feature'],
  },
];

// ─── Main ───────────────────────────────────────────────────────────────────
async function main() {
  const args = process.argv.slice(2);
  const dryRun = !args.includes('--apply');
  const listOnly = args.includes('--list');

  console.log('╔══════════════════════════════════════════════╗');
  console.log('║   🔄 BayIIn Linear Sync                     ║');
  console.log('╚══════════════════════════════════════════════╝');
  console.log();

  // Fetch current state
  console.log('📡 Fetching existing tickets from Linear...');
  const [existingTickets, labels, states] = await Promise.all([
    getExistingTickets(),
    getLabels(),
    getStates(),
  ]);

  console.log(`   Found ${existingTickets.length} existing tickets\n`);

  if (listOnly) {
    console.log('📋 Existing tickets:\n');
    existingTickets
      .sort((a, b) => a.identifier.localeCompare(b.identifier, undefined, { numeric: true }))
      .forEach(t => {
        const lbls = t.labels.nodes.map(l => l.name).join(', ');
        console.log(`  ${t.identifier.padEnd(8)} ${t.state.name.padEnd(13)} ${lbls.padEnd(22)} ${t.title}`);
      });
    return;
  }

  // Build lookup maps
  const labelMap = Object.fromEntries(labels.map(l => [l.name, l.id]));
  const stateMap = Object.fromEntries(states.map(s => [s.name, s.id]));
  const existingTitles = new Set(existingTickets.map(t => t.title.toLowerCase()));

  // Find missing tickets
  const toCreate = MISSING_TICKETS.filter(
    t => !existingTitles.has(t.title.toLowerCase())
  );

  if (toCreate.length === 0) {
    console.log('✅ All tickets are already in Linear. Nothing to create.\n');
    return;
  }

  console.log(`🆕 ${toCreate.length} missing tickets to create:\n`);

  for (const ticket of toCreate) {
    const statusName = ticket.status === 'Done' ? 'Done' : 'Todo';
    const stateId = stateMap[statusName];
    const priority = PRIORITY[ticket.priority] || PRIORITY.medium;

    // Resolve label IDs, create if missing
    const labelIds = [];
    for (const labelName of ticket.labels) {
      if (labelMap[labelName]) {
        labelIds.push(labelMap[labelName]);
      } else if (!dryRun) {
        console.log(`   🏷️  Creating label "${labelName}"...`);
        const newLabel = await createLabel(labelName);
        labelMap[labelName] = newLabel.id;
        labelIds.push(newLabel.id);
      }
    }

    if (dryRun) {
      console.log(`  📝 [DRY RUN] Would create: "${ticket.title}"`);
      console.log(`               Priority: ${ticket.priority} | Status: ${statusName} | Labels: ${ticket.labels.join(', ')}`);
      console.log();
    } else {
      try {
        const issue = await createIssue({
          title: ticket.title,
          description: ticket.description,
          priority,
          stateId,
          labelIds,
        });
        console.log(`  ✅ Created: ${issue.identifier} — ${issue.title}`);
      } catch (err) {
        console.error(`  ❌ Failed: "${ticket.title}" — ${err.message}`);
      }
    }
  }

  console.log();
  if (dryRun) {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('ℹ️  Dry run complete. Run with --apply to create tickets:');
    console.log('   node scripts/sync-linear.mjs --apply');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  } else {
    console.log(`✅ Sync complete. ${toCreate.length} tickets created.`);
  }
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});

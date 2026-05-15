#!/usr/bin/env node

/**
 * push-with-linear.mjs — Automated Linear-first Git Push
 *
 * Scans your current branch for changes, creates a Linear ticket if needed,
 * renames the branch to include the ticket ID, and pushes.
 *
 * Usage:
 *   node scripts/push-with-linear.mjs                    # Interactive — detects and proposes
 *   node scripts/push-with-linear.mjs --title "My title" # Override the ticket title
 *   node scripts/push-with-linear.mjs --dry-run          # Preview only, no changes
 *
 * Flow:
 *   1. Detect changed files vs develop
 *   2. Map changes to a module (Dashboard, Orders, CRM, etc.)
 *   3. Create a Linear ticket with proper labels
 *   4. Rename branch to feature/BAY-XX-description
 *   5. Amend commits to include BAY-XX reference
 *   6. Push to remote
 */

import { readFileSync } from 'fs';
import { execSync } from 'child_process';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createInterface } from 'readline';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

// ─── Config ─────────────────────────────────────────────────────────────────
const CONFIG = {
  teamId: '68babe6e-b1d2-4c69-ac6d-6440963d4c75',
  apiUrl: 'https://api.linear.app/graphql',
  baseBranch: 'develop',
};

// ─── Module detection rules ─────────────────────────────────────────────────
// Maps file path patterns to module info
const MODULE_MAP = [
  { pattern: /pages\/Dashboard/,            module: 'Dashboard',   label: 'Dashboard' },
  { pattern: /components\/ForecastingWidget/,module: 'Dashboard',   label: 'Dashboard;AI' },
  { pattern: /pages\/Orders/,               module: 'Orders',      label: 'Orders' },
  { pattern: /hooks\/useOrder/,             module: 'Orders',      label: 'Orders' },
  { pattern: /components\/OrderModal/,      module: 'Orders',      label: 'Orders' },
  { pattern: /components\/orders\//,        module: 'Orders',      label: 'Orders' },
  { pattern: /pages\/Returns/,             module: 'Orders',      label: 'Orders' },
  { pattern: /utils\/orderStateMachine/,   module: 'Orders',      label: 'Orders' },
  { pattern: /utils\/orderLogic/,          module: 'Orders',      label: 'Orders' },
  { pattern: /hooks\/useAudit/,            module: 'Orders',      label: 'Orders;Security' },
  { pattern: /components\/Copilot/,        module: 'Beya3',       label: 'Beya3;AI' },
  { pattern: /components\/CFOSimulator/,   module: 'Beya3',       label: 'Beya3;AI' },
  { pattern: /context\/CopilotContext/,    module: 'Beya3',       label: 'Beya3;AI' },
  { pattern: /services\/localCopilot/,     module: 'Beya3',       label: 'Beya3;AI' },
  { pattern: /services\/aiService/,        module: 'Beya3',       label: 'Beya3;AI' },
  { pattern: /services\/aiRiskService/,    module: 'Beya3',       label: 'Beya3;AI' },
  { pattern: /services\/productAdvisor/,   module: 'Beya3',       label: 'Beya3;AI' },
  { pattern: /services\/voiceParser/,      module: 'Beya3',       label: 'Beya3;AI' },
  { pattern: /pages\/Products/,            module: 'Catalogue',   label: 'Catalogue' },
  { pattern: /components\/ProductModal/,   module: 'Catalogue',   label: 'Catalogue' },
  { pattern: /pages\/Warehouse/,           module: 'Catalogue',   label: 'Catalogue' },
  { pattern: /pages\/Purchases/,           module: 'Catalogue',   label: 'Catalogue' },
  { pattern: /utils\/stockPrediction/,     module: 'Catalogue',   label: 'Catalogue;AI' },
  { pattern: /pages\/DeliveryApp/,         module: 'Logistique',  label: 'Logistique' },
  { pattern: /pages\/Drivers/,             module: 'Logistique',  label: 'Logistique' },
  { pattern: /pages\/DriverApplication/,   module: 'Logistique',  label: 'Logistique' },
  { pattern: /components\/DriverAuth/,     module: 'Logistique',  label: 'Logistique' },
  { pattern: /lib\/olivraison/,            module: 'Logistique',  label: 'Logistique' },
  { pattern: /lib\/sendit/,               module: 'Logistique',  label: 'Logistique' },
  { pattern: /pages\/Customers/,           module: 'CRM',         label: 'CRM' },
  { pattern: /components\/CustomerModal/,  module: 'CRM',         label: 'CRM' },
  { pattern: /utils\/aiSegmentation/,      module: 'CRM',         label: 'CRM;AI' },
  { pattern: /pages\/Finances/,            module: 'Finances',    label: 'Finances' },
  { pattern: /utils\/financials/,          module: 'Finances',    label: 'Finances' },
  { pattern: /utils\/financeUtils/,        module: 'Finances',    label: 'Finances' },
  { pattern: /utils\/generateInvoice/,     module: 'Finances',    label: 'Finances' },
  { pattern: /components\/InvoiceTable/,   module: 'Finances',    label: 'Finances' },
  { pattern: /hooks\/useReconciliation/,   module: 'Finances',    label: 'Finances' },
  { pattern: /pages\/Automations/,         module: 'Automations', label: 'Feature' },
  { pattern: /hooks\/useAutomations/,      module: 'Automations', label: 'Feature' },
  { pattern: /utils\/automationEngine/,    module: 'Automations', label: 'Feature' },
  { pattern: /pages\/Marketing/,           module: 'Marketing',   label: 'Feature' },
  { pattern: /pages\/HR/,                  module: 'HR',          label: 'Feature' },
  { pattern: /pages\/Planning/,            module: 'Planning',    label: 'Feature' },
  { pattern: /pages\/Team/,               module: 'Team',        label: 'Feature' },
  { pattern: /pages\/Settings/,            module: 'Settings',    label: 'Feature' },
  { pattern: /pages\/ShippingSettings/,    module: 'Settings',    label: 'Feature' },
  { pattern: /pages\/QA/,                 module: 'QA',          label: 'Feature' },
  { pattern: /pages\/Franchise/,           module: 'Franchise',   label: 'Feature' },
  { pattern: /pages\/AdminDashboard/,      module: 'Admin',       label: 'Dashboard' },
  { pattern: /hooks\/useAdminData/,        module: 'Admin',       label: 'Dashboard' },
  { pattern: /pages\/Landing/,             module: 'Onboarding',  label: 'Feature' },
  { pattern: /pages\/Onboarding/,          module: 'Onboarding',  label: 'Feature' },
  { pattern: /pages\/Signup/,              module: 'Onboarding',  label: 'Feature' },
  { pattern: /pages\/Login/,               module: 'Onboarding',  label: 'Feature' },
  { pattern: /pages\/PublicCatalog/,       module: 'Catalogue',   label: 'Catalogue' },
  { pattern: /components\/BiometricLock/,  module: 'PWA',         label: 'PWA;Security' },
  { pattern: /hooks\/useBiometrics/,       module: 'PWA',         label: 'PWA;Security' },
  { pattern: /services\/offlineQueue/,     module: 'PWA',         label: 'PWA' },
  { pattern: /utils\/whatsappTemplates/,   module: 'WhatsApp',    label: 'Feature' },
  { pattern: /utils\/rolePermissions/,     module: 'RBAC',        label: 'Feature' },
  { pattern: /locales\//,                  module: 'i18n',        label: 'Localization' },
  { pattern: /context\/LanguageContext/,   module: 'i18n',        label: 'Localization' },
  { pattern: /docs\//,                     module: 'Docs',        label: 'Documentation' },
  { pattern: /\.github\//,                module: 'CI/CD',       label: 'Feature' },
  { pattern: /tests\//,                   module: 'Tests',       label: 'Feature' },
  { pattern: /firestore\.rules/,          module: 'Security',    label: 'Feature' },
];

// ─── Helpers ────────────────────────────────────────────────────────────────
function git(cmd) {
  return execSync(`git ${cmd}`, { cwd: ROOT, encoding: 'utf-8' }).trim();
}

function loadApiKey() {
  try {
    const envContent = readFileSync(resolve(ROOT, '.env'), 'utf-8');
    const match = envContent.match(/^LINEAR_API_KEY=(.+)$/m);
    if (match) return match[1].trim();
  } catch { /* ignore */ }
  if (process.env.LINEAR_API_KEY) return process.env.LINEAR_API_KEY;
  console.error('❌ LINEAR_API_KEY not found in .env or environment.');
  process.exit(1);
}

async function linearQuery(apiKey, query, variables = {}) {
  const res = await fetch(CONFIG.apiUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': apiKey },
    body: JSON.stringify({ query, variables }),
  });
  const data = await res.json();
  if (data.errors) {
    console.error('❌ Linear API error:', JSON.stringify(data.errors, null, 2));
    process.exit(1);
  }
  return data.data;
}

function prompt(question) {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  return new Promise(resolve => rl.question(question, answer => {
    rl.close();
    resolve(answer.trim());
  }));
}

function toKebabCase(str) {
  return str
    .toLowerCase()
    .replace(/[àáâãäå]/g, 'a')
    .replace(/[èéêë]/g, 'e')
    .replace(/[ìíîï]/g, 'i')
    .replace(/[òóôõö]/g, 'o')
    .replace(/[ùúûü]/g, 'u')
    .replace(/[ç]/g, 'c')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 40);
}

// ─── Core Logic ─────────────────────────────────────────────────────────────

function detectChangedFiles() {
  try {
    // Files changed compared to develop
    const diffOutput = git(`diff --name-only ${CONFIG.baseBranch}...HEAD`);
    if (!diffOutput) return [];
    return diffOutput.split('\n').filter(Boolean);
  } catch {
    // If develop doesn't exist or HEAD has no commits vs develop, try staged + unstaged
    try {
      const staged = git('diff --cached --name-only');
      const unstaged = git('diff --name-only');
      const untracked = git('ls-files --others --exclude-standard');
      const all = [staged, unstaged, untracked].join('\n');
      return [...new Set(all.split('\n').filter(Boolean))];
    } catch {
      return [];
    }
  }
}

function detectModules(files) {
  const detected = new Map(); // module -> { label, files }

  for (const file of files) {
    for (const rule of MODULE_MAP) {
      if (rule.pattern.test(file)) {
        if (!detected.has(rule.module)) {
          detected.set(rule.module, { label: rule.label, files: [] });
        }
        detected.get(rule.module).files.push(file);
        break;
      }
    }
  }

  return detected;
}

function inferCommitType(files) {
  const hasNew = files.some(f => {
    try { git(`log --diff-filter=A --name-only --pretty=format: ${CONFIG.baseBranch}..HEAD -- "${f}"`); return true; }
    catch { return false; }
  });
  const hasFix = files.some(f => f.includes('fix') || f.includes('hotfix'));
  const hasTest = files.some(f => f.includes('test'));
  const hasDocs = files.every(f => f.startsWith('docs/'));

  if (hasDocs) return 'docs';
  if (hasTest) return 'test';
  if (hasFix) return 'fix';
  return 'feat';
}

function generateTicketTitle(modules, branchName) {
  if (modules.size === 1) {
    const [moduleName] = modules.keys();
    return `${moduleName} - ${branchName.replace(/^(feature|fix|hotfix)\//, '').replace(/-/g, ' ')}`;
  }
  // Multiple modules
  const moduleNames = [...modules.keys()].slice(0, 3).join(', ');
  return `${moduleNames} - Updates`;
}

function generateDescription(modules) {
  let desc = '## Fichiers modifiés\n\n';
  for (const [moduleName, info] of modules) {
    desc += `### ${moduleName}\n`;
    for (const file of info.files) {
      desc += `- \`${file}\`\n`;
    }
    desc += '\n';
  }
  desc += '\n*Ticket créé automatiquement par sync-linear.*';
  return desc;
}

// ─── Priority mapping ───────────────────────────────────────────────────────
const PRIORITY_MAP = { urgent: 1, high: 2, medium: 3, low: 4 };

// ─── Main ───────────────────────────────────────────────────────────────────
async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const titleOverride = args.includes('--title')
    ? args[args.indexOf('--title') + 1]
    : null;
  const priorityOverride = args.includes('--priority')
    ? args[args.indexOf('--priority') + 1]
    : null;

  console.log('╔══════════════════════════════════════════════════╗');
  console.log('║   🚀 BayIIn Push-with-Linear                    ║');
  console.log('╚══════════════════════════════════════════════════╝\n');

  const apiKey = loadApiKey();

  // ── Step 1: Check current branch ──────────────────────────────────────
  const currentBranch = git('branch --show-current');
  console.log(`📌 Current branch: ${currentBranch}`);

  if (currentBranch === 'master' || currentBranch === 'main' || currentBranch === 'develop') {
    console.error(`❌ You are on "${currentBranch}". Create a feature branch first:`);
    console.error(`   git checkout -b feature/my-feature develop`);
    process.exit(1);
  }

  // Check if branch already has a Linear ID
  const existingMatch = currentBranch.match(/BAY-(\d+)/);
  if (existingMatch) {
    console.log(`✅ Branch already linked to ticket BAY-${existingMatch[1]}`);
    console.log(`   Pushing directly...\n`);
    if (!dryRun) {
      try {
        console.log(git(`push -u origin ${currentBranch}`));
      } catch (e) {
        console.log(git(`push origin ${currentBranch}`));
      }
      console.log('\n✅ Push complete.');
    } else {
      console.log('   [DRY RUN] Would push to remote.');
    }
    return;
  }

  // ── Step 2: Detect changes ────────────────────────────────────────────
  console.log(`\n🔍 Scanning changes vs ${CONFIG.baseBranch}...\n`);

  const changedFiles = detectChangedFiles();
  if (changedFiles.length === 0) {
    console.log('⚠️  No changed files detected. Nothing to do.');
    process.exit(0);
  }

  const modules = detectModules(changedFiles);
  const commitType = inferCommitType(changedFiles);

  console.log(`   ${changedFiles.length} file(s) changed across ${modules.size} module(s):`);
  for (const [name, info] of modules) {
    console.log(`   • ${name} (${info.files.length} files) → label: ${info.label}`);
  }

  const unmapped = changedFiles.filter(f => !MODULE_MAP.some(r => r.pattern.test(f)));
  if (unmapped.length > 0) {
    console.log(`   • (${unmapped.length} files not mapped to a module)`);
  }

  // ── Step 3: Generate ticket info ──────────────────────────────────────
  const suggestedTitle = titleOverride || generateTicketTitle(modules, currentBranch);
  const description = generateDescription(modules);
  const priority = priorityOverride || (modules.size > 2 ? 'high' : 'medium');
  const primaryLabel = modules.size > 0 ? [...modules.values()][0].label : 'Feature';

  console.log(`\n📝 Proposed Linear ticket:`);
  console.log(`   Title:    ${suggestedTitle}`);
  console.log(`   Priority: ${priority}`);
  console.log(`   Label:    ${primaryLabel}`);
  console.log(`   Type:     ${commitType}`);

  // ── Step 4: Confirm ───────────────────────────────────────────────────
  if (!dryRun) {
    const answer = await prompt('\n🟡 Create ticket and push? (Y/n/edit) > ');
    if (answer.toLowerCase() === 'n') {
      console.log('❌ Cancelled.');
      process.exit(0);
    }

    let finalTitle = suggestedTitle;
    if (answer.toLowerCase() === 'edit' || answer.toLowerCase() === 'e') {
      finalTitle = await prompt('   New title > ');
      if (!finalTitle) {
        console.log('❌ Empty title. Cancelled.');
        process.exit(0);
      }
    }

    // ── Step 5: Fetch Linear metadata ─────────────────────────────────
    console.log('\n📡 Connecting to Linear...');

    const [labelsData, statesData] = await Promise.all([
      linearQuery(apiKey, `{ team(id: "${CONFIG.teamId}") { labels { nodes { id name } } } }`),
      linearQuery(apiKey, `{ team(id: "${CONFIG.teamId}") { states { nodes { id name type } } } }`),
    ]);

    const labels = labelsData.team.labels.nodes;
    const states = statesData.team.states.nodes;
    const labelMap = Object.fromEntries(labels.map(l => [l.name, l.id]));
    const inProgressState = states.find(s => s.name === 'In Progress');

    // Resolve label
    let labelId = labelMap[primaryLabel];
    if (!labelId) {
      // Create label
      const newLabel = await linearQuery(apiKey, `
        mutation { issueLabelCreate(input: { name: "${primaryLabel}", teamId: "${CONFIG.teamId}" }) {
          issueLabel { id name } success
        }}
      `);
      labelId = newLabel.issueLabelCreate.issueLabel.id;
    }

    // ── Step 6: Create Linear ticket ──────────────────────────────────
    console.log('🎫 Creating Linear ticket...');

    const issueData = await linearQuery(apiKey, `
      mutation CreateIssue($input: IssueCreateInput!) {
        issueCreate(input: $input) {
          issue { id identifier title url }
          success
        }
      }
    `, {
      input: {
        teamId: CONFIG.teamId,
        title: finalTitle,
        description,
        priority: PRIORITY_MAP[priority] || 3,
        stateId: inProgressState.id,
        labelIds: [labelId],
      }
    });

    const ticket = issueData.issueCreate.issue;
    console.log(`   ✅ Created: ${ticket.identifier} — ${ticket.title}`);
    console.log(`   🔗 ${ticket.url}`);

    // ── Step 7: Rename branch ─────────────────────────────────────────
    const branchSlug = currentBranch.replace(/^(feature|fix|hotfix)\//, '');
    const branchType = currentBranch.startsWith('hotfix/') ? 'hotfix' : 
                       currentBranch.startsWith('fix/') ? 'fix' : 'feature';
    const newBranch = `${branchType}/${ticket.identifier}-${toKebabCase(branchSlug)}`;

    console.log(`\n🔀 Renaming branch: ${currentBranch} → ${newBranch}`);
    git(`branch -m ${currentBranch} ${newBranch}`);

    // ── Step 8: Amend last commit with ticket reference ───────────────
    try {
      const lastMsg = git('log -1 --pretty=%s');
      if (!lastMsg.includes(ticket.identifier)) {
        const newMsg = lastMsg.includes(' - ')
          ? lastMsg.replace(/$/, ` - ${ticket.identifier}`)
          : `${commitType}(${[...modules.keys()][0]?.toLowerCase() || 'app'}): ${lastMsg} - ${ticket.identifier}`;
        
        console.log(`📝 Amending commit: "${newMsg}"`);
        git(`commit --amend -m "${newMsg.replace(/"/g, '\\"')}"`);
      }
    } catch {
      console.log('   ⚠️  Could not amend commit (no commits on branch yet).');
    }

    // ── Step 9: Push ──────────────────────────────────────────────────
    console.log(`\n⬆️  Pushing ${newBranch} to remote...`);
    try {
      console.log(git(`push -u origin ${newBranch}`));
    } catch (e) {
      // If remote already exists with old name, force
      console.log(git(`push -u origin ${newBranch} --force`));
    }

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`✅ Done! Branch "${newBranch}" pushed with ticket ${ticket.identifier}`);
    console.log(`🔗 ${ticket.url}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  } else {
    // Dry run output
    const branchSlug = currentBranch.replace(/^(feature|fix|hotfix)\//, '');
    const branchType = currentBranch.startsWith('hotfix/') ? 'hotfix' : 'feature';
    console.log(`\n🔀 Branch would be renamed: ${currentBranch} → ${branchType}/BAY-XX-${toKebabCase(branchSlug)}`);
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('ℹ️  Dry run. Run without --dry-run to create ticket and push.');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  }
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});

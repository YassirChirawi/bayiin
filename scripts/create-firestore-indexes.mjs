#!/usr/bin/env node
/**
 * create-firestore-indexes.mjs
 *
 * Crée les index composites de firestore.indexes.json sur la base Firestore NOMMÉE (comsaas)
 * via l'API REST Admin. Contourne un bug de firebase-tools : `firebase deploy --only
 * firestore:indexes` échoue en config multi-base avec
 *   TypeError: Cannot read properties of undefined (reading 'map')  (deploy/firestore/deploy.js)
 * → context.firestore.indexes n'est pas peuplé. Tant que ce bug n'est pas corrigé, déployer les
 * index avec ce script au lieu du CLI.
 *
 * Auth : réutilise le refresh token du firebase CLI déjà connecté (configstore). Ne l'affiche pas.
 * Usage : node scripts/create-firestore-indexes.mjs [--database comsaas]
 */
import { readFileSync } from 'fs';
import { homedir } from 'os';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const arg = (name, def) => { const i = process.argv.indexOf(name); return i >= 0 ? process.argv[i + 1] : def; };
const DATABASE = arg('--database', 'comsaas');

// Identifiants OAuth PUBLICS du firebase CLI (constantes connues, non secrètes).
const CLIENT_ID = '563584335869-fgrhgmd47bqnekij5i8b5pr03ho849e6.apps.googleusercontent.com';
const CLIENT_SECRET = 'j9iVZfS8kkCEFUPaAeJV0sAi';

function projectId() {
  const rc = JSON.parse(readFileSync(resolve(ROOT, '.firebaserc'), 'utf8'));
  const id = rc?.projects?.default;
  if (!id) throw new Error('Projet introuvable dans .firebaserc (projects.default).');
  return id;
}

async function getAccessToken() {
  const credPath = resolve(homedir(), '.config', 'configstore', 'firebase-tools.json');
  const cred = JSON.parse(readFileSync(credPath, 'utf8'));
  const refresh = cred?.tokens?.refresh_token;
  if (!refresh) throw new Error(`Pas de refresh_token dans ${credPath} — lance d'abord: firebase login`);
  const r = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ client_id: CLIENT_ID, client_secret: CLIENT_SECRET, refresh_token: refresh, grant_type: 'refresh_token' }),
  });
  const d = await r.json();
  if (!d.access_token) throw new Error('Échec obtention access_token: ' + JSON.stringify(d));
  return d.access_token;
}

async function main() {
  const PROJECT = projectId();
  const token = await getAccessToken();
  const spec = JSON.parse(readFileSync(resolve(ROOT, 'firestore.indexes.json'), 'utf8'));
  const indexes = spec.indexes || [];
  console.log(`Projet ${PROJECT} · base '${DATABASE}' · ${indexes.length} index composites.\n`);

  let created = 0, exists = 0, failed = 0;
  for (const idx of indexes) {
    const cg = idx.collectionGroup;
    const url = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/${DATABASE}/collectionGroups/${cg}/indexes`;
    const body = { queryScope: idx.queryScope || 'COLLECTION', fields: idx.fields.map((f) => ({ fieldPath: f.fieldPath, order: f.order })) };
    const label = `${cg} [${idx.fields.map((f) => `${f.fieldPath}:${f.order === 'DESCENDING' ? 'DESC' : 'ASC'}`).join(', ')}]`;
    try {
      const r = await fetch(url, { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const d = await r.json().catch(() => ({}));
      if (r.ok) { console.log(`  ✅ créé       ${label}`); created++; }
      else if (r.status === 409 || /already exists/i.test(d?.error?.message || '')) { console.log(`  ↺ existe déjà ${label}`); exists++; }
      else { console.log(`  ❌ échec (${r.status}) ${label} → ${d?.error?.message || JSON.stringify(d)}`); failed++; }
    } catch (e) { console.log(`  ❌ exception  ${label} → ${e.message}`); failed++; }
  }
  console.log(`\nRésumé : ${created} créés · ${exists} déjà présents · ${failed} échecs.`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((e) => { console.error('Fatal:', e.message); process.exit(1); });

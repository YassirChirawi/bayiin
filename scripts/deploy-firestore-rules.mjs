#!/usr/bin/env node
/**
 * Déploie firestore.rules sur une base Firestore NOMMÉE, via l'API Rules.
 *
 * Contourne le même bug de firebase-tools que scripts/create-firestore-indexes.mjs :
 * en configuration multi-base, `firebase deploy --only firestore:rules` affiche
 * « Deploy complete! » sans rien publier. Vérifié : le ruleset actif de
 * 'comsaas' datait du 2026-08-20 après un déploiement annoncé réussi.
 *
 * Usage :
 *   node scripts/deploy-firestore-rules.mjs            # simulation
 *   node scripts/deploy-firestore-rules.mjs --apply    # publie
 *   node scripts/deploy-firestore-rules.mjs --release cloud.firestore --apply
 *
 * Vérifier ensuite avec : node scripts/verify-firestore-rules.mjs
 */
import { readFileSync } from 'fs';
import { homedir } from 'os';
import { resolve } from 'path';

import { dirname } from 'path';
import { fileURLToPath } from 'url';

const arg = (n, d) => { const i = process.argv.indexOf(n); return i >= 0 ? process.argv[i + 1] : d; };
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const RELEASE = arg('--release', 'cloud.firestore/comsaas');
const APPLY = process.argv.includes('--apply');

const CLIENT_ID = '563584335869-fgrhgmd47bqnekij5i8b5pr03ho849e6.apps.googleusercontent.com';
const CLIENT_SECRET = 'j9iVZfS8kkCEFUPaAeJV0sAi';
const PROJECT = JSON.parse(readFileSync(resolve(ROOT, '.firebaserc'), 'utf8')).projects.default;
const SOURCE = readFileSync(resolve(ROOT, 'firestore.rules'), 'utf8');

// En CI il n'y a pas de configstore : FIREBASE_TOKEN est un refresh token du
// CLI firebase, utilisable avec le même échange OAuth.
function refreshToken() {
  if (process.env.FIREBASE_TOKEN) return process.env.FIREBASE_TOKEN;
  const p = resolve(homedir(), '.config', 'configstore', 'firebase-tools.json');
  const t = JSON.parse(readFileSync(p, 'utf8'))?.tokens?.refresh_token;
  if (!t) throw new Error(`Pas de refresh_token dans ${p} — lance: firebase login`);
  return t;
}

const token = await (async () => {
  const r = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: CLIENT_ID, client_secret: CLIENT_SECRET,
      refresh_token: refreshToken(), grant_type: 'refresh_token',
    }),
  });
  const d = await r.json();
  if (!d.access_token) throw new Error('access_token: ' + JSON.stringify(d));
  return d.access_token;
})();

const H = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
const base = `https://firebaserules.googleapis.com/v1`;

// État courant
const { releases = [] } = await (await fetch(
  `${base}/projects/${PROJECT}/releases`, { headers: H })).json();
const current = releases.find((r) => r.name.endsWith(`/releases/${RELEASE}`));
if (!current) throw new Error(`Release introuvable: ${RELEASE}`);

console.log(`Projet   : ${PROJECT}`);
console.log(`Release  : ${RELEASE}`);
console.log(`Actuel   : ${current.rulesetName.split('/rulesets/')[1]} (${current.updateTime})`);
console.log(`Source   : firestore.rules, ${SOURCE.length} caractères`);

if (!APPLY) {
  console.log('\n(simulation — relancer avec --apply pour publier)');
  process.exit(0);
}

// 1. Créer le ruleset. L'API refuse une source invalide : c'est la validation.
const rsRes = await fetch(`${base}/projects/${PROJECT}/rulesets`, {
  method: 'POST',
  headers: H,
  body: JSON.stringify({ source: { files: [{ name: 'firestore.rules', content: SOURCE }] } }),
});
const rs = await rsRes.json();
if (!rsRes.ok) {
  console.error('\n❌ Ruleset refusé :', JSON.stringify(rs.error ?? rs, null, 2));
  process.exit(1);
}
const rulesetId = rs.name.split('/rulesets/')[1];
console.log(`\n✅ Ruleset créé : ${rulesetId}`);

// 2. Pointer la release dessus. Le nom contient un slash : ne pas l'encoder,
//    le pattern de l'API est {name=projects/*/releases/**}.
const relRes = await fetch(`${base}/${current.name}`, {
  method: 'PATCH',
  headers: H,
  body: JSON.stringify({ release: { name: current.name, rulesetName: rs.name } }),
});
const rel = await relRes.json();
if (!relRes.ok) {
  console.error('\n❌ Release non mise à jour :', JSON.stringify(rel.error ?? rel, null, 2));
  console.error(`   Le ruleset ${rulesetId} existe mais n'est pas actif.`);
  process.exit(1);
}
console.log(`✅ Release ${RELEASE} → ruleset ${rulesetId}`);
console.log(`   ${rel.updateTime}`);

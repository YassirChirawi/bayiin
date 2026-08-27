#!/usr/bin/env node
/**
 * Vérifie QUELLES règles sont réellement actives sur chaque base Firestore du
 * projet, et si elles contiennent bien le bloc contact_requests.
 *
 * Le CLI firebase est connu pour mal gérer les configs multi-base (cf.
 * scripts/create-firestore-indexes.mjs) : « Deploy complete! » ne prouve pas
 * que la base NOMMÉE a été mise à jour. On interroge donc l'API Rules.
 *
 * Auth : réutilise le refresh token du firebase CLI déjà connecté.
 *
 * Usage : node scripts/verify-firestore-rules.mjs
 * Sortie 0 si toutes les bases portent la règle contact_requests, 1 sinon.
 */
import { readFileSync } from 'fs';
import { homedir } from 'os';
import { resolve } from 'path';

import { dirname } from 'path';
import { fileURLToPath } from 'url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const CLIENT_ID = '563584335869-fgrhgmd47bqnekij5i8b5pr03ho849e6.apps.googleusercontent.com';
const CLIENT_SECRET = 'j9iVZfS8kkCEFUPaAeJV0sAi';

const PROJECT = JSON.parse(readFileSync(resolve(ROOT, '.firebaserc'), 'utf8')).projects.default;

async function getAccessToken() {
  // En CI il n'y a pas de configstore : FIREBASE_TOKEN est un refresh token du
  // CLI firebase, utilisable avec le même échange OAuth.
  let refresh = process.env.FIREBASE_TOKEN;
  if (!refresh) {
    const credPath = resolve(homedir(), '.config', 'configstore', 'firebase-tools.json');
    refresh = JSON.parse(readFileSync(credPath, 'utf8'))?.tokens?.refresh_token;
    if (!refresh) throw new Error(`Pas de refresh_token dans ${credPath} — lance: firebase login`);
  }
  const r = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: CLIENT_ID, client_secret: CLIENT_SECRET,
      refresh_token: refresh, grant_type: 'refresh_token',
    }),
  });
  const d = await r.json();
  if (!d.access_token) throw new Error('Échec access_token: ' + JSON.stringify(d));
  return d.access_token;
}

const api = async (token, url) => {
  const r = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(`${r.status} ${url} → ${d?.error?.message || ''}`);
  return d;
};

const main = async () => {
  const token = await getAccessToken();

  const { releases = [] } = await api(
    token, `https://firebaserules.googleapis.com/v1/projects/${PROJECT}/releases`);

  const firestore = releases.filter((r) => r.name.includes('cloud.firestore'));
  console.log(`Projet ${PROJECT} — ${firestore.length} release(s) Firestore\n`);

  let allGood = true;
  for (const rel of firestore) {
    const shortName = rel.name.split('/releases/')[1];
    const rs = await api(token, `https://firebaserules.googleapis.com/v1/${rel.rulesetName}`);
    const src = (rs.source?.files || []).map((f) => f.content).join('\n');

    const hasContact = /match\s+\/contact_requests\//.test(src);
    const updated = rel.updateTime || rel.createTime;

    console.log(`  ${hasContact ? '✅' : '❌'} ${shortName}`);
    console.log(`     ruleset  : ${rs.name.split('/rulesets/')[1]}`);
    console.log(`     mis à jour: ${updated}`);
    console.log(`     contact_requests : ${hasContact ? 'PRÉSENT' : 'ABSENT'}`);
    console.log(`     taille   : ${src.length} caractères\n`);
    if (!hasContact) allGood = false;
  }

  console.log(allGood
    ? '→ Toutes les bases Firestore portent bien la règle contact_requests.'
    : '→ ATTENTION : au moins une base ne porte PAS la règle. Le formulaire y sera rejeté.');
  process.exit(allGood ? 0 : 1);
};

main().catch((e) => { console.error('ERREUR:', e.message); process.exit(2); });

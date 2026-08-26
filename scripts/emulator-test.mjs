#!/usr/bin/env node
/**
 * emulator-test.mjs — lance les suites de tests sur l'émulateur Firebase en garantissant un
 * JDK >= 21 sur le PATH.
 *
 * Contexte : firebase-tools exige désormais Java 21+. Sur cette machine, le `java` par défaut est
 * un Java 8/17 (Oracle javapath + jdk-17) → l'émulateur refuse de démarrer. Plutôt que de bidouiller
 * le PATH système (ordre Machine/User imprévisible, setx tronque), ce wrapper détecte un JDK 21
 * (JBR d'Android Studio, ou tout JDK 21 sous Program Files) et le préfixe au PATH pour la commande.
 * Sur CI/Linux où `java` est déjà en 21, il ne change rien.
 *
 * Usage : node scripts/emulator-test.mjs <integration|rules|e2e|all>
 */
import { spawnSync } from 'child_process';
import { existsSync, readdirSync } from 'fs';
import { join, delimiter } from 'path';

const SUITES = {
    integration: { only: 'firestore', inner: 'vitest run --config vitest.emulator.config.js tests/integration' },
    rules: { only: 'firestore', inner: 'vitest run --config vitest.emulator.config.js tests/rules' },
    e2e: { only: 'auth,firestore', inner: 'playwright test tests/e2e' },
    all: { only: 'firestore', inner: 'vitest run --config vitest.emulator.config.js' },
};

/** Version majeure d'un `java` (java -version écrit sur stderr). 0 si introuvable. */
function javaMajor(javaExe) {
    const r = spawnSync(javaExe, ['-version'], { encoding: 'utf8' });
    if (r.error) return 0;
    const m = ((r.stderr || '') + (r.stdout || '')).match(/version "?(\d+)/);
    return m ? parseInt(m[1], 10) : 0;
}

/** Renvoie le dossier bin d'un JDK >= 21, ou null si le `java` courant convient déjà. */
function findJdk21Bin() {
    if (javaMajor('java') >= 21) return null; // déjà bon (CI Linux, ou PATH correct)

    const candidates = [];
    if (process.env.JAVA_HOME) candidates.push(join(process.env.JAVA_HOME, 'bin'));
    // JBR bundlé avec Android Studio (OpenJDK 21 sur les versions récentes).
    candidates.push('C:\\Program Files\\Android\\Android Studio\\jbr\\bin');
    // Scan des emplacements JDK usuels sous Program Files.
    const roots = [
        'C:\\Program Files\\Java',
        'C:\\Program Files\\Eclipse Adoptium',
        'C:\\Program Files\\Microsoft',
        'C:\\Program Files\\Amazon Corretto',
        'C:\\Program Files\\Zulu',
    ];
    for (const root of roots) {
        try {
            for (const d of readdirSync(root)) candidates.push(join(root, d, 'bin'));
        } catch { /* dossier absent */ }
    }

    for (const bin of candidates) {
        const exe = join(bin, process.platform === 'win32' ? 'java.exe' : 'java');
        if (existsSync(exe) && javaMajor(exe) >= 21) return bin;
    }
    return null;
}

function main() {
    const suiteName = process.argv[2];
    // Arguments supplementaires transmis au lanceur interne, pour pouvoir cibler
    // un projet ou une spec : npm run test:e2e -- --project=mobile-safari
    const extraArgs = process.argv.slice(3);
    const suite = SUITES[suiteName];
    if (!suite) {
        console.error(`Suite inconnue: ${suiteName}. Attendu: ${Object.keys(SUITES).join(' | ')}`);
        process.exit(2);
    }

    const env = { ...process.env };
    const jdk21bin = findJdk21Bin();
    if (jdk21bin) {
        console.log(`[emulator-test] JDK 21 utilisé : ${jdk21bin}`);
        env.PATH = jdk21bin + delimiter + (env.PATH || '');
        env.JAVA_HOME = jdk21bin.replace(/[\\/]bin$/, '');
    } else if (javaMajor('java') < 21) {
        console.error('[emulator-test] Aucun JDK >= 21 trouvé. Installe un JDK 21 (ex: Temurin/Adoptium).');
        process.exit(1);
    }

    const inner = [suite.inner, ...extraArgs].join(' ');
    const cmd = `firebase emulators:exec --only ${suite.only} "${inner}"`;
    const r = spawnSync(cmd, { shell: true, stdio: 'inherit', env });
    process.exit(r.status ?? 1);
}

main();

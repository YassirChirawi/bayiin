import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const FILE = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    "../../src/locales/translations.js"
);
const SRC = fs.readFileSync(FILE, "utf8");

/** Découpe le fichier en blocs de langue et renvoie les clés de chacun. */
const blocks = () => {
    const starts = [...SRC.matchAll(/^ {4}(\w+): \{/gm)].map((m) => ({ lang: m[1], at: m.index }));
    return Object.fromEntries(starts.map((s, i) => {
        const end = i + 1 < starts.length ? starts[i + 1].at : SRC.length;
        const body = SRC.slice(s.at, end);
        const entries = [...body.matchAll(/^ {8}(\w+): (.*)$/gm)];
        return [s.lang, { body, keys: new Set(entries.map((e) => e[1])), entries }];
    }));
};

const B = blocks();

describe("i18n — structure", () => {
    it("expose exactement les trois langues attendues", () => {
        expect(Object.keys(B).sort()).toEqual(["ar", "en", "fr"]);
    });

    it("aucune clé dupliquée (la dernière écraserait silencieusement la première)", () => {
        for (const [lang, { entries }] of Object.entries(B)) {
            const seen = new Set();
            const dupes = [];
            for (const [, key] of entries) {
                if (seen.has(key)) dupes.push(key);
                seen.add(key);
            }
            expect(dupes, `doublons dans le bloc ${lang}`).toEqual([]);
        }
    });
});

describe("i18n — complétude", () => {
    // Le français est la langue de référence : c'est la plus complète et celle
    // dans laquelle le produit est conçu.
    const REF = "fr";

    // Seuils de NON-RÉGRESSION, pas des cibles. Ils constatent l'état actuel et
    // empêchent qu'il empire. Les faire baisser au fur et à mesure des
    // traductions — voir docs/LAUNCH_AUDIT.md.
    const MAX_MISSING = { en: 35, ar: 10 };
    const MAX_PLACEHOLDERS = { ar: 639, en: 0, fr: 0 };

    for (const lang of ["en", "ar"]) {
        it(`${lang} : le nombre de clés manquantes ne doit pas augmenter`, () => {
            const missing = [...B[REF].keys].filter((k) => !B[lang].keys.has(k));
            expect(missing.length).toBeLessThanOrEqual(MAX_MISSING[lang]);
        });
    }

    for (const lang of Object.keys(MAX_PLACEHOLDERS)) {
        it(`${lang} : les valeurs encore non traduites ne doivent pas augmenter`, () => {
            // Marqueur laissé par la génération automatique : « Some text (AR) ».
            const placeholders = [...B[lang].body.matchAll(/^ {8}\w+: "[^"]*\((AR|EN|FR)\)",$/gm)];
            expect(placeholders.length).toBeLessThanOrEqual(MAX_PLACEHOLDERS[lang]);
        });
    }

    it("l'arabe reste très largement non traduit — garde explicite", () => {
        // 639 des ~900 clés arabes sont de l'anglais suffixé « (AR) », alors que
        // l'arabe est proposé dans l'app et que le RTL est appliqué. Ce test
        // existe pour que ce fait reste visible plutôt que d'être oublié.
        const placeholders = [...B.ar.body.matchAll(/^ {8}\w+: "[^"]*\(AR\)",$/gm)].length;
        const ratio = placeholders / B.ar.keys.size;
        expect(ratio).toBeGreaterThan(0.5); // À SUPPRIMER une fois l'arabe traduit.
    });
});

describe("i18n — interpolation", () => {
    // t(key, params) remplace les {placeholder}. Un appel t(key) sur une chaine
    // qui en contient un affiche l'accolade telle quelle a l'utilisateur.
    // C'est arrive dans l'onboarding : « Etape {step} sur 3 » etait montre a
    // chaque nouveau marchand, le repli `|| ...` ne s'appliquant jamais puisque
    // t() renvoyait bien une valeur non vide.
    const SRC_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../src");

    const walk = (dir) => fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
        const p = path.join(dir, e.name);
        if (e.isDirectory()) return walk(p);
        return /[.]jsx?$/.test(e.name) && !/[.]test[.]/.test(e.name) ? [p] : [];
    });

    it("aucun texte a placeholder n'est affiche sans interpolation", () => {
        // {3} ou {2,4} sont des quantificateurs regex, pas des placeholders.
        const withPlaceholder = new Set();
        for (const [, key, value] of SRC.matchAll(/^ {8}(\w+): "([^"]*)",$/gm)) {
            const names = [...value.matchAll(/[{](\w+)[}]/g)].map((m) => m[1]);
            if (names.some((n) => !/^\d+$/.test(n))) withPlaceholder.add(key);
        }

        const offenders = [];
        for (const file of walk(SRC_DIR)) {
            fs.readFileSync(file, "utf8").split("\n").forEach((line, i) => {
                for (const m of line.matchAll(/\bt[(]\s*['"](\w+)['"]\s*[)]/g)) {
                    if (!withPlaceholder.has(m[1])) continue;
                    // L'interpolation peut aussi se faire par .replace() chaine.
                    if (line.slice(m.index + m[0].length).trimStart().startsWith(".replace")) continue;
                    offenders.push(`${path.relative(SRC_DIR, file).split(path.sep).join("/")}:${i + 1} t('${m[1]}')`);
                }
            });
        }
        expect(offenders).toEqual([]);
    });
});

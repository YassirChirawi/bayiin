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

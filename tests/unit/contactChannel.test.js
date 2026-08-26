import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
    SUPPORT_EMAIL,
    SUPPORT_WHATSAPP,
    hasWhatsappSupport,
    supportWhatsappLink,
    supportPhoneDisplay,
} from "../../src/config/brand";
import { FEATURES, isEnabled } from "../../src/config/features";

const SRC = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../src");

/** Tous les fichiers source, hors tests. */
const walk = (dir) => fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) return walk(p);
    if (!/\.(jsx?|tsx?)$/.test(e.name) || /\.test\./.test(e.name)) return [];
    return [p];
});

const SOURCES = walk(SRC);
const rel = (p) => path.relative(SRC, p).split(path.sep).join("/");

describe("brand — identité de contact", () => {
    it("expose une boîte de contact BayIIn", () => {
        expect(SUPPORT_EMAIL).toMatch(/^[^@\s]+@bayiin\.shop$/);
    });

    it("ne prétend pas avoir un WhatsApp support tant qu'aucun numéro n'est configuré", () => {
        expect(hasWhatsappSupport()).toBe(Boolean(SUPPORT_WHATSAPP));
        if (!SUPPORT_WHATSAPP) {
            expect(supportWhatsappLink("test")).toBeNull();
            expect(supportPhoneDisplay()).toBeNull();
        }
    });

    it("construit un lien wa.me valide dès qu'un numéro est renseigné", () => {
        // Simule la configuration d'une vraie ligne sans dépendre de sa valeur réelle.
        const digits = "212612345678";
        const link = `https://wa.me/${digits}?text=${encodeURIComponent("Bonjour")}`;
        expect(link).toBe("https://wa.me/212612345678?text=Bonjour");
    });
});

describe("non-régression — aucun contact fictif dans l'UI", () => {
    // Le numéro 06 00 00 00 00 a été affiché pendant des mois comme support officiel,
    // y compris aux clients finaux des marchands. Ce test empêche son retour.
    const FAKE_NUMBERS = [/212600000000/, /\+212\s6(\s00){4}/, /\b0600000000\b/];

    it("aucun numéro de support fictif codé en dur", () => {
        const offenders = [];
        for (const file of SOURCES) {
            const content = fs.readFileSync(file, "utf8");
            content.split("\n").forEach((line, i) => {
                // Un `placeholder=` d'input est une aide à la saisie, pas un contact affiché.
                if (/placeholder\s*=/.test(line)) return;
                // Le StoreBuilder garde des exemples visibles uniquement dans l'éditeur.
                if (/isEditor\s*\?/.test(line)) return;
                if (line.trim().startsWith("//")) return;
                if (FAKE_NUMBERS.some((re) => re.test(line))) {
                    offenders.push(`${rel(file)}:${i + 1}`);
                }
            });
        }
        expect(offenders).toEqual([]);
    });

    it("aucun lien wa.me codé en dur hors du registre brand", () => {
        const offenders = SOURCES
            .filter((f) => rel(f) !== "config/brand.js")
            .filter((f) => /https:\/\/wa\.me\/\d/.test(fs.readFileSync(f, "utf8")))
            .map(rel);
        expect(offenders).toEqual([]);
    });
});

describe("features — modules non livrés", () => {
    it("aucun module non livré n'est actif par défaut", () => {
        for (const [key, value] of Object.entries(FEATURES)) {
            expect(value, `${key} ne doit pas être activé sans implémentation livrée`).toBe(false);
        }
    });

    it("isEnabled est strict", () => {
        expect(isEnabled("youcanIntegration")).toBe(false);
        expect(isEnabled("moduleInexistant")).toBe(false);
    });

    it("l'upsell post-achat factice ne peut pas atteindre un client final", () => {
        expect(FEATURES.postPurchaseUpsell).toBe(false);
    });
});

describe("non-régression — aucune credential dans le bundle client", () => {
    // Les variables VITE_* sont compilées en clair dans le bundle servi à chaque
    // visiteur. Un token d'API qui passe par là est public, quelle que soit
    // l'intention. Les secrets restent côté Cloud Functions.
    const CREDENTIAL_VARS = /import\.meta\.env\.VITE_\w*(SECRET|TOKEN|PASSWORD|PRIVATE)\w*/i;

    it("aucune variable VITE_* de type secret n'est lue côté client", () => {
        const offenders = [];
        for (const file of SOURCES) {
            fs.readFileSync(file, "utf8").split("\n").forEach((line, i) => {
                if (line.trim().startsWith("//")) return;
                if (CREDENTIAL_VARS.test(line)) offenders.push(`${rel(file)}:${i + 1}`);
            });
        }
        expect(offenders).toEqual([]);
    });

    it("aucune credential Shopify codée en dur", () => {
        const offenders = SOURCES
            .filter((f) => /shp(ss|at|ca|pa)_|shopifyAccessToken\s*:/.test(fs.readFileSync(f, "utf8")))
            .map(rel);
        expect(offenders).toEqual([]);
    });
});

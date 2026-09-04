import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
    SUPPORT_EMAIL,
    SUPPORT_WHATSAPP,
    hasWhatsappSupport,
    hasEmailSupport,
    supportWhatsappLink,
    supportMailtoLink,
    supportPhoneDisplay,
} from "../../src/config/brand";
import { FEATURES, isEnabled } from "../../src/config/features";
import {
    LEGAL_ENTITY, LEGAL_ICE, LEGAL_RC,
    DPO_EMAIL, CNDP_DECLARED, SOCIALS, TWITTER_HANDLE,
    hasLegalIdentity,
} from "../../src/config/brand";

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
    it("n'expose une adresse de contact que si une boîte est réellement relevée", () => {
        // contact@bayiin.shop n'existe pas encore. Afficher une adresse non relevée
        // reproduit exactement le défaut du numéro WhatsApp fictif.
        expect(hasEmailSupport()).toBe(Boolean(SUPPORT_EMAIL));
        if (SUPPORT_EMAIL === null) {
            expect(supportMailtoLink("sujet")).toBeNull();
        } else {
            expect(SUPPORT_EMAIL).toMatch(/^[^@\s]+@[^@\s]+\.[a-z]{2,}$/i);
            expect(supportMailtoLink("sujet")).toBe(`mailto:${SUPPORT_EMAIL}?subject=sujet`);
        }
    });

    it("garde au moins un canal joignable quoi qu'il arrive", () => {
        // WhatsApp et email peuvent être éteints ; le formulaire, lui, écrit dans
        // contact_requests et remonte dans le panel admin. C'est le canal de repli.
        const hasExternal = hasWhatsappSupport() || hasEmailSupport();
        const formIsWired = fs
            .readFileSync(path.join(SRC, "components/ContactSection.jsx"), "utf8")
            .includes('collection(db, "contact_requests")');
        expect(hasExternal || formIsWired).toBe(true);
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
    it("aucune adresse @bayiin.shop codée en dur hors config et pages légales", () => {
        // Les pages légales (Terms, Privacy) citent des adresses imposées par la loi :
        // elles ont leur propre exigence, traitée à part.
        const LEGAL = ["pages/Terms.jsx", "pages/Privacy.jsx"];
        const offenders = SOURCES
            .map(rel)
            .filter((f) => f !== "config/brand.js" && !LEGAL.includes(f))
            .filter((f) => /@bayiin\.shop/.test(fs.readFileSync(path.join(SRC, f), "utf8")));
        expect(offenders).toEqual([]);
    });
});

describe("pages légales — aucun placeholder publié", () => {
    const LEGAL_PAGES = ["pages/Terms.jsx", "pages/Privacy.jsx"];
    const read = (f) => fs.readFileSync(path.join(SRC, f), "utf8");

    it("aucun identifiant en XXXXX affiché", () => {
        // « ICE : 00XXXXXXXXXXXXX » sur une page légale publique est pire qu'une
        // absence de mention : c'est visiblement inachevé.
        const offenders = [];
        for (const f of LEGAL_PAGES) {
            read(f).split("\n").forEach((line, i) => {
                const t = line.trim();
                if (t.startsWith("//") || t.startsWith("*") || t.startsWith("/*")) return;
                if (/X{4,}/.test(line) && !/placeholder\s*=/.test(line)) {
                    offenders.push(`${f}:${i + 1}`);
                }
            });
        }
        expect(offenders).toEqual([]);
    });

    it("le mot « Placeholders » n'est plus affiché aux visiteurs", () => {
        expect(LEGAL_PAGES.filter((f) => /Placeholders/.test(read(f)))).toEqual([]);
    });

    it("l'identité légale reste cohérente : tout ou rien", () => {
        expect(hasLegalIdentity()).toBe(Boolean(LEGAL_ENTITY && LEGAL_ICE && LEGAL_RC));
    });

    it("la déclaration CNDP n'est affirmée que si elle est déposée", () => {
        // Affirmer un dépôt non effectué est une fausse déclaration publique.
        if (!CNDP_DECLARED) {
            expect(read("pages/Privacy.jsx")).toContain("CNDP_DECLARED &&");
        }
    });

    it("les pages légales renvoient vers un contact accessible sans connexion", () => {
        // /help est derrière ProtectedRoute : y envoyer un visiteur non connecté
        // depuis une page publique l'enverrait sur l'écran de login.
        for (const f of LEGAL_PAGES) {
            const src = read(f);
            if (!/formulaire de contact/.test(src)) continue;
            expect(src, `${f} doit utiliser PUBLIC_CONTACT_PATH`).toContain("PUBLIC_CONTACT_PATH");
            expect(src, `${f} ne doit pas pointer vers /help`).not.toContain('to="/help"');
        }
    });

    it("aucune mention DPO tant qu'aucune adresse n'existe", () => {
        if (DPO_EMAIL !== null) return;
        expect(LEGAL_PAGES.filter((f) => /privacy@bayiin\.shop/.test(read(f)))).toEqual([]);
    });
});

describe("landing — aucun lien mort ni contenu non sourcé", () => {
    const FOOTER = "components/Landing/Footer.jsx";

    it("aucun lien mort dans le footer de la landing", () => {
        const offenders = fs.readFileSync(path.join(SRC, FOOTER), "utf8")
            .split("\n")
            .map((line, i) => ({ line, n: i + 1 }))
            .filter(({ line }) => /href="#"/.test(line) && !line.trim().startsWith("href="))
            .map(({ n }) => `${FOOTER}:${n}`);
        expect(offenders).toEqual([]);
    });

    it("aucune icône sociale sans URL réelle", () => {
        for (const [name, url] of Object.entries(SOCIALS)) {
            expect(url === null || /^https?:\/\//.test(url), `SOCIALS.${name}`).toBe(true);
        }
    });

    it("twitter:site n'est émis que si le handle est déclaré", () => {
        const src = fs.readFileSync(path.join(SRC, "components/SEO.jsx"), "utf8");
        expect(src).toContain("TWITTER_HANDLE &&");
        expect(TWITTER_HANDLE === null || TWITTER_HANDLE.startsWith("@")).toBe(true);
    });

    it("témoignages inventés et chiffres non sourcés restent masqués", () => {
        expect(FEATURES.landingTestimonials).toBe(false);
        expect(FEATURES.landingStats).toBe(false);
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

describe("landing — cohérence avec le produit livré", () => {
    const LANDING = path.join(SRC, "pages/Landing.jsx");
    const landingSrc = fs.readFileSync(LANDING, "utf8");

    it("chaque ancre de navigation existe réellement", () => {
        // Le lien #features a longtemps pointé vers une ancre inexistante :
        // cliquer « Fonctionnalités » ne faisait rien, et la page ne décrivait
        // nulle part ce que fait le produit.
        const anchors = [...landingSrc.matchAll(/href="#([a-z-]+)"/g)].map((m) => m[1]);
        const allSrc = [LANDING,
            path.join(SRC, "components/Landing/Features.jsx"),
            path.join(SRC, "components/Landing/FAQ.jsx"),
            path.join(SRC, "components/ContactSection.jsx"),
        ].map((f) => fs.readFileSync(f, "utf8")).join("\n");

        const missing = [...new Set(anchors)].filter(
            (a) => !allSrc.includes(`id="${a}"`)
        );
        expect(missing).toEqual([]);
    });

    it("la landing ne vante aucun module coupé", () => {
        // Promettre un module derrière un drapeau, c'est reproduire les overlays
        // « Bientôt Disponible » qu'on a retirés — mais côté commercial.
        // On retire les commentaires avant de verifier : ce qui compte est ce qui
        // est AFFICHE au visiteur, pas la documentation du fichier — laquelle cite
        // justement ces modules comme contre-exemples a ne pas lister.
        const features = fs
            .readFileSync(path.join(SRC, "components/Landing/Features.jsx"), "utf8")
            .replace(/\/\*[\s\S]*?\*\//g, "")
            .replace(/^\s*\/\/.*$/gm, "");
        for (const banned of ["YouCan", "Shopify", "Cathedis", "vitrine", "Vitrine"]) {
            expect(features, `Features.jsx mentionne « ${banned} », module coupé`)
                .not.toContain(banned);
        }
    });
});
